export type EvidenceEvent = {
  seq: number;
  sessionId: string;
  type: string;
  payload: unknown;
  ts: string;
  prevHash: string;
  hash: string;
};

export type SessionHead = {
  sessionId: string;
  seq: number;
  hash: string;
};

export type AnchorRecord = {
  root: string;
  network: string;
  contract: string | null;
  txHash: string | null;
  /** ISO. Null si la cadena pública no confirma la raíz. */
  anchoredAt: string | null;
  explorerUrl: string | null;
};

export type SessionEvidence = {
  events: EvidenceEvent[];
  head: SessionHead | null;
  anchor: AnchorRecord | null;
  /** Datos de demostración generados en el cliente. */
  synthetic: boolean;
};

export type UnavailableReason = "not_found" | "offline" | "error";

export class EvidenceUnavailableError extends Error {
  readonly reason: UnavailableReason;

  constructor(reason: UnavailableReason) {
    super(reason);
    this.reason = reason;
  }
}

export interface EvidenceSource {
  load(sessionId: string, signal: AbortSignal): Promise<SessionEvidence>;
}

export type StationKind = "ok" | "altered" | "missing";

export type Station = {
  seq: number;
  kind: StationKind;
  event: EvidenceEvent | null;
  /** Hash recalculado a partir del contenido; solo si hay evento. */
  recomputedHash: string | null;
};

export type CheckId = "chain" | "sequence" | "root" | "anchor";
export type CheckStatus = "pass" | "fail" | "unavailable";

export type Check = {
  id: CheckId;
  status: CheckStatus;
  /** Valor sellado / esperado, para la prueba técnica. */
  expected: string | null;
  /** Valor recalculado en este dispositivo. */
  found: string | null;
};

export type Verdict = "verified" | "altered" | "deleted" | "altered_deleted" | "unverifiable";

export type UnverifiableReason = UnavailableReason | "not_anchored" | "not_confirmed";

export type Analysis = {
  verdict: Verdict;
  unverifiableReason: UnverifiableReason | null;
  checks: Check[];
  stations: Station[];
  brokenAt: number | null;
  missing: number[];
  recomputedRoot: string;
  evidence: SessionEvidence;
};
