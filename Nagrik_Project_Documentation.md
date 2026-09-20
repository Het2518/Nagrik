# Nagrik — Project Documentation
### Family-Based Beneficiary Management System for Government Schemes in Gujarat
**Organized for:** Pravi Research Hackathon, Gandhinagar
**Stack:** MERN (MongoDB, Express.js, React, Node.js)
**Document Type:** Complete Project Documentation
**Prepared:** September 2026

---

## Table of Contents

1. Problem Statement
2. Glossary of Terms
3. System Overview
4. Frontend Architecture
5. Backend Architecture
6. User Portal (Citizen) — Detailed
7. Admin Portal (Officer/Government) — Detailed
8. Interconnection Between Portals
9. Data Dictionary
10. Solution to the Identified Problem — All Scenarios
11. Non-Functional Requirements
12. Future Roadmap

---

## 1. Problem Statement

Gujarat's government schemes — pensions, scholarships, food security (ration cards), agricultural subsidies, and disability benefits — are currently administered through **separate, department-specific systems** with no shared, verified record of who a beneficiary's family actually is. This causes two persistent, audit-flagged failures:

- **Exclusion errors:** Genuinely eligible families (widows, elderly, disabled, low-income households) do not receive benefits because no department proactively identifies them; families must know about and apply to each scheme individually.
- **Inclusion errors:** Ineligible, duplicate, or fraudulent beneficiaries continue receiving benefits because there is no cross-scheme visibility, no periodic re-verification, and no reliable way to confirm that a claimed family background, income, or category is genuine.

