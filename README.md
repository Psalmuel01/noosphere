# Noosphere

Noosphere is a collective reasoning platform with a React frontend and an Express + SQLite backend. It lets users:

- create deliberation questions with deadlines
- verify contributors per question
- submit structured reasoning chains with premises, conclusion, and confidence
- watch reasoning clusters form in a live graph
- push active submissions through Storacha hot storage when configured
- score persuasion with Impulse AI
- synthesize consensus with Gemini
- archive completed sessions through the Storacha/Filecoin path

## Stack

- React 19 + Vite
- Express 5 + SQLite (`better-sqlite3`)
- Tailwind CSS v4
- React Flow for the reasoning graph
- World ID React SDK for optional verification
- Storacha client for hot storage uploads and archive publication
- Gemini API for synthesis
- Impulse AI prediction API for persuasion scoring (requires inference deployment)
- `multiformats` for deterministic local CID fallback
- `localStorage` for local verification state only

## Run locally

1. Install dependencies:
   `npm install`
2. Start the frontend and backend together:
   `npm run dev`
3. Build for production:
   `npm run build`

## Environment

The app is still usable without provider keys:

- World ID falls back to demo verification
- Storacha falls back to deterministic local CIDs
- Impulse AI falls back to local scoring heuristics until inference is configured
- Gemini falls back to local synthesis heuristics

Backend and AI envs:

```bash
PORT=8787
NOOSPHERE_ENABLE_DEMO_SEED=false
VITE_RP_SIGNING_KEY=sk_xxx
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
IMPULSE_API_BASE_URL=https://api.impulselabs.ai
IMPULSE_INFERENCE_BASE_URL=https://inference.impulselabs.ai
IMPULSE_API_KEY=
IMPULSE_DEPLOYMENT_ID=

VITE_STORACHA_PROOF=
VITE_STORACHA_SPACE_DID=
VITE_WORLD_ID_RP_ID=rp_xxx
```

If you want to enable the client-side World ID widget, also set:

```bash
VITE_WORLD_ID_APP_ID=app_example
VITE_WORLD_ID_ACTION=noosphere-submit-reasoning
VITE_WORLD_ID_RP_CONTEXT_JSON={"rp_id":"rp_example","nonce":"nonce","created_at":0,"expires_at":0,"signature":"signature"}
```

Notes:

- Public/browser envs use `VITE_*`. Server secrets do not. Do not put Gemini, Impulse, or signing secrets behind `VITE_*`, because that exposes them to the browser.
- Storacha is used for hot storage and archive publication; archival reaches Filecoin through the Storacha/Filecoin pipeline when the delegation supports it.
- The backend owns question, submission, and synthesis persistence in `data/noosphere.db`.
- Official World ID verification still requires a signed RP context.
- The fallback path is intentional so development can continue without every provider key.

## Generate World RP Context

For local testing, you can generate a fresh `rp_context` JSON blob with:

```bash
npm run world:rp-context
```

This prints the JSON object expected by `VITE_WORLD_ID_RP_CONTEXT_JSON`. It reads `VITE_WORLD_ID_RP_ID` and `VITE_RP_SIGNING_KEY` from `.env.local` or your shell.

To refresh `.env.local` in place with a new signed context:

```bash
npm run world:refresh-env
```

Restart Vite after refreshing so the new `VITE_` value is loaded.

To validate both integrations directly:

```bash
npm run check:integrations
```
