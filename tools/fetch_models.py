import argparse
import json
import math
import os
import shutil
import struct
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

from PIL import Image

USER_AGENT = "Mozilla/5.0"
TEXTURE_MAX_PX = 512
TEXTURE_QUALITY = 85
SUB_CELL_METRES = 0.5


@dataclass(frozen=True)
class ModelSpec:
    prop_type: str
    asset: str
    category: str
    scale: float
    simplify: float = 0.0
    yaw_offset: float = 0.0
    scale_y: float | None = None
    scale_z: float | None = None
    hinge_node: str | None = None
    hinge_side: str | None = None
    hinge_open_rad: float | None = None
    aggressive_simplify: bool = False

    def __post_init__(self) -> None:
        if self.scale_y is None:
            object.__setattr__(self, "scale_y", self.scale)
        if self.scale_z is None:
            object.__setattr__(self, "scale_z", self.scale)


MANIFEST: tuple[ModelSpec, ...] = (
    ModelSpec("student_desk", "SchoolDesk_01", "furniture", 1.0, 0.5),
    ModelSpec("chair", "SchoolChair_01", "furniture", 1.0, 0.45),
    ModelSpec("bookshelf", "Shelf_01", "furniture", 1.0, yaw_offset=math.pi),
    ModelSpec("desk", "metal_office_desk", "furniture", 1.0, 0.6),
    ModelSpec("side_table", "side_table_01", "furniture", 1.0, 0.7),
    ModelSpec("sofa", "Sofa_01", "furniture", 1.0, yaw_offset=math.pi),
    ModelSpec("bench", "painted_wooden_bench", "furniture", 1.0, yaw_offset=math.pi),
    ModelSpec("cafeteria_table", "dining_table", "furniture", 1.0),
    ModelSpec("cupboard", "drawer_cabinet", "furniture", 1.0, 0.1, yaw_offset=math.pi),
    ModelSpec("trash_can", "industrial_pastic_container", "clutter", 0.75, 0.13, aggressive_simplify=True),
    ModelSpec("recycle_bin", "plastic_crate_02", "clutter", 0.95, 0.25, aggressive_simplify=True),
    ModelSpec("pylon", "WetFloorSign_01", "clutter", 1.0),
    ModelSpec("mop_bucket", "wooden_bucket_01", "clutter", 1.0, 0.37),
    ModelSpec("plant", "potted_plant_04", "clutter", 3.2, 0.17, aggressive_simplify=True),
    ModelSpec("papers", "office_notepads", "clutter", 0.4),
    ModelSpec("books_pile", "binder_notebook", "clutter", 0.7, 0.1),
    ModelSpec("clock", "wall_clock", "wall", 1.0, 0.5, yaw_offset=math.pi),
    ModelSpec("fire_extinguisher", "korean_fire_extinguisher_01", "wall", 1.0, 0.2, yaw_offset=math.pi),
    ModelSpec("microscope", "industrial_microscope", "lab", 0.95, 0.2, yaw_offset=math.pi),
    ModelSpec("bunsen_burner", "bunsen_burner", "lab", 1.0, 0.25),
    ModelSpec("microwave", "vintage_microwave", "appliances", 0.65, 0.3, yaw_offset=math.pi),
    ModelSpec("laptop", "classic_laptop", "appliances", 0.55, 0.25, yaw_offset=math.pi),
    ModelSpec(
        "locker", "painted_wooden_cabinet_02", "furniture", 0.50,
        scale_y=0.70, scale_z=0.55, yaw_offset=math.pi,
        hinge_node="painted_wooden_cabinet_02_door", hinge_side="right",
        hinge_open_rad=math.pi / 2,
    ),
)


PICKUP_MANIFEST: tuple[ModelSpec, ...] = (
    ModelSpec("medkit", "medical_box", "pickups", 0.8, 0.5),
    ModelSpec("potion", "multi_cleaner_bottle", "pickups", 1.0, 0.35),
    ModelSpec("compass", "seadogs_compass", "pickups", 1.6, 0.25),
    ModelSpec("tracker", "retro_multimeter", "pickups", 1.0, 0.3),
    ModelSpec("goggles", "old_gas_mask", "pickups", 0.3, 0.13),
    ModelSpec("gps", "digital_wrist_watch", "pickups", 1.2, 0.22),
)


