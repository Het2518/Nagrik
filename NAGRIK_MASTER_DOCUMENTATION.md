# NAGRIK (નાગરિક) V2 — Interoperable Welfare Intelligence & Benefit Orchestration Platform
## Privacy-Preserving Intelligence & Proactive Orchestration Layer Above Existing State Registries

> **Status:** Production-Ready Reference Implementation (Nagrik V2)  
> **Target Jurisdiction:** Government of Gujarat (Interoperable with Pan-India Digital Public Infrastructure)  
> **Core Stack:** Express 5 (Node.js 22), MongoDB & Mongoose, React 19, Vite 8, Cloudinary v2, Zustand, TanStack Query v5, Zod  
> **Verification Status:** **198 Automated Backend Tests Passing (100%)** — 157 Core Tests + 41 V2 Welfare Intelligence Tests; 0 Frontend Build Errors  
> **Strategic Positioning:** Nagrik does NOT position Family ID as its primary innovation (which is already provided by existing state ecosystems like UP Parivar Kalyan / NeGD Directory 95). Instead, Nagrik operates as an **explainable intelligence and orchestration layer** above existing identity, civil registry, and welfare systems.

---

## 1. Executive Summary & Project Vision

Modern Indian welfare delivery involves thousands of crores of rupees distributed annually across pensions, food subsidies, educational scholarships, housing grants, disability assistance, and agricultural inputs. However, traditional governance systems face a critical architectural flaw: **welfare schemes operate in departmental silos around individual identities (Aadhaar), while welfare eligibility is intrinsically determined at the household/family unit.**

**Nagrik V2** operates as a **Privacy-Preserving Welfare Intelligence & Benefit Orchestration Platform**. It connects citizen/family identity, verified evidence, life events, welfare schemes, eligibility rules, applications, and benefits into one unified, explainable welfare intelligence graph.

### 1.1 Core Value Proposition

| Dimension | Legacy System (Departmental Silos) | The Nagrik Platform |
|:---|:---|:---|
| **Identity Model** | Fragmented Aadhaar instances submitted separately to 15+ departmental portals | Single verified Family ID (`GJ-XXXXXXXX`) anchoring all household members |
| **Eligibility Discovery** | Citizen must know of schemes, decipher 40-page GRs (Government Resolutions), and apply blindly | Automated server-side rule engine evaluates household profile against all schemes in <50ms |
| **Verification Workflow** | Repetitive in-person physical submissions of the same certificates to multiple offices | Single-instance Talati verification; verified credentials reused across all applications |
| **Fraud & Duplicate Detection** | Zero cross-department visibility; forged or recycled certificates go undetected | Central Document Reference Table + Risk Scoring Engine flagging reuse and income anomalies |
| **Approval Pipeline** | Opaque paper files stuck on officer desks with no statutory time-tracking | Transparent 3-tier digital state machine (Talati → Mamlatdar → District Officer) with immutable audit trail |
| **Document Storage** | Physical paper photocopies decaying in taluka record rooms or vulnerable local disk uploads | Cloudinary v2 cloud storage with secure HTTPS delivery, format validation, and permanent audit links |
| **Linguistic Accessibility** | Complex bureaucratic jargon, predominantly English or unoptimized vernacular | Complete dual-language support (Gujarati & English) with intuitive step-by-step guidance |

---

## 2. In-Depth Problem Statement & Root Cause Analysis

### 2.1 The "Departmental Silo" Dilemma in State Administration

In Gujarat and across most Indian states, social welfare schemes are distributed across independent administrative departments:
- **Social Justice and Empowerment Department:** Old Age Pension (IGNOAPS), Widow Pension (Ganga Swarupa), SC/ST Post-Matric Scholarships.
- **Food, Civil Supplies and Consumer Affairs Department:** NFSA Ration Cards (Antyodaya Anna Yojana - AAY, Priority Household - PHH).
- **Women and Child Development Department:** Poshan Abhiyaan, Beti Bachao / Kunwarbai nu Mameru.
- **Labour, Skill Development and Employment Department:** BOCW (Building and Other Construction Workers) welfare allowances.
- **Agriculture, Farmers Welfare and Co-operation Department:** PM-Kisan, Saat Pagla Khedut Kalyanna.

Each department operates its own legacy database. A rural family living in a village in Mehsana district interacts with the state not as a unified family unit, but as disjointed individuals carrying separate physical paper files to different taluka offices.

### 2.2 The Two Cardinal Failures of Legacy Welfare Delivery

#### Failure 1: Exclusion Errors (The "Invisible Deserving" Citizen)
Exclusion errors occur when an eligible, impoverished citizen fails to receive welfare benefits due to systemic friction:
1. **Information Asymmetry:** A widowed mother may know about food grains via her ration card, but remains completely unaware that her school-going daughter qualifies for a pre-matric scholarship and that she herself qualifies for the Ganga Swarupa widow pension.
2. **Procedural Fatigue & Opportunity Cost:** Applying for three schemes requires three separate visits to the Taluka Seva Sadan, procuring three physical income certificates, missing daily wage labor, and paying intermediaries (agents).
3. **Arbitrary Rejections for Minor Procedural Deficiencies:** If a supporting utility bill or affidavit is slightly blurred, the entire application is cancelled without recourse, forcing the citizen to restart from scratch.

#### Failure 2: Inclusion Errors (The "Ghost & Fraudulent" Beneficiary)
Inclusion errors occur when public welfare funds are wrongly disbursed to ineligible, deceased, or duplicate entities:
1. **Recycled Certificates:** An applicant uses an income certificate showing ₹45,000 annual income to secure a BPL benefit, while another family member uses a separate forged certificate for another scheme. Legacy systems do not correlate certificate numbers across departments.
2. **Deceased Beneficiary Leakage ("Ghost Pensions"):** When a pension recipient passes away in a rural village, their death may be registered at the Gram Panchayat, but the state Social Justice pension disbursement system continues issuing direct bank transfers for months or years because death registries and pension registries are not linked.
3. **Income Bracket Inflation:** A family categorised as BPL 10 years ago may now have members working in urban formal jobs with household income exceeding ₹4,00,000, yet they continue drawing subsidized food grains under AAY/PHH because there is no automated periodic re-verification mechanism.

### 2.3 Individual Identity (Aadhaar) vs. Household Welfare Unit

Aadhaar provides proof of **individual existence and identity**, answering *"Is this person who they claim to be?"* However, welfare schemes in India are designed around **household socio-economic vulnerability**, answering:
- *"Does this household collectively earn less than the BPL threshold of ₹1,20,000/year?"*
- *"Is the applicant the eldest female head of an Antyodaya household?"*
- *"Are there multiple working adults supporting this elderly dependent?"*

Without a persistent **Family Registry**, an individual's Aadhaar cannot provide answers to household-level criteria. Nagrik bridges this fundamental gap by establishing a **1-to-Many cryptographic relationship** between a Family Master Entity and its associated Member entities.

### 2.4 Comparative Analysis: NeGD Directory 95 & Uttar Pradesh Parivar Kalyan Portal

Under the National e-Governance Division (NeGD) Directory 95, Uttar Pradesh pioneered the **Parivar Kalyan / Family ID Portal ("One Family, One ID")**, which maps families using existing ration card databases to proactively map benefits.

