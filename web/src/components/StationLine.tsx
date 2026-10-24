import { useMemo, useState, type CSSProperties } from "react";
import { Check, ChevronDown, ChevronsUpDown, Minus, OctagonX, TriangleAlert } from "lucide-react";
import { formatDateTime } from "../features/verify/format";
import { buildItems, describeEvent } from "../features/verify/stations";
import type { Analysis, Station } from "../features/verify/types";
import { useI18n } from "../i18n";
import { HashValue } from "./HashValue";

const LABEL_TONE = {
  ok: "text-green-text",
  altered: "text-scarlet-text",
  missing: "text-amber",
} as const;

function StationMarker({ kind }: { kind: Station["kind"] }) {
  if (kind === "missing") {
    return (
      <span
        aria-hidden
        className="absolute top-3.5 left-5 size-6 rounded-full border-[3px] border-dashed border-amber bg-enamel"
      />
    );
  }

  if (kind === "altered") {
    return (
      <span
        aria-hidden
        className="absolute top-4 left-[1.375rem] size-5 rotate-45 border-[3px] border-porcelain bg-scarlet"
      />
    );
  }

  return (
    <span
      aria-hidden
      className="absolute top-3.5 left-2 size-6 rounded-full border-[5px] border-porcelain bg-enamel"
    />
  );
}

/** El riel gira 45 grados hacia una vía de desvío mientras dura la anomalía. */
function RailJog({ kind }: { kind: "altered" | "missing" }) {
  const color = kind === "altered" ? "var(--color-scarlet)" : "var(--color-amber)";

  return (
    <>
      <svg aria-hidden viewBox="0 0 48 12" className="absolute top-0 left-0 h-3 w-12" fill="none">
        <path d="M20 0 L32 12" stroke={color} strokeWidth="8" />
      </svg>
      <span
        className="rail-seg rail-jog"
        data-cut={kind === "missing"}
        data-tone={kind === "altered" ? "altered" : undefined}
      />
      <svg
        aria-hidden
        viewBox="0 0 48 12"
        className="absolute bottom-0 left-0 h-3 w-12"
        fill="none"
      >
        <path d="M32 0 L20 12" stroke={color} strokeWidth="8" />
      </svg>
    </>
  );
}

function StateLabel({ kind }: { kind: Station["kind"] }) {
  const { t } = useI18n();
  const Icon = kind === "ok" ? Check : kind === "altered" ? OctagonX : TriangleAlert;

  return (
    <span
      className={`flex shrink-0 items-center gap-1.5 font-display text-lg font-semibold tracking-wider uppercase ${LABEL_TONE[kind]}`}
    >
      <Icon aria-hidden className="size-5" strokeWidth={2.75} />
      {t.line[kind]}
    </span>
  );
}

function StationDetail({ station }: { station: Station }) {
  const { t, locale } = useI18n();
  const { event } = station;

  if (event === null) return null;

  return (
    <div className="on-porcelain mt-2 space-y-3 bg-porcelain p-4 text-ink">
      <p className="text-sm text-ink-soft">
        {event.type} · {formatDateTime(event.ts, locale)}
      </p>
      <pre className="overflow-x-auto font-mono text-xs leading-relaxed whitespace-pre-wrap">
        {JSON.stringify(event.payload, null, 2)}
      </pre>
      <HashValue label={t.proof.sealed} value={event.hash} />
      {station.recomputedHash !== null && (
        <HashValue
          label={t.proof.recomputed}
          value={station.recomputedHash}
          flagged={station.kind === "altered"}
        />
      )}
    </div>
  );
}

