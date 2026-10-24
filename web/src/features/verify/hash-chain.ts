import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import type { EvidenceEvent, SessionHead } from "./types";

// Port de src/core/evidence/hash-chain.ts y merkle.ts. El verificador corre
// en el navegador del visitante: el algoritmo debe coincidir byte a byte.

export const GENESIS = "sha256:genesis";

const digest = (input: string): string => bytesToHex(sha256(utf8ToBytes(input)));

export function hashEvent(event: Omit<EvidenceEvent, "hash">): string {
  const canonical = JSON.stringify({
    seq: event.seq,
    sessionId: event.sessionId,
    type: event.type,
    payload: event.payload,
    ts: event.ts,
    prevHash: event.prevHash,
  });

  return `sha256:${digest(canonical)}`;
}

export function merkleRoot(hashes: string[]): string {
  if (hashes.length === 0) {
    return `sha256:${digest("")}`;
  }

  let level = hashes.map((hash) => hash.replace(/^sha256:/, ""));

  while (level.length > 1) {
    const next: string[] = [];

    for (let index = 0; index < level.length; index += 2) {
      const left = level[index]!;
      const right = level[index + 1] ?? left;
      next.push(digest(`${left}${right}`));
    }

    level = next;
  }

  return `sha256:${level[0]}`;
}

export type ChainVerification = {
  brokenAt: number | null;
  missing: number[];
  recomputed: Map<number, string>;
};

export function verifyChain(events: EvidenceEvent[], head: SessionHead | null): ChainVerification {
  const sorted = events.toSorted((a, b) => a.seq - b.seq);
  const missing: number[] = [];
  const recomputed = new Map<number, string>();
  let brokenAt: number | null = null;
  let previous: EvidenceEvent | undefined;

  for (const event of sorted) {
    const expectedSeq = (previous?.seq ?? 0) + 1;

    for (let seq = expectedSeq; seq < event.seq; seq += 1) {
      missing.push(seq);
    }

    const { hash, ...base } = event;
    const actual = hashEvent(base);
    recomputed.set(event.seq, actual);
    // El enlace solo se exige entre eventos contiguos: tras un borrado, el
    // hueco ya lo reporta `missing` y no debe contar además como alteración.
    const chainBroken =
      previous !== undefined && previous.seq === event.seq - 1 && event.prevHash !== previous.hash;

    if ((actual !== hash || chainBroken) && brokenAt === null) {
      brokenAt = event.seq;
    }

    previous = event;
  }

  // La cabeza vive fuera del store: borrar el último evento no deja hueco
  // interno, el hueco está entre el último presente y la cabeza.
  const lastSeq = previous?.seq ?? 0;

  if (head !== null && head.seq > lastSeq) {
    for (let seq = lastSeq + 1; seq <= head.seq; seq += 1) {
      missing.push(seq);
    }
  }

  if (head !== null && brokenAt === null) {
    const headEvent = sorted.find((event) => event.seq === head.seq);

    if (headEvent !== undefined && headEvent.hash !== head.hash) {
      brokenAt = head.seq;
    }
  }

  return { brokenAt, missing, recomputed };
}
