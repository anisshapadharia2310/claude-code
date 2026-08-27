# SIGNAL API and server actions

Two mutation surfaces share one service layer:

- **Server actions** (`src/lib/actions/`) back the interface. They are the
  shortest path for form submissions and revalidate the affected pages.
- **REST routes** (`src/app/api/`) expose the same operations for integrations,
  webhooks and scripts.

Both call the same services, so a score produced through the API is identical to
one produced through the interface.

## Authentication and authorisation

Authentication is a signed, HTTP-only session cookie (`signal_session`),
established by signing in at `/login`. Every route resolves the session and then
checks a **capability**, not a role:

| Capability | Admin | Manager | Researcher | Caller |
|---|:-:|:-:|:-:|:-:|
| `dashboard:view` | ✓ | ✓ | ✓ | ✓ |
| `campaign:view` | ✓ | ✓ | ✓ | ✓ |
| `contact:view` | ✓ | ✓ | ✓ | ✓ |
| `campaign:manage` | ✓ | ✓ | | |
| `scoring:configure` | ✓ | | | |
| `contact:import` | ✓ | | ✓ | |
| `contact:edit` | ✓ | ✓ | ✓ | |
| `review:perform` | ✓ | ✓ | ✓ | |
| `outreach:perform` | ✓ | ✓ | | ✓ |
| `export:perform` | ✓ | ✓ | ✓ | |
| `p1:approve` | ✓ | ✓ | | |
| `compliance:manage` | ✓ | | | |
| `user:manage` | ✓ | | | |

Failures return a JSON envelope: `401` when signed out, `403` when the role
lacks the capability.

```json
{ "error": "Your role (CALLER) cannot perform \"campaign:manage\"." }
```

---

## Campaigns

### `GET /api/campaigns`
Capability: `campaign:view`. Lists campaigns with enrolment counts and cost.

### `GET /api/campaigns/:id/stats`
Capability: `dashboard:view`. Returns `{ kpis, charts, accountSignals }` — the
same data the dashboard renders.

`kpis` includes `p1`…`complianceHold`, `dataQualityPassRate`,
`relevanceGatePassRate`, `emailDeliveryRate`, `positiveReplyRate`,
`webinarRegistrationRate`, `liveAttendanceRate`, `averageAttendanceDuration`,
`meetingRequests`, `verifiedAttendees` and `costPerVerifiedAttendee`.

### `GET /api/campaigns/:id/compare`
Capability: `dashboard:view`. The surface-level list versus the SIGNAL-scored
list, computed over identical contacts and the same campaign cost. Live output
from the seeded CX campaign - the SIGNAL list is 43% smaller yet registers at
more than twice the rate and produces nearly three times the meeting rate:

```json
{
  "currency": "USD",
  "comparison": [
    { "method": "Surface-level list (old method)", "listSize": 54, "contacted": 29, "registered": 10, "attended": 5, "meetings": 3, "registrationRate": 18.5, "attendanceRate": 50, "meetingRate": 5.6, "costPerVerifiedAttendee": 3700 },
    { "method": "SIGNAL-scored list (P1-P2)", "listSize": 31, "contacted": 24, "registered": 12, "attended": 6, "meetings": 5, "registrationRate": 38.7, "attendanceRate": 50, "meetingRate": 16.1, "costPerVerifiedAttendee": 3083.33 }
  ]
}
```

### `GET /api/campaigns/:id/weights`
Capability: `campaign:view`. The effective weights and whether they are custom.

### `PUT /api/campaigns/:id/weights`
Capability: `scoring:configure`. Replaces the weights and re-scores the campaign.

```json
{ "weights": { "companyFit": { "industryMatch": 8, "geographyMatch": 5, "sizeBand": 5, "technologyOrModel": 4, "namedOrExistingClient": 3 }, "roleRelevance": { "...": 0 } } }
```

A configuration that does not total exactly 100 is rejected with `400`:

```json
{ "error": "Invalid scoring weights.", "total": 112, "details": ["Scoring weights must total exactly 100 points. This configuration totals 112."] }
```

### `POST /api/campaigns/:id/rescore`
Capability: `campaign:manage`. Re-runs the engine over every enrolled contact and
writes a `ScoreAudit` row for each score that changes. Returns
`{ scored, byPriority }`.

---

## Contacts

### `GET /api/contacts`
Capability: `contact:view`. Accepts exactly the query parameters the contacts
screen uses, so any view is reproducible:

`q`, `campaign`, `priority`, `country`, `industry`, `employeeBand`, `seniority`,
`roleCategory`, `decisionRole`, `technology`, `trigger`, `minScore`, `maxScore`,
`emailStatus`, `phoneStatus`, `whatsappStatus`, `consentStatus`,
`engagementEvent`, `assignedTo`, `reviewPending`, `sort`, `direction`, `page`,
`pageSize`.

Repeat a parameter for multiple values: `?priority=P1&priority=P2`.

Sort keys: `totalScore`, `roleRelevanceScore`, `triggerScore`,
`attendanceLikelihoodScore`, `dataQualityScore`, `lastVerifiedAt`,
`nextFollowUpAt`, `companyName`.

### `GET /api/campaign-contacts/:id`
Capability: `contact:view`. The **fully explained** live score for one contact in
one campaign — recomputed, not cached:

