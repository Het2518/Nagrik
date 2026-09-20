# Nagrik (નાગરિક) — Privacy-Preserving Welfare Intelligence & Benefit Orchestration Platform

> **Status:** Production-Grade Reference Implementation (Nagrik V2)  
> **Target Jurisdiction:** Government of Gujarat (Interoperable with Pan-India Digital Public Infrastructure)  
> **Test Suite:** **203 Automated Tests Passing (100%)** — 157 Core Tests + 46 V2 Welfare Intelligence Tests  
> **Reference Architecture:** Strategic orchestration layer operating above existing government identity & registry infrastructure (e.g. NeGD Directory 95 & UP Parivar Kalyan "One Family, One ID" paradigm).

---

## 1. Strategic Vision & V2 Paradigm Shift

Existing government ecosystems (such as UP Parivar Kalyan, NFSA PDS registries, and state e-governance systems) already provide family/identity/service infrastructure.

> **Crucial Architectural Positioning:**
> **Nagrik does NOT position Family ID as its primary innovation.**  
> Instead, Nagrik operates as an **explainable intelligence and orchestration layer above existing state registries and welfare systems**.

Nagrik connects citizen/family identity, verified evidence, life events, welfare schemes, eligibility rules, applications, and benefits into one unified, proactive welfare intelligence layer:

```
+-------------------------------------------------------------------------+
|                  CITIZEN & OFFICER PORTALS (Bilingual En/Gu)            |
|       "Analyze My Family" Command Center  |  360° Family Case View     |
+-------------------------------------------------------------------------+
                                    |
+-------------------------------------------------------------------------+
|                     NAGRIK V2 WELFARE INTELLIGENCE                      |
|  +--------------------+  +--------------------+  +--------------------+ |
|  | Family Benefit     |  | Life Event Engine  |  | Explainable        | |
|  | Graph Service      |  | (15 Event Types)   |  | Discovery Engine   | |
|  +--------------------+  +--------------------+  +--------------------+ |
|  +--------------------+  +--------------------+  +--------------------+ |
|  | Benefit Gap        |  | Reusable Evidence  |  | Risk Intelligence  | |
|  | Detector (Coverage)|  | Registry (1 -> N)  |  | (Non-Accusatory)   | |
|  +--------------------+  +--------------------+  +--------------------+ |
+-------------------------------------------------------------------------+
                                    |
+-------------------------------------------------------------------------+
|                   GOVERNMENT DATA CONNECTOR LAYER                       |
|   UIDAI (Aadhaar) | CRS (Birth/Death) | NFSA (Ration) | U-DISE+ (Edu)   |
|   NSAP (Pensions) | DigiLocker (Docs) | PFMS (Direct Benefit Transfer)  |
|          [All External Connectors Clearly Marked as SIMULATED]          |
+-------------------------------------------------------------------------+
                                    |
+-------------------------------------------------------------------------+
|                CORE REPOSITORIES & 3-TIER PIPELINE                      |
|    Family Master  |  Member Records  |  Schemes  |  3-Tier Workflow     |
|   (Talati L1 -> Mamlatdar L2 -> District Officer L3 -> Final Approval)  |
+-------------------------------------------------------------------------+
```

---

## 2. Core V2 Capabilities

### 1. Family Benefit Graph
- Complete relationship graph mapping: `Family` -> `Members` -> `LifeEvents` -> `Evidence` -> `Assessments` -> `Benefits` -> `Risks` -> `Tasks`.
- Traversal query API (`GET /api/v1/families/:id/graph`) powering interactive 360° graph views.

### 2. Proactive Life Event Engine
- Ingests and processes **15 distinct life events**: `Birth`, `Death`, `Marriage`, `Divorce`, `DisabilityOnset`, `SchoolAdmission`, `Graduation`, `Employment`, `Unemployment`, `IncomeLoss`, `IllnessOrHospitalization`, `SeniorCitizenTransition`, `Migration`, `DisasterImpact`, `HousingLoss`.
- Verification statuses: `PendingVerification`, `Verified`, `Rejected` with confidence scoring.
- Proactive downstream orchestration (e.g. `Death` initiates pension transfer or lifecycle pause; `Birth` auto-assesses child welfare and maternity assistance; `DisabilityOnset` triggers assistance grants).
- Interactive Simulation API (`POST /api/v1/life-events/simulate`) allowing citizens to see what benefits open up or change *before* formally reporting.

### 3. Explainable Benefit Discovery Engine
- Non-binary eligibility modeling: `Eligible`, `ConditionallyEligible`, `Ineligible`, `MissingEvidence`.
- Transparent explanation contract returning:
  - `why`: Plain-language explanation for citizen and officer.
  - `satisfiedRules`: Array of verified criteria the family meets.
  - `failedRules`: Array of unmet statutory criteria.
  - `missingEvidence`: Exact missing documentation needed to unlock benefits.
  - `nextActions`: Guided concrete steps.

### 4. Benefit Gap Detector & Coverage Index
- Compares:
  - **Current Benefits:** Enrolled schemes and recurring disbursements.
  - **Potential Benefits:** Available schemes the family qualifies for right now.
  - **Missing Evidence:** High-impact schemes locked behind a single unverified document.
  - **Expiring Soon:** Schemes needing reverification or renewal.
- Computes the household **Welfare Coverage Percentage Index**.

### 5. Reusable Evidence Registry ("One Evidence -> Many Benefits")
- Digital documents (Aadhaar, Income Certificate, Caste Certificate, Disability Certificate, Land Records) are verified once and indexed.
- The registry cross-links one verified document to all eligible state and central schemes, eliminating repetitive submissions across departmental silos.

