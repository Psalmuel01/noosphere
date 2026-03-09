import { sha256 } from 'multiformats/hashes/sha2';
import * as raw from 'multiformats/codecs/raw';
import { CID } from 'multiformats/cid';

const encoder = new TextEncoder();

export async function createIpfsCid(payload: unknown) {
  const bytes = encoder.encode(JSON.stringify(payload));
  const digest = await sha256.digest(bytes);
  return CID.createV1(raw.code, digest).toString();
}

export async function createHexDigest(payload: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(payload));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