function StationRow({ station, index }: { station: Station; index: number }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(station.kind === "altered");
  const isMissing = station.kind === "missing";
  const summary = station.event === null ? null : describeEvent(station.event);

  const body = (
    <span className="flex w-full items-start justify-between gap-3 text-left">
      <span className="min-w-0">
        <span className="block text-sm text-chalk">{t.line.station(station.seq)}</span>
        <span className="block font-semibold break-words">
          {summary?.title ?? t.line.missingNote}
        </span>
        {summary !== null && summary.detail !== "" && (
          <span className="block text-sm break-words text-chalk">{summary.detail}</span>
        )}
      </span>
      <span className="flex items-center gap-2 pt-0.5">
        <StateLabel kind={station.kind} />
        {!isMissing && (
          <ChevronDown
            aria-hidden
            className={`size-5 shrink-0 text-chalk transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </span>
    </span>
  );

  return (
    <li
      className={`station-in relative py-2 ${station.kind === "ok" ? "pl-12" : "pl-14"}`}
      style={{ "--i": index } as CSSProperties}
    >
      {station.kind === "ok" ? (
        <span className="rail-seg" data-start={index === 0} />
      ) : (
        <RailJog kind={station.kind} />
      )}
      <StationMarker kind={station.kind} />
      {isMissing ? (
        <div className="min-h-11 py-1.5">{body}</div>
      ) : (
        <>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="min-h-11 w-full py-1.5"
          >
            {body}
          </button>
          {open && <StationDetail station={station} />}
        </>
      )}
    </li>
  );
}

function RunRow({ count, index, onOpen }: { count: number; index: number; onOpen: () => void }) {
  const { t } = useI18n();

  return (
    <li className="station-in relative py-1 pl-12" style={{ "--i": index } as CSSProperties}>
      <span className="rail-seg" />
      <span aria-hidden className="absolute top-5 left-3.5 size-3.5 rounded-full bg-chalk" />
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-11 w-full items-center justify-between gap-3 py-1.5 text-left text-sm text-chalk"
      >
        <span>{t.line.collapsed(count)}</span>
        <span className="flex items-center gap-1 font-display text-lg font-semibold tracking-wider text-porcelain uppercase">
          <ChevronsUpDown aria-hidden className="size-4" strokeWidth={3} />
          {t.line.expand}
        </span>
      </button>
    </li>
  );
}

function HubRow({ analysis, index }: { analysis: Analysis; index: number }) {
  const { t, locale } = useI18n();
  const { anchor } = analysis.evidence;
  const rootCheck = analysis.checks.find((check) => check.id === "root");
  const matches = rootCheck?.status === "pass";
  const tone = anchor === null ? "text-chalk" : matches ? "text-green-text" : "text-scarlet-text";
  const StatusIcon = anchor === null ? Minus : matches ? Check : OctagonX;
  const status =
    anchor === null
      ? t.line.hubUnanchored
      : matches
        ? t.checks.result.root.pass
        : t.checks.result.root.fail;

  return (
    <li className="station-in relative pt-1 pb-4 pl-16" style={{ "--i": index } as CSSProperties}>
      <span className="rail-seg" data-end="true" />
      {/* El riel gira 45 grados hacia el círculo de enlace */}
      <svg aria-hidden viewBox="0 0 64 56" className="absolute top-6 left-0 h-14 w-16" fill="none">
        <path
          d="M20 0 V6 L40 26"
          stroke={anchor !== null && !matches ? "var(--color-scarlet)" : "var(--color-cobalt)"}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="42" cy="36" r="14" fill="var(--color-enamel)" stroke="white" strokeWidth="6" />
      </svg>
      <div className="flex min-h-14 items-start justify-between gap-3 pt-5">
        <div className="min-w-0">
          <p className="font-display text-2xl leading-none font-semibold tracking-wide uppercase">
            {t.line.hub}
          </p>
          <p className="mt-1 text-sm text-chalk">
            {anchor === null || anchor.anchoredAt === null
              ? t.line.hubUnanchored
              : `${anchor.network} · ${formatDateTime(anchor.anchoredAt, locale)}`}
            {anchor !== null && !matches && (
              <span className="mt-0.5 block text-scarlet-text">{t.line.hubMismatch}</span>
            )}
          </p>
        </div>
        <span
          className={`flex shrink-0 items-center gap-1.5 pt-0.5 font-display text-lg font-semibold tracking-wider uppercase ${tone}`}
        >
          <StatusIcon aria-hidden className="size-5" strokeWidth={2.75} />
          {status}
        </span>
      </div>
    </li>
  );
}

export function StationLine({ analysis }: { analysis: Analysis }) {
  const { t } = useI18n();
  const [expandedRuns, setExpandedRuns] = useState<ReadonlySet<number>>(new Set());
  const items = useMemo(
    () => buildItems(analysis.stations, expandedRuns),
    [analysis.stations, expandedRuns],
  );

  const openRun = (from: number) => setExpandedRuns((current) => new Set(current).add(from));

  return (
    <section aria-labelledby="line-title">
      <h2 id="line-title" className="font-display text-xl font-semibold tracking-wide">
        {t.line.heading}
      </h2>
      <ol className="rail mt-3">
        {items.map((item, index) =>
          item.kind === "run" ? (
            <RunRow
              key={`run-${item.from}`}
              count={item.count}
              index={index}
              onOpen={() => openRun(item.from)}
            />
          ) : (
            <StationRow key={item.station.seq} station={item.station} index={index} />
          ),
        )}
        <HubRow analysis={analysis} index={items.length} />
      </ol>
    </section>
  );
}