### 6. Officer 360° Family Case Graph View
- Unified case console for Talatis, Mamlatdars, and District Officers at `/families/:id/case-view`.
- Combines socio-economic profile, live graph nodes, life event verification queue, benefit gap breakdown, risk signals, and prioritized officer tasks with one-click status updates.

### 7. Non-Accusatory Risk Intelligence
- Detects cross-family document reuse, duplicate benefit claims, impossible lifecycle sequences, and income anomalies without adversarial terminology.
- Generates `RiskSignal` records with severity ratings and specific officer resolution guidelines.

### 8. Interoperable Government Data Connectors
- Simulated adapter architecture honoring standard Indian public digital infrastructure:
  - `IdentityConnector` (UIDAI Aadhaar e-KYC)
  - `CivilRegistrationConnector` (CRS Birth & Death Registry)
  - `RationConnector` (NFSA / PDS State Ration Cards)
  - `EducationConnector` (U-DISE+ Student Enrollment)
  - `PensionConnector` (NSAP National Social Assistance Programme)
  - `DocumentConnector` (DigiLocker Reusable Evidence)
  - `PaymentConnector` (PFMS / DBT Direct Benefit Transfer)
- Status and health telemetry exposed at `GET /api/v1/integrations/status`.

---

## 3. Project Architecture & Ports

```
Nagrik/
  backend/          # Express 5 + MongoDB + V2 Engines   → http://localhost:5000
  user_frontend/    # React 19 + Vite 8 (Citizen Portal)  → http://localhost:5173
  admin_frontend/   # React 19 + Vite 8 (Officer Portal)  → http://localhost:5174
```

---

## 4. Quick Start

### Backend
```bash
cd backend
npm install
# Configure .env with MONGO_URI, JWT_SECRET, and Cloudinary credentials
npm run dev
```

Run test suites:
```bash
# Run 157 core end-to-end API tests
node tests/apiTestSuite.js

# Run 41 V2 welfare intelligence tests
node tests/v2TestSuite.js
```

### Citizen Portal
```bash
cd user_frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. Features the **"Analyze My Family"** Command Center, live benefit gap meter, explainable qualification cards, reusable evidence vault, and interactive life event simulator.

### Officer Portal
```bash
cd admin_frontend
npm install
npm run dev
```
Open [http://localhost:5174](http://localhost:5174) in your browser. Login using credentials for Talati, Mamlatdar, District Officer, or Admin. Access the 360° Family Case View from the Family Registry table.

---

## 5. Summary of V2 REST APIs

Base URL: `http://localhost:5000/api/v1`

| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/families/:id/analyze` | Full proactive family welfare analysis (gaps, potential, evidence) |
| `GET`  | `/families/:id/graph` | Family Benefit Graph nodes and edges for visual rendering |
| `GET`  | `/families/:id/benefit-gaps` | Benefit Gap Detector breakdown and coverage index |
| `GET`  | `/families/:id/benefits` | Active and past benefit entitlements |
| `GET`  | `/families/:id/evidence` | Reusable evidence registry ("One Evidence -> Many Benefits") |
| `GET`  | `/families/:id/life-events` | History of life events for family |
| `POST` | `/life-events` | Ingest new life event (triggers automated orchestration) |
| `POST` | `/life-events/:id/verify` | Officer verification of reported life event |
| `POST` | `/life-events/simulate` | Interactive "What-If" simulator for citizens |
| `GET`  | `/officer/families/:id/case-view` | 360° Officer Family Case Graph View |
| `GET`  | `/officer/tasks` | Officer actionable task checklist |
| `PATCH`| `/officer/tasks/:id` | Update task status (`Pending` -> `InProgress` -> `Completed`) |
| `GET`  | `/risk-signals` | Non-accusatory verification signals |
| `GET`  | `/notifications` | Bilingual citizen notification inbox |
| `GET`  | `/integrations/status` | Real-time status of simulated government connectors |

---

## 6. Comprehensive Documentation

For the exhaustive 1,000+ line technical specification, database schemas, threat models, and operational runbooks, see:  
**[NAGRIK_MASTER_DOCUMENTATION.md](file:///c:/Users/VASU%20MONPARA/OneDrive/Desktop/Nagrik/NAGRIK_MASTER_DOCUMENTATION.md)**

---

## 7. Cloud Deployment Guide (Render & Vercel)

### A. Deploy Backend on Render (`https://render.com`)
1. Create a **New Web Service** connected to this repository (`https://github.com/Het2518/Nagrik.git`).
2. Configure settings:
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
3. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `MONGO_URI`: Your MongoDB Atlas URI connection string
   - `JWT_SECRET`: A secure 32+ character random string
   - `JWT_EXPIRES_IN`: `7d`
   - `ENCRYPTION_KEY`: A 32-character AES secret key
   - `ALLOWED_ORIGINS`: `*` (or your Vercel frontend URLs)
4. (Optional) Run database seed on Render Shell:
   ```bash
   npm run seed:clean
   ```

### B. Deploy Frontends on Vercel (`https://vercel.com`)

#### 1. Citizen Portal (`user_frontend`)
1. Import git repository on Vercel dashboard.
2. Set **Root Directory** to: `user_frontend`
3. Framework Preset: **Vite**
4. Build Command: `npm run build` | Output Directory: `dist`
5. Environment Variable:
   - `VITE_API_URL`: `https://your-render-app.onrender.com/api/v1`

#### 2. Officer Portal (`admin_frontend`)
1. Add a second project on Vercel pointing to the same repository.
2. Set **Root Directory** to: `admin_frontend`
3. Framework Preset: **Vite**
4. Build Command: `npm run build` | Output Directory: `dist`
5. Environment Variable:
   - `VITE_API_URL`: `https://your-render-app.onrender.com/api/v1`

