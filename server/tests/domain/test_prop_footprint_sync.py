from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.domain.world.prop_specs import PROP_SPECS, SUB_CELL

_TOLERANCE = 1.1


def _load_footprints() -> dict:
    repo_root = Path(__file__).resolve().parents[3]
    footprints_path = repo_root / "client" / "public" / "models" / "footprints.json"
    if not footprints_path.exists():
        pytest.skip(
            f"{footprints_path} is missing — run tools/fetch_models.py to "
            "generate it before running this test."
        )
    return json.loads(footprints_path.read_text(encoding="utf-8"))["props"]


FOOTPRINTS = _load_footprints()


def test_every_model_prop_type_is_registered():
    unregistered = [prop for prop in FOOTPRINTS if prop not in PROP_SPECS]
    assert not unregistered, (
        f"models exist for prop types with no PROP_SPECS entry: {unregistered}"
    )


@pytest.mark.parametrize("prop_type", sorted(FOOTPRINTS))
def test_footprint_contains_the_model(prop_type):
    spec = PROP_SPECS[prop_type]
    model = FOOTPRINTS[prop_type]
    for axis, model_extent, spec_cells in (
        ("along", model["along"], spec.footprint[0]),
        ("out", model["out"], spec.footprint[1]),
    ):
        reserved = spec_cells * SUB_CELL
        assert reserved >= model_extent * 0.9, (
            f"{prop_type}: {axis} reservation of {spec_cells} sub-cells "
            f"({reserved:.3f}m) is smaller than the model's {model_extent:.3f}m "
            f"{axis} extent"
        )


@pytest.mark.parametrize("prop_type", sorted(FOOTPRINTS))
def test_footprint_is_not_oversized(prop_type):
    spec = PROP_SPECS[prop_type]
    model = FOOTPRINTS[prop_type]
    for axis, model_extent, spec_cells in (
        ("along", model["along"], spec.footprint[0]),
        ("out", model["out"], spec.footprint[1]),
    ):
        one_smaller = (spec_cells - 1) * SUB_CELL
        assert one_smaller < model_extent * _TOLERANCE, (
            f"{prop_type}: {axis} reservation of {spec_cells} sub-cells is "
            f"oversized for the model's {model_extent:.3f}m {axis} extent — "
            f"{spec_cells - 1} sub-cells ({one_smaller:.3f}m) would already fit it"
        )
