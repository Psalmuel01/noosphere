# Noosphere Deployment Guide

## Deployment model

Noosphere currently deploys best as a single Node/Express service with:

- one persistent disk
- one SQLite database file
- one frontend build served from `dist/`

This is the simplest production shape for the current codebase.

## Recommended hosting

Use a host that supports persistent storage:

- Render with a persistent disk
- Fly.io with a volume
- Railway with a mounted volume
- a VPS

Do not deploy this SQLite setup on serverless functions or multiple autoscaled replicas.

## Render

This repo now includes [render.yaml](/Users/sam/Desktop/Projects/NooSphere/render.yaml) for a single-instance Render web service with:

- Node runtime
- persistent disk mounted at `/var/data`
- `DATABASE_PATH=/var/data/noosphere.db`
- health check at `/healthz`
- production start command via `npm start`

Render setup steps:

1. Push the repo to GitHub.
2. In Render, create a new Blueprint or Web Service from the repo.
3. Let Render read `render.yaml`.
4. Fill in the secret env vars Render marks as unsynced.
5. Deploy.

Required secrets on Render:

- `RP_SIGNING_KEY`
- `GEMINI_API_KEY`
- `IMPULSE_API_KEY`
- `IMPULSE_DEPLOYMENT_ID`
- `VITE_STORACHA_PROOF`
- `VITE_STORACHA_SPACE_DID`
- `VITE_WORLD_ID_RP_ID`
- `VITE_WORLD_ID_APP_ID`

After the first deploy:

1. Visit `/healthz`
2. Open the site
3. Create a question
4. Verify in demo mode or World ID
5. Submit reasoning
6. Run aggregation

## Build and start commands

Build command:

```bash
npm install
npm run build
```

Start command:

```bash
npm start
```

## Required environment variables

Minimum app/runtime configuration:

```bash
PORT=8787
DATABASE_PATH=/var/lib/noosphere/noosphere.db
```

Core provider configuration:

```bash
RP_SIGNING_KEY=sk_xxx
WORLD_ID_VERIFY_BASE_URL=https://developer.world.org

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

IMPULSE_API_BASE_URL=https://api.impulselabs.ai
IMPULSE_INFERENCE_BASE_URL=https://inference.impulselabs.ai
IMPULSE_API_KEY=
IMPULSE_DEPLOYMENT_ID=

VITE_STORACHA_PROOF=
VITE_STORACHA_SPACE_DID=

VITE_WORLD_ID_RP_ID=rp_xxx
VITE_WORLD_ID_APP_ID=app_xxx
VITE_WORLD_ID_ACTION=noosphere-submit-reasoning
VITE_WORLD_ID_ENVIRONMENT=production
```

## Persistent disk layout

Mount your disk and store the database there:

```bash
/var/lib/noosphere/noosphere.db
```

The app will create parent directories automatically if they do not exist.

## Health check

Use this endpoint for uptime checks:

```bash
GET /healthz
```

Expected response:

```json
{
  "ok": true,
  "service": "noosphere",
  "databasePath": "/var/lib/noosphere/noosphere.db"
}
```

## Moving local data into production

If you want your current local dataset in production:

1. Stop the local backend.
2. Copy these files together if they exist:
   - `data/noosphere.db`
   - `data/noosphere.db-wal`
   - `data/noosphere.db-shm`
3. Upload them to the production disk path before starting the app.

If the backend was shut down cleanly, only `noosphere.db` may remain. That is fine.

## Operational notes

- Run only one app instance against the SQLite file.
- Back up the persistent disk regularly.
- Keep all non-`VITE_` secrets on the server only.
- The frontend is served by the backend only when `NODE_ENV=production`.
- The frontend is served by the backend whenever the built `dist/` bundle is present.
- If World ID is unavailable for a user, the app can fall back to Noosphere demo verification.

## Suggested first deploy

1. Provision a host with one persistent disk.
2. Set the environment variables above.
3. Deploy the code.
4. Run the build command.
5. Start the app with `npm start`.
6. Visit `/healthz`.
7. Open the app and test:
   - create a question
   - verify in demo mode
   - submit reasoning
   - run aggregation
