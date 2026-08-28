# API and server-action reference

Project SIGNAL splits its backend surface in two:

- **Server actions** handle mutations initiated from the application's own UI. They are
  Zod-validated, permission-checked, and revalidate the affected routes.
- **REST routes** handle input and output that crosses a boundary: authentication for
  non-browser clients, CSV export, analytics, and the engagement-event webhook an email service
  provider or a webinar platform would call.

Every entry point checks the session and the caller's permission before doing anything.

---

## Authorisation model

Permissions are declared once, in `src/server/auth/rbac.ts`, and used by both the navigation
and the guards.

| Permission | Admin | Manager | Researcher | Caller |
|---|:-:|:-:|:-:|:-:|
| `viewDashboard` | ● | ● | ● | ● |
| `viewContacts` | ● | ● | ● | ● |
| `viewAccounts` | ● | ● | ● | |
| `viewCampaigns` | ● | ● | ● | |
| `editCampaign` | ● | ● | | |
| `importContacts` | ● | | ● | |
| `reviewContacts` | ● | ● | ● | |
| `approveP1` | ● | ● | | |
| `viewOutreach` | ● | ● | | ● |
| `logOutreach` | ● | ● | | ● |
| `viewDataQuality` | ● | ● | ● | |
| `viewCompliance` | ● | ● | ● | |
| `editCompliance` | ● | | | |
| `exportData` | ● | ● | ● | |
| `bulkUpdate` | ● | ● | ● | |
| `editScoringWeights` | ● | | | |
| `manageUsers` | ● | | | |
| `rescore` | ● | ● | ● | |

Page guards (`requirePermission`) redirect to `/forbidden?need=<permission>`.
Action guards (`assertPermission`) throw, and the action returns `{ error }`.

---

## Server actions

All form-bound actions share the state shape:

```ts
interface ActionState {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}
```

### Authentication — `src/server/actions/auth.ts`

| Action | Permission | Fields | Effect |
|---|---|---|---|
| `loginAction` | none | `email`, `password` | Verifies the password with scrypt, sets a signed HTTP-only session cookie, redirects to `/`. |
| `logoutAction` | signed in | — | Clears the session cookie, redirects to `/login`. |

### Campaign context — `src/server/actions/campaign-context.ts`

| Action | Permission | Fields | Effect |
|---|---|---|---|
| `selectCampaignAction` | signed in | `campaignId` | Stores the active campaign in a cookie and revalidates the layout. |

### Outreach — `src/server/actions/outreach.ts`

| Action | Permission | Fields | Effect |
|---|---|---|---|
| `logCallAction` | `logOutreach` | `campaignContactId`, `outcome`, `notes?`, `nextAction?`, `nextFollowUpAt?`, `durationSeconds?` | Writes a `CallActivity`, writes the mapped `EngagementEvent`, moves `currentStatus`, sets the follow-up date, and rescores the campaign. A `WRONG_NUMBER` outcome marks the phone number wrong; `DO_NOT_CONTACT` writes a global opt-out to the contact and the compliance record. |
| `logEmailAction` | `logOutreach` | `campaignContactId`, `emailType`, `subject`, `body`, `markSent?`, `replySentiment?` | Writes an `EmailActivity`. With `markSent`, calls the configured provider (`log` by default, which transmits nothing) and writes an `EMAIL_SENT` event. A `POSITIVE` reply writes `POSITIVE_EMAIL_REPLY`; an `UNSUBSCRIBE` reply writes `OPTED_OUT` and sets the contact to opted out. Rescores afterwards. |
| `logWhatsAppAction` | `logOutreach` | `campaignContactId`, `messageType`, `messageText`, `markSent?` | **Re-evaluates compliance server-side and throws if WhatsApp is not permitted**, then writes a `WhatsAppActivity`. |

`CALL_OUTCOMES` in `src/server/services/outreach.ts` maps each of the twelve outcomes to its
engagement event, resulting status, tone, and suggested follow-up interval.

### Review — `src/server/actions/review.ts`

| Action | Permission | Fields | Effect |
|---|---|---|---|
| `applyReviewAction` | `reviewContacts`, or `approveP1` when `decision=APPROVE` | `campaignContactId`, `decision`, `reviewNotes?`, `whyThisContact?`, `roleCategory?`, `roleConfidence?`, `directProblemResponsibility?`, `ownsBudget?`, `influencesDecision?`, `roleRelevanceNotes?`, `markVerifiedNow?`, `triggerVerification?` | Applies the researcher's corrections to the contact and the account, records the decision, then rescores. `APPROVE` is refused unless a justification of at least 20 characters is present. `REJECT` and `DOWNGRADE` are re-applied after the rescore so a human decision is not undone by the engine. |