@dataclass(frozen=True)
class SketchfabSpec:
    prop_type: str
    uid: str
    title: str
    author: str
    license: str
    reason: str


SKETCHFAB_MANIFEST: tuple[SketchfabSpec, ...] = (
    SketchfabSpec(
        "room door", "b31949b739874c119d31d89a3ec942a3", "Animated low-poly door",
        "Dead-Soul", "CC-BY",
        "would replace the procedural classroom door mesh with a real modelled and "
        "animated door; hinge/lock logic in the client stays untouched either way",
    ),
    SketchfabSpec(
        "metal door", "b5daec11666248c2acd0a9ff2fd22969", "Metal door",
        "LiveToWin34", "CC-BY",
        "alternate door skin for janitor/server rooms, driven by the same procedural "
        "hinge logic as room door",
    ),
    SketchfabSpec(
        "whiteboard", "eff6059c0f654aa3a5ba5e10eb59591e", "Whiteboard",
        "Reflex_Entertainment", "CC-BY",
        "would give the whiteboard frame a real model while the writable face stays "
        "the dynamic marker canvas texture (whiteboardTexture.ts)",
    ),
    SketchfabSpec(
        "notice board", "c7253f06bb8c49b0afcd60a509a8240c", "Notice board",
        "Viktor_", "CC-BY",
        "would replace the procedural bulletin_board prop",
    ),
    SketchfabSpec(
        "bathroom sink", "45a6ab5e5a1a40b8913ab14314734ce8", "Bathroom sink",
        "kEam", "CC-BY",
        "Poly Haven has no bathroom fixtures at all; this is the closest CC-licensed "
        "sink candidate found for the sink prop",
    ),
    SketchfabSpec(
        "toilet", "6ac515a1c4154db18b5b4bd0b46d6405", "Toilet",
        "Allan-Jay Branscombe", "CC-BY",
        "no CC0 toilet fixture exists on Poly Haven; needed for the toilet_stall prop",
    ),
    SketchfabSpec(
        "urinal", "edbcda9bf0854e60bd6fea1a592f0bbe", "Urinal",
        "CurlyFryWhy", "CC-BY",
        "no CC0 urinal fixture exists on Poly Haven; needed for the urinal prop",
    ),
    SketchfabSpec(
        "school locker", "c32db0c65ddb46ce9e6f752b4a0b110b", "School locker",
        "Unknown", "CC-BY",
        "would have replaced the procedural locker mesh built in gameplay/lockers.ts; "
        "a CC0 Poly Haven stand-in (painted_wooden_cabinet_02, prop type `locker`) "
        "shipped instead, so this Sketchfab candidate is no longer needed even once a "
        "token becomes available",
    ),
    SketchfabSpec(
        "exit sign", "56000263a5aa466c96df8e1d36533668", "Exit sign",
        "Adventure Dude", "CC-BY",
        "would replace the procedural exit_sign prop",
    ),
)


_IDENTITY = (1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0)


def _mat_mul(a, b):
    out = [0.0] * 16
    for c in range(4):
        for r in range(4):
            out[c * 4 + r] = sum(a[k * 4 + r] * b[c * 4 + k] for k in range(4))
    return out


def _trs_matrix(node):
    if "matrix" in node:
        return list(node["matrix"])
    t = node.get("translation", [0, 0, 0])
    r = node.get("rotation", [0, 0, 0, 1])
    s = node.get("scale", [1, 1, 1])
    x, y, z, w = r
    matrix = [
        1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0,
        2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0,
        2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0,
        0, 0, 0, 1,
    ]
    for c in range(3):
        for r_ in range(3):
            matrix[c * 4 + r_] *= s[c]
    matrix[12], matrix[13], matrix[14] = t
    return matrix


def _transform_point(matrix, point):
    x, y, z = point
    return (
        matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
        matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
        matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
    )


def _read_json_chunk(data: bytes) -> dict:
    offset = 12
    while offset < len(data):
        chunk_length, chunk_type = struct.unpack_from("<II", data, offset)
        chunk = data[offset + 8: offset + 8 + chunk_length]
        if chunk_type == 0x4E4F534A:
            return json.loads(chunk.decode("utf-8"))
        offset += 8 + chunk_length + ((4 - chunk_length % 4) % 4)
    raise RuntimeError("no JSON chunk found in GLB")