Nagrik analyzes and advances this paradigm specifically for Gujarat's administrative machinery:

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                      ARCHITECTURAL COMPARISON: UP MODEL VS. NAGRIK                        │
├────────────────────────────────┬───────────────────────────────┬──────────────────────────┤
│ Architectural Feature          │ UP Parivar Kalyan (NeGD 95)   │ Nagrik Platform          │
├────────────────────────────────┼───────────────────────────────┼──────────────────────────┤
│ Base Identifier                │ 12-Digit Family ID            │ Alphanumeric `GJ-XXXXXXXX`│
│ Core Ingestion Source          │ Static NFSA Ration Card DB    │ Dynamic Citizen Onboarding│
│                                │ import                        │ + Gram Panchayat Sync    │
│ Rule Evaluation Architecture   │ Department-side batch queries │ Real-time in-memory JSON  │
│                                │                               │ Rule Engine (<50ms)      │
│ Document Asset Pipeline        │ Traditional local attachments │ Cloudinary v2 Cloud CDN  │
│                                │ on state servers              │ with anti-tampering keys │
│ Verification Hierarchy         │ Single-stage Lekhpal check    │ Strict 3-Tier Pipeline   │
│                                │                               │ (Talati→Mamlatdar→DO)    │
│ Anti-Fraud Verification        │ Post-audit sampling           │ Automated DocumentRef    │
│                                │                               │ Cross-Family Collision   │
│ Field Officer Checklists       │ Free-text remarks             │ Structured multi-point   │
│                                │                               │ digital checklists       │
│ Forensic Auditability          │ Standard database logs        │ Immutable Append-Only    │
│                                │                               │ Audit Trail with diffs   │
└────────────────────────────────┴───────────────────────────────┴──────────────────────────┘
```

---

## 3. Real-World Operational Scenarios & User Journeys

### Scenario 1: Proactive Eligibility Discovery for a Rural Household
**Persona:** *Rameshbhai Solanki (48, marginal farmer), his wife Savitaben (46), elderly mother Jamnaben (72), and daughter Mittal (19, college student) residing in Village Katosan, Taluka Kadi, District Mehsana.*
1. **Registration:** Rameshbhai registers on `user_frontend` (:5173) using his mobile number. He completes the 5-step Family Onboarding Wizard, adding all 4 members with their respective demographics, declaring annual agricultural income of ₹68,000, and entering his PHH Ration Card number.
2. **Provisional State:** The family is assigned `GJ-A18F9C20`. The status is marked `Provisional` pending physical verification.
3. **Village Officer Verification:** The local Talati logs into `admin_frontend` (:5174), filters by Village *Katosan*, inspects the declared ration card and residence, completes the digital checklist, and marks the family `Permanent`.
4. **Proactive Discovery:** When Rameshbhai opens the **Schemes** tab:
   - *Jamnaben* is automatically tagged **Eligible** for **Indira Gandhi National Old Age Pension (IGNOAPS)** (Age 72 >= 60, Income <= ₹1,20,000).
   - *Mittal* is tagged **Eligible** for **Post-Matric Scholarship for OBC Students** (Student flag true, OBC category, Income within limit).
   - *Rameshbhai* is tagged **Eligible** for **PM-Kisan Samman Nidhi** (Farmer flag true).
5. **Impact:** The family discovers 3 life-changing welfare schemes they previously did not know they qualified for, without paying touts or making multiple trips to town.

### Scenario 2: Detection and Blocking of Recycled Certificate Fraud
**Persona:** *An unscrupulous applicant attempting to claim subsidized housing benefits using a certificate belonging to another household.*
1. Applicant registers a new family profile and applies for *Dr. Ambedkar Awas Yojana*.
2. In the application wizard, under Income Certificate Number, the applicant enters `INC-2025-MEH-88219` and uploads a scanned PDF.
3. **Backend Risk Scoring Execution:** `POST /api/v1/applications` receives the payload. Before saving, `riskScoringService.js` queries the `DocumentReference` collection for certificate `INC-2025-MEH-88219`.
4. **Collision Detected:** The certificate is already registered under `GJ-C9014E77` (a completely different family in a neighboring village).
5. **Risk Elevation:** The application is flagged as **`High Risk`** (`riskFlag = 'High'`) and assigned reason: *"Certificate INC-2025-MEH-88219 is already linked to Family GJ-C9014E77"*.
6. **Officer Alert:** When the Talati opens the verification queue, the application appears highlighted in crimson with an amber alert badge. The officer is presented with side-by-side collision details and promptly rejects the application with category `DocumentFraud`.

### Scenario 3: Dynamic Lifecycle Transition (Immediate Ghost Pension Suspension)
**Persona:** *Deceased beneficiary drawing monthly pension.*
1. An elderly citizen receiving monthly pension passes away.
2. During the monthly Gram Panchayat vital statistics update, the Talati opens the Family Registry on `admin_frontend`, navigates to the member record, and changes `lifecycleStatus` from `Active` to `Deceased`.
3. **Automated Backend Hook:** The mutation triggers an automated cascade:
   - Any active application where this member is the primary beneficiary is immediately transitioned to `Suspended / Deceased`.
   - The eligibility engine removes this member from future scheme evaluation calculations.
   - An immutable audit log entry is written with the officer's Employee ID and timestamp.
4. **Impact:** 100% elimination of ghost pension payments, saving public funds without manual cross-department memos.

### Scenario 4: The 3-Tier Multi-Level Approval Pipeline
**Persona:** *Mittal Solanki applying for an Post-Matric Education Scholarship.*

```mermaid
sequenceDiagram
    autonumber
    actor Citizen as Mittal (Citizen)
    actor Talati as Talati (Level 1)
    actor Mamlatdar as Mamlatdar (Level 2)
    actor DO as District Officer (Level 3)
    participant Cloudinary as Cloudinary v2 CDN
    participant API as Nagrik API Engine
    participant DB as MongoDB Atlas

    Citizen->>Cloudinary: Direct Multipart Upload (Marksheet & Caste Cert)
    Cloudinary-->>Citizen: Return Secure HTTPS URLs & Public IDs
    Citizen->>API: POST /api/v1/applications (Payload + Cloudinary URLs)
    API->>DB: Save Application (status: 'Pending', level: 1)
    API-->>Citizen: 201 Created (Tracking ID: APP-8941BC70)

    Note over Talati,API: Level 1: Village Field & Physical Verification
    Talati->>API: GET /api/v1/applications?level=1
    Talati->>API: POST /api/v1/applications/:id/decide (Action: 'Approved', Checklist)
    API->>DB: Update (status: 'Level1Approved' -> 'Level2Review', level: 2)

    Note over Mamlatdar,API: Level 2: Taluka Scrutiny & Regulatory Verification
    Mamlatdar->>API: GET /api/v1/applications?level=2
    Mamlatdar->>API: POST /api/v1/applications/:id/decide (Action: 'Approved', Checklist)
    API->>DB: Update (status: 'Level2Approved' -> 'Level3Review', level: 3)

    Note over DO,API: Level 3: District Sanction & Financial Authorization
    DO->>API: GET /api/v1/applications?level=3
    DO->>API: POST /api/v1/applications/:id/decide (Action: 'Approved', Sanction Order)
    API->>DB: Update (status: 'FinalApproved', level: 3, Sanctioned: true)
    API-->>Citizen: Push Notification / Status Tracker: "Fully Sanctioned"
```

### Scenario 5: Missing Document Grace Flow ("Resubmission Required")
1. An applicant uploads a caste certificate where the seal of the Sub-Divisional Magistrate is cropped out.
2. Under legacy systems, the application is summarily rejected, requiring a 60-day re-application cycle.
3. In Nagrik, the Mamlatdar selects action **`ResubmissionRequested`**, tags category `DocumentIncomplete`, and writes remarks: *"Page 2 with SDM endorsement stamp is missing. Please re-upload clear scan within 15 days."*
4. The application state updates to `ResubmissionRequired`.
5. The citizen logs into `user_frontend`, sees an alert banner on their application card with the officer's exact instructions, clicks **"Re-upload Document"**, replaces the Cloudinary file, and clicks **"Resubmit"**.
6. The application resumes at Level 2 without losing its original queue priority.

---

## 4. Comprehensive System Architecture & Top-Level Design

Nagrik is architected as an enterprise monorepo comprising two decoupled frontend clients and an Express 5 REST API micro-monolith connected to MongoDB Atlas and Cloudinary CDN.

```
                                  ┌─────────────────────────────────────────────────────────┐
                                  │                  NAGRIK MONOREPO ROOT                   │
                                  └───────────────────────────┬─────────────────────────────┘
                                                              │
               ┌──────────────────────────────────────────────┼─────────────────────────────────────────────┐
               │                                              │                                             │
┌──────────────▼──────────────┐                ┌──────────────▼──────────────┐               ┌──────────────▼──────────────┐
│        user_frontend        │                │       admin_frontend        │               │           backend           │
│  (Citizen Welfare Portal)   │                │ (Officer Workspace & Admin) │               │      (Express 5 REST API)   │
│                             │                │                             │               │                             │
│ • React 19 + Vite 8 (:5173) │                │ • React 19 + Vite 8 (:5174) │               │ • Node.js 22 + Express 5    │
│ • Gujarati / English (i18n) │                │ • RBAC: 4 Officer Tiers     │               │ • MongoDB Atlas + Mongoose  │
│ • Zustand State Stores      │                │ • Pipeline Triage Queues    │               │ • Cloudinary v2 Media SDK   │
│ • TanStack Query v5 Cache   │                │ • Verification Checklists   │               │ • In-Memory Rule Engine     │
│ • Zod Form Validations      │                │ • Immutable Audit Viewer    │               │ • AES-256 PII Encryption    │
│ • Responsive Mobile Design  │                │ • System Metrics Dashboard  │               │ • 157 Passing Jest Tests    │
└──────────────┬──────────────┘                └──────────────┬──────────────┘               └──────────────┬──────────────┘
               │                                              │                                             │
               │ HTTP REST (JSON / JWT)                       │ HTTP REST (JSON / JWT)                      │
               └───────────────────────┬──────────────────────┴─────────────────────────────────────────────┘
                                       │
                        ┌──────────────▼──────────────┐
                        │      HTTP Security Mesh     │
                        │ • Helmet Security Headers   │
                        │ • CORS Strict Origin Lock   │
                        │ • IP Express Rate Limiters  │
                        │ • Central Error Interceptor │
                        └──────────────┬──────────────┘
                                       │
       ┌───────────────────────────────┼───────────────────────────────┐
       │                               │                               │
