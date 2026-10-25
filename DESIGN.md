---
name: Constancia
description: Employment letters that prove themselves. A modernist identity program in white, black and one institutional marigold; a five-segment C is the verifier.
colors:
  paper: "#ffffff"
  ink: "#0a0a0a"
  ink-muted: "#4d4d4d"
  rule: "#d4d4d4"
  marigold: "#f2b705"
  ok: "#00703a"
  fail: "#b0001f"
  focus: "#0a0a0a"
typography:
  display:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3.25rem, 1.75rem + 4.6vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 1.4rem + 2vw, 3.25rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
  lead:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 400
    lineHeight: 1.4
  body:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: 1.45
  wordmark:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 800
    letterSpacing: "0.32em"
  mono:
    fontFamily: "Red Hat Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.92em"
    fontWeight: 400
    fontFeature: "'tnum' 1"
rounded:
  none: "0px"
spacing:
  gutter: "clamp(1.25rem, 4.4vw, 3.5rem)"
  row: "16px"
  block: "24px"
  group: "48px"
  section: "96px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 24px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 24px"
    height: "48px"
  button-secondary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-disabled:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.none}"
    height: "48px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "8px 12px"
    height: "48px"
  drop-slot:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "24px"
  drop-slot-dragging:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  seal-region:
    backgroundColor: "{colors.marigold}"
    textColor: "{colors.ink}"
    padding: "40px {spacing.gutter}"
  verdict-valid:
    backgroundColor: "{colors.ok}"
    textColor: "{colors.paper}"
    typography: "{typography.display}"
  verdict-invalid:
    backgroundColor: "{colors.fail}"
    textColor: "{colors.paper}"
    typography: "{typography.display}"
  verdict-unavailable:
    backgroundColor: "{colors.marigold}"
    textColor: "{colors.ink}"
    typography: "{typography.display}"
  chip:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.none}"
    size: "36px"
  claim-hidden:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    padding: "8px 12px"
---

# Design System: Constancia

## Overview

**Creative North Star: "Programa de identidad"**

Constancia is drawn as an institution with an identity manual, in the lineage of Venezuelan modernist identity programs of the 1960s and 70s: banks, museums, the Caracas Metro. The whole system rests on one geometric mark, a C built from five segments on a 6x6 module grid, and that mark is not decoration: it is the verifier. Each segment is one check, in fixed order (Constancia, Acreditado, Firma, Titular, Registro), and it changes state in place. It never moves, never reorders.

The palette is two values plus one colour. Pure white paper and near-black ink carry everything; an institutional marigold owns whole regions (the seal column, the closing footer band, the "no se puede verificar ahora" verdict) and is never used for small text. Green and red exist only to report a verdict. Structure comes from black rules at 2, 3 and 4px, a strict 12-column grid and square corners everywhere. There are no shadows, no gradients and no rounded corners; the Tailwind theme resets `--radius-*`, `--shadow-*` and the default colour palette so they cannot be reached for.

Density is calm and projector-safe: body text never below 17px, targets at least 48px, one focal piece per screen. Operate surfaces (`/verify`, `/vault`, `/cv`, `/employer`, `/ledger`) inherit the same world with more restraint: the marigold seal column appears where a check result is the subject, and white with black rules elsewhere.

**Key Characteristics:**
- One mark, five segments, one check per segment; state changes in place.
- White, black, one marigold; verdict green and red only on states.
- Square corners, black rules of 2 / 3 / 4px, no shadows, no gradients.
- Heavy neo-grotesk display, mono only for hashes and IDs.
- State is never colour alone: every state carries a word and a drawn mark.

## Colors

Two values and one institutional colour, plus two verdict darks that only ever speak about a result.

### Primary
- **Institutional Marigold** (marigold): the program's colour. It fills whole regions: the 5/12 seal column on the landing and on `/verify`, the closing footer band, the UNAVAILABLE verdict field, status notices, the CHECKING and UNAVAILABLE chips, and text selection. Text on marigold is always ink.

### Neutral
- **Paper White** (paper): the page and every surface. Also the text colour on ink and on verdict fields.
- **Program Black** (ink): all text, every structural rule, primary buttons, filled seal segments, the inverted "Muestra un dato" band, the hidden-claim bar and the focus ring.
- **Secondary Grey** (ink-muted): secondary text only: hints, details, measured values, placeholders, and the disabled state. 8.4:1 on paper, 4.9:1 on marigold. Never a fill.
- **Hairline** (rule): 2px separators between rows inside a list that is already framed by black rules, and the quiet panel border. Never text.