`decision` is one of `SAVE`, `APPROVE`, `DOWNGRADE`, `REJECT`.

### Contacts — `src/server/actions/contacts.ts`

| Action | Permission | Fields | Effect |
|---|---|---|---|
| `bulkAssignAction` | `bulkUpdate` | `ids` (comma-separated), `campaignId`, `assignedTo` | Assigns the selected contacts to a caller and sets their status to `ASSIGNED`. |
| `bulkStatusAction` | `bulkUpdate` | `ids`, `campaignId`, `currentStatus`, `confirm=yes` | Updates the outreach status. Refused without the confirmation field. A bulk `DO_NOT_CONTACT` also writes a global opt-out to each contact record and rescores. |
| `rescoreCampaignAction` | `rescore` | `campaignId` | Rescores every contact on the campaign and reports how many changed. |

### Administration — `src/server/actions/admin.ts`

| Action | Permission | Fields | Effect |
|---|---|---|---|
| `updateScoringWeightsAction` | `editScoringWeights` | `campaignId`, `component.<CODE>` per component, `p1`, `p2`, `p3`, `p1MinRoleRelevance`, `p1MinDataQuality` | Recomputes band maxima from the components, validates that the six bands total 100 and that each band's components match its maximum, persists the config and rescores. Returns `fieldErrors` keyed by the failing path when invalid. |
| `updateCampaignAction` | `editCampaign` | `campaignId`, `campaignCost?`, `campaignCurrency?`, `status?` | Updates the campaign. Cost drives cost-per-verified-attendee. |
| `updateCountryRuleAction` | `editCompliance` | `country`, `permittedChannels`, `prohibitedChannels`, `requiresExplicitOptIn?`, `whatsappRequiresOptIn?`, `requiresLawfulBasis?`, `requiresNotice?`, `consentValidityDays?`, `policyNotes?` | Saves the country rule and rescores **every** campaign, because a compliance change can move a contact between reject, hold and workable. |
| `updateComplianceRecordAction` | `viewCompliance` | `contactId`, `country`, `consentStatus`, `consentSource?`, `consentDate?`, `lawfulBasis`, `noticeProvided?`, `optOutStatus`, `allowedChannels?`, `blockedChannels?`, `complianceNotes?` | Saves the contact's compliance record, mirrors the consent status onto the contact, and rescores all campaigns. |
| `createUserAction` | `manageUsers` | `name`, `email`, `role`, `password` | Creates a user with a scrypt password hash. Rejects a duplicate email. |
| `updateUserAction` | `manageUsers` | `userId`, `role?`, `isActive?` | Updates a user. An administrator cannot change their own role. |

### Import — `src/server/actions/import.ts`

Called directly from the client wizard rather than through a form, because each step returns
structured data.

| Action | Permission | Signature | Returns |
|---|---|---|---|
| `parseCsvAction` | `importContacts` | `(text: string)` | `{ ok, headers, mapping, rowCount, preview }` — headers, a proposed column mapping and the first five rows. |
| `validateImportAction` | `importContacts` | `(text, mapping)` | `{ ok, result }` where `result` is an `ImportValidationResult`: every row with its normalized form, errors, warnings, duplicate match and status, plus a summary. |
| `commitImportAction` | `importContacts` | `(text, mapping, includeIndexes, campaignIds, includeDuplicates)` | `{ ok, result }` with counts of accounts, contacts and memberships created, and rows skipped. Writes atomically, then scores every affected campaign. |

Row statuses are `VALID`, `INVALID` (a required value is missing or malformed) and `DUPLICATE`.

---

## REST routes

### `POST /api/auth/login`

Session sign-in for non-browser clients.

```bash
curl -i -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"manager@signal.agency","password":"signal123"}'
```

`200` `{ ok: true, user: { id, name, email, role } }` and a `signal_session` cookie.
`401` on bad credentials, `422` on a malformed body.

### `POST /api/auth/logout`

Clears the session. `200 { ok: true }`.

### `GET /api/health`

No authentication. Reports readiness and which data source is active.

```json
{ "ok": true, "dataSource": "postgres", "campaigns": 3 }
```

`503` when the repository cannot be reached.

### `GET /api/export/contacts`

Permission: `exportData`.

| Parameter | Required | Meaning |
|---|---|---|
| `campaignId` | yes | The campaign to export |
| `ids` | no | Comma-separated `CampaignContact` ids, to export a selection |
| any contact filter | no | `q`, `priority`, `country`, `industry`, `roleCategory`, `seniority`, `employeeBand`, `technology`, `trigger`, `emailStatus`, `phoneStatus`, `whatsappStatus`, `consentStatus`, `status`, `eventType`, `assignedTo`, `scoreMin`, `scoreMax`, `verifiedBefore`, `reviewOnly`, `sort`, `dir` |

