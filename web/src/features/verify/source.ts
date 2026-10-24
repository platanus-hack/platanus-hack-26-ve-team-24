import { fixtureSource, isSampleId } from "./fixtures";
import { httpSource } from "./http-source";
import type { EvidenceSource } from "./types";

/** Los ejemplos del demo son sintéticos; cualquier otro ID va a la API real. */
export const evidenceSource: EvidenceSource = {
  load: (sessionId, signal) =>
    (isSampleId(sessionId) ? fixtureSource : httpSource).load(sessionId, signal),
};