### Verdict
- **Verdict Green** (ok): VERIFIED chips and the VÁLIDA verdict field; also status words in text on paper.
- **Verdict Red** (fail): FAILED chips, the NO VÁLIDA verdict field, field error borders and error text.

### Named Rules
**The Two Values and One Colour Rule.** Paper, ink and marigold are the world. Green and red appear only where a result is being reported; there are no decorative greys, tints or extra accents, and the theme does not expose any.

**The Marigold Region Rule.** Marigold owns areas, not details: a column, a band, a verdict field, a status notice, a state chip. It never colours text, rules or icons, and text set on it is always ink.

## Typography

**Display Font:** Schibsted Grotesk (with ui-sans-serif, system-ui)
**Body Font:** Schibsted Grotesk
**Label/Mono Font:** Red Hat Mono, for hashes, DIDs, IDs and measured values only

**Character:** a neo-grotesk with point of view, set extra-bold and tight for display so a headline reads like a sign; the same family at regular weight carries body text. Mono is data, not voice.

### Hierarchy
- **Display** (800, clamp 52px to 96px, 0.95, -0.035em): the landing headline and the verdict word. Measure capped near 12ch, balanced.
- **Headline** (800, clamp 32px to 52px, 1, -0.03em): section titles, page headers, the footer call, the verdict word on small screens. Capped near 18ch.
- **Title** (700, 24px, 1.2): check-row labels, panel and receipt titles, timeline employers.
- **Lead** (400, 22px, 1.4): the one paragraph under a display or headline. 40 to 60ch.
- **Body** (400, 17px, 1.55): running text, capped at 65ch, `text-wrap: pretty`.
- **Label** (700, 15px): field labels, legend entries, receipt keys. Status words use it in uppercase with wide tracking; that is the only uppercase in the system besides the wordmark.
- **Mono** (Red Hat Mono, 0.92em, tabular numerals): hashes, keys and IDs, middle-shortened when long, with copy-on-click where useful.

### Named Rules
**The Status Word Rule.** Uppercase, bold, tracked small text is reserved for a state word printed next to its chip or segment (VERIFICADO, FALLÓ, NO DISPONIBLE). It never sits above a heading as a label.

**The Mono Is Data Rule.** Red Hat Mono appears only on machine values. Headings, buttons and prose never use it.

## Layout

A strict 12-column modular grid at `md` and up. Signature split: a 5/12 marigold seal column, full height, holding the mark and its numbered legend, beside a 7/12 white content column. Horizontal padding is one fluid gutter (20px at 390 to 56px wide); the content column adds 64px at `lg`.

Spacing keeps Tailwind's 4px scale and breathes on 24 / 48 / 96: rows pad 16 to 24px, groups separate by 48px, landing sections pad 96px top and bottom. Headings get more space above than below. Lists are tabular: numbered rows with fixed columns (index, chip, label, status) separated by 2px black rules, closed with a 2px bottom rule. Below `md` the split stacks, the seal shrinks (320 to 176px on the landing, 256 to 144px in `/verify`) and the nav wraps under the wordmark.

**The Fixed Position Rule.** Rows, segments and checks keep their position through every state. Results replace in place; nothing reorders or slides to announce a change.

## Elevation & Depth

Completely flat. There are no shadows of any kind; the theme resets `--shadow-*`, `--inset-shadow-*` and `--drop-shadow-*`. Hierarchy comes from rule weight (4px for a frame or a section break, 3px for a control, 2px for a row), from inversion (an ink band, an ink hidden-claim bar, an inverted drop slot while dragging) and from marigold regions.

**The Rule Weight Rule.** Depth is drawn, not cast: a heavier black rule means a more important boundary. A section starts with a 4px top rule; rows inside it divide with 2px.

## Shapes

Square everywhere: zero radius on buttons, inputs, panels, chips, the drop slot and the seal segments (`--radius-*` is reset). Lines are square-capped and miter-joined, including drawn marks (check, cross, exclamation, dash, plus/minus). Hatching at 45 degrees is the one texture: it marks a failed seal segment and a gap in the employment timeline. Dashed borders mean "open": an unavailable or unexamined segment, an unexamined chip, a disabled control.

## Components

### Seal (signature)
The five-segment C on a 6x6 grid, painted with `currentColor` so the parent's text colour draws it. Stroke scales with size (size / 32, minimum 2px). Segment states: outlined (pending), filled (checking, verified, done), 45-degree hatched (failed), dashed (unavailable), dashed at 40% (not examined). Checking blinks in two hard steps (0.8s). Changes animate background and border in 240ms on the resolve ease, staggered by segment index (120ms on the landing close). Under reduced motion, changes are instant and nothing blinks. The **legend** below it is a five-column numbered list, each entry under a 4px rule, printing the state word once a state exists.

