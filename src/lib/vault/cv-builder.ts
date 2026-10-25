import type { Es256Signer } from '@/lib/credential/keys';
import { buildTimeline, type CareerTimeline } from '@/lib/credential/passport';
import { decodePresentation } from '@/lib/credential/present';
import type { ClaimName, DisclosedClaims } from '@/lib/credential/types';
import type { CvEntry } from './cv-entries';
import { shareLink, templateReveal } from './share-builder';
import { NoKeyError, type CreatedShare } from './share-flow';

export interface CvSelection {
  entry: CvEntry;
  reveal: ClaimName[];
}

export const claimsOf = (entry: CvEntry): DisclosedClaims => decodePresentation(entry.sdJwt).claims;

/** A CV entry shows employment and role by default; the holder opens it up from there. */
export const defaultReveal = (entry: CvEntry): ClaimName[] => templateReveal('role', claimsOf(entry));

export const revealsName = (selections: CvSelection[]): boolean =>
  selections.some(({ reveal }) => reveal.includes('givenName') || reveal.includes('familyName'));

const shownText = (claims: DisclosedClaims, reveal: ClaimName[], name: 'jobTitle' | 'startDate' | 'endDate') =>
  reveal.includes(name) && typeof claims[name] === 'string' ? claims[name] : undefined;

/** The timeline exactly as the reader will see it: only chosen fields, hidden dates last. */
export function previewTimeline(selections: CvSelection[]): CareerTimeline {
  return buildTimeline(
    selections.map(({ entry, reveal }) => {
      const claims = claimsOf(entry);
      return {
        id: entry.id,
        employer: entry.employer,
        jobTitle: shownText(claims, reveal, 'jobTitle'),
        startDate: shownText(claims, reveal, 'startDate'),
        endDate: shownText(claims, reveal, 'endDate'),
        employedNow: reveal.includes('employedNow') ? claims.employedNow === true : undefined,
      };
    }),
  );
}

export interface CvFlowDeps {
  loadSigner(name: string): Promise<Es256Signer | null>;
  buildCv(args: {
    items: { credential: string; holder: Es256Signer; reveal: ClaimName[] }[];
    aud: string;
    ttlSec: number;
  }): Promise<string>;
  seal(plaintext: string): Promise<{ ciphertext: string; key: string }>;
  postShare(ciphertext: string, ttlSec: number): Promise<{ id: string; expiresAt: string }>;
  appUrl: string;
}

/** Every certificate signs the whole set with its own key; the server gets only the ciphertext. */
export async function createCv(
  deps: CvFlowDeps,
  args: { selections: CvSelection[]; aud: string; ttlSec: number },
): Promise<CreatedShare> {
  if (args.selections.length === 0) throw new Error('Elige al menos una constancia');
  const items = await Promise.all(
    args.selections.map(async ({ entry, reveal }) => {
      const holder = entry.keyName ? await deps.loadSigner(entry.keyName) : null;
      if (!holder) throw new NoKeyError('La clave de una constancia no está en este dispositivo');
      return { credential: entry.sdJwt, holder, reveal };
    }),
  );
  const cv = await deps.buildCv({ items, aud: args.aud, ttlSec: args.ttlSec });
  const { ciphertext, key } = await deps.seal(cv);
  const { id, expiresAt } = await deps.postShare(ciphertext, args.ttlSec);
  return { link: shareLink(deps.appUrl, id, key), presentation: cv, expiresAt };
}
