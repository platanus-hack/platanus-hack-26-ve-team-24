import type { EvidenceEvent, Station } from "./types";

export type StationItem =
  | { kind: "station"; station: Station }
  | { kind: "run"; from: number; to: number; count: number };

/** Estaciones sin cambios que se muestran justo después de una anomalía; antes no hace falta. */
const CONTEXT_AFTER = 1;
/** Un tramo corto no merece plegarse. */
const MIN_RUN = 3;

const isAnomaly = (station: Station): boolean => station.kind !== "ok";

function isVisible(stations: Station[], index: number): boolean {
  // Con una anomalía a la vista, el inicio de la sesión es contexto y se pliega.
  const keepStart = !stations.some(isAnomaly);

  if ((keepStart && index === 0) || index === stations.length - 1) return true;

  return (
    isAnomaly(stations[index]!) ||
    stations.slice(Math.max(0, index - CONTEXT_AFTER), index).some(isAnomaly)
  );
}

/** Pliega los tramos largos de estaciones intactas; los abiertos se muestran enteros. */
export function buildItems(stations: Station[], expandedRuns: ReadonlySet<number>): StationItem[] {
  const items: StationItem[] = [];
  let index = 0;

  while (index < stations.length) {
    if (isVisible(stations, index)) {
      items.push({ kind: "station", station: stations[index]! });
      index += 1;
      continue;
    }

    let end = index;

    while (end + 1 < stations.length && !isVisible(stations, end + 1)) {
      end += 1;
    }

    const run = stations.slice(index, end + 1);

    if (run.length < MIN_RUN || expandedRuns.has(run[0]!.seq)) {
      items.push(...run.map((station): StationItem => ({ kind: "station", station })));
    } else {
      items.push({ kind: "run", from: run[0]!.seq, to: run.at(-1)!.seq, count: run.length });
    }

    index = end + 1;
  }

  return items;
}

export type EventSummary = { title: string; detail: string };

const DETAIL_KEYS = ["cmd", "url", "query", "sql"] as const;

export function describeEvent(event: EvidenceEvent): EventSummary {
  const payload =
    typeof event.payload === "object" && event.payload !== null
      ? (event.payload as Record<string, unknown>)
      : {};
  const title = typeof payload.tool === "string" ? payload.tool : event.type;
  const agent = typeof payload.agent === "string" ? payload.agent : null;
  const key = DETAIL_KEYS.find((candidate) => typeof payload[candidate] === "string");
  const extra = key === undefined ? null : String(payload[key]);

  return { title, detail: [agent, extra].filter(Boolean).join(" · ") };
}
