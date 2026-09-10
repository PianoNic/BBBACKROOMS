import argparse
import datetime
import io
import os
import sys
import time
import urllib.error
import urllib.request
import zipfile
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageChops, ImageOps

USER_AGENT = "Mozilla/5.0"
SIZE_SUFFIX = {512: "512"}
AO_BAKE_STRENGTH = 0.6


@dataclass(frozen=True)
class CategorySpec:
    dir_name: str
    asset_id: str
    zip_format: str
    is_decal: bool
    desaturate: float = 0.0


MANIFEST = (
    CategorySpec("wall_plaster_cream", "PaintedPlaster017", "JPG", False),
    CategorySpec("wall_plaster_plain", "Plaster001", "JPG", False),
    CategorySpec("wall_tile_white", "Tiles036", "JPG", False),
    CategorySpec("wall_tile_hex", "Tiles071", "JPG", False),
    CategorySpec("wall_concrete", "Concrete015", "JPG", False),
    CategorySpec("dado_tile_green", "Tiles032", "JPG", False),
    CategorySpec("floor_terrazzo", "Terrazzo004", "JPG", False),
    CategorySpec("floor_lino", "Tiles141", "JPG", False),
    CategorySpec("floor_carpet", "Carpet011", "JPG", False),
    CategorySpec("floor_stone_tile", "Tiles002", "JPG", False),
    CategorySpec("floor_terrazzo_dark", "Terrazzo001", "JPG", False),
    CategorySpec("floor_wood", "Wood087", "JPG", False),
    CategorySpec("ceiling_tile", "Tiles020", "JPG", False, 0.9),
    CategorySpec("ceiling_plaster", "Plaster003", "JPG", False),
    CategorySpec("decal_leak", "Leaking005", "PNG", True),
)


@dataclass
class CategoryResult:
    dir_name: str
    bytes_written: int
    missing_ao: bool
    skipped: bool


class Downloader:
    def __init__(self, cache_dir: Path):
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def fetch(self, url: str, filename: str) -> Path:
        dest = self.cache_dir / filename
        if dest.exists() and dest.stat().st_size > 0:
            return dest
        last_error = None
        for attempt in range(1, 4):
            try:
                request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
                with urllib.request.urlopen(request, timeout=90) as response:
                    data = response.read()
                if not data:
                    raise RuntimeError("empty response body")
                tmp = self.cache_dir / (filename + ".part")
                tmp.write_bytes(data)
                tmp.replace(dest)
                return dest
            except Exception as error:
                last_error = error
                if attempt < 3:
                    time.sleep(2 * attempt)
        raise RuntimeError(f"failed to download {url}: {last_error}")


class AmbientCGAsset:
    URL_TEMPLATE = "https://ambientcg.com/get?file={asset_id}_1K-{fmt}.zip"
    SUFFIXES = {
        "color": "_color",
        "ao": "_ambientocclusion",
        "opacity": "_opacity",
    }

    def __init__(self, spec: CategorySpec, downloader: Downloader):
        self.spec = spec
        self.downloader = downloader

    def _download(self) -> Path:
        url = self.URL_TEMPLATE.format(asset_id=self.spec.asset_id, fmt=self.spec.zip_format)
        filename = f"{self.spec.asset_id}_1K-{self.spec.zip_format}.zip"
        return self.downloader.fetch(url, filename)

    def load_maps(self) -> dict:
        zip_path = self._download()
        maps = {}
        with zipfile.ZipFile(zip_path) as archive:
            names = archive.namelist()
            for key, suffix in self.SUFFIXES.items():
                match = None
                for name in names:
                    stem = os.path.splitext(name)[0].lower()
                    if stem.endswith(suffix):
                        match = name
                        break
                if match is not None:
                    maps[key] = Image.open(io.BytesIO(archive.read(match))).copy()
        return maps


class ImageOps2D:
    @staticmethod
    def albedo(color_img: Image.Image, ao_img, size: int, desaturate: float = 0.0) -> Image.Image:
        base = color_img.convert("RGB").resize((size, size), Image.LANCZOS)
        if ao_img is not None:
            ao = ao_img.convert("L").resize((size, size), Image.LANCZOS)
            factor = ao.point(lambda v: max(0, min(255, round(255 * (1.0 - AO_BAKE_STRENGTH * (1.0 - v / 255.0))))))
            factor_rgb = Image.merge("RGB", (factor, factor, factor))
            base = ImageChops.multiply(base, factor_rgb)
        if desaturate > 0.0:
            grey = ImageOps.grayscale(base).convert("RGB")
            base = Image.blend(base, grey, min(1.0, desaturate))
        return base

    @staticmethod
    def decal_albedo(color_img: Image.Image, opacity_img: Image.Image, size: int) -> Image.Image:
        color = color_img.convert("RGB").resize((size, size), Image.LANCZOS)
        alpha = opacity_img.convert("L").resize((size, size), Image.LANCZOS)
        r, g, b = color.split()
        return Image.merge("RGBA", (r, g, b, alpha))