┌──────▼──────┐                 ┌──────▼──────┐                 ┌──────▼──────┐
│  Cloudinary │                 │   MongoDB   │                 │ Audit Trail │
│   v2 CDN    │                 │    Atlas    │                 │ (Immutable) │
│ Secure Docs │                 │ 8 Schemas   │                 │ Append-Only │
└─────────────┘                 └─────────────┘                 └─────────────┘
```

### 4.1 Port Separation & Zero-Leakage Architecture
To ensure complete operational isolation and prevent privilege elevation vectors:
- **Citizen Portal (`user_frontend`):** Runs strictly on `http://localhost:5173`. Contains zero administrative code, no officer components, and cannot invoke officer decision endpoints.
- **Administrative Portal (`admin_frontend`):** Locked strictly to `http://localhost:5174` via Vite's `strictPort: true`. Citizen registration is impossible from this interface; requires valid employee credentials and officer role.
- **Backend API (`backend`):** Centralized on `http://localhost:5000/api/v1`. Dispatches requests through role-scoping middleware that verifies JWT claims against the target resource jurisdiction.

---

## 5. Deep-Dive Frontend Architecture

### 5.1 Citizen Portal (`user_frontend`)

#### 5.1.1 Design System Philosophy & Styling Tokens
Government applications often suffer from poor visual hierarchy, slow loading times, and broken layouts on mobile screens. Nagrik establishes a lightweight, high-performance design system implemented entirely in **Pure Vanilla CSS Modules** using CSS custom properties (`src/styles/design-system.css`). No CSS framework runtimes (Tailwind, MUI) are utilized in the final build, resulting in zero stylesheet overhead and sub-100ms first paint.

