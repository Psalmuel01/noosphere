import fs from 'node:fs/promises';

const proof = process.env.STORACHA_PROOF?.trim();
const spaceDid = process.env.STORACHA_SPACE_DID?.trim();
const fileName = process.env.STORACHA_FILE_NAME?.trim() || 'noosphere.json';
const payloadPath = process.argv[2];

if (!proof || !spaceDid || !payloadPath) {
  console.error('Usage: STORACHA_PROOF=... STORACHA_SPACE_DID=... node scripts/storacha-upload.mjs <payload-path>');
  process.exit(1);
}

const [{ create }, Proof, payload] = await Promise.all([
  import('@storacha/client'),
  import('@storacha/client/proof'),
  fs.readFile(payloadPath, 'utf8'),
]);

const client = await create();
const delegation = await Proof.parse(proof);

try {
  const added = await client.addSpace(delegation);
  await client.setCurrentSpace(spaceDid || added.did());
} catch {
  await client.addProof(delegation);
  await client.setCurrentSpace(spaceDid);
}

const file = new File([payload], fileName, {
  type: 'application/json',
});
const cid = (await client.uploadFile(file)).toString();

console.log(
  JSON.stringify({
    cid,
    gatewayUrl: `https://storacha.link/ipfs/${cid}`,
  }),
);
