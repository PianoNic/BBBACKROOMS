"""Measure generated worlds instead of eyeballing them.

`visualize_world.py` answers "what does this map look like"; this answers
"are the maps any good", across many seeds at once. Renders are easy to
misread — a dense corridor web looks like one open blob at low zoom, when the
numbers say 74% of corridor cells are one step from a wall.

Checks per world:
  connectivity  every walkable cell, objective spot and teacher spawn
                reachable from the player spawn
  corridors     distance-to-wall histogram of circulation space
  shape         fill ratio, independent cycles, cul-de-sac cells
  content       room archetype mix, prop and light counts
  overlap       props whose footprints intersect, ignoring legitimate
                stacking (a microwave is *supposed* to sit in a counter)
  objectives    walking distance from spawn to each objective spot

Run:  PYTHONPATH=. python tools/analyze_layout.py [--style S] [--sizes 40,60]
                                                  [--seeds 8] [--verbose]
Exits non-zero if a hard invariant is violated, so it doubles as a smoke test
over far more seeds than the unit suite covers.
"""
from __future__ import annotations

import argparse
import itertools
import math
import statistics
from collections import Counter, defaultdict, deque

from app.world.constants import CELL_SIZE
from app.world.generator import _LAYOUT_BUILDERS, generate
from app.world.prop_specs import PROP_SPECS, SUB_CELL

STEPS = ((1, 0), (-1, 0), (0, 1), (0, -1))

# An on_top prop overlapping the parent that offers its layer is the point,
# not a bug.
_ONTOP = {k: v.requires_layer for k, v in PROP_SPECS.items()
          if v.placement == "on_top"}
_OFFERS = {k: v.offers_layer for k, v in PROP_SPECS.items() if v.offers_layer}


def _layer(prop_type: str) -> str:
    """Which horizontal surface a prop sits on.

    Only props sharing a surface can really collide — a microwave on a
    counter and papers on the floor share a footprint but not a height.
    """
    spec = PROP_SPECS.get(prop_type)
    if spec is not None and spec.placement == "on_top":
        return spec.requires_layer or "floor"
    return "floor"


def _stacking_pair(a: str, b: str) -> bool:
    return (_OFFERS.get(b) == _ONTOP.get(a) and a in _ONTOP) or (
        _OFFERS.get(a) == _ONTOP.get(b) and b in _ONTOP)


def _cell(x: float, z: float) -> tuple[int, int]:
    return int(x / CELL_SIZE), int(z / CELL_SIZE)


def _walkable(cells: list[int], w: int, h: int) -> set[tuple[int, int]]:
    return {(x, z) for z in range(h) for x in range(w) if cells[z * w + x] == 1}


def _bfs(start: tuple[int, int], space: set) -> dict[tuple[int, int], int]:
    if start not in space:
        return {}
    dist = {start: 0}
    queue = deque([start])
    while queue:
        cx, cz = queue.popleft()
        for dx, dz in STEPS:
            nxt = (cx + dx, cz + dz)
            if nxt in space and nxt not in dist:
                dist[nxt] = dist[(cx, cz)] + 1
                queue.append(nxt)
    return dist


def _wall_distance(space: set, w: int, h: int) -> dict[tuple[int, int], int]:
    """Steps from each walkable cell to the nearest wall — corridor width."""
    dist: dict[tuple[int, int], int] = {}
    queue: deque[tuple[int, int]] = deque()
    for z in range(h):
        for x in range(w):
            if (x, z) not in space:
                dist[(x, z)] = 0
                queue.append((x, z))
    while queue:
        cx, cz = queue.popleft()
        for dx, dz in STEPS:
            nxt = (cx + dx, cz + dz)
            if 0 <= nxt[0] < w and 0 <= nxt[1] < h and nxt not in dist:
                dist[nxt] = dist[(cx, cz)] + 1
                queue.append(nxt)
    return dist


def _prop_boxes(props) -> list[tuple[str, float, float, float, float]]:
    boxes = []
    for p in props:
        spec = PROP_SPECS.get(p.type)
        if spec is None:
            continue
        along, out = spec.footprint
        half_w, half_d = along * SUB_CELL / 2, out * SUB_CELL / 2
        # Footprints are declared along/out of the wall; a prop turned to face
        # east or west has those axes swapped in world space.
        if abs(math.sin(p.yaw)) > 0.7:
            half_w, half_d = half_d, half_w
        boxes.append((p.type, p.x - half_w, p.x + half_w,
                      p.z - half_d, p.z + half_d))
    return boxes


