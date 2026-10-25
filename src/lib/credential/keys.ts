import { concatBytes } from '@noble/hashes/utils.js';
import { keccak256 } from 'viem';
import { fromB64u } from './jws';
import type { Hex, P256Jwk, P256PrivateJwk } from './types';

export interface Es256Signer {
  keyId: Hex;
  jwk: P256Jwk;
  sign(message: Uint8Array): Promise<Uint8Array>; // 64-byte r||s, hashes with SHA-256
}

const ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const SIGN_PARAMS = { name: 'ECDSA', hash: 'SHA-256' } as const;

const publicPart = ({ x, y }: P256Jwk): P256Jwk => ({ kty: 'EC', crv: 'P-256', x, y });

/** x and y as 32-byte big-endian each, hashed with keccak256 (what the account contract stores). */
export function keyIdOf(jwk: P256Jwk): Hex {
  return keccak256(concatBytes(fromB64u(jwk.x), fromB64u(jwk.y)));
}

export function signerFromKey(privateKey: CryptoKey, jwk: P256Jwk): Es256Signer {
  const publicJwk = publicPart(jwk);
  return {
    keyId: keyIdOf(publicJwk),
    jwk: publicJwk,
    sign: async (message) =>
      new Uint8Array(await crypto.subtle.sign(SIGN_PARAMS, privateKey, message as BufferSource)),
  };
}

export async function generateSigner(opts?: {
  extractable?: boolean;
}): Promise<{ signer: Es256Signer; privateKey: CryptoKey }> {
  const { privateKey, publicKey } = await crypto.subtle.generateKey(
    ALGORITHM,
    opts?.extractable ?? false,
    ['sign', 'verify'],
  );
  const jwk = (await crypto.subtle.exportKey('jwk', publicKey)) as P256Jwk;
  return { signer: signerFromKey(privateKey, jwk), privateKey };
}

export async function signerFromPrivateJwk(
  jwk: P256PrivateJwk,
  opts?: { extractable?: boolean },
): Promise<Es256Signer> {
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d },
    ALGORITHM,
    opts?.extractable ?? false,
    ['sign'],
  );
  return signerFromKey(privateKey, jwk);
}

export async function verifyEs256(
  jwk: P256Jwk,
  message: Uint8Array,
  signature: Uint8Array,
): Promise<boolean> {
  if (signature.length !== 64) return false;
  const publicKey = await crypto.subtle.importKey('jwk', publicPart(jwk), ALGORITHM, false, [
    'verify',
  ]);
  return crypto.subtle.verify(
    SIGN_PARAMS,
    publicKey,
    signature as BufferSource,
    message as BufferSource,
  );
}

/** A fresh holder key whose private half can travel inside the credential file (extractable on purpose). */
export async function generateHolderKey(): Promise<P256PrivateJwk> {
  const { privateKey } = await crypto.subtle.generateKey(ALGORITHM, true, ['sign', 'verify']);
  const { kty, crv, x, y, d } = (await crypto.subtle.exportKey(
    'jwk',
    privateKey,
  )) as P256PrivateJwk;
  return { kty, crv, x, y, d };
}
