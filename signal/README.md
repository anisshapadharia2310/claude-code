# Project SIGNAL

**S**cored **I**ntent and **G**ranular **A**ccount-**L**evel **L**istbuilding.

A qualification platform for a B2B outbound agency that promotes client white
papers and webinars. It replaces surface-level list filtering (geography + job
title + industry) with a scored, gated, fully explainable qualification of every
contact.

## The problem it solves

Filtering a target account list by job title produces false positives. A
"Customer Account Executive" has the word *customer* in their title but works in
sales; they do not own customer experience, customer service, customer
operations, or any transformation of them. Calling them wastes the caller's day
and the client's budget.

SIGNAL never treats a keyword as proof of relevance. Ownership of a campaign's
business problem must be corroborated by at least two independent signals -
a specific multi-word phrase in the title, the department, the job function, or a
researcher's explicitly recorded responsibility. Everything else is scored, but
capped.

## What it qualifies on

| Component | Max | What it measures |
|---|---|---|
| A. Company fit | 25 | Industry, geography, size band, technology, relationship |
| B. Contact-role relevance | 25 | Genuine ownership of the campaign problem |
| C. Current business trigger | 20 | Hiring, transformation, M&A, leadership, regulation, stated priority |
| D. Engagement and intent | 15 | Replies, downloads, registrations, clicks, history |
| E. Data quality and reachability | 10 | Verified title, email, phone, geography, source, consent |
| F. Attendance likelihood | 5 | Past attendance, early registration, convenient local time, explicit request |

Post-webinar engagement adds further points on top (registered +4 through
meeting requested +20), tracked separately and capped so the total never
exceeds 100.

### Priority rules

- **P1** — total ≥ 80 **and** role relevance ≥ 18 **and** data quality ≥ 7
  **and** both gates passed **and** a written "why this contact" exists.
- **P2** — total 60–79 with all gates passed, or a high scorer held back because
  one of the P1 conditions is missing.
- **P3** — total 40–59 with all gates passed. Nurture only.
- **REJECT** — below 40, irrelevant role, duplicate, stale, or compliance-blocked.
- **COMPLIANCE_HOLD** — compliance information is incomplete.

A high score never buys its way past a gate, and seniority alone never produces a
P1: reaching the role-relevance minimum of 18 structurally requires being both a
direct owner *and* an operational owner of the problem.

## Requirements

- Node.js 20 or newer
- PostgreSQL 14 or newer

## Setup

```bash
cd signal
npm install

cp .env.example .env          # then edit DATABASE_URL and SESSION_SECRET
createdb signal               # or point DATABASE_URL at an existing database

npm run db:migrate            # apply migrations
npm run db:seed               # load the demo data set
npm run dev                   # http://localhost:3000
```

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Demo accounts

All seeded users share the password in `SEED_USER_PASSWORD` (default
`signal123`).

| Email | Role | Can do |
|---|---|---|
| `admin@signal.example` | Admin | Campaigns, scoring weights, users, compliance settings |
| `manager@signal.example` | Manager | Dashboards, P1 approval, exports |
| `researcher@signal.example` | Researcher | Import, enrichment, review queue |
| `caller@signal.example` | Caller | Assigned worklist, scripts, call outcomes |

The seed produces 3 campaigns, 24 companies across Canada, Mexico, France,
Colombia, the UAE, Saudi Arabia, Oman and Egypt, 190 contacts, 365 campaign
enrolments and 858 engagement events, distributed roughly as P1 18 / P2 63 /
P3 30 / REJECT 179 / COMPLIANCE_HOLD 75.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm run start` | Serve the production build |
| `npm test` | Vitest suite (scoring, gates, taxonomy, import) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:deploy` | Apply migrations without prompting (CI/production) |
| `npm run db:seed` | Reset and reseed the demo data |
| `npm run db:studio` | Prisma Studio |

## Architecture

