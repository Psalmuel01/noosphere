# Noosphere

Noosphere is a client-side swarm-intelligence reasoning engine built with React and Vite. It lets users:

- create deliberation questions with deadlines
- verify contributors per question
- submit structured reasoning chains with premises, conclusion, and confidence
- watch reasoning clusters form in a live graph
- push active submissions through Storacha hot storage when configured
- generate a quality-weighted synthesis with content-addressed provenance

## Stack

- React 19 + Vite
- Tailwind CSS v4
- React Flow for the reasoning graph
- World ID React SDK for optional verification
- Storacha client for hot storage uploads
- `multiformats` for deterministic local CID fallback
- `localStorage` for local persistence

## Run locally

1. Install dependencies:
   `npm install`
2. Start the dev server:
   `npm run dev`
3. Build for production:
   `npm run build`

## Environment

The app is fully usable without env vars:

- World ID falls back to demo verification
- Storacha falls back to deterministic local CIDs in browser storage

If you want live Storacha uploads, provide a delegated proof and space DID:

```bash
VITE_STORACHA_PROOF=
VITE_STORACHA_SPACE_DID=
```

If you want to enable the client-side World ID widget, also set:

```bash
VITE_WORLD_ID_APP_ID=app_example
VITE_WORLD_ID_ACTION=noosphere-submit-reasoning
VITE_WORLD_ID_RP_CONTEXT_JSON={"rp_id":"rp_example","nonce":"nonce","created_at":0,"expires_at":0,"signature":"signature"}
```

Notes:

- Storacha uses the delegated proof flow rather than an embedded server.
- Official World ID verification still requires a signed RP context.
- The fallback path is intentional so the app remains a normal React app with no backend requirement.

## Generate World RP Context

For local testing, you can generate a fresh `rp_context` JSON blob with:

```bash
RP_ID=rp_xxx RP_SIGNING_KEY=sk_xxx npm run world:rp-context -- noosphere-submit-reasoning
```

This prints the JSON object expected by `VITE_WORLD_ID_RP_CONTEXT_JSON`.

To refresh `.env.local` in place with a new signed context:

```bash
RP_ID=rp_xxx RP_SIGNING_KEY=sk_xxx npm run world:refresh-env -- noosphere-submit-reasoning
```

Restart Vite after refreshing so the new `VITE_` value is loaded.
