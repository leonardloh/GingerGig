"""Recommended: enforce source-level compliance with forbidden-library rules."""

import pathlib
import re

BACKEND = pathlib.Path(__file__).parent.parent
FORBIDDEN_IMPORT_PATTERNS = [
    r"^\s*(?:import|from)\s+passlib\b",
    r"^\s*(?:import|from)\s+jose\b",
    r"^\s*(?:import|from)\s+aioredis\b",
    r"^\s*(?:import|from)\s+oss2\b",
    r"^\s*(?:import|from)\s+psycopg2\b",
]


def test_no_forbidden_imports_or_boto3_streaming_misuse() -> None:
    offenders: list[str] = []
    for root in (BACKEND / "app", BACKEND / "scripts"):
        for py_file in root.rglob("*.py"):
            src = py_file.read_text()
            for pattern in FORBIDDEN_IMPORT_PATTERNS:
                if re.search(pattern, src, re.MULTILINE):
                    offenders.append(f"{py_file}: matches /{pattern}/")

            if "boto3" in src and "start_stream_transcription" in src:
                offenders.append(
                    f"{py_file}: boto3 cannot be used for Transcribe Streaming"
                )

    assert not offenders, "Forbidden imports or SDK misuse found:\n" + "\n".join(
        offenders
    )
