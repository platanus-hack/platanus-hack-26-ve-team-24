import type {
  AnchorRecord,
  EvidenceEvent,
  EvidenceSource,
  SessionEvidence,
  SessionHead,
} from "./types";
import { EvidenceUnavailableError } from "./types";

// Selector de anchoredAt(bytes32) del contrato EvidenceRegistry.
const ANCHORED_AT_SELECTOR = "0x9591a610";

type ServerAnchor = {
  root: string;
  txHash: string | null;
  network: string;
  contract: string | null;
};

type SessionState = { head: SessionHead | null };

const rpcUrl = import.meta.env.VITE_RPC_URL as string | undefined;

async function getJson<T>(url: string, signal: AbortSignal): Promise<T | null> {
  const response = await fetch(url, { signal });

  if (response.status === 404) return null;
  if (!response.ok) throw new EvidenceUnavailableError("error");

  return (await response.json()) as T;
}

/** Pregunta a la cadena pública cuándo se anclaron la raíz; null si no la conoce. */
async function readAnchoredAt(
  contract: string,
  root: string,
  signal: AbortSignal,
): Promise<string | null> {
  if (rpcUrl === undefined) return null;

  const data = `${ANCHORED_AT_SELECTOR}${root.replace(/^sha256:/, "").padStart(64, "0")}`;
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: contract, data }, "latest"],
    }),
    signal,
  });

  if (!response.ok) throw new EvidenceUnavailableError("error");

  const { result } = (await response.json()) as { result?: string };
  const seconds = result === undefined ? 0n : BigInt(result);

  return seconds === 0n ? null : new Date(Number(seconds) * 1000).toISOString();
}

async function resolveAnchor(sessionId: string, signal: AbortSignal): Promise<AnchorRecord | null> {
  const server = await getJson<ServerAnchor>(
    `/api/sessions/${encodeURIComponent(sessionId)}/anchor`,
    signal,
  );

  if (server === null) return null;

  const anchoredAt =
    server.contract === null ? null : await readAnchoredAt(server.contract, server.root, signal);

  return {
    root: server.root,
    network: server.network,
    contract: server.contract,
    txHash: server.txHash,
    anchoredAt,
    explorerUrl:
      server.contract === null ? null : `https://sepolia.etherscan.io/address/${server.contract}`,
  };
}

export const httpSource: EvidenceSource = {
  async load(sessionId, signal): Promise<SessionEvidence> {
    const id = encodeURIComponent(sessionId);

    try {
      const [events, state] = await Promise.all([
        getJson<EvidenceEvent[]>(`/api/sessions/${id}/events`, signal),
        getJson<SessionState>(`/api/sessions/${id}/state`, signal),
      ]);

      if (events === null || (events.length === 0 && state?.head == null)) {
        throw new EvidenceUnavailableError("not_found");
      }

      return {
        events,
        head: state?.head ?? null,
        anchor: await resolveAnchor(sessionId, signal),
        synthetic: false,
      };
    } catch (error) {
      if (error instanceof EvidenceUnavailableError) throw error;
      if (signal.aborted) throw error;

      throw new EvidenceUnavailableError(navigator.onLine ? "error" : "offline");
    }
  },
};
