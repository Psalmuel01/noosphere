# Noosphere Plan

## Next Steps
- Verify Impulse inference output shape and lock the response parsing to the exact fields returned.
- Add a CSV/JSON export for Impulse training data from stored submissions (including a `mindChanged` label).
- Add an admin workflow to close questions and auto-trigger aggregation on deadline.
- Implement a lightweight audit log view for provider calls (Impulse/Gemini/Storacha/Filecoin).
- Add a retry queue for failed provider calls (Impulse/Gemini/Storacha).

## Yet to Be Implemented
- Real Impulse training job creation and dataset upload using the Impulse API.
- Filecoin archival via Storacha/Filecoin pipeline with status tracking and retrieval links.
- A retrieval endpoint to fetch stored reasoning by CID (Storacha/IPFS gateway).
- Production World ID verification flow and persistence of proofs for auditability.
- User-level access control for creating questions and triggering aggregation.
