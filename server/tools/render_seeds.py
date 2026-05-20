"""Render the tentacle layout for several seeds, each to its own PNG."""
from __future__ import annotations

import sys
from pathlib import Path

from tools.visualize_world import render


def main() -> None:
    size = int(sys.argv[1]) if len(sys.argv) > 1 else 80
    seeds = [int(s) for s in sys.argv[2:]] if len(sys.argv) > 2 else [7, 123, 999, 31415, 2026]
    out_dir = Path(__file__).parent
    for seed in seeds:
        out = out_dir / f"world_tentacle_seed{seed}_{size}.png"
        render(seed, size, out, style="tentacle")


if __name__ == "__main__":
    main()
