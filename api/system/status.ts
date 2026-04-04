import type { IncomingMessage, ServerResponse } from 'node:http';
import { env } from '../../lib/config.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        storacha: {
          ok: Boolean(env.VITE_STORACHA_PROOF && env.VITE_STORACHA_SPACE_DID),
          label: 'Storacha',
          detail:
            env.VITE_STORACHA_PROOF && env.VITE_STORACHA_SPACE_DID
              ? `Configured for space ${env.VITE_STORACHA_SPACE_DID}.`
              : 'Missing VITE_STORACHA_PROOF or VITE_STORACHA_SPACE_DID. Local CID fallback is active.',
        },
        impulse: {
          ok: Boolean(
            env.IMPULSE_API_KEY && env.IMPULSE_INFERENCE_BASE_URL && env.IMPULSE_DEPLOYMENT_ID,
          ),
          label: 'Impulse AI',
          detail:
            env.IMPULSE_API_KEY && env.IMPULSE_INFERENCE_BASE_URL && env.IMPULSE_DEPLOYMENT_ID
              ? `Inference configured for deployment ${env.IMPULSE_DEPLOYMENT_ID} at ${env.IMPULSE_INFERENCE_BASE_URL}.`
              : 'Impulse inference not fully configured. Local fallback scoring is active.',
        },
        gemini: {
          ok: Boolean(env.GEMINI_API_KEY),
          label: 'Gemini',
          detail: env.GEMINI_API_KEY
            ? `Configured with model ${env.GEMINI_MODEL}.`
            : 'Missing GEMINI_API_KEY. Local fallback synthesis is active.',
        },
        filecoin: {
          ok: Boolean(env.VITE_STORACHA_PROOF && env.VITE_STORACHA_SPACE_DID),
          label: 'Filecoin archive',
          detail:
            env.VITE_STORACHA_PROOF && env.VITE_STORACHA_SPACE_DID
              ? 'Archive artifacts are published through the Storacha-to-Filecoin path when the delegation includes Filecoin offer capability.'
              : 'Missing Storacha delegation. Session archives fall back to local IPFS-style CIDs until Storacha is configured.',
        },
      }),
    );
  } catch (error) {
    console.error('System status API failed.', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'System status API failed.',
      }),
    );
  }
}