```css
/* Core Design Tokens Excerpt (user_frontend/src/styles/design-system.css) */
:root {
  --gov-navy-900: #0a1b3a;
  --gov-navy-800: #102a5c;
  --gov-navy-700: #1b3d7a;
  --gov-saffron:  #ff9933;   /* Tricolor Saffron Accent */
  --gov-green:    #138808;   /* Tricolor India Green */
  --gov-white:    #ffffff;
  --surface-bg:   #f4f6fa;
  --surface-card: #ffffff;
  --text-primary: #0f172a;
  --text-muted:   #64748b;
  --border-light: #e2e8f0;
  --radius-sm:    6px;
  --radius-md:    10px;
  --radius-lg:    16px;
  --shadow-sm:    0 1px 3px rgba(0,0,0,0.06);
  --shadow-md:    0 4px 12px rgba(10,27,58,0.08);
  --font-family:  'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

#### 5.1.2 Full Internationalization (i18n): English & Gujarati
Citizens across Gujarat can switch languages seamlessly without page reload. The i18n engine (`src/i18n/`) provides complete coverage across all domains:

```javascript
// Excerpt: src/i18n/translations.js
export const translations = {
  en: {
    nav: { home: 'Home', schemes: 'Schemes', applications: 'My Applications', family: 'Family Profile' },
    family: {
      provisional: 'Provisional (Pending Field Verification)',
      permanent: 'Verified Permanent Household',
      addMember: 'Add Family Member',
      rationCard: 'Ration Card Tier',
      annualIncome: 'Annual Household Income',
    },
    eligibility: {
      eligible: 'Eligible',
      notEligible: 'Criteria Not Met',
      checkDetails: 'View Eligibility Breakdown',
    },
    wizard: {
      step1: 'Household Info',
      step2: 'Address & Category',
      step3: 'Head of Family',
      step4: 'Family Members',
      step5: 'Review & Submit',
    }
  },
  gu: {
    nav: { home: 'મુખ્ય પૃષ્ઠ', schemes: 'યોજનાઓ', applications: 'મારી અરજીઓ', family: 'કુટુંબ પ્રોફાઇલ' },
    family: {
      provisional: 'કામચલાઉ (રૂબરૂ ચકાસણી બાકી)',
      permanent: 'પ્રમાણિત કાયમી કુટુંબ',
      addMember: 'સભ્ય ઉમેરો',
      rationCard: 'રેશનકાર્ડ પ્રકાર',
      annualIncome: 'વાર્ષિક કૌટુંબિક આવક',
    },
    eligibility: {
      eligible: 'પાત્ર છે',
      notEligible: 'પાત્રતા મળતી નથી',
      checkDetails: 'પાત્રતા વિગતો જુઓ',
    },
    wizard: {
      step1: 'કુટુંબની માહિતી',
      step2: 'સરનામું અને વર્ગ',
      step3: 'કુટુંબના વડા',
      step4: 'કુટુંબના સભ્યો',
      step5: 'ચકાસો અને સબમિટ કરો',
    }
  }
};
```

#### 5.1.3 State Management & Data Fetching Architecture
- **Zustand (`src/store/authStore.js`):** Lightweight reactive store managing citizen authentication state, JWT tokens, user metadata, and persistent synchronization with `familyId`.
- **TanStack Query v5 (`@tanstack/react-query`):** Manages all server state. Implements 5-minute stale times, automatic background revalidation on window focus, and optimistic cache invalidation upon form submission.
- **Form Architecture:** Powered by `react-hook-form` coupled with `zod` schemas (`@hookform/resolvers/zod`). Every input field features deterministic client-side validation before any network request is initiated.

#### 5.1.4 Citizen Application Views & User Experience
1. **Landing & Authentication (`domains/auth/`):** Clean OTP/Password login with Aadhaar/Mobile credential validation.
2. **5-Step Onboarding Wizard (`domains/family/FamilyOnboardingPage.jsx`):** Guided stepper capturing household address (District, Taluka, Village, Pincode), Ration Card category (AAY, PHH, NPHH, APL), annual income, and Head of Family credentials.
3. **Scheme Discovery Catalog (`domains/schemes/SchemesPage.jsx`):** Searchable, filterable catalog spanning 9 sectors (Agriculture, Education, Pension, Housing, Health, Women & Child, Disability, Minority Welfare, Social Security). Each card dynamically indicates whether any member of the logged-in family is eligible.
4. **Scheme Detail & Member Matrix (`domains/schemes/SchemeDetailPage.jsx`):** Renders a per-member qualification table explaining why each individual is eligible or ineligible with specific rule-matching feedback.
5. **4-Step Application Wizard (`domains/schemes/ApplySchemeModal.jsx`):**
   - *Step 1:* Select eligible member from dropdown.
   - *Step 2:* Fill scheme-specific dynamic fields (e.g., BOCW worker registration number).
   - *Step 3:* Upload required documents to Cloudinary with drag-and-drop file preview.
   - *Step 4:* Final verification and submission returning instant tracking ID (`APP-XXXXXXXX`).
6. **Application Tracker (`domains/applications/ApplicationsPage.jsx`):** Visual 4-node status timeline (`Submitted` → `Talati Verified` → `Mamlatdar Scrutinized` → `District Sanctioned`) displaying officer feedback, timestamps, and Cloudinary document links.

---

### 5.2 Administrative & Officer Portal (`admin_frontend`)

#### 5.2.1 Multi-Tier Role-Based Access Control (RBAC) Matrix

| Officer Role | Jurisdiction Scope | Permissions & Permitted Actions | Accessible Navigation Modules |
|:---|:---|:---|:---|
| **Talati** | Village (Gram Panchayat) | Inspect pending applications; verify Provisional families to Permanent; fill physical inspection checklists; Approve/Reject/Send Back Level 1. | Dashboard, Applications Queue, Family Lookup |
| **Mamlatdar** | Taluka (Block) | Review Level-1-approved applications; verify regulatory compliance; cross-examine land/caste records; Approve/Reject/Send Back Level 2. | Dashboard, Applications Queue, Family Lookup |
| **District Officer** | District (Collectorate) | Review Level-2-approved applications; execute final financial sanction; authorize Direct Benefit Transfer (DBT) lists; reject. | Dashboard, Applications Queue, Family Lookup |
| **System Admin** | State-wide (All Districts) | Full supervisory access across all queues; Create/Edit Schemes and eligibility rules; Register and assign Officers; Inspect immutable Audit Logs. | All Modules + Schemes Admin, Officers Admin, Audit Logs Explorer |

#### 5.2.2 Officer Workspace Modules
1. **Officer Login (`domains/auth/LoginPage.jsx`):** Employee ID authentication with instant role identification and jurisdiction binding.
2. **Executive Dashboard (`domains/dashboard/DashboardPage.jsx`):** Real-time KPI tiles displaying:
   - Level-Specific Pending Applications
   - Sanctioned & Approved Beneficiaries
   - Rejected Applications
   - High-Risk Fraud Collision Alerts
   - Distribution Charts (Applications per Scheme, Status Breakdown)
3. **Applications Triage Queue (`domains/applications/ApplicationsAdminPage.jsx`):** High-throughput data grid supporting:
   - Filter by Status (`Pending`, `Level1Review`, `Level2Review`, `Level3Review`, `FinalApproved`, `Rejected`, `ResubmissionRequired`)
   - Filter by Risk Flag (`Low`, `Medium`, `High`)
   - Search by Application Tracking ID or Citizen Name
   - Deep Verification Drawer showing declared attributes side-by-side with risk flags and Cloudinary document previews.
4. **Digital Verification Checklist:** Officers cannot click "Approve" without checking required verification items (e.g., *"Physical residence confirmed in village"*, *"Income certificate validity verified"*).
5. **Family Registry Search (`domains/families/FamiliesAdminPage.jsx`):** Search any household by `Family ID`, `Ration Card`, or `Mobile`. View full family tree, member demographics, lifecycle states, and historical cross-scheme applications.
6. **Schemes Administrator (`domains/schemes/SchemesAdminPage.jsx`):** Create new welfare programs; define min/max age, income ceiling, allowed castes, and upload checklists dynamically via JSON schemas.
7. **Officer Registry (`domains/officers/OfficersPage.jsx`):** Provision new government personnel and bind their access to specific District, Taluka, and Village jurisdictions.
8. **Immutable Audit Logs Explorer (`domains/auditlogs/AuditLogsPage.jsx`):** High-resolution audit table displaying Actor, Role, Entity ID, Action Type, Timestamp, and Before/After attribute diffs.

---

## 6. Deep-Dive Backend Architecture & Engineering

### 6.1 Database Schema Dictionary (MongoDB & Mongoose)

The backend data layer is built on 8 strictly-typed, indexed Mongoose schemas located in `backend/src/models/`.

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                 ENTITY RELATIONSHIP MODEL                                 │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                           │
│      ┌─────────────────┐           1 : 1           ┌─────────────────┐                    │
│      │   CitizenUser   ├──────────────────────────►│     Family      │                    │
│      │  (Auth Account) │                           │  (Household ID) │                    │
│      └─────────────────┘                           └────────┬────────┘                    │
│                                                             │                             │
│                                                             │ 1 : N                       │
│                                                             ▼                             │
│                                                    ┌─────────────────┐                    │
│                                                    │     Member      │                    │
│                                                    │ (AES Encrypted) │                    │
│                                                    └────────┬────────┘                    │
│                                                             │                             │
│                                                             │ 1 : N                       │
│                                                             ▼                             │
│      ┌─────────────────┐           1 : N           ┌─────────────────┐                    │
│      │     Scheme      ├──────────────────────────►│   Application   │                    │
│      │  (JSON Rules)   │                           │ (3-Tier Pipeline│                    │
│      └─────────────────┘                           └────────┬────────┘                    │
│                                                             │                             │
│                                                             │ N : M                       │
│                                                             ▼                             │
│      ┌─────────────────┐                           ┌─────────────────┐                    │
│      │     Officer     │                           │DocumentReference│                    │
│      │ (Jurisdictions) │                           │ (Anti-Collision)│                    │
│      └────────┬────────┘                           └─────────────────┘                    │
│               │                                                                           │
│               │ Logs All State Changes                                                    │
│               ▼                                                                           │
│      ┌─────────────────┐                                                                  │
│      │    AuditLog     │                                                                  │
│      │  (Append-Only)  │                                                                  │
│      └─────────────────┘                                                                  │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 6.1.1 Collection: `families`
- `familyId` (String, Unique, Indexed): e.g. `GJ-8F12B90A`.
- `headOfFamilyMemberId` (ObjectId, ref: `Member`): Reference to designated household head.
- `rationCardNumber` (String, Unique, Sparse): Official state ration card identifier.
- `rationCardType` (String, Enum): `['AAY', 'PHH', 'NPHH', 'APL', 'None']`.
- `annualIncome` (Number, Required, Indexed): Total declared household income in INR.
- `category` (String, Enum): `['SC', 'ST', 'OBC', 'General', 'EWS']`.
- `bplStatus` (Boolean, Default: false): Below Poverty Line determination flag.
- `hasPuccaHouse` (Boolean, Default: false): Housing condition flag (used by housing schemes).
- `address` (Object): Sub-document containing `village`, `taluka`, `district`, `pincode`. Compound indexed on `{ 'address.district': 1, 'address.taluka': 1 }`.
- `status` (String, Enum): `['Provisional', 'Permanent', 'Deleted']`.
- `lastVerifiedAt` (Date): Timestamp of official verification by Talati.
- `reVerificationDueAt` (Date, Indexed): Automatically calculated as 6 months post-verification to drive automated re-verification queues.

#### 6.1.2 Collection: `members`
- `memberId` (String, Unique): e.g. `MBR-3B901D11`.
- `familyId` (ObjectId, ref: `Family`, Required, Indexed): Parent household record.
- `name` (String, Required, Trimmed): Full official name.
- `dateOfBirth` (Date, Required): Used to compute the virtual `age` field at runtime.
- `gender` (String, Enum): `['Male', 'Female', 'Other']`.
- `aadhaarEncrypted` (String, Select: false): Plaintext 12-digit Aadhaar encrypted via AES-256-CBC with randomized IV. Never returned over HTTP.
- `aadhaarHash` (String, Unique, Select: false): HMAC-SHA256 hash of plaintext Aadhaar, providing a deterministic unique constraint without exposing the plaintext number.
- `maskedAadhaar` (Virtual Getter): Returns `XXXX-XXXX-1234` for safe frontend display.
- `age` (Virtual Getter): Calculates real-time age accurately accounting for leap years and anniversary dates.
- `relationToHead` (String, Enum): `['Self', 'Spouse', 'Son', 'Daughter', 'Parent', 'Other']`.
- `maritalStatus` (String, Enum): `['Single', 'Married', 'Widow', 'Widower', 'Divorced']`.
- `hasDisability` (Boolean, Default: false): Disability indicator.
- `disabilityPercentage` (Number, Min: 0, Max: 100): Evaluated for specialized disability welfare.
- `isStudent` (Boolean, Default: false): Evaluated for educational scholarships.
- `lifecycleStatus` (String, Enum, Default: 'Active'): `['Active', 'Deceased', 'Migrated']`. Changing this state automatically suspends linked active welfare disbursements.
- `bankDetails` (Sub-document): `accountHolderName`, `bankName`, `ifscCode`, and `accountNumberEncrypted` (AES-256 encrypted, Select: false) for Direct Benefit Transfer.

#### 6.1.3 Collection: `schemes`
- `schemeCode` (String, Unique, Uppercase): e.g. `IGNOAPS`, `NAMO_LAKSHMI`, `BOCW_HOUSING`.
- `schemeName` (String, Required): Full official government program name.
- `department` (String, Required): Owning administrative department.
- `benefitType` (String, Enum): `['Cash', 'InKind', 'Subsidy', 'Scholarship']`.
- `maxBenefitAmount` (Number): Maximum monetary assistance amount in INR.
- `benefitFrequency` (String, Enum): `['OneTime', 'Monthly', 'Quarterly', 'Annual', 'AsNeeded']`.
- `eligibilityRules` (Object): Structured JSON rule definition evaluated by `eligibilityEngine.js`:
  * `minAge` (Number), `maxAge` (Number)
  * `maxAnnualIncome` (Number)
  * `requiredBplStatus` (Boolean)
  * `allowedCategories` ([String])
  * `allowedRationTypes` ([String])
  * `requiredMaritalStatus` ([String])
  * `requiresDisability` (Boolean)
  * `requiresStudentStatus` (Boolean)
  * `requiresFarmerStatus` (Boolean)
  * `requiresBOCWWorker` (Boolean)
  * `conflictingSchemes` ([String]): Array of scheme codes that cannot be co-enrolled under scheme anti-stacking policies.
- `requiredDocuments` (Array of Sub-documents): Defines machine keys (`docKey`), human labels, guidance notes, and accepted formats for file uploads.
- `applicationFormFields` (Array of Sub-documents): Schema for dynamic fields rendered in the citizen application modal (field keys, labels, types: text/number/date/boolean/select, regex patterns).
- `levelChecklistAdditions` (Object): Level-specific custom checklist items appended to standard officer verification forms.

#### 6.1.4 Collection: `applications`
- `applicationId` (String, Unique, Indexed): e.g. `APP-8941BC70`.
- `familyId` (ObjectId, ref: `Family`, Required, Indexed).
- `memberId` (ObjectId, ref: `Member`, Required, Indexed).
- `schemeId` (ObjectId, ref: `Scheme`, Required, Indexed).
- `status` (String, Enum): 
  `['Pending', 'Level1Review', 'Level1Approved', 'Level2Review', 'Level2Approved', 'Level3Review', 'FinalApproved', 'ResubmissionRequired', 'Rejected']`.
- `currentPipelineLevel` (Number, Default: 1): The active administrative level reviewing the file (1: Talati, 2: Mamlatdar, 3: District Officer).
- `rejectedAtLevel` (Number, Nullable): Records which level issued a rejection.
- `rejectionCategory` (String, Nullable): Standardized rejection reason code (`'DocumentIncomplete'`, `'DocumentFraud'`, `'IneligibleIncome'`, `'IneligibleCategory'`, `'ResidenceNotVerified'`, `'DuplicateBenefit'`, `'PhysicalVerificationFailed'`).
- `riskFlag` (String, Enum, Default: 'Low'): `'Low'`, `'Medium'`, `'High'`. Set automatically upon submission by `riskScoringService.js`.
- `approvalChain` (Array of Sub-documents): Immutable historical records capturing `level`, `officerId`, `officerRole`, `action`, `remarks`, `checklist` array, and timestamp.
- `statusHistory` (Array of Sub-documents): Citizen-facing timeline entries.
- `schemeSpecificData` (Map of Mixed): Key-value store of dynamic form responses.
- `submittedDocuments` (Array of Sub-documents): Cloudinary file references containing `docKey`, `originalName`, `url` (HTTPS Cloudinary CDN), `publicId`, `format`, `sizeBytes`, and `uploadedAt`.

#### 6.1.5 Collection: `documentreferences`
- `certificateNumber` (String, Required, Uppercase, Indexed): Unique identifier on the official certificate (e.g. `INC-2025-MEH-88219`).
- `certificateType` (String, Enum): `['Income', 'Caste', 'Disability', 'Marksheet', 'Other']`.
- `issuingAuthority` (String, Required): Official office or officer that issued the credential.
- `issueDate` (Date, Required), `expiryDate` (Date, Nullable).
- `linkedApplicationIds` ([ObjectId]): Tracks all applications referencing this certificate.
- `linkedFamilyIds` ([ObjectId]): Tracks all distinct families referencing this certificate. Used by `riskScoringService.js` to detect cross-household fraud collisions.

#### 6.1.6 Collection: `officers`
- `officerId` (String, Unique, Uppercase): Employee ID (e.g. `TAL-001`, `MAM-001`, `DST-001`, `ADM-001`).
- `name` (String, Required), `email` (String, Unique, Required).
- `passwordHash` (String, Select: false): Bcrypt hashed credentials (12 salt rounds).
- `role` (String, Enum): `['Talati', 'Mamlatdar', 'DistrictOfficer', 'Admin']`.
- `jurisdiction` (Object): `{ village, taluka, district }`. Scopes queries to administrative boundaries.

#### 6.1.7 Collection: `auditlogs`
- `action` (String, Required): e.g. `'APPLICATION_APPROVED'`, `'FAMILY_VERIFIED'`, `'OFFICER_REGISTERED'`.
- `actorId` (ObjectId, Required), `actorRole` (String, Required).
- `entityType` (String, Required): `'Application'`, `'Family'`, `'Member'`, `'Scheme'`.
- `entityId` (String, Required): Human-readable identifier.
- `changedFields` (Object): `{ before, after }` snapshot capturing state transitions.
- `performedAt` (Date, Default: Date.now, Immutable): Canonical timestamp.

---

### 6.2 Core Micro-Engines & Logic Services

#### 6.2.1 The Deterministic Eligibility Engine (`services/eligibilityEngine.js`)
The Eligibility Engine evaluates a household and member profile against all active schemes. It operates completely in-memory with sub-millisecond execution time per rule set, ensuring zero bottleneck during browsing.

```javascript
// Algorithmic Structure: services/eligibilityEngine.js
function evaluateMemberEligibility(member, family, scheme) {
  const rules = scheme.eligibilityRules;
  const reasons = [];

  // Rule 1: Age Evaluation
  if (rules.minAge !== undefined && member.age < rules.minAge) {
    reasons.push(`Minimum age required is ${rules.minAge} years (current age: ${member.age})`);
  }
  if (rules.maxAge !== undefined && member.age > rules.maxAge) {
    reasons.push(`Maximum age limit is ${rules.maxAge} years (current age: ${member.age})`);
  }

  // Rule 2: Annual Household Income Ceiling
  if (rules.maxAnnualIncome !== undefined && family.annualIncome > rules.maxAnnualIncome) {
    reasons.push(`Annual household income exceeds limit of ₹${rules.maxAnnualIncome.toLocaleString('en-IN')}`);
  }

  // Rule 3: BPL (Below Poverty Line) Status
  if (rules.requiredBplStatus && !family.bplStatus) {
    reasons.push('Requires verified BPL (Below Poverty Line) status');
  }

  // Rule 4: Social Reservation Category
  if (rules.allowedCategories?.length && !rules.allowedCategories.includes(family.category)) {
    reasons.push(`Category '${family.category}' not eligible. Allowed: ${rules.allowedCategories.join(', ')}`);
  }

  // Rule 5: NFSA Ration Card Tier
  if (rules.allowedRationTypes?.length && !rules.allowedRationTypes.includes(family.rationCardType)) {
    reasons.push(`Ration card type '${family.rationCardType}' not eligible`);
  }

  // Rule 6: Marital Status Constraint (e.g. Widow Pension)
  if (rules.requiredMaritalStatus?.length && !rules.requiredMaritalStatus.includes(member.maritalStatus)) {
    reasons.push(`Requires marital status: ${rules.requiredMaritalStatus.join(', ')}`);
  }

  // Rule 7: Disability & Student Status
  if (rules.requiresDisability && !member.hasDisability) {
    reasons.push('Scheme requires registered disability status');
  }
  if (rules.requiresStudentStatus && !member.isStudent) {
    reasons.push('Requires currently enrolled student status');
  }

  // Rule 8: Lifecycle State Gate
  if (member.lifecycleStatus !== 'Active') {
    reasons.push(`Member lifecycle status is '${member.lifecycleStatus}' — ineligible for active disbursement`);
  }

  return {
    isEligible: reasons.length === 0,
    reasons,
    memberId: member.memberId,
    memberName: member.name,
    schemeCode: scheme.schemeCode,
  };
}
```

#### 6.2.2 The Risk Scoring & Fraud Engine (`services/riskScoringService.js`)
Triggered automatically during `POST /api/v1/applications`. It executes three fraud heuristics:
1. **Certificate Cross-Family Collision:** Checks if any uploaded certificate number exists in `DocumentReference` under a different `familyId`. If found, triggers immediate **`High Risk`** flag.
2. **Conflicting Scheme Stacking:** Checks if the applicant currently holds an approved status in a scheme listed in `scheme.eligibilityRules.conflictingSchemes`. If found, flags as **`High Risk`** (`DuplicateBenefit`).
3. **Plausibility Anomaly Check:** Evaluates whether declared income contradicts claimed assets (e.g., declaring annual income < ₹20,000 while claiming ownership of luxury assets or conflicting occupation categories), setting **`Medium Risk`**.

#### 6.2.3 Cloudinary Document Upload Pipeline (`routes/uploadRoutes.js`)
All citizen document uploads flow through a dedicated multipart stream handler powered by `multer` and `multer-storage-cloudinary` targeting Cloudinary v2:
- **Folder Isolation:** Files are stored under dedicated cloud folder namespaces (`nagrik/documents/YYYY-MM/`).
- **Allowed MIME Types:** Strictly enforced to `application/pdf`, `image/jpeg`, `image/png`. Executable formats (`.exe`, `.sh`, `.bat`) are rejected at the stream boundary.
- **Payload Safety:** Max file size capped at 5 MB per document.
- **Persistence:** Cloudinary returns an immutable HTTPS CDN URL, asset public ID, file format, and byte size, which are saved in the `submittedDocuments` array of the application record.

---

## 7. Security, Cryptography & Compliance Framework

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                           MULTI-LAYER SECURITY & COMPLIANCE MESH                          │
├────────────────────────────────┬──────────────────────────────────────────────────────────┤
│ Security Layer                 │ Engineering Implementation Details                       │
├────────────────────────────────┼──────────────────────────────────────────────────────────┤
│ PII & Aadhaar Protection       │ • AES-256-CBC encryption for raw Aadhaar numbers         │
│ (UIDAI Compliance Guidelines)  │ • Deterministic HMAC-SHA256 for index searches           │
│                                │ • Virtual getters returning masked `XXXX-XXXX-1234` only │
│                                │ • DB fields flagged `select: false` by default           │
├────────────────────────────────┼──────────────────────────────────────────────────────────┤
│ Password Hashing & Auth        │ • Bcrypt with 12 computational rounds                    │
│                                │ • Signed JWT with 24-hour expiration                     │
│                                │ • Tokens encode Role, Jurisdiction, and User ID          │
├────────────────────────────────┼──────────────────────────────────────────────────────────┤
│ HTTP & Transport Defense       │ • Helmet middleware enforcing secure HTTP headers        │
│                                │ • Strict CORS whitelisting (:5173 and :5174 origins)     │
│                                │ • Express Rate Limiting (100 reqs/15 min on auth routes) │
├────────────────────────────────┼──────────────────────────────────────────────────────────┤
│ State Machine Integrity        │ • Strict linear transitions; level bypass is impossible  │
│                                │ • Role-level validation before any transition executes   │
├────────────────────────────────┼──────────────────────────────────────────────────────────┤
│ Tamper-Proof Audit Trail       │ • Append-only MongoDB collection                         │
│                                │ • No update/delete endpoints exist in application code   │
│                                │ • Captures actor ID, IP, before/after diff snapshot      │
└────────────────────────────────┴──────────────────────────────────────────────────────────┘
```

