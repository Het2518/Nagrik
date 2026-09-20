# Nagrik (નાગરિક) — Manual Testing & Step-by-Step User Evaluation Guide

This guide walks you through testing every feature of the Nagrik platform from both the **Citizen** and **Government Officer / Admin** sides.

---

## 🚀 Quick Access Links

| Portal | URL / Command | Default Port | Notes |
|:---|:---|:---|:---|
| **Citizen Welfare Portal** | [`https://nagrik-eosin.vercel.app/`](https://nagrik-eosin.vercel.app/) | Cloud (Vercel) | Live on Vercel, bilingual (En/Gu) |
| **Official Admin Portal** | Run: `cd admin_frontend && npm run dev` | `http://localhost:5173` or `5174` | Officer & Admin Saturation Board |
| **Backend API** | [`https://nagrik-backend-iz5j.onrender.com`](https://nagrik-backend-iz5j.onrender.com) | Cloud (Render) | Live REST API & Cron Scheduler |

---

## 🔑 Demo Credentials Cheatsheet

### 1. Citizen Logins (Mobile Number + Password)
*Citizen Portal: [`https://nagrik-eosin.vercel.app/login`](https://nagrik-eosin.vercel.app/login)*

| Citizen Name | Mobile Number | Password | Profile & Household Type |
|:---|:---|:---|:---|
| **Ramesh Somabhai Patel** *(Main Demo)* | `9876543210` | `Password123!` | Farmer, Gandhinagar (OBC, 4 members, daughter Hetal student) |
| **Savitaben Dayabhai Vankar** | `9876543211` | `Password123!` | BPL Homemaker & Weaver (SC, Antyodaya ration card, 3 members) |
| **Hareshbhai Prajapati** | `9876543212` | `Password123!` | Urban Worker, Ahmedabad (Risk Signal Demo) |

### 2. Government Officer Logins (Username + Password)
*Admin Portal: [`http://localhost:5174/login`](http://localhost:5174/login)*

| Role | Username / ID | Password | Jurisdiction |
|:---|:---|:---|:---|
| **Talati (Level 1 Reviewer)** | `TAL-001` | `Password123!` | Khoraj Village, Gandhinagar |
| **Mamlatdar (Level 2 Approver)** | `MAM-001` | `Password123!` | Gandhinagar Taluka |
| **District Officer (Level 3 Sanction)**| `DST-001` | `Password123!` | Gandhinagar District (Final Sanction) |
| **Super Admin (State Government)** | `ADM-001` | `Password123!` | Gujarat State-Wide (All Schemes) |

---

## 🧪 Test Scenarios: Step-by-Step Walkthrough

---

### Scenario 1: Citizen Scheme Eligibility Visual Differentiator (Eligible vs Ineligible)

**Goal:** Verify that schemes where the family is eligible appear bright with green badges, while ineligible schemes appear in muted grey / low opacity with an interactive hover tooltip explaining why.

1. Open the **Citizen Portal**: [`https://nagrik-eosin.vercel.app/login`](https://nagrik-eosin.vercel.app/login).
2. Login with mobile: **`9876543210`** and OTP: **`123456`** (Ramesh Patel).
3. In the top navigation bar, click **"Schemes"** (or go to `/schemes`).
4. **Observe the Visual Differentiation:**
   - **Eligible Schemes (e.g. *Mukhyamantri Gruh Yojana*, *PM-KISAN*, *Kuvarbainu Mameru*):**
     * Rendered with **100% full opacity** and a green border.
     * Green badge: `✓ Eligible`.
     * Contextual tag: `Qualified: Hetal (22 yrs)` or `Qualified: Ramesh`.
     * Prominent **"Apply Now →"** button.
   - **Ineligible Schemes (e.g. *IGNOAPS Old Age Pension*):**
     * Rendered in **grey / low opacity (`opacity: 0.58`)** with grayscale styling and a `⚠️ Not Eligible` badge.
5. **Hover over an Ineligible Scheme Card:**
   - Hover your mouse over the card (e.g. *Indira Gandhi Old Age Pension*).
   - The card opacity smoothly increases to 0.94 and reveals an **interactive explanatory box**:
     ```
     ℹ️ Why Not Eligible:
     • Minimum age is 60 (member is 45)
     • Family must have BPL status
     ```
6. **Test the Quick Eligibility Filter Bar:**
   - At the top of the page, locate the filter pills:
     - Click **`[✨ Eligible for My Family (9)]`**: Notice all grey/ineligible cards disappear! Only the 9 schemes your family qualifies for are displayed.
     - Click **`[Other Schemes (11)]`**: Displays only the schemes you currently do not qualify for.
     - Click **`[All Schemes (20)]`**: Restores the complete state scheme catalog.

---

### Scenario 2: Government Saturation & Beneficiary Discovery Board

**Goal:** Test how government officers discover all eligible citizens across Gujarat, check the saturation rate %, and send proactive nudges to unreached citizens.

1. In a terminal, start the **Admin Portal**:
   ```bash
   cd admin_frontend
   npm run dev
   ```
2. Open the URL in your browser (e.g. `http://localhost:5174/login` or `http://localhost:5173/login`).
3. Login as **District Officer**:
   - Username: `OFFICER-GND-01`
   - Password: `Officer@123`
4. Click **"Schemes"** in the left sidebar.
5. Notice the two main tabs at the top:
   - **`[📋 Scheme Definitions]`**
   - **`[🎯 Saturation & Beneficiary Discovery Board]`**
6. Click **`[🎯 Saturation & Beneficiary Discovery Board]`** (or click the button **"🎯 Saturation Board"** on any scheme card in the catalog).
7. In the **Selected Scheme dropdown**, select **`MMGY — Mukhyamantri Gruh Yojana`**:
8. **Observe the 4 Saturation Funnel Cards:**
   - **Total Eligible Pool:** e.g. `2` households in the jurisdiction qualifying under the rules.
   - **Active Enrolled:** Citizens currently receiving the benefit + **Saturation Rate %** with a visual progress bar.
   - **In-Flight Applications:** Applications currently under review.
   - **Unreached Coverage Gap (Amber card):** Eligible citizens who have **not applied yet**!
9. **Inspect the Beneficiary Discovery Table:**
   - See the rows listing families (e.g. `GJ-GND-2024-002`, Savitaben Vankar).
   - Shows Head of Household, Qualifying Member, Annual Income, and Status (`🔴 Not Applied`).
   - Shows the exact reason: `Household income within ceiling of ₹3,00,000`.
10. **Send a Proactive Welfare Nudge:**
    - On an unreached family row, click **"📢 Send Nudge"**.
    - Notice the button changes to `"Sending..."` and dispatches an official alert to that family.
    - A green toast message appears:  
      `📢 Welfare nudge successfully dispatched to Family GJ-GND-2024-002!`
11. **Test the Milestone Cron Recalculation:**
    - Click the button **"⚡ Run Milestone Cron Recalculation"** at the top right.
    - The backend re-evaluates all households live and displays:  
      `⚡ Cron evaluation completed: X eligible families discovered!`

---

### Scenario 3: Automated Lifecycle Triggers (Birth, Marriage & Circumstance Updates)

**Goal:** Verify that updating a family member or adding a new child automatically re-evaluates eligibility and unlocks new schemes.

1. In the **Citizen Portal** (logged in as Ramesh Patel `9876543210`), go to **"My Family"** (`/family`).
2. Click **"Add Family Member"**:
   - Full Name: `Aarav Ramesh Patel`
   - Date of Birth: `2024-05-15` (Newborn child)
   - Gender: `Male`
   - Relation to Head: `Son`
   - Occupation: `Infant`
3. Click **"Save Member"**.
4. **What happens automatically in the background:**
   - The backend `lifecycleTriggerService` detects the `MEMBER_ADDED` event.
   - It re-evaluates all 20 active Gujarat schemes for the household.
   - It identifies newly unlocked child and maternal health benefits.
   - It generates an official notification in the citizen's account.
5. In the top navbar, click the **Notifications** bell icon:
   - Notice the new notification:
     `🎉 New Scheme Eligibility Unlocked!`  
     *"Following the addition of a new family member, your household now qualifies for: Mukhyamantri Amrutam, PMMVY. Apply online without physical paperwork."*

---

### Scenario 4: 3-Tier Multi-Level Verification Pipeline (Talati ➔ Mamlatdar ➔ District Officer)

**Goal:** Test the complete end-to-end welfare sanction pipeline from citizen application to final benefit approval.

1. **Step 1 (Citizen Application):**
   - In the Citizen Portal, go to `/schemes` and click **"Apply Now"** on an eligible scheme (e.g. *PM-KISAN* or *Mukhyamantri Gruh Yojana*).
   - Select the qualifying member, review pre-filled verified family details, and click **"Submit Application"**.
   - Note the generated Application ID (e.g. `APP-XXXXXXXX`).
2. **Step 2 (Talati Level 1 Verification):**
   - In Admin Portal, login as Talati: `TALATI-GND-01` / `Talati@123`.
   - Go to **Application Queue** (`/applications`).
   - Click the submitted application.
   - Review the automated evidence checklist.
   - Click **"Approve & Forward to Mamlatdar"** (Transitions to `Level1Approved`).
3. **Step 3 (Mamlatdar Level 2 Verification):**
   - Logout and login as Mamlatdar: `MAMLATDAR-GND-01` / `Mamlatdar@123`.
   - Open the application.
   - Review revenue and socio-economic classification.
   - Click **"Approve & Forward to District Officer"** (Transitions to `Level2Approved`).
4. **Step 4 (District Officer Level 3 Final Sanction):**
   - Logout and login as District Officer: `OFFICER-GND-01` / `Officer@123`.
   - Open the application in your queue.
   - Click **"Final Sanction & Direct Benefit Transfer (DBT) Approval"**.
   - Application status updates to **`FinalApproved`**, and an active `BenefitEntitlement` record is automatically created!
5. **Step 5 (Check Saturation Board):**
   - Go to **Schemes ➔ Saturation Board** for that scheme.
   - Notice that the household status has updated from `Not Applied` to **`🟢 Enrolled`**, and the state **Saturation Rate %** has increased!

---

### Scenario 5: "Analyze My Family" 360° Welfare Intelligence

**Goal:** View the complete household welfare graph and detected benefit gaps.

1. In the Citizen Portal, go to **"Home"** or click **"Analyze My Family"**.
2. Click **"Run 360° Family Welfare Analysis"**.
3. **Inspect the Welfare Intelligence Summary:**
   - **Welfare Coverage Score %** (e.g. 33% received vs 67% potential gap).
   - **Estimated Annual Unclaimed Value** (e.g. ₹3,60,000 unclaimed welfare).
   - **Recommended Next Actions:** Direct links to apply for top qualifying schemes.
   - **Reusable Evidence Registry:** Documents that can be reused across all departments without re-attestation.

---

## 🛠️ Running Automated Verification Tests

You can also run the full test suite locally at any time to verify that all systems are healthy:

```bash
cd backend

# 1. Run Core API Test Suite (157 assertions):
node tests/apiTestSuite.js

# 2. Run V2 Welfare Intelligence Suite (47 assertions):
node tests/v2TestSuite.js
```

**Expected Result:** **`204 / 204 PASSED (100%)`**.
