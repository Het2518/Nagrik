'use strict';

/**
 * Nagrik Social Registry & Family ID — Full Application End-to-End API Test Suite
 * Built with native Node.js fetch (zero extra dependencies).
 */

const BASE_URL = 'http://localhost:5000';
const results = [];

async function apiRequest({ method = 'GET', url, data = null, headers = {} }) {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  const fetchHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const options = {
    method,
    headers: fetchHeaders,
  };

  if (data && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    options.body = JSON.stringify(data);
  }

  const start = Date.now();
  let res;
  let resData = null;
  try {
    res = await fetch(fullUrl, options);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      resData = await res.json();
    } else {
      resData = await res.text();
    }
  } catch (err) {
    return {
      status: 0,
      error: err.message,
      duration: Date.now() - start,
      data: null,
    };
  }

  return {
    status: res.status,
    headers: res.headers,
    data: resData,
    duration: Date.now() - start,
  };
}

function record(name, domain, method, path, response, expectedStatus = 200) {
  const isOk = Array.isArray(expectedStatus)
    ? expectedStatus.includes(response.status)
    : response.status === expectedStatus;

  const summary = {
    name,
    domain,
    method,
    path,
    status: response.status,
    expectedStatus,
    pass: isOk,
    timeMs: response.duration || 0,
    dataPreview: response.data
      ? typeof response.data === 'string'
        ? response.data.slice(0, 100) + '...'
        : JSON.stringify(response.data).slice(0, 120) + '...'
      : null,
  };
  results.push(summary);

  const icon = isOk ? '✅' : '❌';
  console.log(`${icon} [${response.status}] ${method} ${path} - ${name} (${response.duration}ms)`);
  if (!isOk) {
    console.error('   ⚠️ Error details:', response.data);
  }
}