def _overlaps(props) -> Counter:
    boxes = _prop_boxes(props)
    buckets: dict[tuple[int, int], list[int]] = defaultdict(list)
    for i, b in enumerate(boxes):
        buckets[(int(b[1] // CELL_SIZE), int(b[3] // CELL_SIZE))].append(i)

    found: Counter = Counter()
    checked: set[tuple[int, int]] = set()
    for (bx, bz), _ in buckets.items():
        near: list[int] = []
        for dx in (-1, 0, 1):
            for dz in (-1, 0, 1):
                near += buckets.get((bx + dx, bz + dz), [])
        for i, j in itertools.combinations(sorted(set(near)), 2):
            if (i, j) in checked:
                continue
            checked.add((i, j))
            a, b = boxes[i], boxes[j]
            if _stacking_pair(a[0], b[0]) or _layer(a[0]) != _layer(b[0]):
                continue
            if (min(a[2], b[2]) - max(a[1], b[1]) > 0.05
                    and min(a[4], b[4]) - max(a[3], b[3]) > 0.05):
                found[tuple(sorted((a[0], b[0])))] += 1
    return found


def analyse(seed: int, size: int, style: str) -> dict:
    world, layout = generate(
        seed=seed, width=size, height=size, objective_count=6, style=style,
    )
    cells = world.grid.cells
    space = _walkable(cells, size, size)
    spawn = _cell(world.spawn.x, world.spawn.z)
    dist = _bfs(spawn, space)

    room_cells = set()
    for room in layout.rooms:
        for y in range(room.rect.y, room.rect.y + room.rect.h):
            for x in range(room.rect.x, room.rect.x + room.rect.w):
                room_cells.add((x, y))
    corridor = [c for c in space if c not in room_cells]
    wall_dist = _wall_distance(space, size, size)

    # Reachability of the things a round depends on.
    unreachable_spots = 0
    spot_distances: list[int] = []
    for obj in world.objectives:
        for spot in obj.spots:
            cell = _cell(spot.x, spot.z)
            near = [cell] + [(cell[0] + dx, cell[1] + dz) for dx, dz in STEPS]
            reach = [dist[n] for n in near if n in dist]
            if reach:
                spot_distances.append(min(reach))
            else:
                unreachable_spots += 1

    degree = {c: sum(1 for dx, dz in STEPS if (c[0] + dx, c[1] + dz) in space)
              for c in space}
    edges = sum(degree.values()) // 2

    return {
        "seed": seed,
        "orphans": len(space) - len(dist),
        "unreachable_spots": unreachable_spots,
        "walkable": len(space),
        "fill": len(space) / (size * size),
        "cycles": edges - len(space) + 1,
        "cul_de_sac": sum(1 for v in degree.values() if v == 1),
        "corridor_width": Counter(wall_dist[c] for c in corridor),
        "corridor_cells": len(corridor),
        "rooms": len(layout.rooms),
        "archetypes": Counter(r.archetype for r in layout.rooms),
        "props": len(world.props),
        "lights": len(world.lights),
        "overlaps": _overlaps(world.props),
        "objectives": len(world.objectives),
        "spot_dist_mean": statistics.mean(spot_distances) if spot_distances else 0,
        "spot_dist_max": max(spot_distances) if spot_distances else 0,
        "eccentricity": max(dist.values()) if dist else 0,
    }


def report(style: str, sizes: list[int], seeds: int, verbose: bool) -> bool:
    ok = True
    for size in sizes:
        runs = [analyse(s, size, style) for s in range(seeds)]
        widths: Counter = Counter()
        archetypes: Counter = Counter()
        overlaps: Counter = Counter()
        for r in runs:
            widths += r["corridor_width"]
            archetypes += r["archetypes"]
            overlaps += r["overlaps"]
        corridor_total = sum(widths.values()) or 1

        def mean(key: str) -> float:
            return statistics.mean(r[key] for r in runs)

        print(f"\n=== {style} @ {size}x{size} over {seeds} seeds ===")
        print(f"  walkable   {mean('walkable'):7.0f} cells "
              f"({mean('fill'):.1%} of grid)")
        print(f"  rooms      {mean('rooms'):7.1f}   "
              f"props {mean('props'):.0f}   lights {mean('lights'):.0f}")
        print(f"  shape      {mean('cycles'):7.0f} independent cycles, "
              f"{mean('cul_de_sac'):.1f} cul-de-sac cells")
        print(f"  distances  spawn eccentricity {mean('eccentricity'):.0f}, "
              f"objective spot mean {mean('spot_dist_mean'):.0f} "
              f"max {mean('spot_dist_max'):.0f} cells")
        print("  corridor width (steps to nearest wall):")
        for d in sorted(widths):
            share = widths[d] / corridor_total * 100
            print(f"    {d}: {share:5.1f}% {'#' * int(share / 2)}")

        bad_seeds = [r["seed"] for r in runs if r["orphans"] or r["unreachable_spots"]]
        if bad_seeds:
            ok = False
            print(f"  FAIL disconnected maps on seeds {bad_seeds}")
        else:
            print("  ok   every cell, objective and spawn reachable")

        if overlaps:
            ok = False
            total = sum(overlaps.values())
            print(f"  FAIL {total} overlapping prop pairs "
                  f"(excluding legitimate stacking)")
            for pair, n in overlaps.most_common(8):
                print(f"       {pair[0]} + {pair[1]}: {n}")
        else:
            print("  ok   no prop footprints intersect")

        if verbose:
            print(f"  archetypes {dict(archetypes.most_common())}")
    return ok


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--style", default="tentacle",
                    choices=sorted(_LAYOUT_BUILDERS) + ["all"])
    ap.add_argument("--sizes", default="60",
                    help="comma-separated grid sizes, e.g. 40,60,120")
    ap.add_argument("--seeds", type=int, default=8)
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    sizes = [int(s) for s in args.sizes.split(",")]
    styles = sorted(_LAYOUT_BUILDERS) if args.style == "all" else [args.style]
    ok = all(report(s, sizes, args.seeds, args.verbose) for s in styles)
    print("\nRESULT:", "all checks passed" if ok else "FAILURES (see above)")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