class GlbAnalyzer:
    @staticmethod
    def bounding_box(path: Path):
        data = path.read_bytes()
        if data[:4] != b"glTF":
            raise RuntimeError(f"{path} is not a binary glTF")
        document = _read_json_chunk(data)
        nodes = document.get("nodes", [])
        meshes = document.get("meshes", [])
        accessors = document.get("accessors", [])
        lo = [math.inf, math.inf, math.inf]
        hi = [-math.inf, -math.inf, -math.inf]

        def walk(index: int, parent) -> None:
            node = nodes[index]
            world = _mat_mul(parent, _trs_matrix(node))
            if "mesh" in node:
                for primitive in meshes[node["mesh"]].get("primitives", []):
                    accessor = accessors[primitive["attributes"]["POSITION"]]
                    minimum, maximum = accessor.get("min"), accessor.get("max")
                    if not minimum or not maximum:
                        continue
                    for cx in (minimum[0], maximum[0]):
                        for cy in (minimum[1], maximum[1]):
                            for cz in (minimum[2], maximum[2]):
                                point = _transform_point(world, (cx, cy, cz))
                                for i in range(3):
                                    lo[i] = min(lo[i], point[i])
                                    hi[i] = max(hi[i], point[i])
            for child in node.get("children", []):
                walk(child, world)

        for scene in document.get("scenes", []):
            for node_index in scene.get("nodes", []):
                walk(node_index, _IDENTITY)
        return lo, hi

    @staticmethod
    def triangle_count(path: Path) -> int:
        data = path.read_bytes()
        document = _read_json_chunk(data)
        total = 0
        for mesh in document.get("meshes", []):
            for primitive in mesh.get("primitives", []):
                if "indices" in primitive:
                    total += document["accessors"][primitive["indices"]]["count"] // 3
        return total


class Downloader:
    def __init__(self, cache_dir: Path):
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def fetch(self, url: str, relative_path: str) -> Path:
        dest = self.cache_dir / relative_path
        if dest.exists() and dest.stat().st_size > 0:
            return dest
        dest.parent.mkdir(parents=True, exist_ok=True)
        last_error = None
        for attempt in range(1, 4):
            try:
                request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
                with urllib.request.urlopen(request, timeout=240) as response:
                    data = response.read()
                if not data:
                    raise RuntimeError("empty response body")
                tmp = dest.parent / (dest.name + ".part")
                tmp.write_bytes(data)
                tmp.replace(dest)
                return dest
            except Exception as error:
                last_error = error
                if attempt < 3:
                    time.sleep(2 * attempt)
        raise RuntimeError(f"failed to download {url}: {last_error}")

    def fetch_json(self, url: str) -> dict:
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))


class PolyHavenAsset:
    FILES_URL = "https://api.polyhaven.com/files/{asset}"

    def __init__(self, spec: ModelSpec, downloader: Downloader):
        self.spec = spec
        self.downloader = downloader

    def fetch_gltf(self, lod: str = "1k") -> Path:
        files = self.downloader.fetch_json(self.FILES_URL.format(asset=self.spec.asset))
        entry = files["gltf"][lod]["gltf"]
        main = self.downloader.fetch(entry["url"], f"{self.spec.asset}/{self.spec.asset}.gltf")
        for rel, info in (entry.get("include") or {}).items():
            self.downloader.fetch(info["url"], f"{self.spec.asset}/{rel}")
        return main


class AuthorCache:
    def __init__(self, path: Path):
        self.path = path
        self._data = {}
        if path.exists():
            try:
                self._data = json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                self._data = {}

    def get(self, asset: str):
        return self._data.get(asset)

    def set(self, asset: str, author: str) -> None:
        self._data[asset] = author
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self._data, indent=2, sort_keys=True) + "\n", encoding="utf-8")


class PolyHavenInfo:
    INFO_URL = "https://api.polyhaven.com/info/{asset}"

    def __init__(self, downloader: Downloader, cache: AuthorCache):
        self.downloader = downloader
        self.cache = cache

    def author_for(self, asset: str) -> str:
        cached = self.cache.get(asset)
        if cached is not None:
            return cached
        info = self.downloader.fetch_json(self.INFO_URL.format(asset=asset))
        authors = info.get("authors") or {}
        name = ", ".join(authors.keys()) if authors else "Poly Haven"
        self.cache.set(asset, name)
        return name