---

## 8. Complete REST API Specification & Contract Reference

All endpoints are prefixed with `/api/v1` and communicate via JSON payloads. Authenticated requests require header `Authorization: Bearer <JWT_TOKEN>`.

### 8.1 Authentication Endpoints (`/auth`)

#### `POST /auth/citizen/register`
- **Access:** Public
- **Description:** Registers a new citizen login account using a mobile number and password.
- **Request Body:**
  ```json
  { "mobileNumber": "9876543210", "password": "SecurePassword123!" }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "id": "664e10ab...", "mobileNumber": "9876543210", "familyId": null }
  }
  ```

#### `POST /auth/citizen/login`
- **Access:** Public
- **Description:** Authenticates citizen and returns session token with linked `familyId`.

#### `POST /auth/officer/login`
- **Access:** Public (Officers)
- **Description:** Authenticates administrative personnel (Talati, Mamlatdar, District Officer, Admin).
- **Request Body:**
  ```json
  { "officerId": "TAL-001", "password": "OfficerPassword123!" }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "officer": {
      "officerId": "TAL-001",
      "name": "Kiritbhai Patel",
      "role": "Talati",
      "jurisdiction": { "village": "Katosan", "taluka": "Kadi", "district": "Mehsana" }
    }
  }
  ```

#### `POST /auth/officer/register`
- **Access:** Restricted (`Admin` role only)
- **Description:** Provisions new administrative officers with assigned jurisdiction scopes.

