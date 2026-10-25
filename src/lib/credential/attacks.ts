import { bytesToHex } from '@noble/hashes/utils.js';
import { generateSigner, signerFromPrivateJwk, type Es256Signer } from './keys';
import { fromB64u, parseJsonSegment, signJws, splitJws, toB64u } from './jws';
import { decodePresentation, presentCredential, REVEAL_TEMPLATES } from './present';
import { issueCredential } from './sdjwt';
import type { CheckCode } from './verify';
import type { EmploymentRecord, Hex, P256PrivateJwk } from './types';

// Laboratorio de constancias falsas
export type AttackId = 'edit-claim' | 'forge-signature' | 'fake-employer' | 'stolen-certificate';
export interface Attack {
  id: AttackId;
  title: string;
  changed: string;
  expectedFailure: CheckCode;
}
export interface Sample {
  credential: string;
  holderJwk: P256PrivateJwk;
} // public/demo/sample.json

export const ATTACK_TITLES: Record<AttackId, string> = {
  'edit-claim': 'Editar un dato',
  'forge-signature': 'Falsificar la firma del empleador',
  'fake-employer': 'Hacerse pasar por empleador',
  'stolen-certificate': 'Usar la constancia de otra persona',
};

const SHARE_TTL_SEC = 3600;
const LAB_AUDIENCE = 'Fake Letter Lab';
const FAKE_TITLE = 'Director de Operaciones';

type Presented = { presentation: string; attack: Attack };

const present = (
  credential: string,
  holder: Es256Signer,
  template: keyof typeof REVEAL_TEMPLATES,
) =>
  presentCredential({
    credential,
    holder,
    reveal: REVEAL_TEMPLATES[template],
    aud: LAB_AUDIENCE,
    ttlSec: SHARE_TTL_SEC,
  });

/** Rewrites the jobTitle disclosure and keeps its salt, so only the value differs. */
async function editClaim(sample: Sample): Promise<Presented> {
  const holder = await signerFromPrivateJwk(sample.holderJwk);
  const segments = sample.credential.split('~');
  let original = '';
  const edited = segments.map((segment, index) => {
    if (index === 0 || segment === '') return segment;
    const [salt, name, value] = JSON.parse(new TextDecoder().decode(fromB64u(segment))) as [
      string,
      string,
      string,
    ];
    if (name !== 'jobTitle') return segment;
    original = value;
    return toB64u(JSON.stringify([salt, name, FAKE_TITLE]));
  });
  return {
    presentation: await present(edited.join('~'), holder, 'role'),
    attack: {
      id: 'edit-claim',
      title: ATTACK_TITLES['edit-claim'],
      changed: `El cargo cambió de «${original}» a «${FAKE_TITLE}»`,
      expectedFailure: 'TOKEN',
    },
  };
}

/** Keeps the employer's kid, but the signature comes from a key nobody registered. */
async function forgeSignature(sample: Sample): Promise<Presented> {
  const holder = await signerFromPrivateJwk(sample.holderJwk);
  const [issuerJwt, ...rest] = sample.credential.split('~');
  const [header, payload] = splitJws(issuerJwt)!;
  const { signer: forger } = await generateSigner();
  const forged = await signJws(parseJsonSegment(header), parseJsonSegment(payload), forger);
  return {
    presentation: await present([forged, ...rest].join('~'), holder, 'employment'),
    attack: {
      id: 'forge-signature',
      title: ATTACK_TITLES['forge-signature'],
      changed: 'La firma del empleador se reemplazó por una hecha con otra clave',
      expectedFailure: 'SIGNATURE',
    },
  };
}

const recordFrom = (sample: Sample): EmploymentRecord => {
  const { claims } = decodePresentation(sample.credential);
  return {
    givenName: String(claims.givenName),
    familyName: String(claims.familyName),
    nationalId: String(claims.nationalId),
    jobTitle: String(claims.jobTitle),
    department: claims.department === undefined ? undefined : String(claims.department),
    employmentType: claims.employmentType as EmploymentRecord['employmentType'],
    startDate: String(claims.startDate),
    endDate: claims.endDate === undefined ? undefined : String(claims.endDate),
    workCountry: String(claims.workCountry),
    salaryMonthlyUsd:
      typeof claims.salaryMonthlyUsd === 'number' ? claims.salaryMonthlyUsd : undefined,
  };
};

/** A perfectly valid certificate from an account the consortium never accredited. */
async function fakeEmployer(sample: Sample): Promise<Presented> {
  const holder = await signerFromPrivateJwk(sample.holderJwk);
  const { signer } = await generateSigner();
  const account = `0x${bytesToHex(crypto.getRandomValues(new Uint8Array(20)))}` as Hex;
  const { payload } = decodePresentation(sample.credential);
  const [, context] = payload['@context'] as string[];
  const issued = await issueCredential({
    record: recordFrom(sample),
    issuer: { did: `did:constancia:11155111:${account}`, keyId: signer.keyId },
    signer,
    holderJwk: holder.jwk,
    appUrl: new URL(context).origin,
  });
  return {
    presentation: await present(issued.sdJwt, holder, 'employment'),
    attack: {
      id: 'fake-employer',
      title: ATTACK_TITLES['fake-employer'],
      changed: `Un empleador nuevo (${account.slice(0, 8)}…) emitió una constancia perfectamente válida`,
      expectedFailure: 'ISSUER',
    },
  };
}

/** The real certificate, shown by someone who does not hold its key. */
async function stolenCertificate(sample: Sample): Promise<Presented> {
  const { signer: attacker } = await generateSigner();
  return {
    presentation: await present(sample.credential, attacker, 'employment'),
    attack: {
      id: 'stolen-certificate',
      title: ATTACK_TITLES['stolen-certificate'],
      changed: 'La firma del titular se reemplazó por una hecha con la clave del atacante',
      expectedFailure: 'HOLDER',
    },
  };
}

const ATTACKS: Record<AttackId, (sample: Sample) => Promise<Presented>> = {
  'edit-claim': editClaim,
  'forge-signature': forgeSignature,
  'fake-employer': fakeEmployer,
  'stolen-certificate': stolenCertificate,
};

export const runAttack = (id: AttackId, sample: Sample): Promise<Presented> => ATTACKS[id](sample);
