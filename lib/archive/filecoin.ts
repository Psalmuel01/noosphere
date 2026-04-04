import { env } from '../config.js';
import { ProviderStatus } from '../models.js';
import { uploadArchiveArtifact } from '../storage/storacha.js';

export function getFilecoinStatus(): ProviderStatus {
  if (!env.VITE_STORACHA_PROOF || !env.VITE_STORACHA_SPACE_DID) {
    return {
      ok: false,
      label: 'Filecoin archive',
      detail:
        'Missing Storacha delegation. Session archives fall back to local IPFS-style CIDs until Storacha is configured.',
    };
  }

  return {
    ok: true,
    label: 'Filecoin archive',
    detail:
      'Archive artifacts are published through the Storacha-to-Filecoin path when the delegation includes Filecoin offer capability.',
  };
}

export async function archiveSessionToFilecoin(payload: unknown, questionId: string) {
  return uploadArchiveArtifact(payload, questionId);
}
