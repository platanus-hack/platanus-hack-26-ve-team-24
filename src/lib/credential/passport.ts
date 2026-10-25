import type { Es256Signer } from './keys';
import { sha256B64u, toB64u } from './jws';
import { decodePresentation, presentCredential, presentationPrefix, TokenError } from './present';
import { verifyEntry, type CheckCode, type CheckEvent, type Verdict, type VerifyContext } from './verify';
import type { ClaimName } from './types';

const MAX_ENTRIES = 12;

/** Same hash on the builder and the verifier side: order of the entries must not matter. */
const cvSetOf = (sdHashes: string[]): string => sha256B64u([...sdHashes].sort().join('~'));

export async function buildVerifiedCv(args: {
  items: { credential: string; holder: Es256Signer; reveal: ClaimName[] }[];
  aud: string;
  ttlSec: number;
  now?: Date;
}): Promise<string> {
  // Pass 1: sd_hash does not depend on the key-binding JWT, so the set can be hashed first.
  const sdHashes = args.items.map((item) =>
    sha256B64u(presentationPrefix(item.credential, item.reveal)),
  );
  const cvSet = cvSetOf(sdHashes);
  const nonce = toB64u(crypto.getRandomValues(new Uint8Array(16)));
  // Pass 2: every certificate key signs the same set.
  const presentations = await Promise.all(
    args.items.map((item) =>
      presentCredential({
        credential: item.credential,
        holder: item.holder,
        reveal: item.reveal,
        aud: args.aud,
        ttlSec: args.ttlSec,
        now: args.now,
        nonce,
        cvSet,
      }),
    ),
  );
  return JSON.stringify({ type: 'constancia-cv', v: 1, presentations });
}

export type CvEvent = CheckEvent & { entry: number }; // 0-based entry
export type CvVerdict =
  | {
      kind: 'AUTHENTIC';
      entries: Extract<Verdict, { kind: 'AUTHENTIC' }>[];
      timeline: CareerTimeline;
    }
  | { kind: 'NOT_AUTHENTIC'; failedEntry: number | null; failedAt: CheckCode; reason: string }
  | { kind: 'UNAVAILABLE'; reason: string };

const notAuthentic = (failedEntry: number | null, reason: string): CvVerdict => ({
  kind: 'NOT_AUTHENTIC',
  failedEntry,
  failedAt: 'TOKEN',
  reason,
});

function parseCv(input: string): string[] | string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return 'Esto no es un archivo de CV verificado';
  }
  const { type, v, presentations } = (parsed ?? {}) as Record<string, unknown>;
  if (type !== 'constancia-cv' || v !== 1 || !Array.isArray(presentations)) {
    return 'Esto no es un archivo de CV verificado';
  }
  if (presentations.length === 0 || presentations.length > MAX_ENTRIES) {
    return `Un CV verificado contiene entre 1 y ${MAX_ENTRIES} constancias`;
  }
  if (!presentations.every((p) => typeof p === 'string')) return 'Las entradas del CV están mal formadas';
  return presentations as string[];
}

export async function* verifyVerifiedCv(
  input: string,
  ctx: VerifyContext,
): AsyncGenerator<CvEvent, CvVerdict> {
  const presentations = parseCv(input);
  if (typeof presentations === 'string') return notAuthentic(null, presentations);

  const sdHashes: string[] = [];
  for (const [entry, presentation] of presentations.entries()) {
    try {
      sdHashes.push(decodePresentation(presentation).sdHash);
    } catch (error) {
      if (error instanceof TokenError) return notAuthentic(entry, error.message);
      throw error;
    }
  }
  const expectCvSet = cvSetOf(sdHashes);

  const verdicts: Extract<Verdict, { kind: 'AUTHENTIC' }>[] = [];
  for (const [entry, presentation] of presentations.entries()) {
    const run = verifyEntry(presentation, ctx, { requireKeyBinding: true, expectCvSet });
    let step = await run.next();
    while (!step.done) {
      yield { ...step.value, entry };
      step = await run.next();
    }
    const verdict = step.value;
    if (verdict.kind === 'UNAVAILABLE') return { kind: 'UNAVAILABLE', reason: verdict.reason };
    if (verdict.kind === 'NOT_AUTHENTIC') {
      return {
        kind: 'NOT_AUTHENTIC',
        failedEntry: entry,
        failedAt: verdict.failedAt,
        reason: verdict.reason,
      };
    }
    verdicts.push(verdict);
  }

  const timeline = buildTimeline(
    verdicts.map((v, i) => ({
      id: `entry-${i}`,
      employer: v.issuer.name,
      jobTitle: asString(v.claims.jobTitle),
      startDate: asString(v.claims.startDate),
      endDate: asString(v.claims.endDate),
      employedNow: typeof v.claims.employedNow === 'boolean' ? v.claims.employedNow : undefined,
    })),
  );
  return { kind: 'AUTHENTIC', entries: verdicts, timeline };
}

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export interface TimelineInput {
  id: string;
  employer: string;
  jobTitle?: string;
  startDate?: string;
  endDate?: string;
  employedNow?: boolean;
}
export interface CareerTimeline {
  // data; the UI component is `Timeline` in components/ui
  items: (TimelineInput & { datesHidden: boolean })[]; // sorted by startDate, dates-hidden entries last
  gaps: { from: string; to: string; months: number }[]; // > 1 month
  overlaps: { a: string; b: string }[]; // ids
}

const DAY_MS = 24 * 60 * 60 * 1000;
const AVERAGE_MONTH_DAYS = 30.4375;
const PRESENT = Number.POSITIVE_INFINITY;

const dayOf = (iso: string): number => Date.parse(iso);

/** Open end = still employed. An unknown end counts as the start day: no false gaps or overlaps. */
function endOf(entry: TimelineInput): number {
  if (entry.endDate) return dayOf(entry.endDate);
  return entry.employedNow ? PRESENT : dayOf(entry.startDate!);
}

function addOneMonth(day: number): number {
  const date = new Date(day);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.getTime();
}

export function buildTimeline(entries: TimelineInput[]): CareerTimeline {
  const dated = entries
    .filter((e) => e.startDate)
    .sort((a, b) => dayOf(a.startDate!) - dayOf(b.startDate!));
  const hidden = entries.filter((e) => !e.startDate);

  const gaps: CareerTimeline['gaps'] = [];
  const overlaps: CareerTimeline['overlaps'] = [];
  let latestEnd: number | null = null;

  for (const [i, entry] of dated.entries()) {
    const start = dayOf(entry.startDate!);
    if (latestEnd !== null && latestEnd !== PRESENT && start > addOneMonth(latestEnd)) {
      gaps.push({
        from: new Date(latestEnd).toISOString().slice(0, 10),
        to: entry.startDate!,
        months: Math.max(1, Math.round((start - latestEnd) / DAY_MS / AVERAGE_MONTH_DAYS)),
      });
    }
    for (const earlier of dated.slice(0, i)) {
      if (endOf(earlier) > start) overlaps.push({ a: earlier.id, b: entry.id });
    }
    const end = endOf(entry);
    if (latestEnd === null || end > latestEnd) latestEnd = end;
  }

  return {
    items: [
      ...dated.map((e) => ({ ...e, datesHidden: false })),
      ...hidden.map((e) => ({ ...e, datesHidden: true })),
    ],
    gaps,
    overlaps,
  };
}
