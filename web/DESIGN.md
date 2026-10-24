---
name: COMPROBAR
description: Public verification surface for AUDGENTIC sessions, drawn as a midnight-blue transit line with porcelain proof panels.
colors:
  enamel-950: "#070c22"
  enamel: "#0b1230"
  enamel-raised: "#121b42"
  enamel-line: "#2b3a72"
  enamel-edge: "#6577b5"
  chalk: "#b9c3e6"
  porcelain: "#ffffff"
  porcelain-dim: "#eef1f8"
  ink: "#0b1230"
  ink-soft: "#3d4a78"
  cobalt: "#1e5bff"
  cobalt-text: "#93b3ff"
  green: "#22b14c"
  green-text: "#62dc88"
  scarlet: "#e21d2d"
  scarlet-text: "#ff8088"
  amber: "#ffc20e"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "0.025em"
  headline:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.025em"
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.025em"
  body:
    fontFamily: "Public Sans Variable, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.375
  label:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.55
    letterSpacing: "0.05em"
  hash:
    fontFamily: "JetBrains Mono Variable, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.625
rounded:
  none: "0px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.porcelain}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "#3a70ff"
  button-primary-active:
    backgroundColor: "#1748cc"
  button-primary-disabled:
    backgroundColor: "{colors.enamel-line}"
    textColor: "{colors.chalk}"
  chip-sample:
    backgroundColor: "{colors.enamel}"
    textColor: "{colors.porcelain}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "44px"
  chip-sample-hover:
    backgroundColor: "{colors.enamel-raised}"
  input-session:
    backgroundColor: "{colors.enamel-950}"
    textColor: "{colors.porcelain}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "48px"
  verdict-verified:
    backgroundColor: "{colors.green}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
  verdict-altered:
    backgroundColor: "{colors.scarlet}"
    textColor: "{colors.porcelain}"
    rounded: "{rounded.none}"
  verdict-deleted:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
  verdict-unverifiable:
    backgroundColor: "{colors.enamel-line}"
    textColor: "{colors.porcelain}"
    rounded: "{rounded.none}"
  proof-panel:
    backgroundColor: "{colors.porcelain}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 20px"
  language-switch-active:
    backgroundColor: "{colors.porcelain}"
    textColor: "{colors.ink}"
    height: "44px"
    width: "44px"
---

# Design System: COMPROBAR

## Overview

**Creative North Star: "The Midnight Transit Line"**

A session is a transit line. Each event is a station in order, the anchor is the interchange, and a missing station cuts the line. The ground is midnight-blue enamel; the technical proof sits on porcelain-white panels like a printed timetable; line inks carry state. The look is wayfinding signage, built to be read at a glance on a phone reached by QR. The build refuses the dark-green-and-red security dashboard and the crypto neon look.

Density is compact and mobile-first (390px is the design width). Every edge is square except the circles that are stations. There is no gloss and no shadow: the enamel is matte by design, and depth comes from flat tonal planes, hairlines and the porcelain swap.

**Key Characteristics:**
- Signature move: the session drawn as a vertical line of stations. Altered (scarlet) and missing (dashed amber) stations push the line sideways with 45-degree jogs, and the line ends in a 45-degree bend into the anchor interchange circle.
- State is a line ink: green verified, scarlet altered, amber deleted, cobalt for the chain and for primary actions.
- State is never colour alone: every state pairs a colour with an icon, a shape and a text label.
- Porcelain panels are reserved for technical proof (hashes, payloads, anchor facts).
- Condensed transit sans for labels and verdicts, humanist sans for reading, mono only for hashes and IDs.

## Colors

Midnight enamel ground, porcelain paper, four line inks. Chroma lives only in the state inks and the cobalt.

### Primary
- **Chain Cobalt** (`cobalt`): the intact chain rail, the COMPROBAR submit button, links and copy actions on porcelain, the wordmark glyph. Never a state of its own.
- **Cobalt Glow** (`cobalt-text`): cobalt for text and focus rings on the dark ground, where plain cobalt would be too dim.

### Secondary (state inks)
- **Verified Green** (`green`): verified verdict plate. **Green Text** (`green-text`) is the text-on-enamel variant for stations and check results.
- **Altered Scarlet** (`scarlet`): altered verdict plate, altered diamond marker, jog rail, flagged hash background. **Scarlet Text** (`scarlet-text`) for text on enamel.
- **Deleted Amber** (`amber`): deleted verdict plate, the dashed cut rail, out-of-service station ring, the missing-events band, text selection.

