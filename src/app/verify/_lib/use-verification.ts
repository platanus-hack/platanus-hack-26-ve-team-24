'use client';

import { useCallback, useRef, useState } from 'react';
import type { LookupFn, Verdict, CheckEvent } from '@/lib/credential/verify';
import type { DecodedPresentation } from '@/lib/credential/present';
import { createRecordingLookup } from './lookup-client';
import { CHECK_LABELS } from './types';
import type { LoadedInput, RecordedRequest, RowView } from './types';

const MIN_ROW_MS = 450; // every row stays on screen long enough to read; the measured ms stay real
const CODES = ['TOKEN', 'ISSUER', 'SIGNATURE', 'HOLDER', 'LEDGER'] as const;

const pendingRows = (): RowView[] =>
  CODES.map((code) => ({ code, label: CHECK_LABELS[code], status: 'PENDING' }));

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export interface Verification {
  rows: RowView[];
  verdict: Verdict | null;
  decoded: DecodedPresentation | null;
  requests: RecordedRequest[];
  running: boolean;
}

const IDLE: Verification = {
  rows: pendingRows(),
  verdict: null,
  decoded: null,
  requests: [],
  running: false,
};

/** Runs the five checks for one presentation and exposes them row by row. */
export function useVerification() {
  const [state, setState] = useState<Verification>(IDLE);
  const runId = useRef(0);

  const run = useCallback(async (input: LoadedInput, customLookup?: LookupFn) => {
    const id = ++runId.current;
    const stale = () => runId.current !== id;
    const requests: RecordedRequest[] = [];
    const recording = createRecordingLookup();
    const lookup: LookupFn = customLookup
      ? (req) => {
          const body = JSON.stringify(req);
          requests.push({
            url: '/api/ledger/lookup',
            method: 'POST',
            body,
            bytes: new TextEncoder().encode(body).length,
          });
          return customLookup(req);
        }
      : recording.lookup;
    const recorded = customLookup ? requests : recording.requests;

    let rows = pendingRows();
    setState({ ...IDLE, rows, running: true });
    const show = (patch: Partial<Verification>) => {
      if (!stale()) setState((current) => ({ ...current, ...patch }));
    };

    const { verifyPresentation } = await import('@/lib/credential/verify');
    const { decodePresentation } = await import('@/lib/credential/present');
    // The full credential (a PDF straight from the employer) has no holder signature: that check is
    // reported as not examined. A presentation that carries one must pass it.
    let requireKeyBinding = true;
    try {
      requireKeyBinding = decodePresentation(input.text).keyBinding !== null;
    } catch {
      // the token check reports it
    }
    const generator = verifyPresentation(input.text, { lookup, requireKeyBinding });
    let checkingSince = 0;
    let step = await generator.next();
    while (!step.done) {
      const event: CheckEvent = step.value;
      if (event.status !== 'CHECKING' && event.status !== 'NOT_EXAMINED') {
        await sleep(Math.max(0, MIN_ROW_MS - (performance.now() - checkingSince)));
      }
      if (event.status === 'CHECKING') checkingSince = performance.now();
      if (stale()) return;
      rows = rows.map((row) =>
        row.code === event.code
          ? { ...row, status: event.status, measured: event.measured, detail: event.detail }
          : row,
      );
      show({ rows, requests: [...recorded] });
      step = await generator.next();
    }

    let decoded: DecodedPresentation | null = null;
    if (step.value.kind === 'AUTHENTIC') {
      decoded = decodePresentation(input.text);
    }
    show({ verdict: step.value, decoded, requests: [...recorded], running: false });
  }, []);

  return { ...state, run };
}
