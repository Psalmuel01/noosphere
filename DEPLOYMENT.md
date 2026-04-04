# Noosphere Deployment

Noosphere now targets a Vercel-friendly architecture:

- Vite frontend
- Vercel serverless API routes under `/api`
- hosted Postgres via `DATABASE_URL` or `POSTGRES_URL`

## Recommended production setup

1. Frontend + API on Vercel
2. Database on Supabase Postgres
3. Provider secrets stored in the Vercel project environment settings

## Required environment variables

### Always required

```bash
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

For Vercel, use Supabase's transaction pooler connection string. For local development with a long-running backend, use Supabase's direct connection string.

### World ID live

```bash
RP_SIGNING_KEY=sk_...
VITE_WORLD_ID_RP_ID=rp_...
VITE_WORLD_ID_APP_ID=app_...
VITE_WORLD_ID_ACTION=noosphere-submit-reasoning
VITE_WORLD_ID_ENVIRONMENT=production
WORLD_ID_VERIFY_BASE_URL=https://developer.world.org
```

### Gemini aggregation

```bash
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

### Impulse live scoring

```bash
IMPULSE_API_BASE_URL=https://api.impulselabs.ai
IMPULSE_INFERENCE_BASE_URL=https://inference.impulselabs.ai
IMPULSE_API_KEY=...
IMPULSE_DEPLOYMENT_ID=...
```

### Storacha hot storage

```bash
VITE_STORACHA_PROOF=...
VITE_STORACHA_SPACE_DID=...
```

## Vercel setup

1. Push the repo to GitHub.
2. Import the project into Vercel.
3. Set the framework preset to `Vite` if Vercel does not detect it automatically.
4. Set the build command to:

```bash
npm run build
```

5. Set the output directory to:

```bash
dist
```

6. Add the environment variables above in the Vercel dashboard.
7. Deploy.

The repo already includes [vercel.json](/Users/sam/Desktop/Projects/NooSphere/vercel.json) to preserve the SPA routes and the `/healthz` endpoint.

## Local development

You still run frontend and backend separately:

```bash
npm run server:start
npm run client:dev
```

The backend listens on `http://localhost:8787` and the frontend runs on `http://localhost:3000`.

## Health checks

After deployment, confirm:

```bash
GET /healthz
GET /api/system/status
```

Then test the full flow:

1. Create a question
2. Verify with demo or World ID
3. Submit reasoning
4. Aggregate a synthesis

## Notes

- SQLite is no longer the production path.
- The old Render + persistent-disk instructions are obsolete for this deployment target.
- If Gemini, Impulse, Storacha, or World ID envs are missing, Noosphere still falls back gracefully where supported.