### Neutral
- **Midnight Enamel** (`enamel`): page ground. **Enamel Deep** (`enamel-950`) for the input well; **Enamel Raised** (`enamel-raised`) for hover and the loading banner; **Enamel Line** (`enamel-line`) for hairlines, grid gutters and the unverifiable plate; **Enamel Edge** (`enamel-edge`) for control borders.
- **Chalk** (`chalk`): secondary text on enamel and the collapsed-run dot.
- **Porcelain** (`porcelain`) and **Porcelain Dim** (`porcelain-dim`): proof-panel paper and primary text on enamel. **Ink** (`ink`) and **Ink Soft** (`ink-soft`): text on porcelain and on green or amber plates.

### Named Rules
**The Ink Means State Rule.** Green, scarlet and amber appear only to state a verdict, a station, a check or a flagged hash. Never as decoration or hover accent.
**The Never Colour Alone Rule.** Every state carries an icon, a shape and a label as well as its ink: check, octagon-X and triangle for verdicts; ringed circle, scarlet diamond and dashed circle for stations; dashed against solid rail.
**The Porcelain Is Proof Rule.** Porcelain surfaces hold technical evidence only. Controls and narrative stay on enamel.
**The Dark-Ground Text Rule.** On enamel, state text uses the `-text` variants; the pure inks are for fills, markers and rails.

## Typography

**Display Font:** Barlow Condensed (500/600/700, with Arial Narrow)
**Body Font:** Public Sans Variable (with system-ui)
**Label/Mono Font:** JetBrains Mono Variable, hashes, payloads and the session ID input only

**Character:** A signage condensed voice for verdicts and state words against a plain humanist text face. Numbers are tabular throughout. All self-hosted via @fontsource.

### Hierarchy
- **Display** (700, 2.25rem rising to 3rem at 640px, 0.95, uppercase, +0.025em): the verdict title; the loading title runs 3rem.
- **Headline** (600, 1.5rem, 1, uppercase for the anchor name and proof toggle at +0.025em): interchange name, proof toggle.
- **Title** (600, 1.25rem, +0.025em): section headings and the form label.
- **Body** (400 and 600, 1rem and 0.875rem, 1.375): sentences, station titles, details. Reading width capped at 48ch in the verdict, 60ch in proof explanation.
- **Label** (600, 1.125rem, +0.05em, uppercase): state words next to icons, button text (1.25rem), language toggle.
- **Hash** (mono, 0.75rem, 1.625, break-all): sealed and recomputed hashes, payload JSON.

### Named Rules
**The Mono Is For Hashes Rule.** JetBrains Mono carries hashes, payloads and the ID field only; it never labels or decorates.
**The Words Are Condensed Rule.** State words and verdicts are Barlow Condensed uppercase; sentences are Public Sans sentence case.

## Layout

Single column on mobile in DOM reading order: form, verdict, checks, then the station line and proof panel. At `lg` (1024px) a two-column grid, `minmax(0,26rem)` left (form, verdict, checks) and fluid right (line, proof), with a 48px gap, inside a `max-w-6xl` container. Page padding is 16px, 24px from 640px. Vertical rhythm between blocks is 24px; controls are at least 44px high (inputs and the submit button 48px). Safe-area insets are applied to the body.

The checks are a compact 2x2 grid with 1px enamel-line gutters on mobile and a ruled list on desktop. The station line uses a fixed left gutter: rail centred at 1.25rem, intact stations indented 48px, anomalies 56px, interchange 64px.

Known deviation: at 390x844 the first anomaly row sits just below the fold, because the 2x2 checks grid outranks it in the first viewport. The checks justify the verdict, so the order is kept.

## Elevation & Depth

Flat. There are no shadows. Depth comes from tonal planes (enamel, enamel-raised, enamel-950), 1 to 2px hairlines in enamel-line, and the swap to porcelain for proof. The only inset device is the signage plate: a 2px inner keyline 6px inside the verdict banner, drawn at 60% of the current text colour. There is no enamel gloss, by design.

### Named Rules
**The Flat Enamel Rule.** No shadows, gradients or glow. A surface is raised by tone or by a hairline, never lit.

## Shapes

