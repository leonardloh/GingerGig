"""Recommended: assert required dependency pins and forbidden deps stay guarded."""

import pathlib
import re

BACKEND = pathlib.Path(__file__).parent.parent
PYPROJECT = BACKEND / "pyproject.toml"
LOCKFILE = BACKEND / "uv.lock"

REQUIRED_PINS = [
    ("amazon-transcribe", r"amazon-transcribe>=0\.6\.[4-9]"),
    ("bcrypt", r"bcrypt>=4\.2\.0,<5\.0\.0"),
    ("pyjwt[crypto]", r"pyjwt\[crypto\]>=2\."),
    ("alibabacloud-oss-v2", r"alibabacloud-oss-v2>=1\."),
    ("redis", r"redis>=7\.[4-9]"),
    ("fastapi", r"fastapi>=0\.13[6-9]"),
    ("sqlalchemy[asyncio]", r"sqlalchemy\[asyncio\]>=2\."),
    ("asyncpg", r"asyncpg>=0\."),
    ("alembic", r"alembic>=1\."),
    ("pydantic-settings", r"pydantic-settings>=2\."),
]

FORBIDDEN_DEPENDENCIES = ["passlib", "python-jose", "aioredis", "oss2", "psycopg2"]


def test_pyproject_pins_required_versions() -> None:
    text = PYPROJECT.read_text()
    for name, pattern in REQUIRED_PINS:
        assert re.search(pattern, text), f"{name} pin missing or wrong; expected /{pattern}/"


def test_forbidden_dependencies_absent_from_project_and_lockfile() -> None:
    text = PYPROJECT.read_text() + "\n" + LOCKFILE.read_text()
    for name in FORBIDDEN_DEPENDENCIES:
        assert re.search(rf"(?im)^name = \"{re.escape(name)}\"$", text) is None
        assert re.search(rf"(?im)[\"']{re.escape(name)}[<>=~! ]", text) is None