class TextureDownscaler:
    def __init__(self, max_px: int = TEXTURE_MAX_PX, quality: int = TEXTURE_QUALITY):
        self.max_px = max_px
        self.quality = quality

    def process(self, asset_root: Path) -> None:
        textures_dir = asset_root / "textures"
        if not textures_dir.is_dir():
            return
        for path in sorted(textures_dir.glob("*")):
            if not path.is_file():
                continue
            image = Image.open(path)
            if max(image.size) <= self.max_px:
                continue
            width = min(self.max_px, image.width)
            height = min(self.max_px, image.height)
            resized = image.convert("RGB").resize((width, height), Image.LANCZOS)
            resized.save(path, "JPEG", quality=self.quality)


class GltfPacker:
    WINDOWS_CANDIDATES = ("gltfpack.cmd", "gltfpack.exe")
    POSIX_CANDIDATES = ("gltfpack",)

    def __init__(self, client_dir: Path):
        self.binary = self._locate(client_dir)

    def _locate(self, client_dir: Path) -> Path:
        bin_dir = client_dir / "node_modules" / ".bin"
        names = self.WINDOWS_CANDIDATES if os.name == "nt" else self.POSIX_CANDIDATES
        for name in names:
            candidate = bin_dir / name
            if candidate.exists():
                return candidate
        raise RuntimeError(
            f"gltfpack binary not found under {bin_dir} — run `bun install` in client/"
        )

    def pack(self, source: Path, dest: Path, simplify: float, extra_args: list[str] | None = None) -> None:
        dest.parent.mkdir(parents=True, exist_ok=True)
        command = [str(self.binary), "-i", str(source), "-o", str(dest), "-c", "-vtf"]
        if simplify > 0.0:
            command += ["-si", str(simplify)]
        if extra_args:
            command += extra_args
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(
                f"gltfpack failed for {source.name}: {result.stdout[-400:]} {result.stderr[-400:]}"
            )


class DecoderInstaller:
    def __init__(self, client_dir: Path):
        self.source = client_dir / "node_modules" / "meshoptimizer" / "meshopt_decoder.cjs"
        self.dest = client_dir / "public" / "decoders" / "meshopt_decoder.js"

    def install(self) -> Path:
        if not self.source.exists():
            raise RuntimeError(
                f"meshoptimizer package not found at {self.source} — run `bun install` in client/"
            )
        self.dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(self.source, self.dest)
        return self.dest


@dataclass
class ModelResult:
    spec: ModelSpec
    output_path: Path
    triangles: int
    along: float
    out: float
    height: float
    bytes_written: int
    skipped: bool


class ModelProcessor:
    def __init__(
        self,
        spec: ModelSpec,
        output_root: Path,
        downloader: Downloader,
        packer: GltfPacker,
        downscaler: TextureDownscaler,
    ):
        self.spec = spec
        self.output_path = output_root / spec.category / f"{spec.prop_type}.glb"
        self.downloader = downloader
        self.packer = packer
        self.downscaler = downscaler

    def is_complete(self) -> bool:
        return self.output_path.exists() and self.output_path.stat().st_size > 0

    def _measure(self) -> ModelResult:
        lo, hi = GlbAnalyzer.bounding_box(self.output_path)
        width = (hi[0] - lo[0]) * self.spec.scale
        height = (hi[1] - lo[1]) * self.spec.scale_y
        depth = (hi[2] - lo[2]) * self.spec.scale_z
        along, out = width, depth
        quarter_turns = round(self.spec.yaw_offset / (math.pi / 2)) if self.spec.yaw_offset else 0
        if quarter_turns % 2 != 0:
            along, out = out, along
        triangles = GlbAnalyzer.triangle_count(self.output_path)
        return ModelResult(
            self.spec,
            self.output_path,
            triangles,
            round(along, 4),
            round(out, 4),
            round(height, 4),
            self.output_path.stat().st_size,
            skipped=False,
        )

    def _verify_hinge(self) -> None:
        data = self.output_path.read_bytes()
        document = _read_json_chunk(data)
        names = [node.get("name", "") for node in document.get("nodes", [])]
        found = any(self.spec.hinge_node in name for name in names)
        if not found:
            print(
                f"WARNING: hinge node '{self.spec.hinge_node}' not found in packed "
                f"{self.output_path} — node names present: {names}",
                file=sys.stderr,
            )

    def process(self, force: bool) -> ModelResult:
        asset = PolyHavenAsset(self.spec, self.downloader)

        if force or not self.is_complete():
            main_gltf = asset.fetch_gltf()
            self.downscaler.process(self.downloader.cache_dir / self.spec.asset)
            extra_args = []
            if self.spec.hinge_node:
                extra_args.append("-kn")
            if self.spec.aggressive_simplify:
                extra_args.append("-sa")
            self.packer.pack(main_gltf, self.output_path, self.spec.simplify, extra_args or None)
            result = self._measure()
        else:
            result = self._measure()
            result.skipped = True

        if self.spec.hinge_node:
            self._verify_hinge()

        return result