Square by default (0px radius): buttons, input, chips, plates, panels and the language toggle all have hard corners. Circles are reserved for stations, the verdict roundel and the interchange. Geometry has two bend angles: straight verticals and 45-degree jogs. Borders are 2px on controls and 1px on rules. Rail is 8px wide; rail ends are fully rounded caps.

Station markers: intact is a 24px circle with a 5px porcelain ring on enamel; altered is a 20px scarlet diamond (rotated square) with a 3px porcelain border; missing is a 24px circle with a 3px dashed amber ring on enamel. A run of unchanged stations collapses to a small chalk dot with an expand control.

## Components

### Buttons
- **Shape:** square (0px), 48px high, joined flush to the input on one edge.
- **Primary:** cobalt fill, porcelain text in Barlow Condensed 1.25rem uppercase, trailing arrow icon, 16px side padding.
- **Hover / Active:** lightens to `#3a70ff`, deepens to `#1748cc`; colour transition only.
- **Disabled / Loading:** enamel-line fill, chalk text; spinner replaces the arrow (static under reduced motion).
- **Focus:** 3px cobalt-text outline with 2px offset on enamel; plain cobalt inside porcelain panels.

### Chips
- **Style:** square, 2px enamel-edge border, porcelain text at 0.875rem 600, 44px high. Two sample chips under the form (intact and tampered, synthetic data).
- **State:** hover swaps to a porcelain border and enamel-raised fill.

### Inputs / Fields
- **Style:** 2px enamel-edge border (no right border where it meets the button), enamel-950 fill, mono 1rem, 48px high. Autocorrect, capitalisation and spellcheck are off.
- **Focus:** the global outline.

### Navigation
- Header: wordmark (cobalt bent-line glyph with ringed station plus AUDGENTIC in Barlow Condensed 700, +0.14em) left, ES/EN toggle right, over a 2px enamel-line rule. The toggle is a 2px enamel-edge bordered pair; the active option inverts to porcelain with ink text (`aria-pressed`).

### Verdict Plate (signature)
Full-width banner filled with the verdict ink, inner keyline, a porcelain roundel holding the state icon, a condensed uppercase title, one plain-language sentence, and a timestamp. A missing-events line or an amber band names the gaps; when both altered and deleted, an amber band closes the plate. The unverifiable verdict uses the enamel-line plate with a question icon.

### Station Line (signature)
A vertical `ol` with a drawn-in rail (clip-path reveal, 900ms) and staggered station entrance (520ms, 38ms step, capped at 14, out-expo). Each row is a 44px-minimum disclosure button holding the station number, the event title and a state label with icon (check, octagon-X, triangle). Altered stations open by default and show a porcelain detail block with sealed and recomputed hashes; the recomputed value is flagged on scarlet. Missing stations are not expandable and read as out of service. The interchange row names the anchor network and time and carries a status of verified, mismatched or unanchored.

### Proof Panel
Porcelain block with a full-width 56px toggle in Barlow Condensed 1.5rem uppercase. Open state lists the explanation, found root, expected root, a facts list on 15% ink hairlines, and a cobalt underlined explorer link. Opens via `?proof=open`.

### Hash Value
Label, a cobalt copy action with icon and live feedback text (copied or failed), and the hash in mono, break-all. A flagged hash takes a scarlet fill with porcelain text.

## Do's and Don'ts

### Do:
- **Do** express every state as ink plus icon plus label; keep altered as diamond and scarlet, missing as dashed amber.
- **Do** keep proof (hashes, payloads, anchor facts) on porcelain and everything else on enamel.
- **Do** draw new structure with straight verticals and 45-degree jogs, and keep circles for stations.
- **Do** keep corners square and the surface flat; use tone and 2px hairlines to separate.
- **Do** use `-text` ink variants for text on enamel and keep touch targets at 44px or more.
- **Do** honour `prefers-reduced-motion` and `prefers-contrast: more` (enamel-line lifts to `#8f9fd6`, chalk to white).

### Don't:
- **Don't** use state inks for decoration, or use cobalt to signal a verdict.
- **Don't** convey state by colour alone.
- **Don't** add shadows, gloss, gradients or neon glow.
- **Don't** round buttons, panels or inputs; do not use mono for labels.
- **Don't** reuse this system for the PWA manifest and service worker, the Consola del Caos, or the logo: they are not yet part of it and need their own decisions.