async function runSuite() {
  console.log('======================================================================');
  console.log('🚀 INITIATING FULL E2E API VERIFICATION SUITE — NAGRIK PLATFORM');
  console.log('======================================================================\n');

  // ── 0. HEALTH & CORE STATUS ───────────────────────────────────────────────
  console.log('--- 0. Core Infrastructure & Health ---');
  let res = await apiRequest({ method: 'GET', url: '/health' });
  record('Backend Health Ping', 'Core', 'GET', '/health', res, 200);

  res = await apiRequest({ method: 'GET', url: '/api/v1/integrations/status' });
  record('Integrations Status', 'Core', 'GET', '/api/v1/integrations/status', res, 200);

  // ── 1. AUTHENTICATION ─────────────────────────────────────────────────────
  console.log('\n--- 1. Multi-Tier Authentication ---');
  // Citizen Login (Ramesh Patel)
  res = await apiRequest({
    method: 'POST',
    url: '/api/v1/auth/citizen/login',
    data: { mobileNumber: '9876543210', password: 'Password123!' },
  });
  record('Citizen Login (Ramesh Patel)', 'Auth', 'POST', '/api/v1/auth/citizen/login', res, 200);
  const citizenToken = res.data?.data?.token || res.data?.token;
  const citizenFamilyId = res.data?.data?.familyId || res.data?.familyId || 'GJ-GND-2024-001';

  // Officer Login (Talati: TAL-001)
  res = await apiRequest({
    method: 'POST',
    url: '/api/v1/auth/officer/login',
    data: { officerId: 'TAL-001', password: 'Password123!' },
  });
  record('Talati Login (TAL-001)', 'Auth', 'POST', '/api/v1/auth/officer/login', res, 200);
  const talatiToken = res.data?.data?.token || res.data?.token;

  // Officer Login (Mamlatdar: MAM-001)
  res = await apiRequest({
    method: 'POST',
    url: '/api/v1/auth/officer/login',
    data: { officerId: 'MAM-001', password: 'Password123!' },
  });
  record('Mamlatdar Login (MAM-001)', 'Auth', 'POST', '/api/v1/auth/officer/login', res, 200);
  const mamlatdarToken = res.data?.data?.token || res.data?.token;

  // Officer Login (Super Admin: ADM-001)
  res = await apiRequest({
    method: 'POST',
    url: '/api/v1/auth/officer/login',
    data: { officerId: 'ADM-001', password: 'Admin@12345' },
  });
  record('Super Admin Login (ADM-001)', 'Auth', 'POST', '/api/v1/auth/officer/login', res, 200);
  const adminToken = res.data?.data?.token || res.data?.token;

  // Get Current User Profile (Citizen Me)
  res = await apiRequest({
    method: 'GET',
    url: '/api/v1/auth/me',
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  record('Citizen /me Profile', 'Auth', 'GET', '/api/v1/auth/me', res, 200);

  // ── 2. FAMILY IDENTITY & LIFECYCLE (PHASE 1) ──────────────────────────────
  console.log('\n--- 2. Family Identity & Lifecycle Operations (Phase 1) ---');
  // Search Families (Officer)
  res = await apiRequest({
    method: 'GET',
    url: '/api/v1/families?district=Gandhinagar',
    headers: { Authorization: `Bearer ${talatiToken}` },
  });
  record('Search Families by District', 'Family', 'GET', '/api/v1/families', res, 200);

  // Get Single Family 360° Profile
  res = await apiRequest({
    method: 'GET',
    url: `/api/v1/families/${citizenFamilyId}`,
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  record('Get Family 360° Profile', 'Family', 'GET', `/api/v1/families/${citizenFamilyId}`, res, 200);
  const familyDoc = res.data?.family;
  const familyMongoId = familyDoc?._id || citizenFamilyId;
  const membersList = familyDoc?.members || [];
  const headMember = membersList[0];
  const secondMember = membersList[1];

  // Recalculate Family Composition
  res = await apiRequest({
    method: 'POST',
    url: `/api/v1/families/${familyMongoId}/recalculate`,
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  record('Recalculate Family Composition', 'Family', 'POST', `/api/v1/families/:id/recalculate`, res, 200);

  // Change Head of Family
  if (secondMember) {
    res = await apiRequest({
      method: 'PATCH',
      url: `/api/v1/families/${familyMongoId}/change-head`,
      headers: { Authorization: `Bearer ${citizenToken}` },
      data: {
        newHeadMemberId: secondMember._id,
        reason: 'Succession testing',
      },
    });
    record('Change Head of Family', 'Family', 'PATCH', `/api/v1/families/:id/change-head`, res, 200);

    // Revert Head of Family back to primary
    if (headMember) {
      await apiRequest({
        method: 'PATCH',
        url: `/api/v1/families/${familyMongoId}/change-head`,
        headers: { Authorization: `Bearer ${citizenToken}` },
        data: {
          newHeadMemberId: headMember._id,
          reason: 'Revert to original head',
        },
      });
    }
  }

  // ── 3. SCHEMES & SOCIAL REGISTRY ENGINE (PHASE 2) ─────────────────────────
  console.log('\n--- 3. Schemes & Social Registry Engine (Phase 2) ---');
  // List All Schemes (Citizen View)
  res = await apiRequest({
    method: 'GET',
    url: '/api/v1/schemes',
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  record('List Schemes (Catalog)', 'Schemes', 'GET', '/api/v1/schemes', res, 200);

  // Scheme Detail by Code
  res = await apiRequest({
    method: 'GET',
    url: '/api/v1/schemes/PMSSS',
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  record('Get Scheme by Code (PMSSS)', 'Schemes', 'GET', '/api/v1/schemes/PMSSS', res, 200);

  // Social Registry Overview (Admin)
  res = await apiRequest({
    method: 'GET',
    url: '/api/v1/schemes/social-registry/overview',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  record('Social Registry Overview', 'Registry', 'GET', '/api/v1/schemes/social-registry/overview', res, 200);

  // Family Social Registry Score & Deprivation Breakdown
  res = await apiRequest({
    method: 'GET',
    url: `/api/v1/schemes/social-registry/family/${familyMongoId}`,
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  record('Family Deprivation Score & Registry Tier', 'Registry', 'GET', `/api/v1/schemes/social-registry/family/:id`, res, 200);

  // Scheme Rule Versions (Audit Snapshot)
  res = await apiRequest({
    method: 'GET',
    url: '/api/v1/schemes/PMSSS/versions',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  record('Scheme Rule Version History', 'Schemes', 'GET', '/api/v1/schemes/PMSSS/versions', res, 200);

  // Scheme Saturation Board & Beneficiaries
  res = await apiRequest({
    method: 'GET',
    url: '/api/v1/schemes/PMSSS/beneficiaries',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  record('Scheme Saturation Board Analytics', 'Schemes', 'GET', '/api/v1/schemes/PMSSS/beneficiaries', res, 200);

  // Deterministic Eligibility Check
  res = await apiRequest({
    method: 'GET',
    url: `/api/v1/eligibility/${familyMongoId}`,
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  record('Eligibility Engine Rule Evaluation', 'Eligibility', 'GET', `/api/v1/eligibility/:id`, res, 200);

  // ── 4. EVIDENCE LOCKER & DIGILOCKER (PHASE 3) ──────────────────────────────
  console.log('\n--- 4. Document & Evidence Layer (Phase 3) ---');
  // Get Family Registered Documents
  res = await apiRequest({
    method: 'GET',
    url: `/api/v1/families/${familyMongoId}/documents`,
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  record('Family Evidence Documents', 'Evidence', 'GET', `/api/v1/families/:id/documents`, res, 200);

  // Evidence Completeness Score
  res = await apiRequest({
    method: 'GET',
    url: `/api/v1/families/${familyMongoId}/evidence/completeness`,
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  record('Evidence Locker Completeness Score', 'Evidence', 'GET', `/api/v1/families/:id/evidence/completeness`, res, 200);

  // Reusable Evidence Matching against Scheme
  res = await apiRequest({
    method: 'GET',
    url: `/api/v1/families/${familyMongoId}/evidence/match-scheme/PMSSS`,
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  record('Reusable Evidence Match to Scheme', 'Evidence', 'GET', `/api/v1/families/:id/evidence/match-scheme/:schemeCode`, res, 200);

  // Fetch Simulated DigiLocker Documents
  res = await apiRequest({
    method: 'GET',
    url: `/api/v1/families/${familyMongoId}/digilocker/available`,
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  record('DigiLocker Available Credentials', 'Evidence', 'GET', `/api/v1/families/:id/digilocker/available`, res, 200);

  // ── 5. VERIFICATION WORKFLOWS & SLA ENFORCEMENT (PHASE 4) ───────────────────
  console.log('\n--- 5. Verification, SLA & Officer Workflows (Phase 4) ---');
  // Citizen Application List
  res = await apiRequest({
    method: 'GET',
    url: '/api/v1/applications',
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  record('Citizen Applications List', 'Workflow', 'GET', '/api/v1/applications', res, 200);

  // Talati Officer Queue (Level 1 Review with SLA metrics)
  res = await apiRequest({
    method: 'GET',
    url: '/api/v1/applications?level=1',
    headers: { Authorization: `Bearer ${talatiToken}` },
  });
  record('Talati Verification Queue (Level 1)', 'Workflow', 'GET', '/api/v1/applications?level=1', res, 200);

  // Mamlatdar Officer Queue (Level 2 Review)
  res = await apiRequest({
    method: 'GET',
    url: '/api/v1/applications?level=2',
    headers: { Authorization: `Bearer ${mamlatdarToken}` },
  });
  record('Mamlatdar Queue (Level 2)', 'Workflow', 'GET', '/api/v1/applications?level=2', res, 200);

  // Single Application Details
  res = await apiRequest({
    method: 'GET',
    url: '/api/v1/applications/APP-RESUB-DEMO',
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  record('Get Application Detail (APP-RESUB-DEMO)', 'Workflow', 'GET', '/api/v1/applications/APP-RESUB-DEMO', res, 200);

  // Guided Verification Checklist for Officer
  res = await apiRequest({
    method: 'GET',
    url: '/api/v1/applications/APP-RESUB-DEMO/checklist',
    headers: { Authorization: `Bearer ${talatiToken}` },
  });
  record('Officer Guided Verification Checklist', 'Workflow', 'GET', '/api/v1/applications/APP-RESUB-DEMO/checklist', res, 200);

  // Officer Requests Clarification
  res = await apiRequest({
    method: 'POST',
    url: '/api/v1/applications/APP-RESUB-DEMO/clarify',
    headers: { Authorization: `Bearer ${talatiToken}` },
    data: {
      documentKey: 'income_certificate',
      remarks: 'E2E Automated Test: Please confirm signature date on income certificate.',
    },
  });
  record('Officer Request Clarification', 'Workflow', 'POST', '/api/v1/applications/:id/clarify', res, 200);

  // Citizen Responds to Clarification
  res = await apiRequest({
    method: 'POST',
    url: '/api/v1/applications/APP-RESUB-DEMO/respond-clarify',
    headers: { Authorization: `Bearer ${citizenToken}` },
    data: {
      citizenResponse: 'E2E Automated Test: Certificate was issued on 10 April 2024 by Taluka Seva Sadan.',
    },
  });
  record('Citizen Respond to Clarification', 'Workflow', 'POST', '/api/v1/applications/:id/respond-clarify', res, 200);

  // Officer Escalates Priority / SLA
  res = await apiRequest({
    method: 'POST',
    url: '/api/v1/applications/APP-RESUB-DEMO/escalate',
    headers: { Authorization: `Bearer ${mamlatdarToken}` },
    data: {
      reason: 'E2E Automated Test: Escalated for rapid student sanction approval.',
    },
  });
  record('Escalate Application Priority/SLA', 'Workflow', 'POST', '/api/v1/applications/:id/escalate', res, 200);

  // ── 6. PROACTIVE WELFARE & NOTIFICATIONS (PHASE 5) ─────────────────────────
  console.log('\n--- 6. Proactive Welfare, Intelligence & Notifications (Phase 5) ---');
  // Geographic Saturation Analytics
  res = await apiRequest({
    method: 'GET',
    url: '/api/v1/analytics/geographic-saturation?district=Gandhinagar',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  record('Geographic Welfare Saturation Analytics', 'Welfare', 'GET', '/api/v1/analytics/geographic-saturation', res, 200);

  // High-Priority Unreached Families
  res = await apiRequest({
    method: 'GET',
    url: '/api/v1/analytics/priority-families',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  record('High-Priority Unreached Families Queue', 'Welfare', 'GET', '/api/v1/analytics/priority-families', res, 200);

  // Notifications List (Citizen)
  res = await apiRequest({
    method: 'GET',
    url: '/api/v1/notifications',
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  record('Citizen Notifications Feed', 'Notifications', 'GET', '/api/v1/notifications', res, 200);

  // Mark All Notifications Read
  res = await apiRequest({
    method: 'PATCH',
    url: '/api/v1/notifications/read-all',
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  record('Mark All Notifications Read', 'Notifications', 'PATCH', '/api/v1/notifications/read-all', res, 200);

  // Officer Tasks Queue
  res = await apiRequest({
    method: 'GET',
    url: '/api/v1/officer/tasks',
    headers: { Authorization: `Bearer ${talatiToken}` },
  });
  record('Officer Task Worklist', 'Workflow', 'GET', '/api/v1/officer/tasks', res, 200);

  // Non-Accusatory Risk Signals
  res = await apiRequest({
    method: 'GET',
    url: '/api/v1/risk-signals',
    headers: { Authorization: `Bearer ${talatiToken}` },
  });
  record('Cross-Family Collision Risk Signals', 'Governance', 'GET', '/api/v1/risk-signals', res, 200);

  // Executive Dashboard Stats (SLA, Budget, Saturation)
  res = await apiRequest({
    method: 'GET',
    url: '/api/v1/dashboard/stats',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  record('Executive Admin Dashboard KPIs', 'Dashboard', 'GET', '/api/v1/dashboard/stats', res, 200);

  // ── 7. DATA QUALITY & AUDIT INTEGRITY (PHASE 6) ────────────────────────────
  console.log('\n--- 7. Data Quality & System Audit (Phase 6) ---');
  // State Data Quality Report
  res = await apiRequest({
    method: 'GET',
    url: '/api/v1/data-quality/report',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  record('State Data Quality Health Report', 'DataQuality', 'GET', '/api/v1/data-quality/report', res, 200);

  // Incomplete Records Queue for Remediation
  res = await apiRequest({
    method: 'GET',
    url: '/api/v1/data-quality/incomplete',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  record('Incomplete Records Remediation Queue', 'DataQuality', 'GET', '/api/v1/data-quality/incomplete', res, 200);

  // Single Family Quality Score
  res = await apiRequest({
    method: 'GET',
    url: `/api/v1/data-quality/family/${citizenFamilyId}`,
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  record('Single Family Data Quality Score', 'DataQuality', 'GET', `/api/v1/data-quality/family/:id`, res, 200);

  // Send Remediation Update Nudge
  res = await apiRequest({
    method: 'POST',
    url: `/api/v1/data-quality/family/${citizenFamilyId}/nudge`,
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { reason: 'E2E Automated Test: Remind citizen to review bank seeding.' },
  });
  record('Send Remediation Update Nudge', 'DataQuality', 'POST', `/api/v1/data-quality/family/:id/nudge`, res, 200);

  // Audit Logs (Severity Filtered: Critical)
  res = await apiRequest({
    method: 'GET',
    url: '/api/v1/auditlogs?severity=Critical',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  record('Audit Logs with Severity Filter (Critical)', 'Audit', 'GET', '/api/v1/auditlogs?severity=Critical', res, 200);

  // Entity Audit Timeline
  res = await apiRequest({
    method: 'GET',
    url: '/api/v1/auditlogs/timeline/APP-RESUB-DEMO',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  record('Entity Audit Timeline (APP-RESUB-DEMO)', 'Audit', 'GET', '/api/v1/auditlogs/timeline/:entityId', res, 200);

  // Audit Logs CSV Streaming Export
  res = await apiRequest({
    method: 'GET',
    url: '/api/v1/auditlogs/export',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  record('Audit Logs CSV Export Stream', 'Audit', 'GET', '/api/v1/auditlogs/export', res, 200);

  // ── SUMMARY & METRICS ─────────────────────────────────────────────────────
  console.log('\n======================================================================');
  console.log('📊 E2E TEST EXECUTION SUMMARY');
  console.log('======================================================================');
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  const avgTime = Math.round(results.reduce((acc, r) => acc + r.timeMs, 0) / total);

  console.log(`Total API Tests:    ${total}`);
  console.log(`Passed:             ${passed} ✅`);
  console.log(`Failed:             ${failed} ❌`);
  console.log(`Average Latency:    ${avgTime} ms\n`);

  if (failed > 0) {
    console.log('❌ Failed Tests Summary:');
    results
      .filter((r) => !r.pass)
      .forEach((r) => {
        console.log(`   • [${r.domain}] ${r.method} ${r.path} -> Received ${r.status}, Expected ${r.expectedStatus}`);
      });
    process.exit(1);
  } else {
    console.log('🎉 ALL 35+ ENDPOINTS VERIFIED & FUNCTIONING WITH 100% SUCCESS!');
    process.exit(0);
  }
}

runSuite().catch((err) => {
  console.error('Fatal execution error in test suite:', err);
  process.exit(1);
});
