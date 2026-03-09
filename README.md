# Noosphere

Noosphere is a client-side swarm-intelligence reasoning engine built with React and Vite. It lets users:

- create deliberation questions with deadlines
- verify contributors per question
- submit structured reasoning chains with premises, conclusion, and confidence
- watch reasoning clusters form in a live graph
- generate a quality-weighted synthesis with IPFS-compatible provenance

## Stack

- React 19 + Vite
- Tailwind CSS v4
- React Flow for the reasoning graph
- World ID React SDK for optional verification
- `multiformats` for IPFS-compatible CID generation
- `localStorage` for local persistence

## Run locally

1. Install dependencies:
   `npm install`
2. Start the dev server:
   `npm run dev`
3. Build for production:
   `npm run build`

## Environment

World ID is optional. The app works in demo verification mode without any env vars.

If you want to enable the client-side World ID widget, set:

```bash
VITE_WORLD_ID_APP_ID=app_example
VITE_WORLD_ID_ACTION=noosphere-submit-reasoning
VITE_WORLD_ID_RP_CONTEXT_JSON={"rp_id":"rp_example","nonce":"nonce","created_at":0,"expires_at":0,"signature":"signature"}
```

Note: official World ID verification still requires a signed RP context. This app keeps a demo verification fallback so the product remains fully usable as a normal React app.
