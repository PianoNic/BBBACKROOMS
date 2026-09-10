from __future__ import annotations

from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
_SELF = Path(__file__).resolve()

_SCAN_DIRS = ("server/app", "docs")
_SCAN_FILES = ("compose.yml", ".env.example")

LEGACY_COMPAT_LITERALS = ("body_bbb", "BBB_PORT")


_SKIPPED_DIR_NAMES = ("__pycache__",)
_SKIPPED_SUFFIXES = (".pyc", ".pyo")


def _iter_scanned_files():
    for rel_dir in _SCAN_DIRS:
        base = _REPO_ROOT / rel_dir
        if not base.is_dir():
            continue
        for path in base.rglob("*"):
            if not path.is_file():
                continue
            if any(part in _SKIPPED_DIR_NAMES for part in path.relative_to(base).parts):
                continue
            if path.suffix in _SKIPPED_SUFFIXES:
                continue
            yield path
    for rel_file in _SCAN_FILES:
        path = _REPO_ROOT / rel_file
        if path.is_file():
            yield path


def _sanitized_text(path: Path) -> str | None:
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return None
    for literal in LEGACY_COMPAT_LITERALS:
        text = text.replace(literal, "")
    return text


def test_no_legacy_bbb_identifiers_remain():
    offenses: list[str] = []

    for path in _iter_scanned_files():
        if path == _SELF:
            continue
        text = _sanitized_text(path)
        if text is None:
            continue
        for line_no, line in enumerate(text.splitlines(), start=1):
            if "bbb" in line.lower():
                offenses.append(f"{path.relative_to(_REPO_ROOT)}:{line_no}")

    assert not offenses, "legacy 'bbb' identifier found:\n" + "\n".join(offenses)
