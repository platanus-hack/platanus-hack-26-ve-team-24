# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three audiences, one per human gesture the product is built around:

- **VER — team leads.** Watch a swarm of AI agents working in parallel and need to know, at a glance, that everything is sealed and anchored.
- **RESPONDER — security staff.** Get alerted (Telegram), investigate forensically, and stop a misbehaving agent with a kill switch.
- **COMPROBAR — auditors, customers, citizens.** Verify a report against the public anchor, without access to anything internal and without asking permission from anyone.

**Judges** open the demo on their own phones by scanning a QR code. Their first and main mobile surface is COMPROBAR (step 4 of the demo); VER and RESPONDER must also be usable at phone size.

A fourth, secondary audience: the team running the **Consola del Caos**, a standalone feature used to trigger the demo scenario (rogue agent, trace deletion). It is a demo tool, not a main product capability, and must not read as one.

## Product Purpose

AUDGENTIC is a chain of custody for the era of AI agents: an auditable black box. Agents already run code, access credentials and make decisions on their own, and their traces are the only evidence when something goes wrong, yet nothing guarantees those traces' integrity. A code-executing agent can rewrite its own history.

Success: what took months of forensic reconstruction (the 2026 Hugging Face agent incident) takes minutes, and evidence that could be forged becomes verifiable by anyone. Beyond incidents, it turns trust between humans and agents from faith into an informed decision.

## Positioning

"The one who records is not the one recorded." Telemetry is captured by the platform (harness / OpenTelemetry, egress gateway), never self-reported by the agent. Evidence is sealed in an isolated zone, rolled up into Merkle roots signed with post-quantum cryptography (ML-DSA), and only the 32-byte root is anchored on a public blockchain. Integrity is not home-made immutability; it is outsourced to the strongest consensus in the world. A neighbor that merely logs, or that stores logs in its own database, cannot truthfully claim this.

## Operating Context

- Each agent session forms a hash-chain (`seq` + `prev_hash`). Every 5 minutes a Merkle aggregator reduces everything to one root, signed and anchored on-chain (Sepolia testnet for the demo). The chain grows with the clock, not with actions.
- Independent witnesses replicate chain heads by gossip within seconds, so a compromised writer diverges from the majority.
- The forensic verifier recomputes hashes and compares them with the anchored root and the witnesses. A broken hash means alteration; a sequence gap means deletion, even if the content no longer exists. It can show what was deleted, when and from where.
- Live updates arrive over SSE (`/events`); the API is same-origin (`/api`), so no CORS.
- Demo script: (1) the swarm working, sealed and anchored live; (2) a rogue agent tries to exfiltrate data, detected live; (3) the rogue tries to erase its tracks, and the verifier flags the broken hash and sequence gap; (4) a judge verifies a report against the public anchor with no access to anything of ours.
- Event-driven, real-time data: alerts, chain state and anchoring status change while the user watches.

## Capabilities and Constraints

- Frontend: React 19 + Vite+ + Tailwind CSS 4 + TypeScript, served by the NestJS backend in production (one URL). Currently only a placeholder `App.tsx`; no visual implementation exists yet.
- Installable PWA, designed mobile-first (360–430px first, then expanding to desktop). Needs a web manifest (`display: standalone`, theme color, 192/512 icons with a maskable variant), a service worker, and HTTPS in deployment. Respect `viewport-fit=cover` and `env(safe-area-inset-*)`, `prefers-reduced-motion`, `prefers-color-scheme` and `prefers-contrast`.
- The service worker caches only the static shell. It never caches `/events` or `/api`: stale evidence would mislead. Offline, COMPROBAR must say plainly that it cannot verify against the anchor, and a cached result never passes as a current verification.
- The QR code must land directly on a public, no-login entry point that works on first load over mobile data.
- The public verification page must work without access to anything internal.
- Terminology to preserve: black box (caja negra), chain of custody, seal, hash-chain, Merkle root, anchor, witness, verifier, kill switch, rogue agent, Consola del Caos, VER / RESPONDER / COMPROBAR.
- The UI is bilingual (Spanish and English), Spanish by default, with a language selector. All user-facing copy must exist in both languages.
- No authentication in the demo: VER and RESPONDER are open, no login screens. Access control is future work.
- The Consola del Caos opens in a separate window or panel for the presenter, outside the main app; it has no entry in the main navigation.
- Hackathon timeline (Platanus Hack 26, Caracas, track AI Security): scope is bounded by `docs/viabilidad.md`.

## Brand Commitments

- Name: **AUDGENTIC** everywhere in the UI. "Trust" survives only as the internal repo/package name. The current logo (`../project-logo.png`) still says "Trust" and must be reviewed before use.
- Tagline: "La caja negra de los agentes de IA". Pitch line: "Nadie la usa todos los días, pero cuando algo sale mal es la única voz que no puede mentir."
- Core claim: "Lo que tomó meses debería tomar minutos — y lo que puede ser falsificado debería ser verificable por cualquiera."
- Stance: "No vendemos inmutabilidad casera: la subcontratamos al consenso más fuerte del mundo."

## Evidence on Hand

- Pitch and problem statement: `../project-description.md`; system architecture and anti-tampering protocol: `../docs/guia-del-sistema.md`; feasibility: `../docs/viabilidad.md`; decisions: `../docs/adr/`; roadmap: `../docs/roadmaps/`.
- Logo: `../project-logo.png`.
- Not available and must not be fabricated: real customers, testimonials, benchmarks, incident data beyond what the pitch states, pricing, uptime or anchoring statistics. Any numbers shown in the UI come from live or clearly labeled demo data.

## Product Principles

1. **Verifiable, not trusted.** Every claim on screen should be checkable by the viewer; show the evidence (hashes, roots, anchor, gaps) rather than asserting integrity.
2. **Three gestures, three audiences.** VER, RESPONDER and COMPROBAR each serve a different person under different pressure; do not blend them into one generic dashboard.
3. **Truth over reassurance.** A broken hash or sequence gap is surfaced plainly and early; the product never softens an alteration finding.
4. **Public verification needs no permission.** The COMPROBAR surface works for a stranger with no account and no internal context.
5. **The demo tool stays in its place.** The Consola del Caos exists to exercise the product and is kept visibly separate from the main experience.

## Accessibility & Inclusion

Standard: WCAG 2.2 AA. Text contrast at least 4.5:1, visible focus, touch targets at least 24px (aim for 44px on mobile). The public COMPROBAR page serves non-technical visitors (customers, citizens), so verification results must be understandable without cryptography knowledge. Alerts must not rely on color alone.