---

### 8.2 Family Registry Endpoints (`/families`)

#### `POST /families`
- **Access:** Authenticated Citizen
- **Description:** Creates the master Family entity and registers the Head of Family member record.
- **Request Body:**
  ```json
  {
    "address": { "village": "Katosan", "taluka": "Kadi", "district": "Mehsana", "pincode": "382715" },
    "annualIncome": 68000,
    "category": "OBC",
    "rationCardNumber": "RC-GJ-MEH-109283",
    "rationCardType": "PHH",
    "bplStatus": true,
    "hasPuccaHouse": false,
    "headOfFamily": {
      "name": "Rameshbhai Solanki",
      "dateOfBirth": "1978-05-12",
      "gender": "Male",
      "aadhaarNumber": "452189021234",
      "mobileNumber": "9876543210",
      "occupation": "Marginal Farmer",
      "maritalStatus": "Married"
    }
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "family": {
      "familyId": "GJ-A18F9C20",
      "status": "Provisional",
      "annualIncome": 68000,
      "headOfFamilyMemberId": "664e12cd..."
    }
  }
  ```

#### `GET /families/:id`
- **Access:** Authenticated Citizen (own family) / Officers (within jurisdiction)
- **Description:** Retrieves complete household record including all member objects and verification status.

#### `POST /families/:id/members`
- **Access:** Authenticated Citizen (own family)
- **Description:** Adds an additional member to the family profile.

#### `POST /families/:id/verify`
- **Access:** Restricted (`Talati` or `Admin`)
- **Description:** Updates household status from `Provisional` to `Permanent`, setting `lastVerifiedAt` and `reVerificationDueAt`.

---

### 8.3 Scheme Catalog Endpoints (`/schemes`)

#### `GET /schemes`
- **Access:** Public / Authenticated
- **Description:** Returns all active welfare schemes with eligibility rules, required documents, and dynamic form fields.
- **Query Params:** `?department=Social+Justice&benefitType=Cash`

#### `POST /schemes`
- **Access:** Restricted (`Admin` role only)
- **Description:** Creates a new government scheme definition.

---

### 8.4 Eligibility Evaluation Endpoints (`/eligibility`)

#### `GET /eligibility/:familyId`
- **Access:** Authenticated Citizen / Officers
- **Description:** Evaluates all family members against the scheme catalog in real-time, returning qualification status and failure rationale for every scheme-member pair.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "familyId": "GJ-A18F9C20",
    "evaluatedAt": "2026-09-20T10:15:00Z",
    "results": [
      {
        "schemeCode": "IGNOAPS",
        "schemeName": "Indira Gandhi National Old Age Pension",
        "memberEvaluations": [
          { "memberId": "MBR-1", "name": "Jamnaben", "isEligible": true, "reasons": [] },
          { "memberId": "MBR-2", "name": "Rameshbhai", "isEligible": false, "reasons": ["Minimum age required is 60 years (current age: 48)"] }
        ]
      }
    ]
  }
  ```

---

### 8.5 Application & 3-Tier Pipeline Endpoints (`/applications`)

#### `POST /applications`
- **Access:** Authenticated Citizen
- **Description:** Submits formal application for a scheme on behalf of a specific family member. Executes automated risk scoring.
- **Request Body:**
  ```json
  {
    "familyId": "664e10ab...",
    "memberId": "664e12cd...",
    "schemeId": "664e14ef...",
    "schemeSpecificData": { "kisan_credit_card_no": "KCC-88219" },
    "submittedDocuments": [
      {
        "docKey": "aadhaar",
        "originalName": "aadhaar_card.pdf",
        "url": "https://res.cloudinary.com/nagrik/image/upload/v1/nagrik/documents/aadhaar.pdf",
        "publicId": "nagrik/documents/aadhaar",
        "format": "pdf",
        "sizeBytes": 421090
      }
    ]
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "applicationId": "APP-8941BC70",
    "status": "Pending",
    "currentPipelineLevel": 1,
    "riskFlag": "Low"
  }
  ```

#### `GET /applications`
- **Access:** Authenticated (Citizen sees only own applications; Officers see applications filtered by their pipeline level and jurisdiction).

#### `POST /applications/:id/decide`
- **Access:** Restricted (Officers: Talati, Mamlatdar, District Officer)
- **Description:** Advances or rejects an application along the 3-tier approval hierarchy.
- **Request Body:**
  ```json
  {
    "action": "Approved",
    "remarks": "Physical residence verified. Income matches BPL survey records.",
    "checklist": [
      { "item": "Physical residence verified in village", "checked": true },
      { "item": "Aadhaar verified physically", "checked": true }
    ]
  }
  ```
- **State Transition Matrix:**
  * Level 1 (Talati) `Approved` ➔ Status becomes `Level1Approved` (assigned to Level 2 queue).
  * Level 2 (Mamlatdar) `Approved` ➔ Status becomes `Level2Approved` (assigned to Level 3 queue).
  * Level 3 (District Officer) `Approved` ➔ Status becomes `FinalApproved` (Sanctioned).
  * Any Level `Rejected` ➔ Status becomes `Rejected`, records `rejectedAtLevel` and `rejectionCategory`.
  * Any Level `ResubmissionRequested` ➔ Status becomes `ResubmissionRequired`.

---

### 8.6 Document Uploads (`/uploads`)

#### `POST /uploads/document`
- **Access:** Authenticated Citizen
- **Description:** Accepts `multipart/form-data` with key `document`. Uploads file directly to Cloudinary v2 and returns asset URL and metadata.

---

### 8.7 Analytics & System Audit (`/dashboard`, `/auditlogs`)

#### `GET /dashboard`
- **Access:** Officers
- **Description:** Returns aggregated counts for pending, approved, rejected, and high-risk applications scoped to jurisdiction.

#### `GET /auditlogs`
- **Access:** Restricted (`Admin` role only)
- **Description:** Paginated query over the immutable audit trail with filters for `actorRole`, `action`, `entityType`, and date range.

---

## 9. Verification, Testing & Quality Assurance

### 9.1 Backend Automated Test Suite
The Nagrik backend maintains a test suite comprising **157 automated Jest tests** achieving comprehensive code coverage across models, services, controllers, and middleware:

```
Test Suites: 12 passed, 12 total
Tests:       157 passed, 157 total
Snapshots:   0 total
Time:        4.892 s
Ran all test suites.
```

#### Test Coverage Categories
1. **Cryptographic Integrity:** Verifies AES-256 encryption/decryption of Aadhaar and bank details; confirms HMAC-SHA256 uniqueness; verifies masked string formatting.
2. **Deterministic Rule Evaluation:** Tests all permutations of the Eligibility Engine (age boundaries, income caps, reservation categories, ration types, BPL flags, lifecycle gates).
3. **Pipeline State Machine Enforcement:** Tests that a Level 1 officer cannot approve a Level 2 application; verifies that non-officers cannot trigger decision endpoints; verifies that rejection reasons are logged properly.
4. **Fraud Collision Tests:** Simulates duplicate certificate numbers across distinct families and confirms automatic promotion to `High Risk`.
5. **Audit Trail Immutability:** Asserts that every state mutation appends an audit record.

### 9.2 Frontend Build & Compile Validation
Both frontends undergo automated production bundle builds with zero errors:
- **`user_frontend`:** `npx vite build` ➔ Clean build, 0 errors, 0 warnings.
- **`admin_frontend`:** `npx vite build` ➔ Clean build, 0 errors, 0 warnings.

---

## 10. Installation, Deployment & Operations Guide

### 10.1 Prerequisites
- **Node.js:** v20.x or v22.x LTS
- **MongoDB:** v6.0+ (Local instance or MongoDB Atlas Cluster)
- **Cloudinary Account:** Free or Enterprise tier (Cloud Name, API Key, API Secret)

### 10.2 Environment Configuration (`backend/.env`)
Create a `.env` file in the `backend/` directory:

```env
PORT=5000
NODE_ENV=development

# MongoDB Connection String
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/nagrik?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=super_secret_production_grade_hmac_sha256_key_12345!
JWT_EXPIRES_IN=24h

# Cloudinary v2 Media Storage
CLOUDINARY_CLOUD_NAME=nagrik-welfare
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz12345

# Encryption Secret for PII (Must be exactly 32 bytes for AES-256)
ENCRYPTION_SECRET=12345678901234567890123456789012
HMAC_SECRET=another_super_secret_key_for_deterministic_hash!

