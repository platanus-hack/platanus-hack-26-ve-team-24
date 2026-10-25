# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Employers (issuers).** HR and payroll staff at a company or institution that the consortium has accredited. Not technical, never touched a wallet. Job: answer an employee's request for a work certificate in under a minute, accurately, without handing out a PDF anyone can edit.
- **Holders.** Employees and former employees, including the Venezuelan diaspora who must prove their work history abroad. They keep their certificates in a vault in their own browser and decide who sees what. They never meet a wallet, a fee or a seed phrase.
- **Verifiers.** Banks, landlords, consulates, recruiters. They receive a link or a QR and need a trustworthy yes on exactly the fact they asked about, in seconds, with no account and no call to the employer.
- **Consortium members.** The organizations that govern the ledger: they decide, by quorum, which employers are accredited. In the demo they are fictional: a chamber of commerce, a bank, a university, a ministry.
- **Evaluation context.** Built in 20 hours for Platanus Hack 26 Caracas. Judges weigh technical depth, impact, originality, ambition and execution, and see the product in a 3-minute live demo.

## Product Purpose

Constancia turns a work letter into a credential that proves itself and shows only what the holder chooses. Success: a bank opens a link and gets a trustworthy yes about one fact while every other claim stays hidden; a forged or edited letter always fails at a named check; an employee's whole career fits in one Verified CV that cannot be spliced or trimmed after sealing.

## Positioning

Work letters ("constancias de trabajo") are forged in minutes and trusted anyway. Constancia is a hybrid no plain PDF, single-company database or public chain can claim honestly:

- The certificate is a W3C Verifiable Credential (VC Data Model 2.0) secured with **SD-JWT**: every personal claim sits behind a salted hash, and the holder reveals only the ones they choose. This is selective disclosure, not a cryptographic zero-knowledge proof, and we say so.
- The root of trust is **accreditation by a consortium**, recorded on a public testnet ledger (Sepolia) in a consortium contract, open to read. The employer's DID document is resolved from that ledger. There is no domain to own and no single company to trust.
- The ledger stores only hashes, the issuer's account and a time. No name, no claim, no certificate.
- **Account abstraction** (ERC-4337) gives HR an organization account controlled by device keys: no wallet, no fee, several devices per organization. One consortium sponsor wallet pays all gas through our paymaster, so no user ever pays or sees a fee.
- Every request produces a **fresh certificate bound to a fresh key**. Joining them produces a **Verified CV**: each certificate's own key signs the hash of the whole set, so nobody can add a job that is not theirs or drop one after sealing.
- Verification runs in the verifier's browser. The server sees an issuer, a key id and a hash, and stores only ciphertext: delivery to the holder is end-to-end encrypted, and share links keep their key in the URL fragment.

## Operating Context

- Employer flow: create an organization account on a device key → apply to the consortium → members approve → issuing unlocks → an employee's request arrives → review, issue → the certificate is signed, written to the ledger as a hash, encrypted to the holder, and delivered.
- Holder flow: request a certificate from an accredited employer (employee number, current or past) → it arrives in the vault → share with a template ("Proof of employment", "Proof of income", …) and a live preview of what the reader will see → or attach several certificates and create a Verified CV.
- Verifier flow: open the share link or drop the file → five checks pass or fail in sequence (certificate, employer accredited, signature, bound to its holder, ledger record) → read only the claims the holder chose, plus how many remain hidden.
- Demo context: projector, live network, 3 minutes, judges watching the verifier react in real time.

## Capabilities and Constraints

**In the MVP**
- Employer onboarding with a device key, a smart account, consortium accreditation by quorum, and an issuing lock until accredited.
- Holder vault, per-request keys, end-to-end encrypted delivery, selective sharing by link and QR.
- Employer-side issuing, listing and **revocation**.
- A public, client-side verifier with five sequential checks and a privacy receipt of what left the browser.
- The Verified CV: attach, verify, timeline with gaps and overlaps, seal, share.
- The Fake Letter Lab: four forgeries, each failing at a named check.
- A public `/ledger` page showing blocks, members, accredited employers and anchored hashes.
- A database holding only public keys, an opaque employee number and ciphertext.
- **PWA support**: the app can be installed from the browser to the home screen. Still open: whether anything works offline (the vault, the verifier) and which surfaces get an install prompt. It stays a web app, not a native one.

**Out of the MVP (decided)**
- Identity proofing of employees; HRIS, payroll or bank integrations.
- True zero-knowledge predicates (BBS+ or ZK proofs).
- Holder multi-device recovery; native apps.
- Validator governance UI, Merkle batching of anchors, federation between consortia.
- A printable PDF letter and verifier-challenge mode (stretch goals).
- Pricing, subscriptions, billing.

**Stack:** Next.js 16.4 App Router, React 19.3, Tailwind CSS 4, TypeScript strict, pnpm, oxlint and oxfmt, PostgreSQL with Prisma 7 (mailbox only), public Sepolia, Solidity 0.8.28 with Foundry, viem (including its account-abstraction module), jose, SD-JWT, WebCrypto ES256 (P-256) device keys. App on Render through the existing CD workflow. UI entirely in Spanish; code stays in English.

**Terminology (UI, Spanish):** Empleador (Employer), Titular (Holder), Verificador (Verifier), Constancia (an employment certificate), CV verificado (Verified CV), Consorcio (Consortium), Registro (Ledger), Acreditación (Accreditation), Bóveda (Vault), Enlace para compartir (Share link), Dato (Claim). Humans never see "wallet", "gas", "seed phrase", "transacción" or "UserOp" outside an optional "Detalles técnicos" disclosure.

## Brand Commitments

- Name: **Constancia**, from "constancia de trabajo" (work certificate) and "constancy".
- Must not feel like: the crypto/Web3 look (neon on black, gradients, coins, chain imagery), HR or government bureaucracy (gray form portals, stamp overload, legalese), or a generic SaaS template (purple gradients, icon-tile grids, glass cards).
- Spanish UI (decided 2026-10-24, replacing English). Only the name **Constancia** carries over from the previous visual identity; nothing else of the op-art world is binding.
- Must read as clear and trustworthy at a glance: the previous op-art world was judged too artsy, unclear and not credible enough for banks and consulates.

## Evidence on Hand

- No customers, pilots, partner employers, consortium members, testimonials or benchmarks exist. Do not invent any.
- All demo employers, members, employees and certificates are synthetic and must be labelled as such where they could be mistaken for real. Never use a real company's name.
- Any statistic used in the pitch (diaspora size, letter fraud) must carry a cited source. We have none for letter fraud: leave the number out.

## Product Principles

1. **Prove, don't claim.** Every trust promise appears as a check the user watches pass or fail, with the evidence one click away.
2. **Show only what's needed.** The holder decides claim by claim, and sees the reader's view while deciding. Hidden means unreadable, not blurred.
3. **Zero Web3 for humans.** No step requires knowing what a wallet, a fee or a key phrase is.
4. **The server is blind, and shows it.** Make visible what left the browser and what was stored: ciphertext, public keys, hashes.
5. **Fail loudly and specifically.** A failed verification names the exact check, what was expected, and what was found.
6. **The consortium is the root of trust.** Always show who accredited the employer and what the ledger does and does not prove.