```json
{
  "components": { "fit": 25, "roleRelevance": 25, "trigger": 20, "engagement": 8, "dataQuality": 10, "attendance": 0 },
  "baseTotal": 88,
  "engagementBonus": 0,
  "totalScore": 88,
  "priority": "P1",
  "priorityReasons": ["Score 88 with role relevance 25/18 and data quality 10/7; both gates passed."],
  "explanation": [
    { "component": "B_ROLE", "code": "role.directOwner", "label": "Direct owner of the campaign problem", "points": 12, "max": 12, "reason": "Classified as direct owner on 2 independent signals (department: operations; researcher-recorded responsibility)." }
  ],
  "relevance": { "passed": true, "roleEligibleForP1": true, "checks": [] },
  "compliance": { "outcome": "PASS", "allowedChannels": ["EMAIL", "PHONE", "WHATSAPP"], "permissions": [] },
  "humanReviewRequired": false,
  "playbook": { "recommendedChannel": "PHONE", "recommendedNextAction": "Call within 24 hours…", "callerOpening": "…", "emailAngle": "…", "whatsappRecommended": false }
}
```

### `GET /api/export/contacts`
Capability: `export:perform`. CSV of the current filtered view, with the full
score decomposition, both gate results, the "why this contact" note and the
recommended action. Same parameters as `GET /api/contacts`.

---

## Import

### `POST /api/import/preview`
Capability: `contact:import`. Validates, normalises and de-duplicates without
writing anything. Safe to call repeatedly while a user corrects rows.

```json
{ "records": [{ "Company Name": "Northwind Utilities", "First Name": "Amara" }], "mapping": { "Company Name": "companyName", "First Name": "firstName" } }
```

Returns each row with `status` (`VALID` / `INVALID` / `DUPLICATE`), its errors,
its warnings, the normalised values, the duplicate match and its reason, plus a
summary counting valid, invalid, duplicate, missing-email, missing-phone,
missing-consent and unrecognised-country rows.

### `POST /api/import/commit`
Capability: `contact:import`. Writes accounts, contacts and compliance records,
enrols them in a campaign and scores them. Accepts `skipRowNumbers` for rows the
user chose to skip. Returns the import summary.

Imported contacts arrive with ownership flags unset, so they earn no ownership
points and cannot reach P1 until a researcher verifies who owns the problem.

---

## Engagement and activities

### `POST /api/events`
Capability: `contact:edit`. The webhook-shaped entry point a marketing platform
would call. Awards the event's post-webinar points, updates the outreach status
and re-scores the contact.

```json
{ "campaignId": "…", "contactId": "…", "eventType": "WEBINAR_ATTENDANCE_80_PERCENT", "metadata": { "attendedPercent": 87 } }
```

All 28 event types from `EventType` are accepted.

### `POST /api/activities/call`
Capability: `outreach:perform`. Records one of the twelve call outcomes. Each
outcome maps to an engagement event, a status transition and any contact-level
side effect — `WRONG_NUMBER` marks the phone invalid but leaves email available;
`DO_NOT_CONTACT` writes a global opt-out onto the compliance record, which blocks
every channel on the next scoring pass.

### `POST /api/activities/email`
Capability: `outreach:perform`. Drafts and records an email. With the default
`log` provider nothing is transmitted; the response reports which provider
handled it.

### `POST /api/activities/whatsapp`
Capability: `outreach:perform`. Records a WhatsApp message. **Refused** unless the
contact's status is `AVAILABLE_OPTED_IN`, even when called directly — the service
enforces this independently of the interface.

---

## Compliance

### `GET /api/compliance/rules`
Capability: `contact:view`. The configured country rules, with the counsel
disclaimer.

### `PUT /api/compliance/rules`
Capability: `compliance:manage`. Creates or replaces one country's rule.

```json
{ "country": "France", "emailRequirement": "SOFT_OPT_IN_SUFFICIENT", "phoneRequirement": "LEGITIMATE_INTEREST_SUFFICIENT", "whatsappRequirement": "EXPLICIT_OPT_IN_REQUIRED", "requiredFields": ["consentStatus", "lawfulBasis", "consentSource", "consentDate"], "noticeRequired": true }
```

`ConsentRequirement` is one of `EXPLICIT_OPT_IN_REQUIRED`,
`SOFT_OPT_IN_SUFFICIENT`, `LEGITIMATE_INTEREST_SUFFICIENT`, `CHANNEL_PROHIBITED`.

---

## Server actions

| Action | Capability | Effect |
|---|---|---|
| `loginAction` / `logoutAction` | — | Session lifecycle |
| `updateScoringWeightsAction` | `scoring:configure` | Validate to 100, save, re-score |
| `updateCampaignCostAction` | `campaign:manage` | Cost, drives cost per attendee |
| `updateRelevantRolesAction` | `campaign:manage` | Relevant role categories and ownership phrases, then re-score |
| `rescoreCampaignAction` | `campaign:manage` | Re-score a campaign |
| `submitReviewAction` | `review:perform` | Approve / downgrade / reject, update role facts, verify triggers, re-verify |
| `logCallAction` | `outreach:perform` | Call outcome, event, status, re-score |
| `logEmailAction` / `logWhatsAppAction` | `outreach:perform` | Record a message through the provider abstraction |
| `bulkAssignAction` | `contact:edit` | Reassign selected contacts |
| `bulkStatusAction` | `contact:edit` | Bulk status change; requires explicit confirmation |
| `setFollowUpAction` | `outreach:perform` | Next follow-up date |
| `saveCountryRuleAction` | `compliance:manage` | Country compliance rule |
| `saveComplianceRecordAction` | `compliance:manage` | Contact record, then re-score every enrolment |
| `createUserAction` / `toggleUserAction` | `user:manage` | User administration |

### Approval rule

`submitReviewAction` refuses to approve without a written justification:

```json
{ "error": "A written \"why this contact\" justification is required before approving a contact for P1." }
```

The scoring engine enforces the same rule independently: a contact scoring 80+
with no justification is held at P2 with the reason recorded on the record.