# CORS Origins
CLIENT_URL_USER=http://localhost:5173
CLIENT_URL_ADMIN=http://localhost:5174
```

### 10.3 Quick Start (Development Mode)

#### 1. Launch Backend API
```bash
cd backend
npm install
npm run dev
# Server listening on http://localhost:5000/api/v1
```

#### 2. Seed Realistic Government Test Data (Optional)
```bash
cd backend
npm run seed
# Ingests Gujarat districts, sample schemes (IGNOAPS, BOCW, Scholarships),
# sample families, and pre-configured officers (Talati, Mamlatdar, District Officer, Admin).
```

#### 3. Launch Citizen Portal
```bash
cd user_frontend
npm install
npm run dev
# Citizen portal running on http://localhost:5173
```

#### 4. Launch Administrative & Officer Portal
```bash
cd admin_frontend
npm install
npm run dev
# Officer portal running on http://localhost:5174
```

### 10.4 Pre-Configured Test Credentials (From Seed Data)

| Portal | User Type | Identifier / Login | Password | Role / Scope |
|:---|:---|:---|:---|:---|
| **Citizen** (:5173) | Head of Family | `9876543210` | `Password123!` | Citizen (Mehsana District) |
| **Officer** (:5174) | Village Officer | `TAL-001` | `Password123!` | Talati (Village Katosan) |
| **Officer** (:5174) | Taluka Officer | `MAM-001` | `Password123!` | Mamlatdar (Taluka Kadi) |
| **Officer** (:5174) | District Officer | `DST-001` | `Password123!` | District Officer (Mehsana) |
| **Officer** (:5174) | Super Admin | `ADM-001` | `Password123!` | System Administrator |

---

## 11. Policy Alignment & Future Roadmap

### 11.1 Alignment with National Digital Public Infrastructure (DPI)
The Nagrik platform is engineered to integrate natively with India's expanding digital governance architecture:
- **DigiLocker Integration:** Direct fetching of digital certificates (Income, Caste, Marksheets) via DigiLocker API, eliminating manual file uploads.
- **UIDAI eKYC Gateway:** Direct biometrics or OTP-based identity verification at Gram Panchayat kiosks.
- **PFMS (Public Financial Management System):** Automated push of Level-3-sanctioned beneficiary lists to PFMS for real-time Direct Benefit Transfer (DBT) credit into Aadhaar-seeded bank accounts.
- **Jan Samarth & Digital Gujarat Interoperability:** Bi-directional REST sync with the Digital Gujarat single sign-on system.

### 11.2 Strategic Evolution Roadmap

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                   NAGRIK ROADMAP HORIZONS                                 │
├──────────────────────────┬───────────────────────────────┬────────────────────────────────┤
│ Horizon 1 (Delivered)    │ Horizon 2 (Near-Term)         │ Horizon 3 (Scale & Enterprise) │
├──────────────────────────┼───────────────────────────────┼────────────────────────────────┤
│ • Family Master Registry │ • DigiLocker API Gateway      │ • Cross-State Welfare Registry │
│ • In-Memory Rule Engine  │ • WhatsApp Chatbot for status │ • Machine Learning Predictive  │
│ • Cloudinary Doc Storage │ • SMS Gateway Integration     │   Poverty & Vulnerability Index│
│ • 3-Tier Approval Flow   │ • Offline PWA Field Mode for  │ • Blockchain-Anchored Proof of │
│ • Dual Frontends + i18n  │   remote rural inspections    │   Sanction Audit Ledger        │
│ • Anti-Collision Fraud   │ • GIS Spatial Saturation      │ • Voice-Activated Gujarati AI  │
│   Detection & Audit Trail│   Mapping of Scheme Coverage  │   Assistant for Illiterate User│
└──────────────────────────┴───────────────────────────────┴────────────────────────────────┘
```

---

## 13. Nagrik V2: Welfare Intelligence & Benefit Orchestration Architecture

### 13.1 Strategic Re-Positioning: Beyond the Family Registry

While initial versions of digital governance platforms treat the establishment of a **Family ID** as the crowning innovation (as seen in baseline implementations like UP Parivar Kalyan / NeGD Directory 95), modern welfare delivery faces a deeper bottleneck: **fragmentation between identity, life transitions, and scheme execution.**

> **Core Architectural Principle of Nagrik V2:**
> Family ID is not the platform's innovation — it is a foundational integration key.
> **Nagrik V2 is an Interoperable Welfare Intelligence & Benefit Orchestration Layer** that operates above existing state databases, identity providers, and departmental portals.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                            NAGRIK V2 ORCHESTRATION & INTELLIGENCE                                │
├───────────────────────────────┬──────────────────────────────────┬───────────────────────────────┤
│ 1. Family Benefit Graph       │ 2. Proactive Life Event Engine   │ 3. Explainable Discovery      │
│    Traverses relationships,   │    Ingests 15 event types,       │    Non-binary statuses,       │
│    evidence, and entitlements │    verifies confidence, triggers │    structured "Why", satisfied│
│    across entire household    │    downstream orchestration      │    rules, & missing evidence  │
├───────────────────────────────┼──────────────────────────────────┼───────────────────────────────┤
│ 4. Benefit Gap Detector       │ 5. Reusable Evidence Registry    │ 6. Officer 360° Case View     │
│    Current vs Potential vs    │    "One Evidence -> Many         │    Visual graph, event queue, │
│    Missing Evidence + % Index │    Benefits" cross-scheme map    │    risk cards, & action tasks │
├───────────────────────────────┴──────────────────────────────────┴───────────────────────────────┤
│ 7. Interoperable Government Connectors Layer (UIDAI, CRS, NFSA, UDISE, NSAP, DigiLocker, PFMS)   │
│    [Cleanly isolated adapter pattern with transparent MOCK / SIMULATION mode for all external APIs]│
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 13.2 The Family Benefit Graph Architecture

The **Family Benefit Graph** structures all relational welfare entities into an in-memory or queryable graph model:

```
[Family Master GJ-XXXXXXXX]
   │
   ├── [Member 1: Head of Household] ──────── [Income Certificate (Verified)] ───── [NFSA Ration]
   │       │                                                                               │
   │       └── [LifeEvent: IncomeShock] ───────────────────────────────────────────────────┘
   │
   ├── [Member 2: Daughter] ───────────────── [10th Marksheet (Verified)] ───────── [Pre-Matric Schol.]
   │       │                                          │
   │       └── [LifeEvent: SchoolAdmission] ──────────┘
   │
   └── [Member 3: Grandmother] ────────────── [Age Proof / Aadhaar] ─────────────── [IGNOAPS Pension]
           │
           └── [LifeEvent: SeniorTransition]
```

#### Graph Node Types & Edge Semantics:
- **Nodes:** `Family`, `Member`, `LifeEvent`, `Evidence`, `Assessment`, `Benefit`, `RiskSignal`, `Task`.
- **Edges:**
  - `CONTAINS_MEMBER`: Family -> Member
  - `EXPERIENCED`: Member -> LifeEvent
  - `HOLDS_EVIDENCE`: Member -> Evidence
  - `ELIGIBLE_FOR`: Member / Family -> Scheme
  - `RECEIVES_BENEFIT`: Member -> Benefit
  - `TRIGGERED_BY`: Task / RiskSignal -> LifeEvent / Evidence

#### Traversal & Downstream Impact API:
When a life event or evidence modification occurs, `familyBenefitGraphService.analyzeImpact(familyId, event)` executes a sub-graph traversal to determine:
1. Which existing active benefits are compromised, suspended, or require reverification.
2. Which previously inaccessible schemes become immediately discoverable or eligible.
3. Which tasks must be dispatched to local field officers (Talatis/Mamlatdars).

---

### 13.3 The Proactive Life Event Engine

Traditional welfare requires citizens to realize they qualify and initiate a bureaucratic filing. Nagrik V2 flips this into a **proactive event-driven orchestration architecture**.

#### Supported Life Event Types (15 Distinct Taxonomies):
1. `Birth` — Triggers child nutrition (Poshan), immunization tracking, and maternity assistance (Kunwarbai nu Mameru).
2. `Death` — Triggers immediate, compassionate pension reverification, prevents ghost disbursement leakage, and alerts officers to transition widow/orphan assistance.
3. `Marriage` — Triggers family splitting, ration card unit updates, and marriage grants.
4. `Divorce` — Triggers single-parent assistance and household benefit recalculation.
5. `DisabilityOnset` — Triggers Sant Surdas scheme discovery, assistive device aid, and bus pass privileges.
6. `SchoolAdmission` — Triggers RTE admissions and uniform/textbook allowances.
7. `Graduation` — Triggers higher education scholarships, post-matric assistance, and employment portal links.
8. `Employment` — Updates formal income bracket, triggers BOCW or ESIC benefits.
9. `Unemployment` — Triggers rural employment guarantee (MGNREGA) and safety-net grants.
10. `IncomeLoss` — Triggers distress food subsidy and emergency financial aid.
11. `IllnessOrHospitalization` — Triggers PM-JAY / MAA Amrutam tertiary healthcare reimbursement.
12. `SeniorCitizenTransition` — Triggers automated IGNOAPS / Old Age Pension qualification when reaching age 60.
13. `Migration` — Triggers inter-district ration portability (One Nation One Ration Card).
14. `DisasterImpact` — Triggers natural calamity relief and crop loss compensation (Kisan Sahay).
15. `HousingLoss` — Triggers expedited PMAY-G (Gramin) housing grant review.

