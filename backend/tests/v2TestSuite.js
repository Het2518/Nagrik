'use strict';

// ── Nagrik V2 Welfare Intelligence Test Suite ────────────────────────────────
// Tests the Family Benefit Graph, Life Event Engine, Explainable Eligibility,
// Benefit Gap Detector, Reusable Evidence Registry, and Officer Case View.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const http = require('http');

const BASE = `http://localhost:${process.env.PORT || 5000}/api/v1`;
const RUN_ID = Date.now().toString().slice(-6);
const TEST_MOBILE = `99${RUN_ID}01`;

let passed = 0;
let failed = 0;

const req = (method, path, body, token) =>
  new Promise((resolve, reject) => {
    const url = new URL(`${BASE}${path}`);
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const request = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    request.on('error', reject);
    if (payload) request.write(payload);
    request.end();
  });

const assert = (label, condition, detail = '') => {
  if (condition) {
    console.log(`  ✅ PASS | ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL | ${label}${detail ? `\n         ${detail}` : ''}`);
    failed++;
  }
};

async function runV2Tests() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  NAGRIK V2 — WELFARE INTELLIGENCE TEST SUITE');
  console.log('══════════════════════════════════════════════════\n');

  // 1. Integrations Status Check
  console.log('── SECTION 1: Interoperability Connectors ────────');
  const connRes = await req('GET', '/integrations/status');
  assert('Integrations status endpoint → HTTP 200', connRes.status === 200);
  assert('Has disclaimer regarding simulations', !!connRes.body?.data?.disclaimer);
  assert('Connectors list returned', Array.isArray(connRes.body?.data?.connectors));
  assert('At least 5 connectors registered', (connRes.body?.data?.connectors?.length || 0) >= 5);

  // 2. Authentication & Household Setup
  console.log('\n── SECTION 2: Auth & Family Onboarding ───────────');
  // Register citizen
  const regRes = await req('POST', '/auth/citizen/register', {
    mobileNumber: TEST_MOBILE,
    password: 'Citizen@1234',
  });
  assert('Register citizen → HTTP 201', regRes.status === 201);

  const loginRes = await req('POST', '/auth/citizen/login', {
    mobileNumber: TEST_MOBILE,
    password: 'Citizen@1234',
  });
  assert('Citizen login → HTTP 200', loginRes.status === 200);
  let citizenToken = loginRes.body?.data?.token;

  // Officer login
  const talatiLogin = await req('POST', '/auth/officer/login', {
    email: 'ramesh.talati@nagrik.gov.in',
    password: 'Officer@12345',
  });
  assert('Talati officer login → HTTP 200', talatiLogin.status === 200);
  const talatiToken = talatiLogin.body?.data?.token;

  // Register Family
  const familyPayload = {
    familyDetails: {
      annualIncome: 75000,
      category: 'OBC',
      bplStatus: true,
      rationCardType: 'PHH',
      rationCardNumber: `RC-V2-${RUN_ID}`,
      hasPuccaHouse: false,
      address: { village: 'Katosan', taluka: 'Kadi', district: 'Mehsana', pincode: '382715' },
    },
    headMemberDetails: {
      name: 'V2 Test Citizen',
      dateOfBirth: '1982-04-10',
      gender: 'Male',
      relationToHead: 'Self',
      occupation: 'Marginal Farmer',
      maritalStatus: 'Married',
      aadhaar: `8800${Date.now().toString().slice(-8)}`,
    },
  };

  const famRegRes = await req('POST', '/families', familyPayload, citizenToken);
  assert('Register family → HTTP 201', famRegRes.status === 201);
  const family = famRegRes.body?.data?.family;
  const familyId = family?._id;
  const familyReadableId = family?.familyId;

  // Re-login to get refreshed JWT containing familyId
  const reloginRes = await req('POST', '/auth/citizen/login', {
    mobileNumber: TEST_MOBILE,
    password: 'Citizen@1234',
  });
  citizenToken = reloginRes.body?.data?.token || famRegRes.body?.data?.token || citizenToken;

  // Talati verifies family using PATCH
  const verFam = await req(
    'PATCH',
    `/families/${familyReadableId}/verify`,
    { action: 'Approve', verificationNotes: 'Field check OK. Documents verified.' },
    talatiToken
  );
  assert('Talati verifies family → HTTP 200', verFam.status === 200);

  // Add a student member
  const addMemRes = await req(
    'POST',
    `/families/${familyReadableId}/members`,
    {
      name: 'V2 Student Child',
      dateOfBirth: '2008-08-15',
      gender: 'Female',
      relationToHead: 'Daughter',
      maritalStatus: 'Single',
      isStudent: true,
      educationLevel: '12th Grade',
      aadhaar: `8900${Date.now().toString().slice(-8)}`,
    },
    citizenToken
  );
  assert('Add student member → HTTP 201', addMemRes.status === 201);
  const studentMember = addMemRes.body?.data?.member;

  // 3. Analyze My Family & Gap Detector
  console.log('\n── SECTION 3: Analyze My Family & Gap Detector ───');
  const analyzeRes = await req('POST', `/families/${familyId}/analyze`, {}, citizenToken);
  assert('POST /families/:id/analyze → HTTP 200', analyzeRes.status === 200);
  const analysis = analyzeRes.body?.data;
  assert('Analysis has coveragePercentage', typeof analysis?.coveragePercentage === 'number');
  assert('Analysis has potentialBenefits array', Array.isArray(analysis?.potentialBenefits));
  assert('Analysis has reusableEvidence array', Array.isArray(analysis?.reusableEvidence));
  assert('Analysis has recommendations', Array.isArray(analysis?.recommendations));

  const gapRes = await req('GET', `/families/${familyId}/benefit-gaps`, null, citizenToken);
  assert('GET /families/:id/benefit-gaps → HTTP 200', gapRes.status === 200);
  assert('Gap response has potentialBenefitsCount', typeof gapRes.body?.data?.potentialBenefitsCount === 'number');

  // 4. Family Benefit Graph
  console.log('\n── SECTION 4: Family Benefit Graph ───────────────');
  const graphRes = await req('GET', `/families/${familyId}/graph`, null, citizenToken);
  assert('GET /families/:id/graph → HTTP 200', graphRes.status === 200);
  const graph = graphRes.body?.data;
  assert('Graph has nodes array', Array.isArray(graph?.nodes));
  assert('Graph has edges array', Array.isArray(graph?.edges));
  assert('Graph contains Family node', graph?.nodes?.some((n) => n.type === 'Family'));
  assert('Graph contains Member node', graph?.nodes?.some((n) => n.type === 'Member'));

  // 5. Life Event Engine & Impact Simulation
  console.log('\n── SECTION 5: Life Event Engine & Simulation ─────');
  const simRes = await req(
    'POST',
    `/families/${familyId}/simulate-life-event`,
    {
      eventType: 'AgeThresholdReached',
      affectedMemberId: studentMember?._id,
      simulatedChanges: { annualIncome: 50000 },
    },
    citizenToken
  );
  assert('Simulate life event → HTTP 200', simRes.status === 200);
  assert('Simulation returns impact summary', typeof simRes.body?.data?.summaryEn === 'string');

  // Record Real Life Event
  const recordEventRes = await req(
    'POST',
    '/life-events',
    {
      familyId,
      memberId: studentMember?._id,
      eventType: 'StudentStatusChange',
      eventDate: new Date(),
      details: { institution: 'Govt Higher Secondary, Katosan' },
      evidence: [{ title: 'Enrollment Bonafide', certNumber: 'ENR-2026-091' }],
    },
    citizenToken
  );
  assert('Record Life Event → HTTP 201', recordEventRes.status === 201);
  const createdEvent = recordEventRes.body?.data?.event;
  assert('Life event has eventId', !!createdEvent?.eventId);
  assert('Verification status is PendingVerification', createdEvent?.verificationStatus === 'PendingVerification');

  // Get Family Life Events
  const getEventsRes = await req('GET', `/families/${familyId}/life-events`, null, citizenToken);
  assert('GET /families/:id/life-events → HTTP 200', getEventsRes.status === 200);
  assert('Events list includes newly created event', getEventsRes.body?.data?.lifeEvents?.length > 0);

  // 6. Officer Case View & Tasks
  console.log('\n── SECTION 6: Officer Case View & Tasks ──────────');
  const caseViewRes = await req('GET', `/officer/families/${familyId}/case-view`, null, talatiToken);
  assert('Officer 360° Case View → HTTP 200', caseViewRes.status === 200);
  assert('Case view has family profile', !!caseViewRes.body?.data?.family);
  assert('Case view has graph', !!caseViewRes.body?.data?.graph);
  assert('Case view has benefit gaps', !!caseViewRes.body?.data?.benefitGaps);

  // Officer Tasks
  const tasksRes = await req('GET', '/officer/tasks', null, talatiToken);
  assert('GET /officer/tasks → HTTP 200', tasksRes.status === 200);
  const tasks = tasksRes.body?.data?.tasks;
  assert('Tasks is array', Array.isArray(tasks));

  // Verify Life Event by Officer
  if (createdEvent?._id) {
    const verifyEventRes = await req('POST', `/life-events/${createdEvent._id}/verify`, {}, talatiToken);
    assert('Officer verifies life event → HTTP 200', verifyEventRes.status === 200);
    assert('Event status is Verified', verifyEventRes.body?.data?.event?.verificationStatus === 'Verified');
  }

  // Risk Signals
  const riskRes = await req('GET', '/risk-signals', null, talatiToken);
  assert('GET /risk-signals → HTTP 200', riskRes.status === 200);
  assert('Risk signals list returned', Array.isArray(riskRes.body?.data?.riskSignals));

  // 7. Citizen Notifications
  console.log('\n── SECTION 7: Citizen Notifications ──────────────');
  const notifsRes = await req('GET', '/notifications', null, citizenToken);
  assert('GET /notifications → HTTP 200', notifsRes.status === 200);
  const notifs = notifsRes.body?.data?.notifications;
  assert('Notifications array returned', Array.isArray(notifs));
  if (notifs?.length > 0) {
    const markReadRes = await req('PATCH', `/notifications/${notifs[0]._id}/read`, {}, citizenToken);
    assert('Mark notification read → HTTP 200', markReadRes.status === 200);
  }

  // 8. Resubmission & Document Correction Workflow (Problem D)
  console.log('\n── SECTION 8: Resubmission Workflow (Problem D) ──');
  const schemesRes = await req('GET', '/schemes', null, citizenToken);
  const testScheme = schemesRes.body?.data?.schemes?.find(s => s.schemeCode === 'PMAY-G') || schemesRes.body?.data?.schemes?.[1];
  const testMemberId = studentMember?._id;
  if (testScheme && testMemberId) {
    const docKeys = (testScheme.requiredDocuments || []).map(d => d.docKey);
    const formFields = {
      land_ownership_type: 'Own Land',
      current_house_type: 'Kutcha',
      bank_account_number: '1234567890',
      ifsc_code: 'SBIN0001234',
      total_family_members: 4,
    };
    for (const f of testScheme.applicationFormFields || []) {
      if (!formFields[f.fieldKey]) {
        formFields[f.fieldKey] = f.fieldType === 'number' ? 4 : 'Sample value';
      }
    }
    const appSubmitRes = await req('POST', '/applications', {
      memberId: testMemberId,
      schemeId: testScheme._id,
      submittedDocumentKeys: docKeys.length > 0 ? docKeys : ['aadhaar', 'income_certificate'],
      schemeSpecificData: formFields,
      documents: [{ documentType: 'Income Certificate', certificateNumber: `INC-${RUN_ID}-01`, issuingAuthority: 'Talati' }]
    }, citizenToken);

    assert('Submit application for resubmission test → HTTP 201', appSubmitRes.status === 201, JSON.stringify(appSubmitRes.body));
    if (appSubmitRes.status === 201) {
      const testAppId = appSubmitRes.body?.data?.applicationId;

      // Talati requests resubmission
      const appGetRes = await req('GET', `/applications/${testAppId}`, null, talatiToken);
      const appMongoId = appGetRes.body?.data?.application?._id || testAppId;

      const reqResubRes = await req('PATCH', `/applications/${appMongoId}/decision`, {
        action: 'RequestResubmission',
        remarks: 'Income certificate is blurred, please upload a clear copy.',
        documentAffected: 'income_certificate',
        correctionRequired: 'Clear, legible copy of current year certificate'
      }, talatiToken);
      assert('Officer requests resubmission → HTTP 200', reqResubRes.status === 200);
      assert('Status is ResubmissionRequired', reqResubRes.body?.data?.status === 'ResubmissionRequired');

      // Citizen resubmits with updated document
      const resubmitRes = await req('PATCH', `/applications/${testAppId}/resubmit`, {
        remarks: 'Uploaded high resolution scan of the income certificate',
        submittedDocuments: [{
          docKey: 'income_certificate',
          url: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
          publicId: 'sample_income_cert',
          originalName: 'clear_income_cert.pdf',
          format: 'pdf',
          sizeBytes: 102400
        }]
      }, citizenToken);
      assert('Citizen resubmits application → HTTP 200', resubmitRes.status === 200);
      assert('Application transitions back to Pending', resubmitRes.body?.data?.status === 'Pending');
    }
  }

  // Final Summary
  console.log('\n══════════════════════════════════════════════════');
  console.log(`  ✅ PASSED: ${passed}`);
  console.log(`  ❌ FAILED: ${failed}`);
  console.log(`  📊 TOTAL:  ${passed + failed}`);
  console.log('══════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runV2Tests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
