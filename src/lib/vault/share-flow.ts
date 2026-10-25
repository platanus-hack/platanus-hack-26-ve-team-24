import type { Es256Signer } from '@/lib/credential/keys';
import type { ClaimName } from '@/lib/credential/types';
import { shareLink } from './share-builder';
import type { VaultCertificate } from './types';

export interface ShareFlowDeps {
  loadSigner(name: string): Promise<Es256Signer | null>;
  present(args: {
    credential: string;
    holder: Es256Signer;
    reveal: ClaimName[];
    aud: string;
    ttlSec: number;
  }): Promise<string>;
  seal(plaintext: string): Promise<{ ciphertext: string; key: string }>;
  postShare(ciphertext: string, ttlSec: number): Promise<{ id: string; expiresAt: string }>;
  appUrl: string;
}

export interface CreatedShare {
  link: string;
  presentation: string;
  expiresAt: string;
}

export class NoKeyError extends Error {}

/** Presents with this certificate's own key, seals it, and sends the server only the ciphertext. */
export async function createShare(
  deps: ShareFlowDeps,
  args: { certificate: VaultCertificate; reveal: ClaimName[]; aud: string; ttlSec: number },
): Promise<CreatedShare> {
  if (args.reveal.length === 0) throw new Error('Elige al menos un dato para mostrar');
  const holder = await deps.loadSigner(args.certificate.keyName);
  if (!holder) throw new NoKeyError('La clave de esta constancia no está en este dispositivo');

  const presentation = await deps.present({
    credential: args.certificate.sdJwt,
    holder,
    reveal: args.reveal,
    aud: args.aud,
    ttlSec: args.ttlSec,
  });
  const { ciphertext, key } = await deps.seal(presentation);
  const { id, expiresAt } = await deps.postShare(ciphertext, args.ttlSec);
  return { link: shareLink(deps.appUrl, id, key), presentation, expiresAt };
}