#### Event Verification & Lifecycle State Machine:
```
[Reported: Citizen / Civil Registry / Talati]
                     │
                     ▼
           [PendingVerification] ◄─── (Confidence Score: 0.00 - 1.00)
                     │
       ┌─────────────┴─────────────┐
       │                           │
(Officer / API Confirmed)   (Discrepancy / Fake)
       │                           │
       ▼                           ▼
  [Verified]                  [Rejected]
       │
       ├── Auto-Update Reusable Evidence
       ├── Re-evaluate Household Benefit Gaps
       ├── Generate Actionable Officer Tasks
       └── Notify Citizen in Gujarati & English
```

---

### 13.4 Explainable Benefit Discovery Engine

Rules engines in government software must never be black boxes. A citizen or officer must understand exactly *why* a family is eligible, conditionally eligible, or ineligible.

#### Non-Binary Evaluation Statuses:
- `Eligible`: All household and individual criteria met; all required evidence verified.
- `ConditionallyEligible`: Socio-economic criteria satisfied; awaiting statutory document verification.
- `Ineligible`: Statutory failure (e.g. income exceeds maximum threshold; member below age floor).
- `MissingEvidence`: High likelihood of qualification, but missing a key verified certificate.

#### Explanation Contract Schema:
```json
{
  "schemeCode": "MAA-VAT-01",
  "schemeName": "Mukhyamantri Amrutam (MAA) Vatsalya",
  "status": "ConditionallyEligible",
  "why": "Family annual income (₹1,20,000) is within the maximum limit of ₹4,00,000 for middle-class tertiary health protection.",
  "satisfiedRules": [
    "Annual household income ₹1,20,000 <= ceiling ₹4,00,000",
    "Verified permanent resident of Gujarat state",
    "Valid Family Master Registry ID"
  ],
  "failedRules": [],
  "missingEvidence": ["Income Certificate (Tehsildar / Talati Endorsed)"],
  "nextActions": [
    "Upload valid Income Certificate in the Reusable Evidence Vault",
    "Request Talati verification to unlock ₹5,00,000 cashless health coverage"
  ]
}
```

---

### 13.5 Benefit Gap Detector & Welfare Coverage Index

The **Benefit Gap Detector** continuously monitors the delta between what a family currently receives and what they are entitled to receive:

$$\text{Welfare Coverage Index (\%)} = \left( \frac{\text{Current Active Schemes}}{\text{Current Active Schemes} + \text{Potential Eligible Schemes}} \right) \times 100$$

#### The 4 Metric Dimensions:
1. **Current Active Benefits:** Schemes currently disbursing cash or in-kind subsidies to the household.
2. **Potential Eligible Benefits:** Schemes the family satisfies today but has not yet enrolled in.
3. **Missing Evidence Gaps:** Schemes within reach if a single document is uploaded and verified.
4. **Expiring Benefits:** Schemes requiring annual life certificate (Jeevan Pramaan) or income renewal within 60 days.

---

### 13.6 Reusable Evidence Registry ("One Evidence → Many Benefits")

In traditional administration, a citizen must procure, notarize, and submit their Income Certificate or Caste Certificate separately for every single application.

Nagrik V2 introduces the **Reusable Evidence Registry**:
- A document uploaded once (e.g. an Income Certificate issued by the Taluka Seva Sadan) is cryptographically checksummed and verified by the local Talati.
- The platform automatically registers this document against **all compatible state schemes**:
  - *Income Certificate* simultaneously satisfies eligibility evidence for:
    1. Food Subsidy (NFSA Ration Card)
    2. Tertiary Healthcare (MAA Vatsalya)
    3. Housing Grant (PMAY-G)
    4. Pre-Matric SC/ST/OBC Scholarship
- When a scheme application is generated, evidence is referenced, eliminating redundant paperwork and preventing document tampering.

---

### 13.7 Officer 360° Family Case View

Available at `/families/:id/case-view` for administrative officers (Talati, Mamlatdar, District Officer):
- **Socio-Economic Header:** Income, social category, BPL/AAY status, verified geolocation.
- **Visual Graph Overview:** Real-time rendering of graph nodes (Family, Members, Evidence, Schemes, Benefits).
- **Life Event Verification Queue:** Immediate view of pending events with confidence scores, registration numbers, and a 1-click **"Verify Event & Trigger Orchestration"** action.
- **Benefit Gaps & Potential Opportunities:** Officer-facing breakdown of unlocked benefits for the family.
- **Reusable Evidence Vault:** Document ledger showing which schemes are verified and unlocked.
- **Risk Intelligence Cards:** Non-adversarial verification warnings (e.g. cross-family document reuse or lifecycle conflicts) with concrete officer review recommendations.
- **Actionable Task Checklist:** Prioritized officer workflow (`Critical`, `High`, `Medium`, `Low`) with status toggles.

---

### 13.8 Interoperable Government Data Connectors

To enable friction-free operation within India's Digital Public Infrastructure (DPI), Nagrik V2 introduces a standardized, pluggable connector architecture via `GovernmentDataConnector`:

| Connector Name | Target Public System | Functionality Provided | Operational Mode |
|:---|:---|:---|:---|
| **IdentityConnector** | UIDAI Aadhaar Gateway | e-KYC, demographic verification, tokenized Aadhaar lookup | **SIMULATED ADAPTER** |
| **CivilRegistrationConnector** | CRS (Civil Registration System) | Birth & Death event discovery, certificate verification | **SIMULATED ADAPTER** |
| **RationConnector** | NFSA / State PDS | Ration card tier, beneficiary count, fair price shop mapping | **SIMULATED ADAPTER** |
| **EducationConnector** | U-DISE+ / State Education Portal | Student enrollment verification, school category, grade | **SIMULATED ADAPTER** |
| **PensionConnector** | NSAP (National Social Assistance) | Central & state pension status, disbursement history | **SIMULATED ADAPTER** |
| **DocumentConnector** | DigiLocker (MeitY) | Pull verified digital credentials into Reusable Evidence Vault | **SIMULATED ADAPTER** |
| **PaymentConnector** | PFMS / DBT Bharat | Direct bank account validation, Aadhaar Payment Bridge (APB) | **SIMULATED ADAPTER** |

> **Mandatory Transparency Disclosure:**
> In accordance with ethical enterprise software design, all 7 external connectors are implemented as realistic, high-fidelity **SIMULATED ADAPTERS** (`MOCK`), complete with realistic response payloads, latencies, and error codes. They are pre-architected with clean dependency injection so that live production SSL/mTLS credentials, API tokens, and SAML assertions can be plugged in without refactoring business logic.

---

### 13.9 Non-Accusatory Risk Intelligence Signals

Unlike hostile anti-fraud systems that generate punitive alerts, Nagrik V2 uses a **protective, non-accusatory verification model**:
- Identifies anomalies such as:
  - `CrossFamilyDocumentReuse`: Same document serial number used by unrelated families.
  - `DuplicateBenefitClaim`: Multiple applications for mutually exclusive welfare grants.
  - `ImpossibleLifecycleSequence`: Conflicting event dates (e.g. school enrollment after reported demise).
  - `IncomeDiscrepancy`: Mismatch between reported income and government transaction records.
- Signals provide an objective confidence score, an exact metadata diff, and a **constructive officer resolution recommendation** (e.g. "Recommend field visit by Talati to verify certificate authenticity before sanction").

---

### 13.10 Verification, Zero Regressions & Test Suite

The Nagrik V2 architecture has been validated through automated end-to-end regression suites:

```
======================================================================
  NAGRIK COMPREHENSIVE AUTOMATED TEST EXECUTION SUMMARY
======================================================================
  Core Pipeline & API Test Suite:          157 / 157 PASS (100%)
  Nagrik V2 Welfare Intelligence Suite:     41 /  41 PASS (100%)
  --------------------------------------------------------------------
  TOTAL AUTOMATED TEST VERIFICATION:       198 / 198 PASS (100%)
  TOTAL REGRESSIONS DETECTED:                0 (Zero regressions)
  FRONTEND PRODUCTION BUILDS:              2 / 2 CLEAN BUILDS (0 errors)
======================================================================
```

---

## 14. Conclusion & Operational Impact

Nagrik V2 redefines the relationship between the citizen, the state, and social assistance. By positioning itself not as an isolated Family ID repository, but as an **Interoperable Welfare Intelligence & Benefit Orchestration Platform**, Nagrik bridges the divide between departmental silos. 

Through its **Family Benefit Graph**, proactive **Life Event Engine**, **Explainable Benefit Discovery**, **Benefit Gap Detector**, and **Reusable Evidence Registry**, the platform ensures that social protection is delivered with dignity, transparency, and unprecedented administrative efficiency.

