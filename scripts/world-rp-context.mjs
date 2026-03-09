import { signRequest } from '@worldcoin/idkit/signing';

const action = process.argv[2] ?? process.env.WORLD_ACTION ?? 'noosphere-submit-reasoning';
const rpId = process.env.RP_ID;
const signingKey = process.env.RP_SIGNING_KEY;

if (!rpId) {
  console.error('Missing RP_ID.');
  console.error('Usage: RP_ID=rp_xxx RP_SIGNING_KEY=sk_xxx npm run world:rp-context -- <action>');
  process.exit(1);
}

if (!signingKey) {
  console.error('Missing RP_SIGNING_KEY.');
  console.error('Usage: RP_ID=rp_xxx RP_SIGNING_KEY=sk_xxx npm run world:rp-context -- <action>');
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
