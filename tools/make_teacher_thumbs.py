import argparse
import sys
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageOps

THUMB_WIDTH = 128
THUMB_HEIGHT = 171
THUMB_QUALITY = 82
THUMB_METHOD = 6


@dataclass
class ThumbResult:
    written: bool
    skipped: bool


class ThumbGenerator:
    def __init__(self, src_dir: Path, out_dir: Path, force: bool):
        self.src_dir = src_dir
        self.out_dir = out_dir
        self.force = force

    def process(self, src_path: Path) -> ThumbResult:
        out_path = self.out_dir / f"{src_path.stem}.webp"
        if not self.force and out_path.exists() and out_path.stat().st_mtime >= src_path.stat().st_mtime:
            return ThumbResult(written=False, skipped=True)

        self.out_dir.mkdir(parents=True, exist_ok=True)
        with Image.open(src_path) as img:
            img = ImageOps.exif_transpose(img)
            img = img.convert("RGB")
            img = img.resize((THUMB_WIDTH, THUMB_HEIGHT), Image.LANCZOS)
            img.save(out_path, "WEBP", quality=THUMB_QUALITY, method=THUMB_METHOD)
        return ThumbResult(written=True, skipped=False)

    def run(self) -> int:
        sources = sorted(self.src_dir.glob("*.jpg"))
        if not sources:
            print(f"no *.jpg files found under {self.src_dir}", file=sys.stderr)
            return 1

        written = 0
        skipped = 0
        errors = []
        for src_path in sources:
            try:
                result = self.process(src_path)
                if result.written:
                    written += 1
                else:
                    skipped += 1
            except Exception as error:
                print(f"[{src_path.name}] FAILED: {error}", file=sys.stderr)
                errors.append((src_path.name, error))

        print(f"thumbs: {written} written, {skipped} skipped, {len(errors)} failed -> {self.out_dir}")
        return 1 if errors else 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate 128x171 WebP thumbnails for teacher portraits used by the slot wheel and lobby grid.",
    )
    repo_root = Path(__file__).resolve().parents[1]
    default_src = repo_root / "client" / "public" / "teachers"
    default_out = default_src / "thumbs"
    parser.add_argument("--src", type=Path, default=default_src)
    parser.add_argument("--out", type=Path, default=default_out)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    return ThumbGenerator(args.src, args.out, args.force).run()


if __name__ == "__main__":
    sys.exit(main())
