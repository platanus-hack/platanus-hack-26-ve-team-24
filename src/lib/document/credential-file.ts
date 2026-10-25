// Browser only. Opens a credential PDF the way Compartir and Unificar need it: token, key and claims.
import { decodePresentation, TokenError } from '../credential/present';
import type { DisclosedClaims, P256PrivateJwk } from '../credential/types';
import { isPdf, readPdfPayload } from './pdf';

export interface CredentialFile {
  name: string;
  sdJwt: string;
  holderKey: P256PrivateJwk;
  claims: DisclosedClaims;
  issuer: string; // DID
  credentialHash: string; // identifies this exact credential, so the same PDF attached twice counts once
}

export class CredentialFileError extends Error {}

export async function readCredentialFile(file: File): Promise<CredentialFile> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const payload = isPdf(bytes) ? await readPdfPayload(bytes) : null;
  if (!payload) throw new CredentialFileError(`${file.name}: no es un PDF de Constancia`);
  if (payload.type !== 'credential') {
    throw new CredentialFileError(
      `${file.name}: es ${payload.type === 'cv' ? 'un historial' : 'una presentación'}, no la constancia completa que emitió el empleador`,
    );
  }
  try {
    const decoded = decodePresentation(payload.sdJwt);
    return {
      name: file.name,
      sdJwt: payload.sdJwt,
      holderKey: payload.holderKey,
      claims: decoded.claims,
      issuer: String(decoded.payload.issuer),
      credentialHash: decoded.sdHash,
    };
  } catch (caught) {
    if (caught instanceof TokenError)
      throw new CredentialFileError(`${file.name}: ${caught.message}`);
    throw caught;
  }
}
