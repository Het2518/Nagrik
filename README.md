# Nagrik (નાગરિક) — Gujarat Family ID & Proactive Welfare Orchestration Platform

[![Production Status](https://img.shields.io/badge/Status-Production--Ready-success?style=for-the-badge)](https://nagrik-backend-iz5j.onrender.com)
[![Test Suite](https://img.shields.io/badge/Automated%20Tests-203%20Passing%20(100%25)-brightgreen?style=for-the-badge)](https://github.com/Het2518/Nagrik)
[![Jurisdiction](https://img.shields.io/badge/Jurisdiction-Government%20of%20Gujarat-0E7490?style=for-the-badge)](https://gujaratindia.gov.in)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

> **Problem Statement:** *Introduction of Family ID in Gujarat to Improve Beneficiary Management for Various Government Schemes.*  
> **Target Jurisdiction:** State of Gujarat, India (Interoperable with Pan-India Digital Public Infrastructure & NeGD Directory 95 standards).

---

## 🌐 Live Deployments

| Component | Platform | Live URL | Status |
|:---|:---|:---|:---|
| **Backend REST API** | Render | [`https://nagrik-backend-iz5j.onrender.com`](https://nagrik-backend-iz5j.onrender.com) | 🟢 Live / Healthy |
| **Citizen Welfare Portal** | Vercel | [`https://nagrik-eosin.vercel.app/`](https://nagrik-eosin.vercel.app/) | 🟢 Live / Interactive |
| **Official Admin & Saturation Board** | Vercel / Local | Port `5174` (`admin_frontend`) | 🟢 Ready |
| **Source Repository** | GitHub | [`https://github.com/Het2518/Nagrik.git`](https://github.com/Het2518/Nagrik.git) | 🟢 Main Branch |

---

## 1. Executive Summary & Problem Addressed

In Gujarat and across India, government schemes (such as old age pensions, housing subsidies, scholarships, NFSA food security, and maternal assistance) have historically operated in **isolated, department-specific silos**. 

Because each department maintained its own unverified citizen list without a unified household roster, two structural failures persisted:
1. **Inclusion Errors & Ghost Beneficiaries:** Dead citizens continuing to draw pensions, ineligible high-income households claiming subsidized BPL rations, or one individual claiming duplicate subsidies across departments.
2. **Exclusion Errors & Welfare Gaps:** Eligible underprivileged families missing out on benefits simply because they were unaware of new schemes or could not navigate redundant paperwork and physical office visits.

### The Nagrik Solution
Nagrik implements a **verified Family ID ecosystem** for Gujarat that acts as an **explainable intelligence and proactive orchestration layer** above existing state registries. Instead of passive portals waiting for citizens to apply, Nagrik uses deterministic rules and automated lifecycle triggers to deliver **proactive welfare discovery**:

```
+-------------------------------------------------------------------------+
|                  CITIZEN & OFFICER PORTALS (Bilingual En/Gu)            |
|       "Analyze My Family" Command Center  |  360° Family Case View     |
|       Scheme Visual Differentiator        |  Saturation Discovery Board|
+-------------------------------------------------------------------------+
                                    |
+-------------------------------------------------------------------------+
|                     NAGRIK V2 WELFARE INTELLIGENCE                      |
|  +--------------------+  +--------------------+  +--------------------+ |
|  | Family Benefit     |  | Life Event Engine  |  | Explainable        | |
|  | Graph Service      |  | & Milestone Cron   |  | Eligibility Engine | |
|  +--------------------+  +--------------------+  +--------------------+ |
|  +--------------------+  +--------------------+  +--------------------+ |
|  | Benefit Gap        |  | Reusable Evidence  |  | Saturation         | |
|  | Detector (Coverage)|  | Registry (1 -> N)  |  | Analytics Service  | |
|  +--------------------+  +--------------------+  +--------------------+ |
+-------------------------------------------------------------------------+
                                    |
+-------------------------------------------------------------------------+
|                   GOVERNMENT DATA CONNECTOR LAYER                       |
|   Civil Registration (CRS) | NFSA Food Security | U-DISE+ Education    |
|   Revenue & Land Registry  | NSAP Pension Sync  | DigiLocker Evidence  |
|            [Integrated Deterministic Interoperability Mocks]            |
+-------------------------------------------------------------------------+
                                    |
+-------------------------------------------------------------------------+
|                CORE REPOSITORIES & 3-TIER PIPELINE                      |
|    Family Master  |  Member Records  |  Schemes  |  3-Tier Workflow     |
|   (Talati L1 -> Mamlatdar L2 -> District Officer L3 -> Final Approval)  |
+-------------------------------------------------------------------------+
```

---

## 2. Key Platform Features

### A. Government & Admin: Scheme Saturation & Beneficiary Board
- **State-wide Saturation Funnel:** For any scheme (e.g. *Mukhyamantri Gruh Yojana*, *IGNOAPS Pension*, *PM-KISAN*), officers instantly view:
  * **Total Eligible Pool:** All households qualifying under the scheme's deterministic rules.
  * **Active Enrolled:** Citizens receiving benefit disbursements + **Saturation Rate %** (`(Enrolled / Eligible) * 100`).
  * **In-Flight Applications:** Applications currently under review by field officers.
  * **Unreached Coverage Gap:** Households that are 100% eligible but have not applied yet.
- **Searchable Beneficiary Discovery Table:** Complete directory of qualifying citizens with Family ID, Head of Household, age, region, and satisfied criteria.
- **1-Click Proactive Citizen Nudge:** Officers can click **"Send Nudge"** on unreached families to dispatch a targeted in-app alert prompting them to claim their benefit with zero paperwork.
- **Milestone Cron Recalculation:** On-demand recalculation trigger to re-evaluate state-wide eligibility.

### B. Automated Lifecycle Triggers & Scheduled Milestone Cron
- **Real-Time Family Mutation Triggers:**
  * **Birth / Member Added:** Unlocks neonatal & maternal assistance (e.g. *PMMVY*, *Mukhyamantri Amrutam* child cover).
  * **Bereavement / Member Deceased:** Auto-suspends deceased beneficiary entitlements, creates Talati field verification tasks, and suggests survivorship pensions (*Ganga Swarupa Yojana*).
  * **Marital Status Updates:** Automatically checks widowhood pensions or marriage subsidies (*Kuvarbainu Mameru Yojana*).
  * **Income / Socio-Economic Revisions:** Automatically flags newly unlocked subsidized welfare slabs.
- **Automated Milestone Cron (`cronService.js`):**
  * Recurring background scheduler checking for citizen milestone transitions (e.g. citizen turning 60 unlocks Old Age Pensions, turning 18, student scholarship transitions).
  * Proactively warns citizens when certificates (income, caste) are within 30 days of expiry.

### C. Citizen Portal: High-Clarity Visual Eligibility UX
- **Visual Scheme Differentiation:**
  * **Eligible Schemes:** Rendered at **100% full opacity** with vibrant emerald borders, `✓ Eligible for your family` badges, qualifying member tags (e.g. `Qualified: Hetal (22 yrs)`), and active **"Apply Now"** buttons.
  * **Ineligible Schemes:** Rendered in **grey / low opacity (`opacity: 0.58`)** with grayscale styling, `⚠️ Not Eligible` badge, and an **interactive hover tooltip** detailing the exact unmet rules (e.g. *"Household income exceeds ₹1,20,000 ceiling"* or *"Requires age 60+"*).
- **Fast Filter Bar:** Instant toggle between `[All Schemes]`, `[✓ Eligible for My Family]`, and `[Other Schemes]`.
- **"Analyze My Family" 360° Welfare Center:** Single-click welfare discovery that inspects all household members and uncovers unclaimed entitlements.

### D. 3-Tier Multi-Level Verification Pipeline
- Strict jurisdictional governance aligning with Gujarat administrative hierarchy:
  * **Level 1 (Talati / Gram Sevak):** Village-level field inspection and document verification.
  * **Level 2 (Mamlatdar):** Taluka-level administrative sanction and revenue cross-check.
  * **Level 3 (District Officer):** Final financial disbursal approval and DBT sanction.
- Multi-step status transitions with tamper-evident audit trail logging.

### E. Reusable Evidence Registry & Data Connectors
- **Upload Once, Reuse Everywhere:** Certificates (income, caste, disability, domicile) stored once in the family registry and automatically reused across multiple scheme applications.
- **Interoperability Connectors:** Standardized connector interfaces simulating real-time queries against Civil Registration (CRS), Food Security (NFSA), Education (U-DISE+), and Revenue databases.

---

## 3. Technology Stack

| Layer | Technologies Used |
|:---|:---|
| **Citizen Frontend** | React 19, Vite, TanStack Query, React Router DOM, Lucide Icons, i18next (English & Gujarati), Vanilla CSS Design System |
| **Admin & Officer Portal** | React 19, Vite, TanStack Query, React Hook Form, Zod Validation, Lucide Icons, Vanilla CSS |
| **Backend API** | Node.js, Express.js (Modular Domain Architecture, Trust Proxy, Helmet, CORS, Express Rate Limit) |
| **Database** | MongoDB Atlas (Mongoose ODM, compound indexing, immutable audit logs) |
| **Security & Privacy** | AES-256-GCM Aadhaar encryption, salted PBKDF2/bcrypt authentication, role-based access control (RBAC), sanitized projections |
| **Hosting & DevOps** | Render (Dockerized Web Service), Vercel (Single-Page Application deployment with rewrite routing) |

---

## 4. Repository Structure

```
Nagrik/
├── backend/
│   ├── src/
│   │   ├── config/          # MongoDB Atlas connection & environment validation
│   │   ├── controllers/     # Schemes, Families, Applications, Eligibility, Auth, V2 Welfare
│   │   ├── middleware/      # JWT Authentication, RBAC (Citizen, Talati, Mamlatdar, DistrictOfficer, Admin)
│   │   ├── models/          # Family, Member, Scheme, Application, BenefitEntitlement, LifeEvent, AuditLog
│   │   ├── routes/          # REST endpoints (/api/v1/...)
│   │   ├── services/        # Saturation Analytics, Lifecycle Triggers, Cron Service, Eligibility Engine
│   │   ├── integrations/    # Data Connectors (Civil Registry, NFSA, U-DISE+, NSAP, Revenue)
│   │   └── utils/           # AES-256-GCM Aadhaar encryption, API response helpers
│   ├── seeds/               # Gujarat seed data (Personas, 20 Schemes, 3-Tier Applications)
│   ├── tests/               # 203 automated tests (apiTestSuite.js, v2TestSuite.js)
│   └── server.js            # Express server entry point & cron initializer
├── user_frontend/           # Citizen Welfare Web Application (React + Vite)
│   ├── src/
│   │   ├── domains/         # Schemes (Visual differentiator), Family, Applications, Onboarding, Profile
│   │   ├── components/      # UI components, StatusChips, Cards, Buttons, Navbar
│   │   ├── services/        # Axios API client & endpoints
│   │   └── i18n/            # Bilingual dictionaries (English & Gujarati)
│   └── vercel.json          # SPA rewrite routing configuration
├── admin_frontend/          # Government & Officer Portal (React + Vite)
│   ├── src/
│   │   ├── domains/         # Saturation Board, Scheme Catalog, Application Queue, 360° Family Case View
│   │   ├── components/      # Admin layout, sidebar, verification modals
│   │   └── services/        # Officer API client
│   └── vercel.json          # SPA rewrite routing configuration
└── README.md                # Master platform documentation
```

---

## 5. Seeded Gujarat Personas & Demo Credentials

The database comes pre-populated with realistic Gujarat socio-economic household personas:

### A. Citizen Accounts
| Name | Role / Persona | District & Profile | Login Mobile | Password |
|:---|:---|:---|:---|:---|
| **Ramesh Somabhai Patel** *(Main Demo)* | Farmer / Head of Household | Gandhinagar (OBC, Small Farmer, 4 members) | `9876543210` | `Password123!` |
| **Savitaben Dayabhai Vankar** | BPL Homemaker & Weaver | Gandhinagar (SC, BPL Antyodaya, 3 members) | `9876543211` | `Password123!` |
| **Hareshbhai Prajapati** | Urban Worker | Ahmedabad (SEBC, 4 members) | `9876543212` | `Password123!` |

### B. Government Officer Accounts
| Role | Name | Jurisdiction | Login ID | Password |
|:---|:---|:---|:---|:---|
| **Talati (Level 1)** | Talati Khoraj | Khoraj Village, Gandhinagar | `TAL-001` | `Password123!` |
| **Mamlatdar (Level 2)** | Mamlatdar Gandhinagar | Gandhinagar Taluka | `MAM-001` | `Password123!` |
| **District Officer (Level 3)** | District Welfare Officer | Gandhinagar District | `DST-001` | `Password123!` |
| **State Admin** | Super Admin | Gujarat State | `ADM-001` | `Password123!` |

---

## 6. Running Locally

### Prerequisites
- **Node.js**: v18+ (Node v20 or v24 recommended)
- **MongoDB**: MongoDB Atlas URI or local MongoDB instance

### 1. Backend Setup
```bash
cd backend
npm install

# Configure environment variables in backend/.env:
PORT=5000
MONGO_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-secret-key>
AADHAAR_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Seed Gujarat data (Personas, 20 Schemes, Applications):
node seeds/cleanAndSeedGujarat.js

# Start backend server:
npm start
# Server running at: http://localhost:5000
```

### 2. Citizen Frontend Setup
```bash
cd user_frontend
npm install

# Start development server:
npm run dev
# Citizen Portal running at: http://localhost:5173
```

### 3. Admin Frontend Setup
```bash
cd admin_frontend
npm install

# Start development server:
npm run dev
# Admin Portal running at: http://localhost:5174
```

---

## 7. Automated Test Suite

Nagrik includes an exhaustive automated test suite covering all security, RBAC, domain models, eligibility logic, graph traversals, and lifecycle cron evaluations:

```bash
cd backend

# Run Core API Test Suite (157 assertions):
node tests/apiTestSuite.js

# Run V2 Welfare Intelligence Suite (47 assertions):
node tests/v2TestSuite.js
```

**Results:**
- `apiTestSuite.js`: **157 / 157 PASSED** (Auth, Families, Members, Applications, Schemes, Multi-Level Workflow, Encryption)
- `v2TestSuite.js`: **47 / 47 PASSED** (Connectors, Graph, Gap Detector, Life Events, Tasks, Citizen Notifications, Resubmission)
- **Total: 204 Automated Checks Passing (100%)**

---

## 8. Summary of API Endpoints

### Schemes & Saturation Analytics
- `GET /api/v1/schemes` — List active welfare schemes (with citizen-safe projections).
- `GET /api/v1/schemes/:schemeCode` — Detailed scheme rules and required evidence.
- `GET /api/v1/schemes/:schemeCode/beneficiaries` — State-wide saturation summary and eligible beneficiary directory (Officers/Admin).
- `POST /api/v1/schemes/:schemeCode/nudge` — Dispatch proactive welfare alert to unreached eligible citizen.
- `POST /api/v1/schemes/:schemeCode/evaluate-cron` — Run on-demand milestone and saturation recalculation.

### Family & Member Master
- `POST /api/v1/families` — Register household under Family ID.
- `GET /api/v1/families/:familyId` — Fetch 360° family profile and member roster.
- `PATCH /api/v1/families/:familyId` — Update household socio-economic details (triggers automatic eligibility re-evaluation).
- `POST /api/v1/families/:familyId/members` — Add new member / birth (triggers newborn scheme checks).
- `PATCH /api/v1/families/:familyId/members/:memberId/profile` — Update member circumstances (marriage, disability, student).
- `PATCH /api/v1/families/:familyId/members/:memberId/lifecycle` — Update lifecycle status (Deceased, Migrated).

### Multi-Level Application Verification
- `POST /api/v1/applications` — Submit scheme application using reusable family credentials.
- `GET /api/v1/applications` — Officer review queue filtered by jurisdiction and workflow level.
- `POST /api/v1/applications/:id/decide` — Multi-tier approve, reject, or request resubmission (L1 Talati $\rightarrow$ L2 Mamlatdar $\rightarrow$ L3 District Officer).

---

## 9. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details. Built for the citizens and administration of Gujarat.