class CategoryProcessor:
    ALBEDO_QUALITY = 80
    DECAL_QUALITY = 82
    SIZES = (512,)

    def __init__(self, spec: CategorySpec, output_root: Path, downloader: Downloader):
        self.spec = spec
        self.output_dir = output_root / spec.dir_name
        self.downloader = downloader

    def expected_files(self):
        return ["albedo-512.webp"]

    def is_complete(self) -> bool:
        return all((self.output_dir / name).exists() for name in self.expected_files())

    def existing_bytes(self) -> int:
        return sum((self.output_dir / name).stat().st_size for name in self.expected_files())

    def process(self, force: bool) -> CategoryResult:
        if not force and self.is_complete():
            return CategoryResult(self.spec.dir_name, self.existing_bytes(), False, True)

        self.output_dir.mkdir(parents=True, exist_ok=True)
        asset = AmbientCGAsset(self.spec, self.downloader)
        maps = asset.load_maps()

        color = maps.get("color")
        if color is None:
            raise RuntimeError(f"{self.spec.asset_id}: missing Color map")

        ao = maps.get("ao")

        opacity = None
        if self.spec.is_decal:
            opacity = maps.get("opacity")
            if opacity is None:
                raise RuntimeError(f"{self.spec.asset_id}: missing Opacity map for decal")

        total_bytes = 0
        for size in self.SIZES:
            suffix = SIZE_SUFFIX[size]

            if self.spec.is_decal:
                albedo_img = ImageOps2D.decal_albedo(color, opacity, size)
                quality = self.DECAL_QUALITY
            else:
                albedo_img = ImageOps2D.albedo(color, ao, size, self.spec.desaturate)
                quality = self.ALBEDO_QUALITY
            albedo_path = self.output_dir / f"albedo-{suffix}.webp"
            albedo_img.save(albedo_path, "WEBP", quality=quality, method=6)
            total_bytes += albedo_path.stat().st_size

        return CategoryResult(self.spec.dir_name, total_bytes, ao is None, False)


class LicenseGenerator:
    def __init__(self, manifest, fetch_date: str):
        self.manifest = manifest
        self.fetch_date = fetch_date

    def build(self) -> str:
        lines = []
        lines.append("# Texture Licenses")
        lines.append("")
        lines.append(
            "Every texture in this directory is CC0 1.0 / public domain and requires no attribution to use, "
            "modify or redistribute; the table below is provided for traceability only."
        )
        lines.append("")
        lines.append("| Category | Asset | Source URL | Source | License | Fetched |")
        lines.append("|---|---|---|---|---|---|")
        for spec in self.manifest:
            url = f"https://ambientcg.com/view?id={spec.asset_id}"
            lines.append(f"| `{spec.dir_name}` | {spec.asset_id} | {url} | ambientCG | CC0 1.0 | {self.fetch_date} |")
        lines.append("")
        lines.append("## File layout")
        lines.append("")
        lines.append(
            "Each category directory holds a single `albedo-512.webp` (RGBA for `decal_leak`, alpha from the "
            "source Opacity map; RGB for the rest), with ambient occlusion pre-baked into it at "
            f"{AO_BAKE_STRENGTH} strength."
        )
        desaturated = [spec for spec in self.manifest if spec.desaturate > 0.0]
        if desaturated:
            joined = ", ".join(f"`{spec.dir_name}` ({spec.desaturate:g})" for spec in desaturated)
            lines.append("")
            lines.append(
                f"The following categories have their albedo desaturated before the client's tint multiply, "
                f"because the source asset's hue does not match the intended surface and the client supplies "
                f"the final hue itself: {joined}."
            )
        lines.append("")
        lines.append("Run `tools/fetch_textures.py` to regenerate this entire tree.")
        lines.append("")
        return "\n".join(lines)


class TextureFetcher:
    def __init__(self, repo_root: Path, force: bool):
        self.repo_root = repo_root
        self.force = force
        self.output_root = repo_root / "client" / "public" / "textures" / "pbr"
        self.cache_dir = repo_root / "tools" / ".texture-cache"
        self.downloader = Downloader(self.cache_dir)

    def run(self) -> int:
        results = []
        errors = []

        for spec in MANIFEST:
            processor = CategoryProcessor(spec, self.output_root, self.downloader)
            try:
                result = processor.process(self.force)
                results.append(result)
                notes = []
                if result.missing_ao:
                    notes.append("no AO")
                status = "skipped" if result.skipped else "built"
                note_text = f" ({', '.join(notes)})" if notes else ""
                print(f"[{spec.dir_name}] {status} - {result.bytes_written} bytes{note_text}")
            except Exception as error:
                print(f"[{spec.dir_name}] FAILED: {error}", file=sys.stderr)
                errors.append((spec.dir_name, error))

        license_text = LicenseGenerator(MANIFEST, datetime.date.today().isoformat()).build()
        self.output_root.mkdir(parents=True, exist_ok=True)
        (self.output_root / "LICENSES.md").write_text(license_text, encoding="utf-8")

        total_bytes = sum(f.stat().st_size for f in self.output_root.rglob("*") if f.is_file())
        print(f"TOTAL: {total_bytes} bytes ({total_bytes / 1024 / 1024:.2f} MB) under {self.output_root}")

        if errors:
            print(f"{len(errors)} categories failed", file=sys.stderr)
            return 1
        return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    repo_root = Path(__file__).resolve().parent.parent
    return TextureFetcher(repo_root, args.force).run()


if __name__ == "__main__":
    sys.exit(main())