class LicenseGenerator:
    def __init__(self, results, info: PolyHavenInfo, sketchfab):
        self.results = results
        self.info = info
        self.sketchfab = sketchfab

    def build(self) -> str:
        lines = []
        lines.append("# Model Licenses")
        lines.append("")
        lines.append(
            "Every model in this directory is CC0 1.0 from Poly Haven and requires no "
            "attribution to use, modify or redistribute; the table below credits the "
            "original authors anyway."
        )
        lines.append("")
        lines.append("| Prop type | Model file | Source asset | Source URL | Author | License |")
        lines.append("|---|---|---|---|---|---|")
        for result in sorted(self.results, key=lambda r: r.spec.prop_type):
            spec = result.spec
            model_file = f"{spec.category}/{spec.prop_type}.glb"
            url = f"https://polyhaven.com/a/{spec.asset}"
            author = self.info.author_for(spec.asset)
            lines.append(
                f"| `{spec.prop_type}` | `{model_file}` | {spec.asset} | {url} | {author} | "
                f"CC0 1.0 |"
            )
        lines.append("")
        lines.append("## Not fetched — Sketchfab (CC-BY, requires `SKETCHFAB_API_TOKEN`)")
        lines.append("")
        lines.append(
            "The models below were identified as good matches for their prop types but "
            "could not be downloaded because Sketchfab requires an API token and "
            "`SKETCHFAB_API_TOKEN` was not available when this manifest was assembled. "
            "If one of these is ever added, use the credit line in the last column."
        )
        lines.append("")
        lines.append("| Prop type | Title | Author | Sketchfab UID | License | Why it matters | Credit line |")
        lines.append("|---|---|---|---|---|---|---|")
        for item in self.sketchfab:
            credit = f"\"{item.title}\" by {item.author}, licensed CC-BY, via sketchfab.com/3d-models/{item.uid}"
            lines.append(
                f"| `{item.prop_type}` | {item.title} | {item.author} | `{item.uid}` | "
                f"{item.license} | {item.reason} | {credit} |"
            )
        lines.append("")
        lines.append(
            "Run `tools/fetch_models.py` to regenerate the Poly Haven table (author names "
            "are cached in `tools/.model-cache/authors.json`)."
        )
        lines.append("")
        return "\n".join(lines)


class FootprintsWriter:
    def __init__(self, output_path: Path):
        self.output_path = output_path

    def _entry(self, result) -> dict:
        spec = result.spec
        entry = {
            "model": f"{spec.category}/{spec.prop_type}",
            "asset": spec.asset,
            "scale": spec.scale,
            "scaleY": spec.scale_y,
            "scaleZ": spec.scale_z,
            "yawOffset": spec.yaw_offset,
            "along": result.along,
            "out": result.out,
            "height": result.height,
            "triangles": result.triangles,
        }
        if spec.hinge_node:
            entry["hinge"] = {
                "node": spec.hinge_node,
                "side": spec.hinge_side,
                "openRad": spec.hinge_open_rad,
            }
        return entry

    def write(self, prop_results, pickup_results) -> None:
        props = {
            result.spec.prop_type: self._entry(result)
            for result in sorted(prop_results, key=lambda r: r.spec.prop_type)
        }
        pickups = {
            result.spec.prop_type: self._entry(result)
            for result in sorted(pickup_results, key=lambda r: r.spec.prop_type)
        }
        payload = {
            "generator": "tools/fetch_models.py",
            "subCellMetres": SUB_CELL_METRES,
            "props": props,
            "pickups": pickups,
        }
        self.output_path.parent.mkdir(parents=True, exist_ok=True)
        self.output_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


