---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/components/ui","src/app/verify","src/app/vault","src/app/employer","src/app/ledger"]
---

# Landing (`/`)

## Scope and mode
Public landing at `/`. Mode: **Persuade**. It establishes Constancia's new visual world (replacing the op-art world), which `/verify`, `/vault`, `/cv`, `/employer/**` and `/ledger` inherit (Operate surfaces: same world, more restraint). All UI copy in Spanish.

## Audience, job, action
- Who must act: banks, landlords and consulates holding a work letter; employers (HR); employees who need to prove one fact; hackathon judges on a projector.
- What they must believe: a constancia can prove itself in seconds, the holder shows one fact at a time, and no single company or public chain sits in the middle.
- Primary action, in working form: **drop a constancia** into the slot on the first viewport (hands the file to `/verify` via `src/lib/handoff.ts`). Secondary: **Abrir mi bóveda** → `/vault`; text link **Soy empleador** → `/employer`.
- Proof on the page: the five checks, selective disclosure, the consortium, the honest limits. No invented customers, numbers or logos.

## Direction contract
THESIS: Constancia is an institution with an identity manual, in the lineage of Venezuelan modernist identity programs (1960s–70s banks, museums, the Metro). One geometric mark, a C built from five segments, is the verifier: each segment is one check and closes as it passes. It refuses the navy shield, centred upload box and three feature cards.
OWN-WORLD: Pure white #FFFFFF and black #0A0A0A plus one institutional marigold #F2B705 that owns whole regions (Committed); no decorative greys. Verdict darks green #00703A and red #B0001F appear only on states. A neo-grotesk with point of view, heavy for display; mono only for hashes. Square corners, 2–4px black rules, strict modular grid, no shadows, no gradients, no rounded cards.
STORY: The visitor reads that a constancia proves itself, watches the mark close segment by segment, then drops a constancia or opens their vault.
FIRST VIEWPORT: Nav across the top under a 2px rule (spaced wordmark CONSTANCIA left; Verificar · Empleadores · Bóveda · Registro right). Left 5/12 is a full-height marigold block holding the five-segment mark with a numbered legend (1 Constancia · 2 Acreditado · 3 Firma · 4 Titular · 5 Registro). Right: a very large headline "Constancias que se prueban solas.", one lead line, and at the bottom a 4px-bordered drop slot "Suelta una constancia para verificarla" beside the stacked primary "Verificar una constancia", outline "Abrir mi bóveda" and link "Soy empleador".
RAISES: Fixed positions, state changes in place (from Contador nixie). Two values plus one colour, no decorative greys (from Datamática). Every result prints its measured value (from Forja). On the CV verificado, length equals exact duration on one axis (from Labanotación). One focal piece per screen, transitions announced (from Cartón de caricatura).
FORM: Programa de identidad, candidate 3 of 7 on the ordered list; seed:3a594abc139a9dbd. Composition: `.impeccable/mocks/decision/assigned.html` (code-led; no image generation this session).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Memorable moment (signature interaction)
**The mark closes.** At rest the mark shows its five segments in outline. When a constancia is dropped, segments fill black one by one in check order (fixed positions, never reordering), then the page moves to `/verify`, where the same mark resolves: all five filled on VÁLIDA, the failing segment hatched and named in the legend on NO VÁLIDA, an open dashed segment on NO SE PUEDE VERIFICAR AHORA. One orchestrated motion, ~120ms per segment, ease-out, no bounce. Reduced motion: instant fill. State is never colour alone: every state carries its word and its mark.

## Constraints
- Spanish UI. No wallet, gas or seed-phrase words outside "Detalles técnicos".
- Must read as clear and trustworthy; not crypto/Web3, not government bureaucracy, not a generic SaaS template.
- Projector-safe: text on marigold is black only; body text at least 17px; targets at least 48px.
