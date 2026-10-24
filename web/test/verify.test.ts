import { describe, expect, it } from "vite-plus/test";
import { merkleRoot as backendMerkleRoot } from "../../src/core/evidence/merkle";
import {
  hashEvent as backendHashEvent,
  verifyChain as backendVerifyChain,
} from "../../src/core/evidence/hash-chain";
import { analyze } from "../src/features/verify/analyze";
import {
  fixtureSource,
  SAMPLE_INTACT_ID,
  SAMPLE_TAMPERED_ID,
} from "../src/features/verify/fixtures";
import { hashEvent, merkleRoot } from "../src/features/verify/hash-chain";

const signal = new AbortController().signal;

describe("port del verificador", () => {
  it("calcula los mismos hashes y raíces que el backend", async () => {
    const { events } = await fixtureSource.load(SAMPLE_INTACT_ID, signal);

    for (const { hash, ...base } of events) {
      expect(hashEvent(base)).toBe(backendHashEvent(base));
      expect(hash).toBe(backendHashEvent(base));
    }

    const hashes = events.map((event) => event.hash);
    expect(merkleRoot(hashes)).toBe(backendMerkleRoot(hashes));
  });

  it("coincide con el backend sobre el ejemplo manipulado", async () => {
    const { events, head } = await fixtureSource.load(SAMPLE_TAMPERED_ID, signal);
    const backend = backendVerifyChain(events, head ?? undefined);
    const local = analyze({ events, head, anchor: null, synthetic: true });

    expect(local.brokenAt).toBe(backend.brokenAt);
    expect(local.missing).toEqual(backend.missing);
  });
});

describe("veredictos", () => {
  it("verifica una sesión íntegra y anclada", async () => {
    const analysis = analyze(await fixtureSource.load(SAMPLE_INTACT_ID, signal));

    expect(analysis.verdict).toBe("verified");
    expect(analysis.checks.every((check) => check.status === "pass")).toBe(true);
  });

  it("detecta alteración y borrado a la vez", async () => {
    const analysis = analyze(await fixtureSource.load(SAMPLE_TAMPERED_ID, signal));

    expect(analysis.verdict).toBe("altered_deleted");
    expect(analysis.brokenAt).toBe(8);
    expect(analysis.missing).toEqual([9]);
    expect(analysis.stations.find((station) => station.seq === 8)?.kind).toBe("altered");
    expect(analysis.stations.find((station) => station.seq === 9)?.kind).toBe("missing");
  });

  it("un borrado solo no cuenta como alteración", async () => {
    const evidence = await fixtureSource.load(SAMPLE_INTACT_ID, signal);
    const analysis = analyze({
      ...evidence,
      events: evidence.events.filter((event) => event.seq !== 5),
    });

    expect(analysis.verdict).toBe("deleted");
    expect(analysis.brokenAt).toBeNull();
  });

  it("detecta el borrado del último evento contra la cabeza", async () => {
    const evidence = await fixtureSource.load(SAMPLE_INTACT_ID, signal);
    const analysis = analyze({ ...evidence, events: evidence.events.slice(0, -1) });

    expect(analysis.verdict).toBe("deleted");
    expect(analysis.missing).toEqual([12]);
  });

  it("sin ancla no se puede verificar, pero no se declara alterado", async () => {
    const evidence = await fixtureSource.load(SAMPLE_INTACT_ID, signal);
    const analysis = analyze({ ...evidence, anchor: null });

    expect(analysis.verdict).toBe("unverifiable");
    expect(analysis.unverifiableReason).toBe("not_anchored");
  });

  it("un ancla que la cadena pública no confirma no verifica", async () => {
    const evidence = await fixtureSource.load(SAMPLE_INTACT_ID, signal);
    const analysis = analyze({
      ...evidence,
      anchor: { ...evidence.anchor!, anchoredAt: null },
    });

    expect(analysis.verdict).toBe("unverifiable");
    expect(analysis.unverifiableReason).toBe("not_confirmed");
  });
});