class ModelFetcher:
    def __init__(self, repo_root: Path, force: bool):
        self.repo_root = repo_root
        self.force = force
        self.client_dir = repo_root / "client"
        self.cache_dir = repo_root / "tools" / ".model-cache"
        self.output_root = self.client_dir / "public" / "models"
        self.downloader = Downloader(self.cache_dir)
        self.packer = GltfPacker(self.client_dir)
        self.downscaler = TextureDownscaler()
        self.author_cache = AuthorCache(self.cache_dir / "authors.json")
        self.info = PolyHavenInfo(self.downloader, self.author_cache)

    def _print_sketchfab_notice(self) -> None:
        token = os.environ.get("SKETCHFAB_API_TOKEN")
        print("=" * 78)
        if token:
            print("SKETCHFAB_API_TOKEN found, but the Sketchfab downloader is not implemented.")
            print("The following models would be fetched if it were:")
        else:
            print("SKETCHFAB_API_TOKEN not set — skipping these Sketchfab CC-BY models:")
        for item in SKETCHFAB_MANIFEST:
            print(f"  - {item.prop_type}: \"{item.title}\" by {item.author} (uid {item.uid}) — {item.reason}")
        print(f"{len(SKETCHFAB_MANIFEST)} Sketchfab model(s) skipped this run.")
        print("=" * 78)

    def _directory_size(self) -> int:
        return sum(p.stat().st_size for p in self.output_root.rglob("*") if p.is_file())

    def _print_summary(self, results) -> None:
        print()
        print(
            f"{'prop type':20} {'category':12} {'along':>7} {'out':>7} {'height':>7} "
            f"{'tris':>7} {'MB':>7}"
        )
        total_bytes = 0
        for result in sorted(results, key=lambda r: r.spec.prop_type):
            spec = result.spec
            total_bytes += result.bytes_written
            print(
                f"{spec.prop_type:20} {spec.category:12} {result.along:7.3f} {result.out:7.3f} "
                f"{result.height:7.3f} {result.triangles:7d} {result.bytes_written / 1e6:7.3f}"
            )
        print(f"TOTAL (tracked results): {total_bytes / 1e6:.2f} MB across {len(results)} models")
        print(f"Sketchfab models skipped: {len(SKETCHFAB_MANIFEST)}")
        dir_bytes = self._directory_size()
        print(f"client/public/models on-disk size: {dir_bytes / 1e6:.2f} MB (budget: 25 MB)")

    def run(self) -> int:
        self._print_sketchfab_notice()

        results = []
        errors = []
        for spec in MANIFEST + PICKUP_MANIFEST:
            processor = ModelProcessor(spec, self.output_root, self.downloader, self.packer, self.downscaler)
            try:
                result = processor.process(self.force)
                results.append(result)
                status = "skipped" if result.skipped else "built"
                print(f"[{spec.prop_type}] {status} - {result.triangles} tris, {result.bytes_written} bytes")
            except Exception as error:
                print(f"[{spec.prop_type}] FAILED: {error}", file=sys.stderr)
                errors.append((spec.prop_type, error))

        decoder_path = DecoderInstaller(self.client_dir).install()
        print(f"[decoder] meshopt_decoder.js installed at {decoder_path}")

        license_text = LicenseGenerator(results, self.info, SKETCHFAB_MANIFEST).build()
        self.output_root.mkdir(parents=True, exist_ok=True)
        (self.output_root / "LICENSES.md").write_text(license_text, encoding="utf-8")

        prop_results = [r for r in results if r.spec.category != "pickups"]
        pickup_results = [r for r in results if r.spec.category == "pickups"]
        footprints_path = self.client_dir / "src" / "world" / "footprints.json"
        FootprintsWriter(footprints_path).write(prop_results, pickup_results)

        self._print_summary(results)

        if errors:
            print(f"{len(errors)} models failed", file=sys.stderr)
            return 1
        return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    repo_root = Path(__file__).resolve().parent.parent
    return ModelFetcher(repo_root, args.force).run()


if __name__ == "__main__":
    sys.exit(main())
