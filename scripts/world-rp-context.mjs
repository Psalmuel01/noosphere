import { signRequest } from '@worldcoin/idkit/signing';
import { getEnv } from './lib/env.mjs';

const action = process.argv[2] ?? getEnv('VITE_WORLD_ID_ACTION') ?? 'noosphere-submit-reasoning';
const rpId = getEnv('VITE_WORLD_ID_RP_ID');
const signingKey = getEnv('VITE_RP_SIGNING_KEY') ?? getEnv('RP_SIGNING_KEY');

if (!rpId) {
  console.error('Missing VITE_WORLD_ID_RP_ID.');
  console.error(
    'Usage: VITE_WORLD_ID_RP_ID=rp_xxx VITE_RP_SIGNING_KEY=sk_xxx npm run world:rp-context -- <action>',
  );
  console.error('You can also place VITE_WORLD_ID_RP_ID and VITE_RP_SIGNING_KEY in .env.local.');
  process.exit(1);
}

if (!signingKey) {
  console.error('Missing VITE_RP_SIGNING_KEY.');
  console.error(
    'Usage: VITE_WORLD_ID_RP_ID=rp_xxx VITE_RP_SIGNING_KEY=sk_xxx npm run world:rp-context -- <action>',
  );
  console.error('You can also place VITE_WORLD_ID_RP_ID and VITE_RP_SIGNING_KEY in .env.local.');
  process.exit(1);
}

const { sig, nonce, createdAt, expiresAt } = signRequest(action, signingKey);

const rpContext = {
  rp_id: rpId,
  nonce,
  created_at: createdAt,
  expires_at: expiresAt,
  signature: sig,
};

console.log(JSON.stringify(rpContext, null, 2));
