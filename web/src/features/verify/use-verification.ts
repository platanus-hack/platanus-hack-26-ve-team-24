import { useCallback, useEffect, useRef, useState } from "react";
import { analyze } from "./analyze";
import { evidenceSource } from "./source";
import { EvidenceUnavailableError, type Analysis, type UnavailableReason } from "./types";

export type VerificationState =
  | { status: "idle" }
  | { status: "loading"; sessionId: string }
  | { status: "done"; sessionId: string; analysis: Analysis; checkedAt: Date }
  | { status: "unavailable"; sessionId: string; reason: UnavailableReason };

const SESSION_PARAM = "s";

const readSessionParam = (): string | null =>
  new URLSearchParams(window.location.search).get(SESSION_PARAM);

function writeSessionParam(sessionId: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set(SESSION_PARAM, sessionId);
  window.history.replaceState(null, "", url);
}

export function useVerification() {
  const [state, setState] = useState<VerificationState>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);

  const verify = useCallback(async (rawId: string) => {
    const sessionId = rawId.trim();

    if (sessionId === "") return;

    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;

    writeSessionParam(sessionId);
    setState({ status: "loading", sessionId });

    try {
      const evidence = await evidenceSource.load(sessionId, current.signal);
      setState({ status: "done", sessionId, analysis: analyze(evidence), checkedAt: new Date() });
    } catch (error) {
      if (current.signal.aborted) return;

      const reason = error instanceof EvidenceUnavailableError ? error.reason : "error";
      setState({ status: "unavailable", sessionId, reason });
    }
  }, []);

  // Enlace directo (el QR del demo apunta a ?s=<id>).
  useEffect(() => {
    const initial = readSessionParam();

    if (initial !== null) {
      void verify(initial);
    }

    return () => controller.current?.abort();
  }, [verify]);

  return { state, verify };
}