### Wordmark
The closed seal at 24px beside CONSTANCIA in extra-bold body size, tracked 0.32em. Top-left of every nav, sitting under a 2px ink rule.

### Verdict
A 4px ink frame. Inside, a field in green (VÁLIDA), red (NO VÁLIDA) or marigold (NO SE PUEDE VERIFICAR AHORA) holds a 112px seal and the verdict word at display size. The colour wipes in once from the seal side, a 600ms `clip-path` on the resolve ease, then a status region announces it. Reason and issuer sit below a 4px rule. This is the page's one motion.

### Buttons
- **Shape:** square (0px), 3px ink border, 48px minimum height, 24px horizontal padding, bold body text.
- **Primary:** ink fill, paper text.
- **Secondary:** paper fill, ink text.
- **Hover:** the two invert into each other (150ms colour transition). Focus is the global 3px ink outline offset 3px.
- **Quiet:** transparent border, underline on hover.
- **Disabled:** dashed ink-muted border, paper fill, ink-muted text, no pointer events. Disabled is drawn as "open", never only faded.

### Inputs / Fields
- **Style:** 2px ink border, paper fill, square, 48px minimum, 8px by 12px padding, body size. Bold label above, ink-muted hint below.
- **Focus:** global 3px ink outline.
- **Error:** border turns fail red; a bold red message with a drawn square-capped cross, announced as an alert.

### Drop slot
A paper field with a 4px ink border and an extra-bold label. When a file is dragged anywhere over the page it inverts to ink with paper text and a 4px marigold outline at 6px offset. Disabled: dashed ink-muted border and ink-muted text (the same open treatment as buttons), not-allowed cursor.

### Check list and chips
Numbered rows on 2px ink rules: index, a 36px square chip with a drawn 3px mark, a title-size label with ink-muted detail, and on the right the uppercase status word plus the measured value in mono. Chip fills: paper (pending), marigold blinking (checking), green with check (verified), red with cross (failed), marigold with exclamation (unavailable), dashed muted with dash (not examined), ink with check (done).

### Claim list
Two-column rows on 2px ink rules. Shown claims sit in a 2px ink box. Hidden claims are a solid ink bar reading OCULTO, and their value never reaches the DOM. Toggleable claims use a 32px square with a 3px border that fills ink with a check when shared.

### Navigation
Wordmark left, four bold links right (Verificar, Empleadores, Bóveda, Registro), 48px targets, no underline at rest, underline on hover. A 2px ink rule closes the bar. On small screens the links wrap under the wordmark in small size.

### Containers
Panels: 2px ink border, 24px padding, title in extra-bold title size; a quiet tone swaps the border for the hairline. Receipts: a 4px top rule, then label/value rows on hairlines, values in mono where they are machine data. Disclosures: 2px top rule, bold summary, a drawn plus that loses its vertical stroke when open.

### Timeline
A 3px ink spine through the centre of the chip column. Overlapping employment doubles the spine; a gap breaks it with a hatched 2px-bordered block labelled "Sin empleo · N meses".

## Do's and Don'ts

### Do:
- **Do** keep every surface on paper, ink and marigold; use ok and fail only on verdicts, chips and status words.
- **Do** give marigold whole regions (the 5/12 seal column, a band, a verdict field) and set only ink on it.
- **Do** frame and divide with black rules: 4px for frames and section breaks, 3px for controls, 2px for rows.
- **Do** print every state as a word plus a drawn mark, and keep it in its fixed position.
- **Do** use the resolve ease (cubic-bezier(0.16, 1, 0.3, 1)) for the seal and the verdict wipe, and make both instant under reduced motion.
- **Do** keep body text at 17px or more and every target at 48px or more.
- **Do** set hashes, keys and IDs in Red Hat Mono with tabular numerals, shortened in the middle when long.

### Don't:
- **Don't** use rounded corners, shadows or gradients; the theme deliberately does not provide them.
- **Don't** set marigold as text, rule or icon colour, or put white text on marigold.
- **Don't** introduce greys beyond ink-muted (secondary text) and rule (hairlines), or use either as a fill.
- **Don't** place an uppercase label or kicker above a heading; uppercase tracking is for status words only.
- **Don't** reorder, slide or reflow checks to show progress; segments and rows change state in place.
- **Don't** show a state through colour alone, or a disabled control through opacity alone.
- **Don't** use glyph or icon-font icons; marks are drawn square-capped SVG strokes.
