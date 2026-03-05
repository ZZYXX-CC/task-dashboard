# Task Dashboard

Next.js dashboard for task + trading telemetry.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Secure Bybit Credential Bridge

`/trading` now uses a host-side credential bridge (no browser localStorage for API secrets).

### Required host env vars (local Windows host)

```powershell
$env:TRADING_BRIDGE_TOKEN="<strong-random-token>"
$env:BYBIT_CREDENTIALS_MASTER_KEY="<32-byte-base64-or-long-passphrase>"
```

- `TRADING_BRIDGE_TOKEN` authenticates bridge writes/reads.
- `BYBIT_CREDENTIALS_MASTER_KEY` encrypts at-rest credential file in:
  - `%APPDATA%\task-dashboard\bybit-credentials.enc.json`

### Safety behavior

- Bridge storage is **disabled** on Vercel/serverless (`VERCEL`, `NOW_REGION`, lambda env checks).
- Runtime credential read endpoint is localhost-only + token-authenticated.
- UI stores two encrypted profiles: `monitor` (read-only/paper) and `execution` (demo execution).
- UI only shows masked key/secret + last updated timestamp per profile.
- Saving requires explicit confirmation text per profile: `STORE MONITOR KEYS` or `STORE EXECUTION KEYS` (legacy `STORE LIVE KEYS` still accepted).

## Bot runtime credential access (bybit-futures)

`skills/bybit-futures/scripts/config.py` can read runtime credentials from:

- `BYBIT_BRIDGE_URL` (default `http://127.0.0.1:3000/api/secure/bybit-credentials/runtime`)
- `TRADING_BRIDGE_TOKEN`

It binds mode automatically (`paper` => `monitor`, `demo` => `execution`) via `TRADING_OPERATOR_MODE` and falls back to `BYBIT_API_KEY` / `BYBIT_API_SECRET` env vars if explicitly set.

## Deploy

Vercel deployment is fine for dashboard UI, but secure credential bridge endpoints intentionally refuse persistent secret storage on Vercel runtime.
