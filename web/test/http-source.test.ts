import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { httpSource } from "../src/features/verify/http-source";
import { EvidenceUnavailableError } from "../src/features/verify/types";

const signal = new AbortController().signal;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("httpSource", () => {
  it("un ID que la API no conoce es not_found", async () => {
    vi.stubGlobal("fetch", async () => json({}, 404));

    await expect(httpSource.load("nope", signal)).rejects.toMatchObject({ reason: "not_found" });
  });

  it("una sesión sin eventos ni cabeza es not_found", async () => {
    vi.stubGlobal("fetch", async (url: string) =>
      url.endsWith("/events") ? json([]) : json({ head: null }),
    );

    await expect(httpSource.load("vacia", signal)).rejects.toBeInstanceOf(EvidenceUnavailableError);
  });

  it("sin red y sin conexión reporta offline, no un fallo de integridad", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });

    await expect(httpSource.load("x", signal)).rejects.toMatchObject({ reason: "offline" });
  });

  it("con conexión pero error de red reporta error", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });

    await expect(httpSource.load("x", signal)).rejects.toMatchObject({ reason: "error" });
  });

  it("sin endpoint de ancla devuelve la evidencia sin ancla", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.endsWith("/anchor")) return json({}, 404);
      if (url.endsWith("/events")) {
        return json([
          { seq: 1, sessionId: "s", type: "t", payload: {}, ts: "x", prevHash: "g", hash: "h" },
        ]);
      }
      return json({ head: { sessionId: "s", seq: 1, hash: "h" } });
    });

    const evidence = await httpSource.load("s", signal);

    expect(evidence.anchor).toBeNull();
    expect(evidence.synthetic).toBe(false);
    expect(evidence.events).toHaveLength(1);
  });
});