```
src/lib/domain/     Pure domain core - no I/O, no React, no Prisma calls
  role-taxonomy.ts    normalized title + corroboration -> role category
  relevance-gate.ts   eight mandatory blocking checks
  compliance-gate.ts  country-configurable PASS / HOLD / BLOCK
  scoring/engine.ts   the 100-point model; emits a reason for every criterion
  scoring/weights.ts  per-campaign weights, Zod-validated to total 100
  engagement.ts       post-webinar points, highest attendance tier only
  account-signal.ts   account-level aggregation, kept out of contact scores
  import/            normalize, validate, dedupe, process
src/lib/repositories/ Prisma data access
src/lib/services/     Orchestration: scoring, import, outreach, analytics
src/lib/providers/    Email and WhatsApp abstractions (log-only by default)
src/lib/actions/      Server actions used by the interface
src/app/api/          REST API (see docs/API.md)
src/app/(app)/        Authenticated screens
```

The domain layer is pure, which is what makes the test suite fast and
deterministic, and what would let the scoring model be reused outside the web
application unchanged.

### Screens

Dashboard · Campaigns (+ targeting, weights, comparison, account signals) ·
Accounts · Contacts · Contact detail · Import · Data quality · Review queue ·
Outreach worklist · Outreach workspace · Compliance · Users.

## Sending: nothing is transmitted

The first version deliberately sends no real email or WhatsApp. Both channels go
through a provider abstraction (`src/lib/providers/`) whose default `log`
implementation records the message so activity history and engagement scoring
stay complete, and transmits nothing. Registering a real provider is an
implementation of `EmailProvider` / `WhatsAppProvider` plus one line in the
resolver; no caller changes.

## Compliance

Country rules are stored in `CountryComplianceRule` and edited by an
administrator - the application does not hard-code legal conclusions anywhere.
Each country sets the consent strength required per channel, the fields that must
be present before outreach, and whether a privacy notice is required. Before any
Send or Contact action is offered, the gate checks opt-out status, channel
permission and record completeness, and blocks or holds accordingly.

> Confirm country-specific legal rules with qualified privacy counsel before
> campaign launch.

## Testing

```bash
npm test
```

131 unit tests over the domain core:

- **Scoring engine** — each component, priority thresholds, the P1 sub-minimums,
  the 100-point cap, attendance-tier de-duplication, weight validation, and the
  explanation contract (every criterion carries a reason).
- **Relevance gate** — all eight checks, individually and in combination.
- **Compliance gate** — do-not-contact, opt-out, per-channel blocking, country
  requirements, incomplete records, reachability.
- **Role taxonomy** — title normalization, seniority detection, and the
  "customer" keyword trap in both directions.
- **Import** — country/phone/revenue normalization, column mapping, row
  validation, four-key duplicate detection, and an end-to-end preview.

## Documentation

- `docs/API.md` — REST endpoints and server actions
- `public/sample-import.csv` — sample import file, including the messy rows the
  validator is meant to catch

## Assumptions

Recorded explicitly rather than hidden in the code:

1. **Ownership must be corroborated.** Two independent signals are required
   before a contact is treated as a direct owner. This is the central judgement
   the brief asks for, and it is configurable per campaign.
2. **Attendance tiers are cumulative.** Someone who reached 80% also passed 50%
   and 75%, so only the highest tier scores.
3. **Unverified triggers still score, but flag for review.** Withholding the
   points entirely would hide real signals; a trigger explicitly marked false
   scores nothing.
4. **P1 requires a human sentence.** The engine will not promote a contact to P1
   without a researcher's written justification, and holds them at P2 instead.
5. **The account signal is never folded into a contact score.** It is displayed
   alongside, so the reason for an individual score stays attributable.
6. **Staleness is 180 days.** Configurable in `src/lib/domain/constants.ts`.
7. **The "old method" comparison** re-derives what industry + geography + a
   title keyword would have selected from the same data, so both columns are
   measured against identical outcomes and the same campaign cost.
