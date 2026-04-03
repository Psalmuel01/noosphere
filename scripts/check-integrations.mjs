import { getEnv } from './lib/env.mjs';
import { signRequest } from '@worldcoin/idkit/signing';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const uploadScriptPath = path.resolve(process.cwd(), 'scripts/storacha-upload.mjs');

function summarizeStorachaError(error) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('failed space/blob/add invocation')) {
    return 'The current delegation does not authorize space/blob/add for this agent DID.';
  }

  return message;
}

async function checkWorldId() {
  const appId = getEnv('VITE_WORLD_ID_APP_ID');
  const action = getEnv('VITE_WORLD_ID_ACTION') ?? 'noosphere-submit-reasoning';
  const rpId = getEnv('VITE_WORLD_ID_RP_ID');
  const signingKey = getEnv('RP_SIGNING_KEY') ?? getEnv('RP_SIGNING_KEY');

  if (!appId || !rpId || !signingKey) {
    return {
      ok: false,
      label: 'World ID',
      detail: 'Missing VITE_WORLD_ID_APP_ID, VITE_WORLD_ID_RP_ID, or RP_SIGNING_KEY.',
    };
  }

  try {
    const { expiresAt } = signRequest(action, signingKey);
    return {
      ok: true,
      label: 'World ID',
      detail: `RP context signing configured. Example expires at ${new Date(expiresAt * 1000).toISOString()}`,
    };
  } catch (error) {
    return {
      ok: false,
      label: 'World ID',
      detail: error instanceof Error ? error.message : 'Failed to generate rp_context.',
    };
  }
}

async function checkDatabase() {
  const connectionString = getEnv('DATABASE_URL') || getEnv('POSTGRES_URL');

  if (!connectionString) {
    return {
      ok: false,
      label: 'Database',
      detail: 'Missing DATABASE_URL or POSTGRES_URL.',
    };
  }

  return {
    ok: true,
    label: 'Database',
    detail: 'Postgres connection string is configured.',
  };
}

async function checkStoracha() {
  const proof = getEnv('VITE_STORACHA_PROOF');
  const spaceDid = getEnv('VITE_STORACHA_SPACE_DID');

  if (!proof || !spaceDid) {
    return {
      ok: false,
      label: 'Storacha',
      detail: 'Missing VITE_STORACHA_PROOF or VITE_STORACHA_SPACE_DID.',
    };
  }

  try {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'noosphere-storacha-check-'));
    try {
      const payloadPath = path.join(tempDir, 'noosphere-check.json');
      await fs.writeFile(
        payloadPath,
        JSON.stringify({ check: 'storacha', at: new Date().toISOString() }, null, 2),
        'utf8',
      );
      const { stdout } = await execFile(process.execPath, [uploadScriptPath, payloadPath], {
        env: {
          ...process.env,
          STORACHA_PROOF: proof,
          STORACHA_SPACE_DID: spaceDid,
          STORACHA_FILE_NAME: 'noosphere-check.json',
        },
      });
      const { cid } = JSON.parse(stdout);

      return {
        ok: true,
        label: 'Storacha',
        detail: `Upload succeeded with CID ${cid}`,
      };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    return {
      ok: false,
      label: 'Storacha',
      detail: summarizeStorachaError(error),
    };
  }
}

async function checkGemini() {
  const apiKey = getEnv('GEMINI_API_KEY');
  const model = getEnv('GEMINI_MODEL') || 'gemini-2.5-flash';

  if (!apiKey) {
    return {
      ok: false,
      label: 'Gemini',
      detail: 'Missing GEMINI_API_KEY. Local synthesis fallback is active.',
    };
  }

  return {
    ok: true,
    label: 'Gemini',
    detail: `Configured with model ${model}.`,
  };
}

async function checkImpulse() {
  const baseUrl = getEnv('IMPULSE_INFERENCE_BASE_URL');
  const apiKey = getEnv('IMPULSE_API_KEY');
  const deploymentId = getEnv('IMPULSE_DEPLOYMENT_ID');
  const trainingBaseUrl = getEnv('IMPULSE_API_BASE_URL');

  if (!apiKey) {
    return {
      ok: false,
      label: 'Impulse AI',
      detail: 'Missing IMPULSE_API_KEY. Local scoring fallback is active.',
    };
  }

  if (!baseUrl || !deploymentId) {
    const detailParts = [
      'Missing IMPULSE_INFERENCE_BASE_URL or IMPULSE_DEPLOYMENT_ID. Local scoring fallback is active.',
    ];
    if (trainingBaseUrl) {
      detailParts.push(`Training base URL set (${trainingBaseUrl}).`);
    }
    return {
      ok: false,
      label: 'Impulse AI',
      detail: detailParts.join(' '),
    };
  }

  return {
    ok: true,
    label: 'Impulse AI',
    detail: `Inference configuration present for deployment ${deploymentId} at ${baseUrl}.`,
  };
}

const results = await Promise.all([
  checkDatabase(),
  checkWorldId(),
  checkStoracha(),
  checkGemini(),
  checkImpulse(),
]);

for (const result of results) {
  console.log(`${result.ok ? 'OK' : 'FAIL'} ${result.label}: ${result.detail}`);
}

if (results.some((result) => !result.ok)) {
  process.exit(1);
}
