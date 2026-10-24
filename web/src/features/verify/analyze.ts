import { merkleRoot, verifyChain } from "./hash-chain";
import type {
  Analysis,
  Check,
  SessionEvidence,
  Station,
  UnverifiableReason,
  Verdict,
} from "./types";

type AnchorState = "none" | "unconfirmed" | "confirmed";

function buildStations(evidence: SessionEvidence, recomputed: Map<number, string>): Station[] {
  const bySeq = new Map(evidence.events.map((event) => [event.seq, event]));
  const lastSeq = Math.max(
    evidence.head?.seq ?? 0,
    ...evidence.events.map((event) => event.seq),
    0,
  );
  const stations: Station[] = [];

  for (let seq = 1; seq <= lastSeq; seq += 1) {
    const event = bySeq.get(seq) ?? null;

    if (event === null) {
      stations.push({ seq, kind: "missing", event: null, recomputedHash: null });
      continue;
    }

    const recomputedHash = recomputed.get(seq) ?? null;
    const kind = recomputedHash === event.hash ? "ok" : "altered";
    stations.push({ seq, kind, event, recomputedHash });
  }

  return stations;
}

function decideVerdict(
  tampered: boolean,
  deleted: boolean,
  anchorState: AnchorState,
  rootMatches: boolean,
): { verdict: Verdict; reason: UnverifiableReason | null } {
  if (tampered && deleted) return { verdict: "altered_deleted", reason: null };
  if (tampered) return { verdict: "altered", reason: null };
  if (deleted) return { verdict: "deleted", reason: null };
  if (anchorState === "none") return { verdict: "unverifiable", reason: "not_anchored" };
  if (anchorState === "unconfirmed") return { verdict: "unverifiable", reason: "not_confirmed" };
  if (!rootMatches) return { verdict: "altered", reason: null };
  return { verdict: "verified", reason: null };
}

export function analyze(evidence: SessionEvidence): Analysis {
  const { brokenAt, missing, recomputed } = verifyChain(evidence.events, evidence.head);
  const stations = buildStations(evidence, recomputed);
  const recomputedRoot = merkleRoot(
    evidence.events.toSorted((a, b) => a.seq - b.seq).map((event) => event.hash),
  );
  const { anchor } = evidence;
  const anchorState: AnchorState =
    anchor === null ? "none" : anchor.anchoredAt === null ? "unconfirmed" : "confirmed";
  const rootMatches = anchor !== null && anchor.root === recomputedRoot;

  const checks: Check[] = [
    { id: "chain", status: brokenAt === null ? "pass" : "fail", expected: null, found: null },
    {
      id: "sequence",
      status: missing.length === 0 ? "pass" : "fail",
      expected: String(stations.length),
      found: String(stations.filter((station) => station.kind !== "missing").length),
    },
    {
      id: "root",
      status: anchor === null ? "unavailable" : rootMatches ? "pass" : "fail",
      expected: anchor?.root ?? null,
      found: recomputedRoot,
    },
    {
      id: "anchor",
      status:
        anchorState === "none" ? "unavailable" : anchorState === "confirmed" ? "pass" : "fail",
      expected: anchor?.root ?? null,
      found: anchor?.anchoredAt ?? null,
    },
  ];

  const { verdict, reason } = decideVerdict(
    brokenAt !== null,
    missing.length > 0,
    anchorState,
    rootMatches,
  );

  return {
    verdict,
    unverifiableReason: reason,
    checks,
    stations,
    brokenAt,
    missing,
    recomputedRoot,
    evidence,
  };
}