**The core issue:** there is no unified, verified, family-level identity that every scheme can reference. Individual applicants are checked in isolation, allowing manipulation (e.g., a person exploiting another family's background or a fabricated income certificate) and allowing genuinely deserving families to fall through the cracks simply because no system connects the dots.

**Nagrik's objective:** Introduce a **Family ID-based beneficiary management platform** that registers every household once, links every member and every scheme application to that verified household record, and gives government officers a single interface to verify, approve, and track benefits — replacing scattered, scheme-by-scheme silos with one connected system.

---

## 2. Glossary of Terms

| Term | Definition |
|---|---|
| **Nagrik** | Name of this project/platform — Hindi/Gujarati word for "citizen" |
| **Family ID** | A unique identifier assigned to a household at registration, linking all its members and all scheme applications to one record |
| **Member** | An individual person belonging to a registered family, with their own demographic and eligibility-relevant attributes |
| **Head of Family** | The primary registrant of a household, typically the main earning or eldest responsible member |
| **Scheme** | A specific government welfare program (e.g., old-age pension, post-matric scholarship, NFSA ration card) with defined eligibility rules |
| **Eligibility Engine** | The backend logic component that evaluates a family/member's data against a scheme's rules and returns an eligible/ineligible result |
| **Application** | A citizen's formal request to be enrolled in a specific scheme, tied to a Family ID and Member ID |
| **Officer** | A government staff member (Talati, Mamlatdar, District Officer, Admin) responsible for verifying and approving/rejecting applications |
| **Talati** | Village-level revenue officer, typically the first point of verification |
| **Mamlatdar** | Taluka-level administrative officer, typically the approving authority above Talati |
| **Risk Flag** | A system-generated indicator (Low/Medium/High) showing how likely an application is to involve fraud or error, based on automated checks |
| **Document Reference Table** | A central backend store of certificate metadata (number, issuer, date) used to detect duplicate or reused certificates across applications |
| **Ration Card Type** | Classification of a household under Gujarat's food security system: AAY, PHH, NPHH, or APL |
| **BPL** | Below Poverty Line — a classification used to determine eligibility for several welfare schemes |
| **NFSA** | National Food Security Act — the central law governing India's ration card and food subsidy system |
| **NSAP** | National Social Assistance Programme — the central scheme covering old-age, widow, and disability pensions |
| **DBT** | Direct Benefit Transfer — the mechanism by which scheme payments are sent directly to a beneficiary's bank account |
| **JWT** | JSON Web Token — the authentication mechanism used to secure API access for both citizens and officers |
| **RBAC** | Role-Based Access Control — a security model restricting system actions based on the logged-in user's role |
| **Audit Log** | An immutable record of every significant action (create, verify, approve, reject) taken within the system, with actor and timestamp |
| **Inclusion Error** | A situation where an ineligible person wrongly receives a benefit |
| **Exclusion Error** | A situation where an eligible person wrongly fails to receive a benefit |
| **MERN** | MongoDB, Express.js, React, Node.js — the technology stack used to build Nagrik |
| **Mongoose** | The Object Data Modeling (ODM) library used to define MongoDB schemas in Node.js |
| **REST API** | Representational State Transfer — the architectural style used for communication between Nagrik's frontend and backend |

---

## 3. System Overview

Nagrik is built as a standard three-tier MERN application, with two distinct frontend experiences (User Portal and Admin Portal) sharing one backend and one database.

```
                     ┌───────────────────────┐
                     │      USER PORTAL        │
                     │  (React - Citizens)     │
                     └───────────┬───────────┘
                                 │
                                 │ REST API (HTTPS)
                                 │
                     ┌───────────▼───────────┐
                     │     ADMIN PORTAL        │
                     │ (React - Officers)      │◄────┐
                     └───────────┬───────────┘      │
                                 │                    │
                     ┌───────────▼───────────┐      │
                     │   EXPRESS.JS BACKEND     │      │
                     │  (Node.js REST API)     │──────┘
                     └───────────┬───────────┘
                                 │
                     ┌───────────▼───────────┐
                     │   MONGODB DATABASE      │
                     │ (Families, Schemes,    │
                     │  Applications, Logs)   │
                     └───────────────────────┘
```

Both portals are separate React applications (or separate route groups within one React app) that consume the same backend REST API, differentiated by the JWT role encoded at login.

---

## 4. Frontend Architecture

### 4.1 Technology Choices

- **Framework:** React (Vite for fast builds)
- **UI Library:** Material UI (MUI) — chosen for pre-built, government-dashboard-appropriate components (tables, steppers, badges)
- **Routing:** React Router — separate route trees for `/citizen/*` and `/officer/*`
- **State Management:** React Context for auth state; local component state for forms; no heavy global state library needed at hackathon scale
- **Form Handling:** React Hook Form + Yup for validation
- **HTTP Client:** Axios, with a shared instance that attaches the JWT token automatically
- **Charts:** Recharts, used only in the Admin Portal's analytics dashboard

### 4.2 Frontend Folder Structure

```
src/
├── components/
│   ├── common/          (Button, Card, Badge, LoadingSkeleton, EmptyState)
│   ├── citizen/          (FamilyForm, MemberCard, EligibilityBadge)
│   └── officer/          (ApplicationTable, RiskFlagBadge, VerificationChecklist)
├── pages/
│   ├── citizen/          (Register, FamilyProfile, SchemeEligibility, ApplyToScheme, TrackApplication)
│   └── officer/          (Login, ApplicationsQueue, FamilyLookup, VerifyApplication, Dashboard, AuditLogs)
├── context/
│   └── AuthContext.jsx
├── services/
│   ├── api.js            (Axios instance + interceptors)
│   ├── familyService.js
│   ├── schemeService.js
│   └── applicationService.js
├── hooks/
│   └── useEligibility.js
└── App.jsx               (route definitions for both portals)
```

### 4.3 Shared Frontend Design Principles

- Government-appropriate color palette (navy/teal primary, white background, minimal decorative color).
- Loading skeletons instead of blank screens during API calls.
- Toast notifications for success/error feedback (react-hot-toast or MUI Snackbar).
- Masked display of sensitive data (Aadhaar shown as `XXXX-XXXX-1234`) everywhere except during entry.
- Mobile-first responsive design for the User Portal; desktop-optimized layout for the Admin Portal (used at taluka offices).

---

## 5. Backend Architecture

### 5.1 Technology Choices

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB, accessed via Mongoose ODM
- **Authentication:** JWT (jsonwebtoken) with bcrypt for password hashing
- **Validation:** express-validator or Joi at the route level
- **Environment Config:** dotenv

### 5.2 Backend Folder Structure

```
src/
├── config/
│   └── db.js                    (MongoDB connection)
├── models/
│   ├── Family.js
│   ├── Member.js
│   ├── Scheme.js
│   ├── Application.js
│   ├── Officer.js
│   ├── DocumentReference.js
│   └── AuditLog.js
├── controllers/
│   ├── familyController.js
│   ├── schemeController.js
│   ├── eligibilityController.js
│   ├── applicationController.js
│   ├── officerController.js
│   └── dashboardController.js
├── routes/
│   ├── familyRoutes.js
│   ├── schemeRoutes.js
│   ├── applicationRoutes.js
│   ├── authRoutes.js
│   └── dashboardRoutes.js
├── middleware/
│   ├── authMiddleware.js        (JWT verification)
│   ├── roleMiddleware.js        (RBAC — restricts by officer role)
│   └── errorHandler.js
├── services/
│   ├── eligibilityEngine.js     (core rule-matching logic)
│   ├── riskScoringService.js    (duplicate/fraud detection logic)
│   └── auditLogService.js
└── server.js
```

### 5.3 Core Backend Services (Business Logic Layer)

**Eligibility Engine (`eligibilityEngine.js`)**
Takes a family's and member's data, iterates through the active Scheme Catalog, and evaluates each scheme's `eligibilityRules` object against that data, returning a structured result of eligible/ineligible schemes with reasons.

**Risk Scoring Service (`riskScoringService.js`)**
Runs automatically whenever a new application is submitted. Checks:
- Whether the submitted certificate number already exists in the Document Reference Table under a different Family ID.
- Whether the applying member already holds a conflicting or duplicate benefit under scheme stacking rules.
- Whether the declared income is inconsistent with other known attributes (e.g., linked to a flagged occupation category).
Outputs a `riskFlag` value (`Low`, `Medium`, `High`) stored on the Application document.

**Audit Log Service (`auditLogService.js`)**
Called by every controller action that changes state (family created, member added, application status changed) to write an immutable log entry with actor ID, role, action, and timestamp.

---

## 6. User Portal (Citizen) — Detailed

### 6.1 Purpose

Allows a citizen (head of family) to register their household once, discover which schemes they qualify for, apply, and track application status — without needing to know which government department owns which scheme.

### 6.2 Screens and Functionality

**Screen 1: Family Registration**
- Multi-step form (MUI Stepper): Step 1 — Head of family details (name, DOB, gender, Aadhaar, mobile); Step 2 — Address, ration card number, ration card type, annual income, category; Step 3 — Add additional members (relationship, DOB, occupation, disability status, student status); Step 4 — Review and submit.
- On submit, calls `POST /api/v1/families`, which creates the Family document and the head-of-family Member document, and returns a generated `familyId`.

**Screen 2: Family Dashboard / Profile**
- Displays the Family ID prominently, a verification status badge (`Pending Verification` / `Verified`), and a card-based list of all registered members.
- "Add Member" button opens a form to register additional household members at any time (`POST /api/v1/families/:id/members`).

**Screen 3: Scheme Eligibility Checker**
- Calls `GET /api/v1/eligibility/:familyId` and displays a badge grid: one row per member, one column per scheme, with color-coded badges (`Eligible` — green, `Not Eligible` — grey, `Already Applied` — blue).
- Each badge is clickable to see the specific reason for eligibility or ineligibility (e.g., "Income exceeds limit by ₹20,000").

**Screen 4: Apply to Scheme**
- From an "Eligible" badge, citizen clicks "Apply," selects the member applying, and fills in scheme-specific document fields (certificate number, issuing authority, issue date) rather than only uploading a file.
- Calls `POST /api/v1/applications`, which triggers the Risk Scoring Service server-side before saving.

**Screen 5: Application Tracker**
- Timeline component showing status progression: `Pending` → `Under Review` → `Verified` → `Approved`/`Rejected`, along with any officer remarks, fetched via `GET /api/v1/applications?familyId=X`.

### 6.3 User Portal Data Flow Summary

Register Family → View Eligibility → Apply to Scheme → Track Status — every step reads or writes against the same `familyId`, ensuring the citizen never has to re-enter household data for a second scheme application.

---

## 7. Admin Portal (Officer/Government) — Detailed

### 7.1 Purpose

Gives government officers (Talati, Mamlatdar, District Officer, Admin) a single interface to look up any family by their Family ID, review pending applications with risk context, verify documents, and approve or reject — with full audit accountability.

### 7.2 Screens and Functionality

**Screen 1: Officer Login**
- Role-based JWT login (`POST /api/v1/auth/login`); token encodes officer role and jurisdiction (village/taluka/district), used by backend RBAC middleware to scope what data the officer can see.

**Screen 2: Family ID Lookup**
- A search bar where the officer enters a Family ID (or in production, scans a QR code) and instantly retrieves the full family record: all members, ration card details, income/category, and complete application history across every scheme.
- Calls `GET /api/v1/families/:familyId`.

**Screen 3: Applications Queue**
- A filterable, sortable table (`GET /api/v1/applications?status=Pending&district=X&risk=High`) showing all pending applications in the officer's jurisdiction, with a dedicated **Risk Flag column** (Low/Medium/High) so high-risk cases are immediately visible rather than buried in a long list.

**Screen 4: Verification Screen**
- Opens when an officer selects an application; shows declared data (income, category, certificate details) side-by-side with any flags raised by the Risk Scoring Service (e.g., "Certificate number already used on Application #4521").
- Requires the officer to complete a verification checklist and enter mandatory remarks before the Approve/Reject buttons become active.
- Calls `PATCH /api/v1/applications/:id/status`, which also triggers an Audit Log entry.

**Screen 5: Analytics Dashboard**
- Two Recharts visualizations: a bar chart of eligible-vs-enrolled counts per scheme, and a pie chart of application status breakdown, both fed by `GET /api/v1/dashboard/stats`.
- A summary tile showing count of high-risk flags detected and resolved, directly demonstrating fraud-prevention value to judges.

**Screen 6: Audit Log Viewer (Admin role only)**
- A read-only, filterable table of every action taken system-wide (`GET /api/v1/auditlogs`), showing actor, action, entity affected, and timestamp — used to demonstrate accountability and traceability.

### 7.3 Admin Portal Data Flow Summary

Login → Look up Family by ID → Review flagged/pending Applications → Verify against risk context → Approve/Reject with remarks → Action logged automatically — every decision an officer makes is both informed by cross-scheme context and permanently recorded.

---

## 8. Interconnection Between Portals

The User Portal and Admin Portal are **not independent systems** — they are two views over the exact same backend data, connected as follows:

- **Shared Family ID as the join key.** Any family registered through the User Portal is immediately visible and searchable in the Admin Portal's Family Lookup screen — there is no separate sync or import step.
- **Application lifecycle bridges both portals.** A citizen submits an application in the User Portal; it appears instantly in the officer's Applications Queue in the Admin Portal; when the officer updates its status, the citizen sees the updated status in their Application Tracker in near real time (via polling or, if time permits, WebSocket/Socket.io push updates).
- **Risk scoring is invisible to citizens, visible to officers.** The Risk Scoring Service runs automatically on submission (backend-side), but its output (`riskFlag`) is only ever displayed in the Admin Portal — citizens never see or can manipulate their own risk flag.
- **Eligibility Engine serves both portals.** The same `eligibilityEngine.js` service that powers the citizen's "Check Eligibility" screen is reused by the Admin Portal's Verification Screen to show the officer *why* the system considers an application eligible or not, ensuring both sides always see consistent logic.
- **Single source of truth for audit.** Every state change, whether triggered by a citizen action (submitting an application) or an officer action (approving it), writes to the same `AuditLog` collection, giving Admins full visibility into the complete lifecycle of every record from either side.

---

## 9. Data Dictionary

### 9.1 Collection: `families`

| Field | Type | Description |
|---|---|---|
| familyId | String (unique) | Human-readable Family ID |
| headOfFamilyId | ObjectId (ref: Member) | Reference to household head |
| rationCardNumber | String (unique) | Links to NFSA/ration records |
| rationCardType | Enum (AAY/PHH/NPHH/APL) | Subsidy tier |
| annualIncome | Number | Household income |
| category | Enum (SC/ST/OBC/General/EWS) | Reservation category |
| bplStatus | Boolean | BPL flag |
| address | Object | Village, taluka, district, pincode |
| isVerified | Boolean | Officer verification status |
| lastVerifiedDate | Date | Drives periodic re-verification |
| createdAt / updatedAt | Date | Timestamps |

### 9.2 Collection: `members`

| Field | Type | Description |
|---|---|---|
| memberId | String (unique) | Member identifier |
| familyId | ObjectId (ref: Family) | Parent household |
| name, dob, gender | Mixed | Demographics |
| aadhaarNumber | String (encrypted) | Identity linkage |
| relationToHead | Enum | Self/Spouse/Son/Daughter/Parent/Other |
| occupation | String | For scheme targeting |
| maritalStatus | Enum | Widow pension eligibility |
| disabilityStatus | Boolean | Disability pension eligibility |
| isStudent | Boolean | Scholarship eligibility |
| lifecycleStatus | Enum (Active/Deceased/Migrated) | Auto-suspends benefits when changed |

### 9.3 Collection: `schemes`

| Field | Type | Description |
|---|---|---|
| schemeId | String (unique) | e.g., IGNOAPS, PMSSS |
| schemeName | String | Full name |
| department | String | Owning department |
| eligibilityRules | Object (JSON) | minAge, maxIncome, allowedCategories, requiredRationTypes, etc. |
| benefitType | Enum | Cash/InKind/Subsidy/Scholarship |
| isActive | Boolean | Enable/disable scheme |

### 9.4 Collection: `applications`

| Field | Type | Description |
|---|---|---|
| applicationId | String (unique) | Tracking number |
| familyId / memberId | ObjectId | Applicant reference |
| schemeId | ObjectId | Scheme applied for |
| status | Enum | Pending/UnderReview/Verified/Approved/Rejected |
| riskFlag | Enum (Low/Medium/High) | Set by Risk Scoring Service |
| documentReferences | Array[ObjectId] | Linked certificate metadata |
| remarks | String | Officer notes |
| verifiedByOfficerId | ObjectId (ref: Officer) | Verifying officer |
| submissionDate / decisionDate | Date | Timeline |

### 9.5 Collection: `documentreferences`

| Field | Type | Description |
|---|---|---|
| certificateNumber | String | Used for duplicate detection |
| certificateType | Enum | Income/Caste/Disability/Marksheet |
| issuingAuthority | String | Issuer name |
| issueDate | Date | Validity tracking |
| linkedApplicationIds | Array[ObjectId] | All applications referencing this certificate |

### 9.6 Collection: `officers`

| Field | Type | Description |
|---|---|---|
| officerId | String (unique) | Staff ID |
| name, email, passwordHash | Mixed | Login credentials |
| role | Enum | Talati/Mamlatdar/DistrictOfficer/Admin |
| jurisdiction | Object | Village/taluka/district scope |

### 9.7 Collection: `auditlogs`

| Field | Type | Description |
|---|---|---|
| action | String | e.g., APPLICATION_APPROVED |
| actorId, actorRole | Mixed | Who performed the action |
| entityAffected | String | e.g., Family:GJ-AMD-000123 |
| timestamp | Date | When it occurred |
| metadata | Object | Old/new values for context |

---

## 10. Solution to the Identified Problem — All Scenarios

### 10.1 Root Cause Recap

The fundamental problem is the absence of a single, verified, family-level record shared across schemes, which causes exclusion errors (eligible families missed) and inclusion errors (ineligible/duplicate/fraudulent beneficiaries enrolled).

### 10.2 Scenario-by-Scenario Resolution

**Scenario 1 — Eligible family never applies because they don't know the scheme exists.**
*Nagrik fix:* The Eligibility Engine proactively evaluates every active scheme against a family's data the moment they register, surfacing all qualifying schemes automatically rather than waiting for the citizen to search for them.

**Scenario 2 — Application rejected due to a missing minor document, even though core eligibility is met.**
*Nagrik fix:* Hard eligibility criteria (income, age, category) are separated from soft procedural documents; missing soft documents trigger a grace-period request rather than outright rejection.

**Scenario 3 — Same person appears twice, or Aadhaar conflicts across records.**
*Nagrik fix:* Database-level uniqueness constraint enforces one Aadhaar → one Member → one Family ID; conflicts are surfaced immediately at registration with a clear resolution workflow.

**Scenario 4 — Household income rises but ration card/scheme status is never updated.**
*Nagrik fix:* `lastVerifiedDate` field on the Family record drives a periodic re-verification cycle; records past the review window are automatically flagged for officer re-check rather than continuing indefinitely.

**Scenario 5 — Deceased or migrated beneficiary continues receiving benefits.**
*Nagrik fix:* `lifecycleStatus` field on Member records (Active/Deceased/Migrated); when changed, all linked scheme benefits for that member are automatically suspended pending re-review.

**Scenario 6 — A certificate (income, caste, etc.) is reused across multiple unrelated applications.**
*Nagrik fix:* The Document Reference Table centrally stores certificate metadata; any reuse of the same certificate number across different Family IDs triggers an automatic `High Risk` flag and mandatory officer verification for both applications.

**Scenario 7 — Person X exploits Person Y's family background to appear eligible.**
*Nagrik fix:* Every application must reference a `memberId` that is a verified, registered member of the specific `familyId` making the claim; the system blocks submission outright if declared certificate details don't match a registered family member.

**Scenario 8 — A family draws overlapping benefits from two schemes that were never meant to be combined.**
*Nagrik fix:* Before approving any new application, the Application Workflow Service checks the same Family ID's active benefit list against scheme stacking rules, flagging or blocking conflicting combinations.

**Scenario 9 — Officers have no visibility into a family's full scheme history, so verification happens in isolation.**
*Nagrik fix:* The Family ID Lookup screen in the Admin Portal shows an officer the complete cross-scheme application history for a household in one view, enabling informed verification decisions instead of siloed, single-scheme checks.

**Scenario 10 — No accountability for who approved a fraudulent or erroneous case.**
*Nagrik fix:* Every state-changing action writes an immutable Audit Log entry with actor identity, role, and timestamp, enabling traceability and administrative accountability after the fact.

### 10.3 Why This Constitutes a Complete Solution

Each scenario above maps to a distinct point of failure in the current siloed system, and each Nagrik fix operates on the **same shared Family Registry and Eligibility Engine** rather than requiring scheme-specific patches. This means new schemes onboarded onto Nagrik in the future automatically inherit all of these protections — proactive discovery, duplicate detection, lifecycle management, cross-scheme conflict checking, and audit accountability — without needing to rebuild fraud-prevention logic from scratch each time.

---

## 11. Non-Functional Requirements

- **Security:** JWT-based authentication, bcrypt password hashing, RBAC middleware restricting officer actions by role and jurisdiction, masked display of sensitive identifiers (Aadhaar).
- **Auditability:** Every state-changing action logged immutably with actor and timestamp.
- **Usability:** Government-appropriate, accessible UI (WCAG AA contrast), mobile-first citizen flow, desktop-optimized officer flow.
- **Scalability (future):** Document-based MongoDB schema allows easy addition of new schemes without restructuring existing Family/Member data.
- **Data integrity:** Database-level uniqueness constraints on Aadhaar and certificate numbers to prevent duplication at the source.

---

## 12. Future Roadmap (Explicitly Out of Hackathon Scope)

- Real Aadhaar/UIDAI eKYC integration for identity verification (requires government approval).
- Integration with production Digital Gujarat, IPDS, and NFSA systems.
- Gujarati language localization across both portals.
- SMS/WhatsApp notifications for application status changes.
- Offline-first PWA support for citizens in low-connectivity rural areas.
- QR-code-based physical Family ID cards for faster officer lookup in the field.

---

*End of documentation.*
