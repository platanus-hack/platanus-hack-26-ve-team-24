# COMPROBAR

Mode: Operate. Public verification surface, mobile-first (QR entry), bilingual es/en.

Audience, job, task: judge, auditor or citizen pastes a session ID (or taps a sample) and sees whether the evidence is intact, altered, deleted or unverifiable, recomputed in their own browser, with the proof one tap away. Constraints: PRODUCT.md. Data comes through a typed source interface; fixtures are synthetic and labelled so; the backend will implement the anchor endpoint later.

## Direction contract

THESIS: A session is a transit line. Each event is a station in order, the anchor is the interchange, and a missing station cuts the line. Refuses the dark-green-and-red security dashboard and the crypto neon look.

OWN-WORLD: Midnight-blue enamel ground, porcelain-white proof panels, line inks as state: green intact, scarlet altered, amber deleted, cobalt chain and controls. Condensed transit sans for labels and verdicts, humanist sans for reading, mono only for hashes. Lines bend at 45 and 90 degrees. Stations are ringed circles. Recognisable with content removed.

STORY: The visitor understands in seconds whether the record is whole, believes it because their own phone recomputed it, and can open the proof to check the numbers against the public anchor.

FIRST VIEWPORT: 390px wide. AUDGENTIC wordmark and ES/EN toggle on top. Session ID field with a cobalt COMPROBAR button and two sample chips. Below, one full-width signage-plate verdict banner in the state colour with a plain-language sentence and, when events are missing, an amber band naming them. Then a compact 2x2 grid of the four checks. The station line begins at the fold (heading and the folded run of unchanged stations); the first anomaly row sits just below the fold on 844px. Accepted trade-off: the checks that justify the verdict outrank the anomaly row in the first viewport. Desktop: form, verdict and checks in a left column, line and proof panel on the right.

FORM: challenger wayfinding-cartography-signage-midnight-transit-diagram, won both axes in the roll; seed: 83bb245477601335 (rerolled once, round 1). Signature move: the session drawn as a line of stations, and a gap shown as an out-of-service station.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved

- Witnesses are not in the API; they are not shown or claimed.
- The anchor endpoint `GET /api/sessions/:id/anchor` is a contract the backend owes.
- PWA manifest and service worker come in a later pass.
