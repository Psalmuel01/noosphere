import { createIpfsCid } from './cid';
import { StorageNetwork } from '../types';
import type { SpaceDID } from '@storacha/client/types';

export interface StorageUploadResult {
  cid: string;
  network: StorageNetwork;
  gatewayUrl: string | null;
}

export interface StorageStatus {
  network: StorageNetwork;
  configured: boolean;
  label: string;
  detail: string;
}

const storachaProof = import.meta.env.VITE_STORACHA_PROOF?.trim();
const storachaSpaceDid = import.meta.env.VITE_STORACHA_SPACE_DID?.trim() as SpaceDID | undefined;

let storachaClientPromise: Promise<import('@storacha/client').Client | null> | null = null;

function readSpaceDid() {
  return storachaSpaceDid;
}

function createGatewayUrl(cid: string, network: StorageNetwork) {
  if (network === 'storacha') {
    return `https://storacha.link/ipfs/${cid}`;
  }

  return `ipfs://${cid}`;
}

async function getStorachaClient() {
  if (!storachaProof) {
    return null;
  }

  if (!storachaClientPromise) {
    storachaClientPromise = (async () => {
      const [{ create }, Proof] = await Promise.all([
        import('@storacha/client'),
        import('@storacha/client/proof'),
      ]);

      const client = await create();
      const delegation = await Proof.parse(storachaProof);

      try {
        const currentSpaceDid = readSpaceDid();
        const existingSpace = storachaSpaceDid
          ? client.spaces().find((space) => space.did() === storachaSpaceDid)
          : undefined;

        if (existingSpace) {
          await client.setCurrentSpace(existingSpace.did());
          return client;
        }

        const addedSpace = await client.addSpace(delegation);
        await client.setCurrentSpace(currentSpaceDid ?? addedSpace.did());
      } catch (error) {
        await client.addProof(delegation);

        if (readSpaceDid()) {
          await client.setCurrentSpace(readSpaceDid()!);
        }
      }

      return client.currentSpace() ? client : null;
    })().catch((error) => {
      console.error('Storacha setup failed, falling back to local CID generation.', error);
      return null;
    });
  }

  return storachaClientPromise;
}

async function uploadJsonFile(fileName: string, payload: unknown): Promise<StorageUploadResult> {
  const client = await getStorachaClient();

  if (!client) {
    const cid = await createIpfsCid(payload);

    return {
      cid,
      network: 'local-ipfs',
      gatewayUrl: createGatewayUrl(cid, 'local-ipfs'),
    };
  }

  const file = new File([JSON.stringify(payload, null, 2)], fileName, {
    type: 'application/json',
  });
  const cid = (await client.uploadFile(file)).toString();

  return {
    cid,
    network: 'storacha',
    gatewayUrl: createGatewayUrl(cid, 'storacha'),
  };
}

export async function uploadHotReasoningSubmission(payload: unknown, submissionId: string) {
  return uploadJsonFile(`reasoning-${submissionId}.json`, payload);
}

export async function uploadSessionArchive(payload: unknown, questionId: string) {
  return uploadJsonFile(`session-${questionId}-archive.json`, payload);
}

export function getStorageStatus(): StorageStatus {
  if (storachaProof) {
    return {
      network: 'storacha',
      configured: true,
      label: 'Storacha active',
      detail:
        'Hot storage uploads will go to Storacha and return live CIDs for reasoning submissions and archives.',
    };
  }

  return {
    network: 'local-ipfs',
    configured: false,
    label: 'Local CID fallback',
    detail:
      'No Storacha delegation is configured, so the app generates deterministic local CIDs and keeps session data in browser storage.',
  };
}
