import type { Messages } from "./es";

export const en: Messages = {
  app: {
    name: "AUDGENTIC",
    section: "Verify",
  },
  lang: { label: "Language", es: "ES", en: "EN" },
  form: {
    label: "Session ID",
    placeholder: "Paste the session ID",
    submit: "Verify",
    loading: "Verifying…",
    samples: "Try an example",
    sampleIntact: "Intact example",
    sampleTampered: "Tampered example",
    synthetic: "Synthetic demo data.",
  },
  loading: {
    title: "Verifying",
    body: "Downloading the events, recomputing the hashes on this device and reading the public anchor.",
  },
  verdict: {
    heading: "Result",
    verified: {
      title: "Verified",
      body: "No event changed and none is missing. The root your device computed matches the one anchored on the public chain.",
    },
    altered: {
      title: "Altered",
      body: "At least one event no longer matches what was sealed: its content was modified afterwards.",
    },
    deleted: {
      title: "Deleted",
      body: "Events are missing from the sequence: someone removed them. The gap is still evidence.",
    },
    altered_deleted: {
      title: "Altered and deleted",
      body: "Some events were modified and some were removed. This record cannot be treated as intact.",
    },
    unverifiable: {
      title: "Cannot be verified",
      not_found: "No session exists with that ID. Check that it is complete.",
      offline:
        "Without a connection it cannot be checked against the public anchor. This does not mean the record was altered.",
      error: "The evidence could not be read. Try again; this is not an integrity failure.",
      not_anchored:
        "The chain is consistent, but this session has not been anchored on the public chain yet.",
      not_confirmed:
        "The server reports an anchor, but the public chain does not confirm it from this device.",
    },
    checkedAt: (when: string) => `Checked here · ${when}`,
    missing: (list: string, count: number) =>
      count === 1 ? `Event ${list} is missing` : `Events ${list} are missing`,
  },
  checks: {
    heading: "Checks",
    chain: "Hash chain",
    sequence: "Complete sequence",
    root: "Merkle root",
    anchor: "Public anchor",
    result: {
      chain: { pass: "Matches", fail: "Broken", unavailable: "No data" },
      sequence: { pass: "Complete", fail: "Incomplete", unavailable: "No data" },
      root: { pass: "Matches", fail: "Mismatch", unavailable: "No data" },
      anchor: { pass: "Confirmed", fail: "Unconfirmed", unavailable: "No anchor" },
    },
    sequenceValue: (found: number, expected: number) => `${found} of ${expected} events`,
  },
  line: {
    heading: "The session, station by station",
    station: (seq: number) => `Event ${seq}`,
    ok: "Matches",
    altered: "Altered",
    missing: "Out of service",
    missingNote: "Event deleted",
    hub: "Interchange · public anchor",
    hubUnanchored: "Not anchored",
    hubMismatch: "Root differs from the anchored one",
    collapsed: (count: number) =>
      count === 1 ? "1 unchanged station" : `${count} unchanged stations`,
    expand: "Show",
    collapse: "Hide",
  },
  proof: {
    heading: "The proof",
    open: "View the technical proof",
    close: "Hide the technical proof",
    sealed: "Sealed hash",
    recomputed: "Hash recomputed here",
    expectedRoot: "Anchored root",
    foundRoot: "Recomputed root",
    anchoredAt: "Anchored on",
    network: "Network",
    contract: "Contract",
    explorer: "View on the explorer",
    copy: "Copy",
    copied: "Copied",
    copyFailed: "Could not copy",
    none: "—",
    explain:
      "Anyone can repeat this calculation: each event's hash is recomputed with SHA-256 and all of them are reduced to a Merkle root.",
  },
  empty: {
    title: "Check it yourself",
    body: "Your device recomputes the chain of events and compares it with the root anchored on the public chain. You do not have to trust anyone.",
  },
};
