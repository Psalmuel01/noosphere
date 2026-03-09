import fs from 'node:fs';
import path from 'node:path';
import { signRequest } from '@worldcoin/idkit/signing';

const action = process.argv[2] ?? process.env.WORLD_ACTION ?? 'noosphere-submit-reasoning';
const rpId = process.env.RP_ID;
const signingKey = process.env.RP_SIGNING_KEY;
const envPath = path.resolve(process.cwd(), '.env.local');

if (!rpId) {
  console.error('Missing RP_ID.');
  console.error('Usage: RP_ID=rp_xxx RP_SIGNING_KEY=sk_xxx npm run world:refresh-env -- <action>');
  process.exit(1);
}

if (!signingKey) {
  console.error('Missing RP_SIGNING_KEY.');
  console.error('Usage: RP_ID=rp_xxx RP_SIGNING_KEY=sk_xxx npm run world:refresh-env -- <action>');
  process.exit(1);
}

const { sig, nonce, createdAt, expiresAt } = signRequest(action, signingKey);
const rpContext = JSON.stringify({
  rp_id: rpId,
  nonce,
  created_at: createdAt,
  expires_at: expiresAt,
  signature: sig,
});

const current = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const lines = current.length > 0 ? current.split('\n') : [];

let replaced = false;
const nextLines = lines.map((line) => {
  if (line.startsWith('VITE_WORLD_ID_RP_CONTEXT_JSON=')) {
    replaced = true;
    return `VITE_WORLD_ID_RP_CONTEXT_JSON=${rpContext}`;
  }

  return line;
});

if (!replaced) {
  nextLines.push(`VITE_WORLD_ID_RP_CONTEXT_JSON=${rpContext}`);
}

fs.writeFileSync(envPath, nextLines.join('\n'));

console.log(`Updated ${envPath} with a fresh VITE_WORLD_ID_RP_CONTEXT_JSON.`);
console.log(`Expires at unix ${expiresAt}.`);
