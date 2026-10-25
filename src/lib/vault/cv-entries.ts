import type { RowStatus } from '@/components/ui/check-list';
import type { TimelineItem } from '@/components/ui/timeline';
import { buildTimeline, type CareerTimeline } from '@/lib/credential/passport';
import { decodePresentation, TokenError } from '@/lib/credential/present';
import { credentialHashOf } from '@/lib/credential/sdjwt';
import type { P256Jwk } from '@/lib/credential/types';
import type { CheckCode, Verdict } from '@/lib/credential/verify';
import { CHECK_LABELS } from './claims';

export const PRESENT = 'actualidad';
export const DATES_HIDDEN = 'fechas ocultas';

export const MAX_FILE_BYTES = 256 * 1024;

export type EntryStatus = 'VERIFIED' | 'FAILED' | 'UNAVAILABLE' | 'UNBOUND';

export interface CvEntry {
  id: string;
  sdJwt: string;
  /** Keystore name of the holder key; null when the certificate was issued to another vault. */
  keyName: string | null;
  employer: string;
  jobTitle?: string;
  startDate?: string;
  endDate?: string;
  employedNow?: boolean;
  status: EntryStatus;
  failedAt?: CheckCode;
  reason?: string;
}

export interface AttachDeps {
  findKeyName(jwk: P256Jwk): Promise<string | null>;
  verify(sdJwt: string): Promise<Verdict>;
}

const text = (value: unknown) => (typeof value === 'string' ? value : undefined);

export function failedEntry(id: string, reason: string): CvEntry {
  return { id, sdJwt: '', keyName: null, employer: 'Archivo ilegible', status: 'FAILED', reason };
}

function statusFrom(verdict: Verdict, keyName: string | null): Pick<CvEntry, 'status' | 'failedAt' | 'reason'> {
  if (!keyName) return { status: 'UNBOUND', reason: 'Se emitió para otra bóveda: no se puede unir aquí' };
  if (verdict.kind === 'AUTHENTIC') return { status: 'VERIFIED' };
  if (verdict.kind === 'UNAVAILABLE') return { status: 'UNAVAILABLE', failedAt: verdict.failedAt, reason: verdict.reason };
  return { status: 'FAILED', failedAt: verdict.failedAt, reason: verdict.reason };
}

/** Decodes in full (the holder owns it), then verifies against the ledger. Nothing is uploaded. */
export async function attachCertificate(deps: AttachDeps, sdJwt: string, knownKeyName?: string): Promise<CvEntry> {
  const input = sdJwt.trim();
  let decoded;
  try {
    decoded = decodePresentation(input);
  } catch (caught) {
    return failedEntry(`bad:${input.slice(0, 24)}`, caught instanceof TokenError ? caught.message : 'Esto no es una constancia');
  }
  const jwk = (decoded.payload.cnf as { jwk?: P256Jwk } | undefined)?.jwk;
  const keyName = knownKeyName ?? (jwk ? await deps.findKeyName(jwk) : null);
  const verdict = await deps.verify(input);
  const { claims } = decoded;
  return {
    id: credentialHashOf(decoded.issuerJwt),
    sdJwt: input,
    keyName,
    employer: verdict.kind === 'AUTHENTIC' ? verdict.issuer.name : 'Empleador desconocido',
    jobTitle: text(claims.jobTitle),
    startDate: text(claims.startDate),
    endDate: text(claims.endDate),
    employedNow: claims.employedNow === true,
    ...statusFrom(verdict, keyName),
  };
}

/** The same certificate (same hash) attached twice collapses into one row. */
export function addEntry(entries: CvEntry[], entry: CvEntry): CvEntry[] {
  return entries.some((existing) => existing.id === entry.id) ? entries : [...entries, entry];
}

export const canJoin = (entry: CvEntry) => entry.status === 'VERIFIED';

export const ENTRY_ROW_STATUS: Record<EntryStatus, RowStatus> = {
  VERIFIED: 'VERIFIED',
  FAILED: 'FAILED',
  UNAVAILABLE: 'UNAVAILABLE',
  UNBOUND: 'FAILED',
};

export function entryNote(entry: CvEntry): string | undefined {
  if (entry.status === 'FAILED' && entry.failedAt) {
    return `Falló en «${CHECK_LABELS[entry.failedAt]}». ${entry.reason ?? ''}`.trim();
  }
  return entry.reason;
}

export function timelineOf(entries: CvEntry[]): CareerTimeline {
  return buildTimeline(
    entries.filter(canJoin).map((entry) => ({
      id: entry.id,
      employer: entry.employer,
      jobTitle: entry.jobTitle,
      startDate: entry.startDate,
      endDate: entry.endDate,
      employedNow: entry.employedNow,
    })),
  );
}

export function timelineItems(timeline: CareerTimeline): TimelineItem[] {
  return timeline.items.map((item) => ({
    id: item.id,
    employer: item.employer,
    title: item.jobTitle,
    start: item.startDate,
    end: item.endDate ?? (item.employedNow ? PRESENT : undefined),
    status: 'VERIFIED',
    note: item.datesHidden ? DATES_HIDDEN : undefined,
  }));
}
