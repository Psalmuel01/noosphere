import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { createIpfsCid } from '../../src/lib/cid';
import { env } from '../config';
import { ProviderStatus, StorageNetwork } from '../models';

const execFile = promisify(execFileCallback);
const uploadScriptPath = path.resolve(process.cwd(), 'scripts/storacha-upload.mjs');

export interface StorageUpload {
  cid: string;
  gatewayUrl: string | null;
  network: StorageNetwork;
}

async function localFallbackUpload(payload: unknown) {
  const cid = await createIpfsCid(payload);
  return {
    cid,
    gatewayUrl: `ipfs://${cid}`,
    network: 'local-ipfs' as const,
  };
}

function gatewayUrl(cid: string) {
  return `https://storacha.link/ipfs/${cid}`;
}

function formatStorachaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('failed space/blob/add invocation')) {
    return 'Storacha upload failed: the current delegation does not authorize space/blob/add for this agent DID.';
  }

  return `Storacha upload failed: ${message}`;
}

export function getStorachaStatus(): ProviderStatus {
  if (!env.VITE_STORACHA_PROOF || !env.VITE_STORACHA_SPACE_DID) {
    return {
      ok: false,
      label: 'Storacha',
      detail: 'Missing VITE_STORACHA_PROOF or VITE_STORACHA_SPACE_DID. Local CID fallback is active.',
    };
  }

  return {
    ok: true,
    label: 'Storacha',
    detail: `Configured for space ${env.VITE_STORACHA_SPACE_DID}.`,
  };
}

async function uploadJson(fileName: string, payload: unknown, network: StorageNetwork) {
  if (!env.VITE_STORACHA_PROOF || !env.VITE_STORACHA_SPACE_DID) {
    return localFallbackUpload(payload);
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'noosphere-storacha-'));
  const payloadPath = path.join(tempDir, fileName);

  try {
    await fs.writeFile(payloadPath, JSON.stringify(payload, null, 2), 'utf8');
    let stdout = '';

    try {
      const result = await execFile(process.execPath, [uploadScriptPath, payloadPath], {
        env: {
          ...process.env,
          STORACHA_PROOF: env.VITE_STORACHA_PROOF,
          STORACHA_SPACE_DID: env.VITE_STORACHA_SPACE_DID,
          STORACHA_FILE_NAME: fileName,
        },
      });
      stdout = result.stdout;

      if (result.stderr?.trim()) {
        console.warn(result.stderr.trim());
      }
    } catch (error) {
      console.warn(formatStorachaError(error));
      return localFallbackUpload(payload);
    }

    const parsed = JSON.parse(stdout) as { cid: string; gatewayUrl?: string | null };

    const result = {
      cid: parsed.cid,
      gatewayUrl: parsed.gatewayUrl ?? gatewayUrl(parsed.cid),
      network,
    };

    return result;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

export async function uploadReasoningToStoracha(payload: unknown, submissionId: string) {
  return uploadJson(`reasoning-${submissionId}.json`, payload, 'storacha');
}

export async function uploadArchiveArtifact(payload: unknown, questionId: string) {
  return uploadJson(`archive-${questionId}.json`, payload, 'filecoin');
}