Returns `text/csv` with 48 columns: identity, company fit, role classification, reachability,
all six band scores, the post-event bonus, both gate results, gate failure reasons, review
status, the *why this contact* note, the business trigger, the recommended channel and next
action, the assignment and the follow-up date. The export is designed so a list handed to a
client can be defended line by line.

```bash
curl -H "Cookie: signal_session=$TOKEN" \
  'http://localhost:3000/api/export/contacts?campaignId=camp-cx-transformation&priority=P1' \
  -o p1.csv
```

### `GET /api/campaigns/[id]/kpis`

Permission: `viewDashboard`. Returns the full analytics payload as JSON: KPIs, every chart
series, and the surface-level-versus-SIGNAL comparison. Use this to feed an external BI tool
rather than scraping the dashboard.

```json
{
  "campaign": { "id": "...", "name": "..." },
  "kpis": {
    "totalContacts": 79, "byPriority": { "P1": 11, "P2": 8, "P3": 11, "REJECT": 47, "COMPLIANCE_HOLD": 2 },
    "dataQualityPassRate": 91.1, "relevanceGatePassRate": 40.5,
    "emailDeliveryRate": 100, "positiveReplyRate": 12.5,
    "webinarRegistrationRate": 27.8, "liveAttendanceRate": 63.6,
    "averageAttendanceDuration": 71.4, "meetingRequests": 4,
    "campaignCost": 18500, "costPerVerifiedAttendee": 1321.4, "currency": "USD",
    "awaitingApproval": 3, "inReviewQueue": 21
  },
  "charts": { "contactsByPriority": [], "funnel": [], "registrationByPriority": [],
              "scoreDistribution": [], "eventsOverTime": [], "accountEngagement": [] },
  "methodComparison": []
}
```

### `POST /api/events`

Permission: `logOutreach` or `rescore`. **This is the integration point for a webinar platform
or an email service provider.**

```json
{
  "campaignId": "camp-cx-transformation",
  "contactId": "ct-0001",
  "eventType": "WEBINAR_ATTENDANCE_80_PERCENT",
  "eventDate": "2026-06-21T14:52:00.000Z",
  "metadata": { "minutesAttended": 49 },
  "rescore": true
}
```

Appends the event to the ledger with its point value and, unless `rescore` is `false`,
rescores the campaign so the effect is visible immediately. Set `rescore: false` when posting a
batch and rescore once at the end.

`201` `{ ok: true, event }`. `422` with Zod issues on an invalid payload.

All 28 event types are accepted: the white-paper and email lifecycle, the webinar lifecycle
including the three attendance tiers, Q&A, polls, questions, resources, CTA clicks, replays,
meeting requests, the three call outcomes, `NOT_INTERESTED` and `OPTED_OUT`.

### `POST /api/campaign-contacts/[id]/rescore`

Permission: `rescore`. Rescores the campaign the contact belongs to and returns the contact's
resulting priority, total score and review flag.

```json
{ "ok": true, "priority": "P1", "totalScore": 92, "humanReviewRequired": false }
```

---

## The repository interface

Everything above `src/server/repo` depends on `SignalRepository`, never on Prisma. Two
implementations exist and are selected by `DATA_SOURCE`:

- `PrismaRepository` — PostgreSQL.
- `MemoryRepository` — the same seed dataset in process, scored by the real engine at boot.

```ts
const repo = await getRepository();
const links = await repo.listCampaignContacts(campaignId);
```

Read operations are deliberately coarse. Filtering, sorting and aggregation are pure functions
in `src/server/services/filters.ts`, so both implementations behave identically and the query
semantics are unit-testable without a database.

---

## The domain layer

The pure core can be called directly — from a script, a test, or a future job runner — with no
server and no database:

```ts
import { qualifyContact } from '@/domain/qualify';

const result = qualifyContact({
  account, contact, campaign,
  events, historicalEvents,
  complianceRecord, countryRule,
  whyThisContact, humanReviewApproved,
  now: new Date(),
});

result.compliance;       // status, allowed and blocked channels, missing fields
result.gate;             // every check with its severity and detail
result.score;            // the six band scores plus the full breakdown
result.decision;         // priority, the reasons for it, review requirements
result.recommendations;  // channel, next action, call opening, email angle, WhatsApp guidance
```

`qualifyContact` is the single entry point the scoring service, the import pipeline and the
tests all use, which is why the seed data's priority distribution is produced by the same code
path that runs in production.
