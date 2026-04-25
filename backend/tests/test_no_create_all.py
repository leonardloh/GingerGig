"""Recommended: Alembic is the only schema-applying mechanism."""

import pathlib
import re

BACKEND = pathlib.Path(__file__).parent.parent


def test_no_metadata_create_all() -> None:
    offenders: list[str] = []
    for subdir in ("app", "scripts", "alembic"):
        root = BACKEND / subdir
        if not root.exists():
            continue
        for py_file in root.rglob("*.py"):
            if re.search(r"\.metadata\.create_all\b", py_file.read_text()):
                offenders.append(str(py_file))
    assert not offenders, f"Base.metadata.create_all found in: {offenders}"
