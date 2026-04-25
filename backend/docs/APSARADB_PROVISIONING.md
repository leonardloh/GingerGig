# ApsaraDB PostgreSQL Provisioning Runbook (Phase 1, D-11/D-23)

> **Status:** Manual one-time setup for the shared Phase 1 database.
> **Region:** `ap-southeast-3` (Kuala Lumpur) per `MULTI-CLOUD-ARCHITECTURE.md`.
> **Current decision:** Phase 1 uses the main `DATABASE_URL` database only. A separate `TEST_DATABASE_URL` / `gingergig_test` database is not required for this milestone.

## Why This Is In Phase 1

The backend has no local Postgres (D-10). Developer commands such as `make migrate`,
`make seed`, `make test`, and `make dev` talk to ApsaraDB directly, so the
instance must exist before any DB-backed backend work can be verified.

## What You Need

| Resource | Purpose |
|----------|---------|
| ApsaraDB PostgreSQL instance | Primary data store in `ap-southeast-3` |
| Database `gingergig` | Shared dev and judging-demo data for Phase 1 |
| Database account | Login credential used by the backend |
| IP allowlist entry | Allows the developer machine to reach the DB |
| `backend/.env` | Local ignored file containing real connection values |

## Provisioning Steps

### 1. Pick The Right Region

Open <https://rdsnext.console.aliyun.com> and choose **Asia Pacific SE 3
(Kuala Lumpur)** (`ap-southeast-3`) in the region picker. If the console lands
on Singapore (`ap-southeast-1`), switch before creating anything.

### 2. Create The Instance

Create a PostgreSQL instance:

- Engine: PostgreSQL 14 or higher.
- Edition: Basic or the smallest dev-friendly equivalent.
- Storage: the smallest SSD or ESSD PL1 option is fine for Phase 1.
- VPC/zone: any reachable network in `ap-southeast-3`.
- Public endpoint: enabled for laptop development.

Wait until the instance status is `Running`.

### 3. Add The Developer IP To The Allowlist

In the ApsaraDB console, open the instance, then **Whitelist Settings** or
**Data Security > Whitelist**. Add the developer machine's public egress IP.

To find the current egress IP:

```bash
curl ifconfig.me
```

Avoid `0.0.0.0/0`; that exposes the database to the public Internet.

### 4. Configure SSL Mode For This Instance

The current ApsaraDB endpoint rejected SSL negotiation during live verification.
For this instance, use:

```text
DATABASE_SSL_MODE=disable
```

If SSL is enabled server-side later, switch this value to:

```text
DATABASE_SSL_MODE=require
```

The backend and Alembic both respect `DATABASE_SSL_MODE`, so the same setting
applies to migrations, tests, seeding, and runtime connections.

### 5. Create The Database Account

Create an account such as `gingergig_dev` and save the password in a password
manager. The account needs normal read/write access to `gingergig`, plus schema
creation privileges so Alembic can create and migrate tables.

If using a standard account, make sure the target DB grants at least:

```sql
GRANT CONNECT ON DATABASE gingergig TO gingergig_dev;
GRANT USAGE, CREATE ON SCHEMA public TO gingergig_dev;
```

### 6. Create The Database

Create a single database:

```text
gingergig
```

Use UTF-8 encoding and assign the backend account as owner or grant it the
permissions listed above. A separate `gingergig_test` database is intentionally
not required for Phase 1.

### 7. Fill `backend/.env`

Use the public ApsaraDB hostname from **Connection Info**. It usually looks like:

```text
pgm-xxxxxxxxxxxx.pg.rds.aliyuncs.com
```

`backend/.env` should contain:

```text
DATABASE_URL=postgresql+asyncpg://gingergig_dev:<PASSWORD>@<HOST>:5432/gingergig
DATABASE_SSL_MODE=disable
JWT_SECRET=<generated secret>
CORS_ORIGINS_CSV=http://localhost:5173
AWS_REGION=ap-southeast-1
OSS_REGION=ap-southeast-3
```

Generate `JWT_SECRET` locally:

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

Do not commit `backend/.env`.

## Smoke Test

Run this from the repository root. It reads `backend/.env` without printing
secrets, normalizes a SQLAlchemy `postgresql+asyncpg://` DSN to the
`postgresql://` form expected by direct `asyncpg.connect`, respects
`DATABASE_SSL_MODE`, and verifies `SELECT 1` against `DATABASE_URL` only.

```bash
cd backend && uv run python - <<'PY'
import asyncio
from pathlib import Path

import asyncpg


def read_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def asyncpg_dsn(url: str) -> str:
    if url.startswith("postgresql+asyncpg://"):
        return "postgresql://" + url.removeprefix("postgresql+asyncpg://")
    return url


def ssl_arg(mode: str):
    normalized = mode.lower().strip()
    if normalized == "disable":
        return False
    if normalized == "require":
        return "require"
    raise ValueError(f"Unsupported DATABASE_SSL_MODE: {mode!r}")


async def main() -> None:
    env = read_env(Path(".env"))
    database_url = env["DATABASE_URL"]
    database_ssl_mode = env.get("DATABASE_SSL_MODE", "disable")
    conn = await asyncpg.connect(
        asyncpg_dsn(database_url),
        ssl=ssl_arg(database_ssl_mode),
    )
    try:
        value = await conn.fetchval("SELECT 1")
    finally:
        await conn.close()
    assert value == 1, f"expected SELECT 1 -> 1, got {value!r}"
    print(f"OK: DATABASE_URL reachable; SELECT 1 returned {value}; ssl_mode={database_ssl_mode}")


asyncio.run(main())
PY
```

Confirm `.env` is ignored and not tracked:

```bash
git ls-files --error-unmatch backend/.env >/dev/null 2>&1 \
  && echo "FAIL: backend/.env is tracked" \
  || echo "OK: backend/.env is not tracked"
```

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Connection times out | Developer IP is not in the ApsaraDB allowlist | Re-check `curl ifconfig.me`, add that IP/CIDR to the whitelist, and wait a minute for propagation |
| `permission denied for schema public` | Account lacks schema creation privileges | Grant `USAGE, CREATE ON SCHEMA public` or make the account the DB owner |
| `No module named psycopg2` or SQLAlchemy tries a sync driver | DSN uses `postgresql://` in app settings | Use `postgresql+asyncpg://` in `DATABASE_URL`; only the smoke test normalizes it for direct `asyncpg.connect` |
| SSL negotiation rejected | Server-side SSL is disabled or unsupported on this instance | Set `DATABASE_SSL_MODE=disable` for the current instance |
| SSL required later | Server-side SSL has been enabled | Set `DATABASE_SSL_MODE=require` and re-run the smoke test |
| Authentication error | Wrong password or account missing access to `gingergig` | Reset the account password or re-grant DB privileges |
| Hostname resolution fails | Wrong endpoint copied | Copy the public endpoint from ApsaraDB **Connection Info** |

## Phase 8 Note

Phase 8 must add the deployed Alibaba ECS instance's egress IP to the same
ApsaraDB allowlist. The database instance is already in `ap-southeast-3`; deploy
work should reuse it rather than provision a second Postgres system.

## What This Runbook Does Not Cover

- Tair / Redis provisioning, which belongs to Phase 6.
- Alibaba OSS provider-photo storage, which belongs to later backend phases.
- AWS S3, Textract, Rekognition, and Transcribe resources, which belong to KYC,
  voice, and deployment phases.
- Production database hardening such as read replicas, verified CA bundles,
  backups, and account separation; Phase 8 owns that pass.
