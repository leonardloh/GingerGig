SHELL := /bin/bash
.PHONY: dev migrate migrate-new seed test lint format typecheck

dev:
	uv run uvicorn app.main:app --reload --port 8000

migrate:
	uv run alembic upgrade head

migrate-new:
	@if [ -z "$(MSG)" ]; then echo "Usage: make migrate-new MSG=\"add foo column\""; exit 1; fi
	uv run alembic revision --autogenerate -m "$(MSG)"

seed:
	ALLOW_SEED=1 uv run python -m scripts.seed

test:
	uv run pytest -q

lint:
	uv run ruff check .

format:
	uv run ruff format .

typecheck:
	uv run mypy app
