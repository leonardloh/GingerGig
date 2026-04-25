"""Recommended: seed.py refuses ApsaraDB DSNs unless ALLOW_SEED=1."""

import os

import pytest

from scripts.seed import SeedRefusedError, _check_safety


def test_seed_refused_against_apsaradb_without_env() -> None:
    os.environ.pop("ALLOW_SEED", None)
    with pytest.raises(SeedRefusedError):
        _check_safety("postgresql+asyncpg://user:pw@example.rds.aliyuncs.com:5432/gingergig")


def test_seed_allowed_against_localhost_without_env() -> None:
    os.environ.pop("ALLOW_SEED", None)
    _check_safety("postgresql+asyncpg://user:pw@localhost:5432/gingergig")
    _check_safety("postgresql+asyncpg://user:pw@127.0.0.1:5432/gingergig")


def test_seed_allowed_with_explicit_env() -> None:
    os.environ["ALLOW_SEED"] = "1"
    try:
        _check_safety("postgresql+asyncpg://user:pw@example.rds.aliyuncs.com:5432/gingergig")
    finally:
        os.environ.pop("ALLOW_SEED", None)
