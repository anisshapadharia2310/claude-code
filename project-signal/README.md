# Project SIGNAL

**S**cored **I**ntent and **G**ranular **A**ccount-**L**evel **L**istbuilding.

A qualification system for a B2B outbound agency that promotes client white papers and
webinars. It replaces surface-level list filtering — geography, job title, industry — with a
scored, gated and fully explainable qualification of every contact against every campaign.

The problem it solves is specific: a person can have the word *customer* in their job title
and own nothing about customer experience, customer service or customer operations. SIGNAL is
built so that such a person is **structurally incapable of reaching P1**.

---

## Contents

- [What it does](#what-it-does)
- [Setup](#setup)
- [Demo accounts](#demo-accounts)
- [Architecture](#architecture)
- [The scoring model](#the-scoring-model)
- [The relevance gate](#the-relevance-gate)
- [Compliance](#compliance)
- [Screens](#screens)
- [Testing](#testing)
- [Running without a database](#running-without-a-database)
- [Deliverables map](#deliverables-map)
- [Assumptions and decisions](#assumptions-and-decisions)

---

## What it does

Each contact is qualified **per campaign** on seven dimensions:

| # | Dimension | Where it lives |
|---|---|---|
| 1 | Company fit | Score band A (25 points) |
| 2 | Contact-role relevance | Score band B (25 points) |
| 3 | Current business triggers | Score band C (20 points) |
| 4 | Engagement and intent | Score band D (15 points) + post-event bonus |
| 5 | Data quality and reachability | Score band E (10 points) |
| 6 | Likelihood of attending | Score band F (5 points) |
| 7 | Communication permission and compliance | Compliance gate |

Each contact then receives one of five statuses:

| Status | Meaning |
|---|---|
| **P1** | Highest priority. Confirmed problem ownership, live trigger, verified data, all gates passed, written justification, manager approval. |
| **P2** | Medium priority. Qualifies on fit and role but short of the P1 bar. |
| **P3** | Low priority / nurture. Relevant, but no live trigger or intent yet. |
| **Reject** | Inaccurate, irrelevant, duplicate, outdated or non-compliant. |
| **Compliance hold** | Required compliance information is incomplete; outreach is blocked until it is completed. |

---

## Setup

### Requirements

- Node.js 22 or later
- PostgreSQL 16 or later (or run in memory — see [below](#running-without-a-database))

### Install and run

```bash
# 1. Install dependencies
npm install

# 2. Configure the environment
cp .env.example .env
#    Set DATABASE_URL and generate a SESSION_SECRET:
#    openssl rand -hex 32

# 3. Create the database schema
npm run db:migrate      # development: creates and applies migrations
# or
npm run db:deploy       # production: applies existing migrations only

# 4. Load the seed data and score it with the real engine
npm run db:seed

# 5. Start the application
npm run dev             # http://localhost:3000
```

### Creating the database from scratch

```bash
sudo -u postgres psql -c "CREATE USER signal WITH PASSWORD 'signal' SUPERUSER;"
sudo -u postgres createdb -O signal signal
```

Then set:

```
DATABASE_URL="postgresql://signal:signal@localhost:5432/signal?schema=public"
```

### All scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Vitest suites |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:seed` | Load fixtures and run the scoring engine over them |
| `npm run db:reset` | Drop, recreate, migrate and seed |
| `npm run db:studio` | Prisma Studio |

---

## Demo accounts

The seed creates one user per role. The password for all of them is `signal123`
(override with `SEED_PASSWORD`).

| Email | Role | Can do |
|---|---|---|
| `admin@signal.agency` | Admin | Everything, including scoring weights, users and compliance rules |
| `manager@signal.agency` | Manager | Dashboards, P1 approval, exports, campaign settings |
| `researcher@signal.agency` | Researcher | Import, enrich, work the review queue |
| `caller@signal.agency` | Caller | Assigned contacts, scripts, call outcomes |

Seeded volume: 3 campaigns · 25 accounts · 128 contacts · 231 campaign memberships ·
768 engagement events. Nothing about the priority distribution is hard-coded — the seed script
writes the fixtures and then runs the real engine over them.

---

## Architecture

```
project-signal/
├─ prisma/
│  ├─ schema.prisma        12 models, 24 enums
│  ├─ migrations/          SQL migrations
│  └─ seed.ts              fixtures + a real scoring run
├─ src/
│  ├─ domain/              PURE. No Next.js, no React, no Prisma runtime.
│  │  ├─ countries.ts        country normalization, time zones, calling codes
│  │  ├─ normalize.ts        title / email / phone / company normalization
│  │  ├─ taxonomy.ts         role taxonomy + campaign relevance (anti-keyword logic)
│  │  ├─ dedupe.ts           four-key duplicate detection
│  │  ├─ compliance.ts       country-aware channel permission engine
│  │  ├─ relevance-gate.ts   the mandatory gate
│  │  ├─ weights.ts          the 100-point model and its validation
│  │  ├─ scoring.ts          the scoring engine
│  │  ├─ engagement.ts       post-event bonus, timeline
│  │  ├─ account-signal.ts   account rollup, kept separate from contact scores
│  │  ├─ priority.ts         P1/P2/P3/Reject/Hold rules
│  │  ├─ recommendations.ts  channel, next action, call opening, email angle
│  │  └─ qualify.ts          the full pipeline as one pure function
│  ├─ server/
│  │  ├─ repo/             SignalRepository + Prisma and in-memory implementations
│  │  ├─ services/         scoring · import · outreach · review · analytics · export
│  │  ├─ actions/          Zod-validated server actions
│  │  ├─ providers/        email and WhatsApp provider abstractions
│  │  ├─ auth/             sessions, password hashing, RBAC
│  │  └─ seed/             the fixture dataset, shared by Prisma and memory modes
│  ├─ app/                routes and REST endpoints
│  ├─ components/         ui primitives, charts, feature components
│  └─ lib/                CSV, formatting, row mappers
└─ tests/                 scoring · relevance gate · compliance · import validation
```

### Layering rules

1. `src/domain` imports **nothing** from Next.js, React or the Prisma runtime. It imports
   Prisma's *types* only, which are erased at compile time. It can be tested with no database
   and no server.
2. The UI never computes a score. It renders `ScoreBreakdown` objects the domain produced.
3. Only `src/server/repo` touches Prisma. Everything above it depends on the
   `SignalRepository` interface.
4. Mutations go through Zod-validated server actions; integration points are REST routes.

---

## The scoring model

100 points, six bands. Every award carries a code, the points, the evidence and the record
fields the decision came from, so any number in the UI can be traced to its source.

### Band A — Company fit (25)

| Component | Points |
|---|---|
| Target industry match | 8 |
| Target geography match | 5 |
| Target employee or revenue band | 5 |
| Relevant technology or business model | 4 |
| Named strategic account or existing relationship | 3 |

### Band B — Contact-role relevance (25)

| Component | Points |
|---|---|
| **Direct owner of the campaign problem** | **12** |
| Operational owner or strong business influencer | 8 |
| Relevant seniority | 3 |
| Budget or decision influence | 2 |

The two ownership awards measure different things and stack: *accountable for the outcome*
(12) and *runs or shapes the work day to day* (8). Seniority and budget together cap at 5.

**This is the mechanism that makes the product work.** A P1 requires
`roleRelevanceScore >= 18`. Since seniority plus budget can only reach 5, 18 is unreachable
without the 12-point direct-ownership award — and that award requires all three of:

- the role category is `DIRECT_OWNER`,
- a researcher has recorded `directProblemResponsibility = true`,
- the normalized title or department matches a campaign job function or term.

A "Customer Account Executive" satisfies none of them. Its band B score is 0.

### Band C — Current business trigger (20)

Relevant hiring 5 · active transformation 5 · expansion/merger 3 · leadership change 2 ·
regulatory pressure 3 · publicly stated priority 2.

A trigger a researcher has marked a **false positive** stops scoring immediately.

### Band D — Engagement and intent (15)

Positive reply 5 · white-paper download 3 · webinar registration 4 · resource click 2 ·
previous attendance or meeting 1.

### Band E — Data quality and reachability (10)

Verified title 2 · verified email 2 · valid phone 2 · country and time zone 1 · source 1 ·
last-verified date 1 · consent status 1.

A missing phone number costs 2 points and nothing else: email remains a full qualification
and nurture channel.

### Band F — Attendance likelihood (5)

Previous attendance 2 · early registration 1 · convenient local event time 1 · explicit
request for the link 1.

Kept deliberately separate from commercial importance. A perfect commercial fit with no
attendance evidence scores near zero here and is still a P1 on the strength of the other bands.

### Post-event engagement

Applied **on top** of the base score, hard-capped so the total never exceeds 100:

| Event | Points |
|---|---|
| Registered | +4 (credited in band D, suppressed here so it is not counted twice) |
| Attended live | +5 |
| Attended ≥ 50% / ≥ 75% / ≥ 80% | +10 / +15 / +20 (highest tier only) |
| Stayed through Q&A | +5 |
| Answered a poll | +5 |
| Asked a question | +10 |
| Downloaded a resource | +5 |
| Clicked a CTA | +10 |
| Watched the replay | +5 |
| Requested a one-to-one meeting | +20 |

The attendance tiers form a ladder, not a stack: somebody who reached 80% necessarily passed
50% and 75%, so only the highest tier scores. The suppressed entries stay visible in the
breakdown with the reason.

### Priority rules

```
compliance says do-not-contact          -> REJECT
contact is a duplicate                  -> REJECT
relevance gate has a blocking failure   -> REJECT
compliance is BLOCKED                   -> REJECT
compliance is HOLD                      -> COMPLIANCE_HOLD
total >= 80 and role >= 18 and data quality >= 7 and gates clear -> P1
total 60-79                             -> P2
total 40-59                             -> P3
total < 40                              -> REJECT
```

A numeric P1 additionally requires a written *why this contact* note of at least 20 characters
and a manager approval before it counts as an approved P1. Until then it displays as
`P1 · pending` and stays in the review queue.

### Editable weights

Admins edit component weights per campaign at `/admin/scoring`. The editor shows a live total
and refuses to submit unless the six bands add up to exactly 100 and each band's components
add up to that band's maximum. The server re-validates regardless. Saving rescores the whole
campaign and writes an audit entry per changed contact.

### Account-level signal

Computed per account and **displayed separately**: registered, attended, engaged and meetings
requested, with a tier and a multiplier. When more than one stakeholder engages, the UI shows
*"Account-level signal: multiple stakeholders engaged."* It never changes a contact score,
because folding it in would hide why an individual ranks where they do.

---

## The relevance gate

Runs before any priority is assigned, in three severity tiers.

| Check | Severity | Failing means |
|---|---|---|
| Company is in a target industry | Blocking | Reject |
| Company is in a target geography | Blocking | Reject |
| Role relates to the campaign problem | Blocking | Reject |
| Contact owns or influences the problem | Blocking | Reject |
| Record is not outdated (> 540 days, or never verified and unreachable) | Blocking | Reject |
| At least one channel is permitted | Blocking | Reject |
| Contact has not opted out | Blocking | Reject |
| Contact is not a duplicate | Blocking | Reject |
| Contact data is current (< 180 days) | Review | Workable, but P1 is locked |
| Compliance record is complete | Review | Workable, but P1 is locked |
| Role classification is confident | Review | Workable, but P1 is locked |
| Company is in a priority city | Advisory | Noted only |

The three-tier design is deliberate: "outdated" belongs in the rejection definition, but merely
*stale* data should route a contact to a researcher rather than throw them away.

### Why a keyword is never enough

`detectFunctions()` requires a customer keyword to be paired with an **ownership noun**
(experience, service, care, support, operations, success, contact centre, journey, and their
Spanish and French equivalents) and to be free of a **revenue-side decoy** (account executive,
key accounts, sales, business development, acquisition, customer marketing, market research,
customer insights). When a title fails that test the reason is recorded and surfaced to the
reviewer:

> Title contains "customer" but describes "account executive", which is a revenue role, not
> ownership of customer operations.

Titles are matched in-language: `Directrice de la Relation Client`,
`Gerente de Servicio al Cliente` and `Responsable Exploitation Réseau` classify correctly.

---

## Compliance

Country rules are **data, not code**, stored in `CountryComplianceRule` and editable at
`/compliance`. Per country you can set permitted channels, prohibited channels, whether an
explicit opt-in is required, whether WhatsApp needs its own opt-in, whether a lawful basis and
a privacy notice are required, and a consent validity window.

Before any Send or Contact action the engine checks opt-out status, the permitted channel set,
required record completeness, and the campaign's own channel list. The check is re-run
server-side inside the action, so a stale page cannot send.

WhatsApp is blocked unless the contact has a documented opt-in **and** the country rule and the
campaign both permit it.

> **Confirm country-specific legal rules with qualified privacy counsel before campaign
> launch.** This application stores facts and evaluates them against rules you configure. It
> does not encode legal conclusions and it is not legal advice. The warning is displayed on the
> compliance screen.

### Outbound providers

`EMAIL_PROVIDER` and `WHATSAPP_PROVIDER` both default to `log`. **Nothing is ever transmitted
in this version.** Messages are drafted, previewed and recorded against the contact with a
`LOGGED_ONLY` delivery status. `src/server/providers/` defines the interfaces a real provider
implements; the compliance checks that gate them are unaffected by the swap.

---

## Screens

| Route | Who | What |
|---|---|---|
| `/` | all | Campaign KPIs, funnel, score distribution, engagement over time, account signals, old method versus SIGNAL |
| `/contacts` | all | Master table: search, ~15 filters, 9 sorts, bulk assign, bulk status, export |
| `/contacts/[id]` | all | Full score derivation, gate checks, timeline, outreach history, audit trail |
| `/accounts`, `/accounts/[id]` | admin, manager, researcher | Company fit and trigger evidence, account signal |
| `/campaigns` | admin, manager, researcher | Targeting criteria, cost, status |
| `/campaigns/compare` | all | Surface-level list versus SIGNAL, side by side |
| `/review` | admin, manager, researcher | Research review queue with reasons and corrections |
| `/outreach`, `/outreach/[id]` | admin, manager, caller | Caller workspace: local time, script, trigger, 12 outcome buttons |
| `/email/[id]` | admin, manager, caller | Drafting, templates, preview, compliance footer |
| `/whatsapp/[id]` | admin, manager, caller | Templates, permission status, blocked when not permitted |
| `/import` | admin, researcher | Four-step import wizard |
| `/data-quality` | admin, manager, researcher | Eight data-quality categories |
| `/compliance` | admin, manager, researcher | Country rules and per-contact records |
| `/admin/scoring` | admin | Weight editor with live validation |
| `/admin/users` | admin | Users and roles |

Design: navy, white and blue; desktop-first and mobile-compatible; wide tables scroll inside
their card rather than the page; every score carries a tooltip; every priority badge explains
its own meaning on hover.

---

## Testing

```bash
npm test
```

123 tests across four suites, all pure — no database, no server, no browser.

| Suite | Covers |
|---|---|
| `tests/scoring.test.ts` | Each band, caps, the 100-point ceiling, weight validation, every priority rule, and the keyword traps |
| `tests/relevance-gate.test.ts` | All eight blocking checks in isolation, the review tier, title classification and normalization |
| `tests/compliance.test.ts` | Do-not-contact, channel opt-outs, country rules, WhatsApp permission, incomplete records → hold |
| `tests/import-validation.test.ts` | CSV parsing, column mapping, required values, normalization, all four duplicate keys |

`tests/factories.ts` returns complete valid records, so each test breaks exactly one thing and
asserts the consequence.

---

## Running without a database

Set `DATA_SOURCE=memory`. The application boots the same fixture dataset in process, runs the
real qualification engine over it and serves every screen with no PostgreSQL at all. Writes are
in-process and lost on restart. Switching back to `postgres` requires no code change: the two
implementations satisfy the same `SignalRepository` interface.

`GET /api/health` reports which data source is active.

---

## Deliverables map

| Deliverable | Location |
|---|---|
| Complete application code | `src/` |
| Database schema and migrations | `prisma/schema.prisma`, `prisma/migrations/` |
| Seed script | `prisma/seed.ts`, `src/server/seed/` |
| Environment variable example | `.env.example` |
| README with setup instructions | this file |
| API / server-action documentation | [`docs/API.md`](docs/API.md) |
| Scoring-engine unit tests | `tests/scoring.test.ts` |
| Import-validation tests | `tests/import-validation.test.ts` |
| Relevance-gate tests | `tests/relevance-gate.test.ts` |
| Compliance-blocking tests | `tests/compliance.test.ts` |
| Responsive dashboard | `src/app/(app)/page.tsx` |
| Sample CSV for import | `public/sample-import.csv` |

---

## Assumptions and decisions

Points where the brief left room for judgement, and what was decided.

1. **Band B awards stack.** "Direct owner: 12" and "operational owner or strong influencer: 8"
   are treated as additive measures of different things. Read as mutually exclusive tiers, band
   B would cap at 17 and the specified P1 minimum of 18 would be unreachable, making P1
   impossible. Stacking preserves the specified numbers *and* produces exactly the intended
   effect: P1 requires demonstrated direct ownership.

2. **Registration is credited once.** The brief lists webinar registration in band D (4 points)
   and again in the post-event table (+4). Counting both would double-count one event, so
   registration scores in band D and the bonus entry is recorded as suppressed with the reason
   visible in the breakdown.

3. **Attendance tiers are a ladder.** 50%, 75% and 80% are alternative depths of the same
   attendance, so only the highest tier reached is scored. Summing them would award 45 points
   for one webinar.

4. **Staleness is tiered.** "Outdated" appears in the rejection definition, but a single
   threshold would either reject most real lists or never reject anything. Over 540 days (or
   never verified and unreachable) rejects; over 180 days locks P1 and routes to review. Both
   thresholds are constants in `relevance-gate.ts`.

5. **"Why this contact" is separated from the generated draft.** The engine writes a draft to
   `whyThisContactDraft`; the human note lives in `whyThisContact`. Auto-filling the human field
   would let a generated sentence satisfy the P1 justification rule, which would defeat it.

6. **Filtering is a pure function over loaded rows.** Both repository implementations load the
   campaign's contacts and apply the same predicate, which guarantees identical behaviour with
   or without a database and keeps the filter semantics in one testable place. At campaign
   sizes in the hundreds this is comfortably fast; at tens of thousands per campaign the Prisma
   implementation should push the cheap predicates into the `where` clause.

7. **Fields added to the specified schema.** `ScoreAudit` (the brief requires an audit history
   of score changes), `ScoringConfig` (the brief requires per-campaign editable weights),
   `CountryComplianceRule` (the brief requires configurable country rules),
   `publiclyStatedPriority` and `triggerVerification` on Account (band C scores a stated
   priority and researchers must mark triggers verified/unverified/false), `roleConfidence` and
   `isDuplicate` on Contact (the review queue and the duplicate gate need them), and
   `whyThisContactDraft` on CampaignContact (see point 5).

8. **Authentication is deliberately simple.** Email and password with scrypt hashing and a
   signed, HTTP-only session cookie. No password reset, no MFA, no SSO. Role-based access is
   enforced in one table (`rbac.ts`) used by both the navigation and the route guards, so a
   link is never shown for a page the user cannot open.

9. **Old-method comparison is reconstructed, not invented.** The surface-level list is derived
   from the same contacts by applying keyword-plus-geography-plus-industry filtering with no
   ownership test, and both lists are measured against the same event ledger. The difference is
   the selection method, not the measurement.

10. **Nothing is sent.** Both providers log only. This is a product decision, not a limitation:
    an outbound system that can transmit before its compliance rules have been reviewed by
    counsel is the wrong default.
