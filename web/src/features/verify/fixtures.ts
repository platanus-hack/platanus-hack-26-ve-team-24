import { GENESIS, hashEvent, merkleRoot } from "./hash-chain";
import type { AnchorRecord, EvidenceEvent, EvidenceSource, SessionEvidence } from "./types";
import { EvidenceUnavailableError } from "./types";

// Datos de demostración SINTÉTICOS. Se sellan en el cliente con el mismo
// algoritmo que el backend, así que los hashes son reales; el anclaje no.

export const SAMPLE_INTACT_ID = "demo-integro";
export const SAMPLE_TAMPERED_ID = "demo-manipulado";
// Accesibles solo por URL (?s=...): estados que el demo no muestra como atajo.
export const SAMPLE_DELETED_ID = "demo-borrado";
export const SAMPLE_UNANCHORED_ID = "demo-sin-ancla";

const NETWORK = "Sepolia";
const START = Date.parse("2026-10-24T02:31:00.000Z");

type Draft = { type: string; payload: Record<string, string> };

const DRAFTS: Draft[] = [
  { type: "tool_call", payload: { agent: "agent-01", tool: "shell.exec", cmd: "ls -la" } },
  { type: "tool_call", payload: { agent: "agent-02", tool: "http.get", url: "api.github.com" } },
  { type: "tool_call", payload: { agent: "agent-01", tool: "rag.search", query: "incident" } },
  {
    type: "tool_call",
    payload: { agent: "agent-02", tool: "db.query", sql: "select count(*) from orders" },
  },
  { type: "tool_call", payload: { agent: "agent-01", tool: "http.get", url: "status.internal" } },
  { type: "tool_call", payload: { agent: "agent-02", tool: "shell.exec", cmd: "df -h" } },
  {
    type: "tool_call",
    payload: { agent: "agent-rogue", tool: "db.query", sql: "select * from users" },
  },
  {
    type: "tool_call",
    payload: { agent: "agent-rogue", tool: "http.post", url: "paste.example/upload" },
  },
  {
    type: "tool_call",
    payload: { agent: "agent-rogue", tool: "shell.exec", cmd: "rm -rf /var/log/agent" },
  },
  { type: "tool_call", payload: { agent: "agent-01", tool: "rag.search", query: "release notes" } },
  { type: "tool_call", payload: { agent: "agent-02", tool: "http.get", url: "api.github.com" } },
  { type: "tool_call", payload: { agent: "agent-01", tool: "shell.exec", cmd: "git status" } },
];

function sealAll(sessionId: string): EvidenceEvent[] {
  const events: EvidenceEvent[] = [];

  for (const [index, draft] of DRAFTS.entries()) {
    const base = {
      seq: index + 1,
      sessionId,
      type: draft.type,
      payload: draft.payload,
      ts: new Date(START + index * 21_000).toISOString(),
      prevHash: events[index - 1]?.hash ?? GENESIS,
    };

    events.push({ ...base, hash: hashEvent(base) });
  }

  return events;
}

function anchorFor(events: EvidenceEvent[]): AnchorRecord {
  return {
    root: merkleRoot(events.map((event) => event.hash)),
    network: NETWORK,
    contract: null,
    txHash: null,
    anchoredAt: "2026-10-24T02:40:00.000Z",
    explorerUrl: null,
  };
}

function intact(): SessionEvidence {
  const events = sealAll(SAMPLE_INTACT_ID);
  const last = events.at(-1)!;

  return {
    events,
    head: { sessionId: SAMPLE_INTACT_ID, seq: last.seq, hash: last.hash },
    anchor: anchorFor(events),
    synthetic: true,
  };
}

/** El rogue altera el evento 8 sin tocar su hash y borra el evento 9. */
function tampered(): SessionEvidence {
  const original = sealAll(SAMPLE_TAMPERED_ID);
  const last = original.at(-1)!;
  const events = original
    .filter((event) => event.seq !== 9)
    .map((event) =>
      event.seq === 8
        ? { ...event, payload: { agent: "agent-rogue", tool: "http.get", url: "api.github.com" } }
        : event,
    );

  return {
    events,
    head: { sessionId: SAMPLE_TAMPERED_ID, seq: last.seq, hash: last.hash },
    anchor: anchorFor(original),
    synthetic: true,
  };
}

/** Solo se borra el evento 9: la cadena restante sigue siendo coherente. */
function deleted(): SessionEvidence {
  const original = sealAll(SAMPLE_DELETED_ID);
  const last = original.at(-1)!;

  return {
    events: original.filter((event) => event.seq !== 9),
    head: { sessionId: SAMPLE_DELETED_ID, seq: last.seq, hash: last.hash },
    anchor: anchorFor(original),
    synthetic: true,
  };
}

function unanchored(): SessionEvidence {
  return { ...intact(), anchor: null };
}

const SAMPLES: Record<string, () => SessionEvidence> = {
  [SAMPLE_INTACT_ID]: intact,
  [SAMPLE_TAMPERED_ID]: tampered,
  [SAMPLE_DELETED_ID]: deleted,
  [SAMPLE_UNANCHORED_ID]: unanchored,
};

export const fixtureSource: EvidenceSource = {
  async load(sessionId) {
    const build = SAMPLES[sessionId];

    if (build === undefined) {
      throw new EvidenceUnavailableError("not_found");
    }

    return build();
  },
};

export const isSampleId = (sessionId: string): boolean => sessionId in SAMPLES;
