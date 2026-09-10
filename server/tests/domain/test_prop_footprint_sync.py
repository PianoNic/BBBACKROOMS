from __future__ import annotations

import json
import struct
from pathlib import Path

import pytest

from app.domain.world.prop_specs import PROP_SPECS, SUB_CELL

_TOLERANCE = 1.1
_CLIENT_ROOT = Path(__file__).resolve().parents[3] / "client"
_MODELS_ROOT = _CLIENT_ROOT / "public" / "models"
_FOOTPRINTS_ROOT = _CLIENT_ROOT / "src" / "world"
_MODELS_BUDGET_BYTES = 25_000_000


def _load_footprints_file() -> dict:
    footprints_path = _FOOTPRINTS_ROOT / "footprints.json"
    if not footprints_path.exists():
        pytest.skip(
            f"{footprints_path} is missing — run tools/fetch_models.py to "
            "generate it before running this test."
        )
    return json.loads(footprints_path.read_text(encoding="utf-8"))


_FOOTPRINTS_FILE = _load_footprints_file()
FOOTPRINTS = _FOOTPRINTS_FILE["props"]
PICKUPS = _FOOTPRINTS_FILE.get("pickups", {})


def _read_glb_json(path: Path) -> dict:
    data = path.read_bytes()
    offset = 12
    while offset < len(data):
        chunk_length, chunk_type = struct.unpack_from("<II", data, offset)
        chunk = data[offset + 8: offset + 8 + chunk_length]
        if chunk_type == 0x4E4F534A:
            return json.loads(chunk.decode("utf-8"))
        offset += 8 + chunk_length + ((4 - chunk_length % 4) % 4)
    raise RuntimeError(f"no JSON chunk found in {path}")


def _triangle_count(path: Path) -> int:
    document = _read_glb_json(path)
    total = 0
    for mesh in document.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            if "indices" in primitive:
                total += document["accessors"][primitive["indices"]]["count"] // 3
    return total


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


@pytest.mark.parametrize("pickup_kind", sorted(PICKUPS))
def test_pickup_model_is_sized_for_handheld_use(pickup_kind):
    entry = PICKUPS[pickup_kind]
    model_path = _MODELS_ROOT / f"{entry['model']}.glb"
    assert model_path.exists(), f"{pickup_kind}: missing model file {model_path}"

    largest_dim = max(entry["along"], entry["out"], entry["height"])
    assert 0.05 <= largest_dim <= 0.6, (
        f"{pickup_kind}: largest dimension {largest_dim:.3f}m is outside the "
        "0.05m-0.6m handheld pickup range"
    )

    triangles = _triangle_count(model_path)
    assert triangles < 3000, (
        f"{pickup_kind}: {triangles} triangles exceeds the 3000 pickup budget"
    )


_ALL_MODEL_PATHS = sorted(_MODELS_ROOT.rglob("*.glb"))


@pytest.mark.parametrize("model_path", _ALL_MODEL_PATHS, ids=lambda p: p.name)
def test_no_material_uses_khr_texture_transform(model_path):
    document = _read_glb_json(model_path)
    for material in document.get("materials", []):
        base_color = material.get("pbrMetallicRoughness", {}).get("baseColorTexture", {})
        assert "KHR_texture_transform" not in base_color.get("extensions", {}), (
            f"{model_path.name}: material {material.get('name', '?')} has a "
            "KHR_texture_transform on baseColorTexture — this renders as a black "
            "silhouette through the StandardMaterial path every model is converted to"
        )


def test_models_directory_is_within_budget():
    total_bytes = sum(p.stat().st_size for p in _MODELS_ROOT.rglob("*") if p.is_file())
    assert total_bytes <= _MODELS_BUDGET_BYTES, (
        f"client/public/models is {total_bytes / 1e6:.2f} MB, over the "
        f"{_MODELS_BUDGET_BYTES / 1e6:.0f} MB budget"
    )
