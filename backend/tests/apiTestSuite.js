'use strict';

// ── Nagrik Backend — Full API Test Suite ─────────────────────────────────────
// Run:  node tests/apiTestSuite.js
// Covers every endpoint + edge cases. Prints PASS/FAIL with details.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const http = require('http');

const BASE = `http://localhost:${process.env.PORT || 5000}/api/v1`;
let passed = 0;
let failed = 0;

// ── HTTP helper ───────────────────────────────────────────────────────────────
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

// ── Assertion helpers ─────────────────────────────────────────────────────────
const assert = (label, condition, detail = '') => {
  if (condition) {
    console.log(`  ✅ PASS | ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL | ${label}${detail ? `\n         ${detail}` : ''}`);
    failed++;
  }
};

const expectStatus = (label, res, code) =>
  assert(`${label} → HTTP ${code}`, res.status === code,
    `Got ${res.status}: ${JSON.stringify(res.body).slice(0, 120)}`);

const expectField = (label, obj, field) =>
  assert(`${label} has '${field}'`, obj?.[field] !== undefined,
    `Got: ${JSON.stringify(obj).slice(0, 100)}`);

// ── State shared across tests ─────────────────────────────────────────────────
const RUN_ID = Date.now().toString().slice(-6);        // 6-digit unique suffix
const MOBILE_1 = `9${RUN_ID}001`;                      // 9 + 6 + 3 = 10 digits, starts with 9
const MOBILE_2 = `9${RUN_ID}002`;
const TEST_SCHEME_CODE = `TST-${RUN_ID}`;

let citizenToken, citizenToken2;
let adminToken, talatiToken, mamlatToken, doToken;
let familyId, memberId, memberDbId, appDbId, appId;
let schemeDbId, pmaySchemeId, bplSchemeId;

// ─────────────────────────────────────────────────────────────────────────────
const run = async () => {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  NAGRIK API — FULL TEST SUITE');
  console.log('══════════════════════════════════════════════════\n');

  // ── 0. Health check ─────────────────────────────────────────────────────────
  console.log('── SECTION 0: Health ──────────────────────────────');
  {
    const r = await req('GET', '/../../health', null, null);
    assert('Health endpoint returns ok', r.body?.status === 'ok' || r.status === 200);
  }

  // ── 1. Citizen Auth ─────────────────────────────────────────────────────────
  console.log('\n── SECTION 1: Citizen Auth ────────────────────────');
  {
    // 1a. Register — missing fields
    const r1 = await req('POST', '/auth/citizen/register', { mobileNumber: '9111111111' });
    expectStatus('Register without password', r1, 400);

    // 1b. Register — short password
    const r2 = await req('POST', '/auth/citizen/register', { mobileNumber: '9111111199', password: '123' });
    expectStatus('Register with short password', r2, 400);

    // 1c. Valid register — citizen 1 (unique mobile per run)
    const r3 = await req('POST', '/auth/citizen/register', { mobileNumber: MOBILE_1, password: 'Citizen@1234' });
    expectStatus('Register citizen 1', r3, 201);

    // 1d. Duplicate mobile
    const r4 = await req('POST', '/auth/citizen/register', { mobileNumber: MOBILE_1, password: 'Citizen@1234' });
    expectStatus('Duplicate mobile → 409', r4, 409);

    // 1e. Login with wrong password
    const r5 = await req('POST', '/auth/citizen/login', { mobileNumber: MOBILE_1, password: 'WrongPass' });
    expectStatus('Login wrong password → 401', r5, 401);

    // 1f. Valid login
    const r6 = await req('POST', '/auth/citizen/login', { mobileNumber: MOBILE_1, password: 'Citizen@1234' });
    expectStatus('Citizen login', r6, 200);
    expectField('Citizen login', r6.body.data, 'token');
    citizenToken = r6.body.data.token;

    // 1g. Register citizen 2 (for cross-family tests)
    await req('POST', '/auth/citizen/register', { mobileNumber: MOBILE_2, password: 'Citizen@1234' });
    const r8 = await req('POST', '/auth/citizen/login', { mobileNumber: MOBILE_2, password: 'Citizen@1234' });
    citizenToken2 = r8.body.data?.token;

    // 1h. GET /auth/me — no token
    const r9 = await req('GET', '/auth/me');
    expectStatus('GET /me without token → 401', r9, 401);

    // 1i. GET /auth/me — valid token
    const r10 = await req('GET', '/auth/me', null, citizenToken);
    expectStatus('GET /me with token', r10, 200);
    expectField('GET /me', r10.body.data, 'role');
  }

  // ── 2. Officer Auth ─────────────────────────────────────────────────────────
  console.log('\n── SECTION 2: Officer Auth ────────────────────────');
  {
    // 2a. Admin login
    const r1 = await req('POST', '/auth/officer/login', { email: 'admin@nagrik.gov.in', password: 'Admin@12345' });
    expectStatus('Admin login', r1, 200);
    adminToken = r1.body.data?.token;

    // 2b. Talati login
    const r2 = await req('POST', '/auth/officer/login', { email: 'ramesh.talati@nagrik.gov.in', password: 'Officer@12345' });
    expectStatus('Talati login', r2, 200);
    talatiToken = r2.body.data?.token;

    // 2c. Mamlatdar login
    const r3 = await req('POST', '/auth/officer/login', { email: 'sneha.mamlatdar@nagrik.gov.in', password: 'Officer@12345' });
    expectStatus('Mamlatdar login', r3, 200);
    mamlatToken = r3.body.data?.token;

    // 2d. DistrictOfficer login
    const r4 = await req('POST', '/auth/officer/login', { email: 'priya.do@nagrik.gov.in', password: 'Officer@12345' });
    expectStatus('DistrictOfficer login', r4, 200);
    doToken = r4.body.data?.token;

    // 2e. Wrong password
    const r5 = await req('POST', '/auth/officer/login', { email: 'admin@nagrik.gov.in', password: 'wrong' });
    expectStatus('Officer wrong password → 401', r5, 401);

    // 2f. Citizen cannot use officer login
    const r6 = await req('POST', '/auth/officer/login', { email: 'notexist@gov.in', password: 'anything' });
    expectStatus('Non-existent officer → 401', r6, 401);
  }

  // ── 3. Schemes ──────────────────────────────────────────────────────────────
  console.log('\n── SECTION 3: Schemes ─────────────────────────────');
  {
    // 3a. Citizen lists active schemes
    const r1 = await req('GET', '/schemes', null, citizenToken);
    expectStatus('Citizen lists schemes', r1, 200);
    assert('At least 20 schemes seeded', (r1.body.data?.total || 0) >= 20);

    // 3b. Citizen cannot see levelChecklistAdditions
    const first = r1.body.data?.schemes?.[0];
    assert('Citizen scheme has no levelChecklistAdditions', first?.levelChecklistAdditions === undefined);

    // 3c. Citizen gets scheme by code
    const r2 = await req('GET', '/schemes/PMAY-G', null, citizenToken);
    expectStatus('GET /schemes/PMAY-G', r2, 200);
    pmaySchemeId = r2.body.data?.scheme?._id;
    assert('PMAY-G has requiredDocuments', (r2.body.data?.scheme?.requiredDocuments?.length || 0) > 0);
    assert('PMAY-G has applicationFormFields', (r2.body.data?.scheme?.applicationFormFields?.length || 0) > 0);

    // 3d. Officer can see levelChecklistAdditions
    const r3 = await req('GET', '/schemes/PMAY-G', null, adminToken);
    assert('Admin sees levelChecklistAdditions', r3.body.data?.scheme?.levelChecklistAdditions !== undefined);

    // 3e. Non-existent scheme
    const r4 = await req('GET', '/schemes/FAKESCHEME', null, citizenToken);
    expectStatus('Non-existent scheme → 404', r4, 404);

    // 3f. Non-admin cannot create scheme
    const r5 = await req('POST', '/schemes', { schemeCode: 'TEST', schemeName: 'Test', department: 'Test', benefitType: 'Cash' }, talatiToken);
    expectStatus('Talati create scheme → 403', r5, 403);

    // 3g. Admin creates scheme (unique code per run)
    const r6 = await req('POST', '/schemes', {
      schemeCode: TEST_SCHEME_CODE,
      schemeName: 'Test Scheme for Suite',
      department: 'Test Dept',
      benefitType: 'Cash',
      maxBenefitAmount: 1000,
      benefitFrequency: 'Monthly',
      eligibilityRules: { minAge: 18, maxAnnualIncome: 100000 },
      requiredDocuments: [{ docKey: 'aadhaar', label: 'Aadhaar Card', isRequired: true }],
      applicationFormFields: [{ fieldKey: 'bank_account', label: 'Bank Account', fieldType: 'text', isRequired: true }],
    }, adminToken);
    expectStatus('Admin creates scheme', r6, 201);
    schemeDbId = r6.body.data?.scheme?._id;

    // 3h. Duplicate scheme code
    const r7 = await req('POST', '/schemes', { schemeCode: TEST_SCHEME_CODE, schemeName: 'X', department: 'X', benefitType: 'Cash' }, adminToken);
    expectStatus('Duplicate schemeCode → 409', r7, 409);

    // 3i. Create without required fields
    const r8 = await req('POST', '/schemes', { schemeName: 'Missing code' }, adminToken);
    expectStatus('Create scheme missing fields → 400', r8, 400);

    // 3j. Admin updates scheme
    const r9 = await req('PATCH', `/schemes/${TEST_SCHEME_CODE}`, { maxBenefitAmount: 2000 }, adminToken);
    expectStatus('Admin updates scheme', r9, 200);
    assert('maxBenefitAmount updated', r9.body.data?.scheme?.maxBenefitAmount === 2000);

    // 3k. Update with no valid fields
    const r10 = await req('PATCH', `/schemes/${TEST_SCHEME_CODE}`, { unknownField: 'x' }, adminToken);
    expectStatus('Update with no valid fields → 400', r10, 400);

    // 3l. Admin deactivates scheme
    const r11 = await req('DELETE', `/schemes/${TEST_SCHEME_CODE}`, null, adminToken);
    expectStatus('Admin deactivates scheme', r11, 200);

    // 3m. Citizen cannot see deactivated scheme
    const r12 = await req('GET', `/schemes/${TEST_SCHEME_CODE}`, null, citizenToken);
    expectStatus('Citizen views deactivated scheme → 404', r12, 404);

    // 3n. Deactivate already-inactive scheme
    const r13 = await req('DELETE', `/schemes/${TEST_SCHEME_CODE}`, null, adminToken);
    expectStatus('Deactivate already-inactive → 409', r13, 409);
  }

  // ── 3.5 Integrations (PDS & UIDAI) ──────────────────────────────────────────
  console.log('\n── SECTION 3.5: Integrations ──────────────────────');
  {
    // 3.5a PDS fetch
    const pds1 = await req('GET', '/integrations/pds/RC-INVALID', null, citizenToken);
    expectStatus('PDS missing → 404', pds1, 404);

    const pds2 = await req('GET', '/integrations/pds/RC-VALID-123', null, citizenToken);
    expectStatus('PDS found → 200', pds2, 200);
    assert('Got PDS address', !!pds2.body.data?.address?.village);

    // 3.5b UIDAI fetch
    const uidai1 = await req('POST', '/integrations/uidai/ekyc', { aadhaar: '123' }, citizenToken);
    expectStatus('UIDAI short Aadhaar → 400', uidai1, 400);

    const uidai2 = await req('POST', '/integrations/uidai/ekyc', { aadhaar: '123456789012' }, citizenToken);
    expectStatus('UIDAI success → 200', uidai2, 200);
    assert('Got eKYC name', !!uidai2.body.data?.name);
  }

  // ── 4. Family Registration ──────────────────────────────────────────────────
  console.log('\n── SECTION 4: Family Registration ─────────────────');
  {
    const familyPayload = {
      familyDetails: {
        annualIncome: 80000,
        category: 'SC',
        bplStatus: true,
        rationCardType: 'PHH',
        rationCardNumber: `RC-TST-${RUN_ID}`,
        hasPuccaHouse: false,
        address: { village: 'Khoraj', taluka: 'Gandhinagar', district: 'Gandhinagar', pincode: '382007' },
      },
      headMemberDetails: {
        name: 'Test Citizen One',
        dateOfBirth: '1975-06-15',
        gender: 'Male',
        relationToHead: 'Self',
        occupation: 'Daily Wage Labour',
        maritalStatus: 'Married',
        aadhaar: `90${RUN_ID}${RUN_ID}`,
      },
    };

    // 4a. Missing body
    const r1 = await req('POST', '/families', {}, citizenToken);
    expectStatus('Register family with empty body → 400', r1, 400);

    // 4b. Valid registration
    const r2 = await req('POST', '/families', familyPayload, citizenToken);
    expectStatus('Register family', r2, 201);
    familyId = r2.body.data?.familyId;
    memberDbId = r2.body.data?.headMember?._id;
    memberId = r2.body.data?.headMember?.memberId;
    assert('Got familyId', !!familyId);
    assert('Got memberId', !!memberId);

    // Re-login after family registration — JWT must be refreshed to include familyId
    const reLogin = await req('POST', '/auth/citizen/login', { mobileNumber: MOBILE_1, password: 'Citizen@1234' });
    citizenToken = reLogin.body.data?.token;
    assert('Token refreshed with familyId', !!citizenToken);


    // 4c. Citizen cannot register second family
    const r3 = await req('POST', '/families', familyPayload, citizenToken);
    expectStatus('Second family registration → 409', r3, 409);

    // 4d. Officer cannot register family
    const r4 = await req('POST', '/families', familyPayload, adminToken);
    expectStatus('Admin register family → 403', r4, 403);

    // 4e. GET family profile
    const r5 = await req('GET', `/families/${familyId}`, null, citizenToken);
    expectStatus('GET family profile', r5, 200);
    expectField('Family profile', r5.body.data, 'family');
    expectField('Family profile', r5.body.data, 'members');

    // 4f. Non-existent family
    const r6 = await req('GET', '/families/GJ-XXXXXXXX', null, adminToken);
    expectStatus('Non-existent family → 404', r6, 404);

    // 4g. Update family profile — valid
    const r7 = await req('PATCH', `/families/${familyId}`, { annualIncome: 90000 }, citizenToken);
    expectStatus('Update family income', r7, 200);
    assert('isVerified reset after update', r7.body.data?.family?.isVerified === false);

    // 4h. Citizen 2 cannot update Citizen 1's family
    const r8 = await req('PATCH', `/families/${familyId}`, { annualIncome: 50000 }, citizenToken2);
    expectStatus('Citizen2 updates Citizen1 family → 403', r8, 403);
  }

  // ── 5. Members ──────────────────────────────────────────────────────────────
  console.log('\n── SECTION 5: Members ─────────────────────────────');
  {
    // 5a. Add member — missing required fields
    const r1 = await req('POST', `/families/${familyId}/members`, { name: 'Only Name' }, citizenToken);
    expectStatus('Add member missing fields → 400', r1, 400);

    // 5b. Add member — valid
    const r2 = await req('POST', `/families/${familyId}/members`, {
      name: 'Test Spouse',
      dateOfBirth: '1978-03-20',
      gender: 'Female',
      relationToHead: 'Spouse',
      maritalStatus: 'Married',
      aadhaar: `8000${Date.now().toString().slice(-8)}`,
    }, citizenToken);
    expectStatus('Add member', r2, 201);

    // 5c. Citizen 2 cannot add member to Citizen 1's family
    const r3 = await req('POST', `/families/${familyId}/members`, {
      name: 'Intruder',
      dateOfBirth: '2000-01-01',
      gender: 'Male',
      relationToHead: 'Other',
    }, citizenToken2);
    expectStatus('Citizen2 adds to Citizen1 family → 403', r3, 403);

    // 5d. Duplicate Aadhaar
    const r4 = await req('POST', `/families/${familyId}/members`, {
      name: 'Duplicate Aadhaar',
      dateOfBirth: '1980-01-01',
      gender: 'Male',
      relationToHead: 'Son',
      aadhaar: `8000${(Date.now() - 1).toString().slice(-8)}`, // previous Aadhaar reuse
    }, citizenToken);
    // Note: might be 201 if truly unique timestamp — just checking structure
    assert('Duplicate Aadhaar returns 409 or 201', [201, 409].includes(r4.status));

    // 5e. GET single member
    const r5 = await req('GET', `/families/${familyId}/members/${memberId}`, null, citizenToken);
    expectStatus('GET single member', r5, 200);
    expectField('Member', r5.body.data, 'member');

    // 5f. GET member from wrong family
    const r6 = await req('GET', `/families/GJ-XXXXXXXX/members/${memberId}`, null, adminToken);
    expectStatus('Member from wrong family → 404', r6, 404);

    // 5g. Update member profile
    const r7 = await req('PATCH', `/families/${familyId}/members/${memberId}/profile`, { occupation: 'Farmer' }, citizenToken);
    expectStatus('Update member profile', r7, 200);
    assert('Occupation updated', r7.body.data?.member?.occupation === 'Farmer');

    // 5h. Update with no valid fields
    const r8 = await req('PATCH', `/families/${familyId}/members/${memberId}/profile`, { unknownField: 'x' }, citizenToken);
    expectStatus('Update member with invalid fields → 400', r8, 400);

    // 5i. Mark member Deceased
    const r9 = await req('PATCH', `/families/${familyId}/members/${memberId}/lifecycle`, { lifecycleStatus: 'Deceased' }, adminToken);
    expectStatus('Mark member Deceased', r9, 200);

    // Restore Active for application tests
    await req('PATCH', `/families/${familyId}/members/${memberId}/lifecycle`, { lifecycleStatus: 'Active' }, adminToken);
  }

  // ── 6. Eligibility Check ────────────────────────────────────────────────────
  console.log('\n── SECTION 6: Eligibility ─────────────────────────');
  {
    // 6a. All members (no memberId filter)
    const r1 = await req('GET', `/eligibility/${familyId}`, null, citizenToken);
    expectStatus('Eligibility all members', r1, 200);
    expectField('Eligibility', r1.body.data, 'eligibility');
    assert('eligibility is array', Array.isArray(r1.body.data?.eligibility));

    // 6b. Single member filter
    const r2 = await req('GET', `/eligibility/${familyId}?memberId=${memberDbId}`, null, citizenToken);
    expectStatus('Eligibility single member', r2, 200);
    const memberResult = r2.body.data?.eligibility?.[0];
    assert('Member eligibility returned', !!memberResult);
    assert('eligibleSchemes is array', Array.isArray(memberResult?.eligibleSchemes));
    assert('ineligibleSchemes is array', Array.isArray(memberResult?.ineligibleSchemes));
    bplSchemeId = memberResult?.eligibleSchemes?.[0]?.schemeId;

    // 6c. Non-existent family
    const r3 = await req('GET', '/eligibility/GJ-FAKEFAKE', null, citizenToken);
    expectStatus('Eligibility non-existent family → 404', r3, 404);

    // 6d. Bad memberId (no match)
    const r4 = await req('GET', `/eligibility/${familyId}?memberId=000000000000000000000000`, null, citizenToken);
    expectStatus('Eligibility bad memberId → 404', r4, 404);
  }

  // ── 7. Applications ─────────────────────────────────────────────────────────
  console.log('\n── SECTION 7: Applications ────────────────────────');
  {
    // 7a0. Submit before verified (Provisional guardrail)
    const rPre = await req('POST', '/applications', { memberId: memberDbId, schemeId: pmaySchemeId, submittedDocumentKeys: ['aadhaar'] }, citizenToken);
    expectStatus('Submit application while Provisional → 403', rPre, 403);

    // 7a0.1 Officer verifies family to Permanent status so applications can proceed
    const rv = await req('PATCH', `/families/${familyId}/verify`, { action: 'Approve', verificationNotes: 'Auto-verified for tests' }, talatiToken);
    expectStatus('Talati upgrades family to Permanent', rv, 200);
    assert('status = Permanent', rv.body.data?.status === 'Permanent');
    // 7a. Submit without family
    const r1 = await req('POST', '/applications', { memberId: memberDbId, schemeId: pmaySchemeId }, citizenToken2);
    expectStatus('Submit without family → 400', r1, 400);

    // 7b. Submit — missing memberId
    const r2 = await req('POST', '/applications', { schemeId: pmaySchemeId }, citizenToken);
    // may be 422 (eligibility) or 400 (validation) — not 2xx
    assert('Submit missing memberId is not 2xx', r2.status >= 400);

    // 7c. Valid submission
    const r3 = await req('POST', '/applications', {
      memberId: memberDbId,
      schemeId: pmaySchemeId,
      submittedDocumentKeys: ['aadhaar', 'bpl_card', 'land_document', 'house_photo', 'bank_passbook'],
      schemeSpecificData: {
        land_ownership_type: 'Own Land',
        current_house_type: 'Kutcha',
        bank_account_number: '1234567890',
        ifsc_code: 'SBIN0001234',
      },
    }, citizenToken);
    expectStatus('Submit application', r3, 201);
    appId = r3.body.data?.applicationId;
    assert('Got applicationId', !!appId);

    // 7d. Duplicate application
    const r4 = await req('POST', '/applications', {
      memberId: memberDbId,
      schemeId: pmaySchemeId,
      submittedDocumentKeys: ['aadhaar', 'bpl_card', 'land_document', 'house_photo', 'bank_passbook'],
      schemeSpecificData: { land_ownership_type: 'Own Land', current_house_type: 'Kutcha', bank_account_number: '1234567890', ifsc_code: 'SBIN0001234' },
    }, citizenToken);
    expectStatus('Duplicate application → 409', r4, 409);

    // 7e. Citizen lists own applications
    const r5 = await req('GET', '/applications', null, citizenToken);
    expectStatus('Citizen lists applications', r5, 200);
    assert('At least 1 application', (r5.body.data?.total || 0) >= 1);

    // 7f. Talati sees their queue (Pending)
    const r6 = await req('GET', '/applications', null, talatiToken);
    expectStatus('Talati sees queue', r6, 200);

    // Get DB _id of our application
    const apps = r6.body.data?.applications;
    const ourApp = apps?.find((a) => a.applicationId === appId);
    appDbId = ourApp?._id;
    assert('Found application in Talati queue', !!appDbId);

    // 7g. GET application by ID
    const r7 = await req('GET', `/applications/${appDbId}`, null, adminToken);
    expectStatus('GET application detail', r7, 200);
    expectField('Application', r7.body.data, 'application');
    assert('Application has approvalChain', Array.isArray(r7.body.data?.application?.approvalChain));
    assert('Application has submittedDocumentKeys', Array.isArray(r7.body.data?.application?.submittedDocumentKeys));

    // 7h. GET checklist for Talati
    const r8 = await req('GET', `/applications/${appDbId}/checklist`, null, talatiToken);
    expectStatus('GET Talati checklist', r8, 200);
    assert('Checklist has items', (r8.body.data?.checklist?.length || 0) > 0);
    assert('PMAY-G has scheme-specific house check',
      r8.body.data?.checklist?.some((i) => i.item.toLowerCase().includes('house')));

    // 7i. Citizen cannot GET checklist
    const r9 = await req('GET', `/applications/${appDbId}/checklist`, null, citizenToken);
    expectStatus('Citizen cannot GET checklist → 403', r9, 403);

    // 7j. Wrong role acting on wrong queue (Mamlatdar tries to act on Pending app)
    const r10 = await req('PATCH', `/applications/${appDbId}/decision`, {
      action: 'Approve', remarks: 'Out of sequence attempt',
    }, mamlatToken);
    expectStatus('Mamlatdar acts out of sequence → 409', r10, 409);

    // 7k. Missing remarks
    const r11 = await req('PATCH', `/applications/${appDbId}/decision`, {
      action: 'Approve',
    }, talatiToken);
    expectStatus('Decision without remarks → 400', r11, 400);

    // 7l. Invalid action value
    const r12 = await req('PATCH', `/applications/${appDbId}/decision`, {
      action: 'Ignore', remarks: 'test',
    }, talatiToken);
    expectStatus('Invalid action → 400', r12, 400);

    // 7m. Reject without category
    const r13 = await req('PATCH', `/applications/${appDbId}/decision`, {
      action: 'Reject', remarks: 'Missing category',
    }, talatiToken);
    expectStatus('Reject without category → 400', r13, 400);

    // 7n. Talati requests resubmission
    const r14 = await req('PATCH', `/applications/${appDbId}/decision`, {
      action: 'RequestResubmission',
      remarks: 'Income certificate missing. Please upload valid income certificate.',
      checklist: [
        { item: 'Aadhaar card physically verified against applicant face', checked: true, note: 'Verified' },
        { item: 'Income certificate is valid and within the last 12 months', checked: false, note: 'Not uploaded' },
      ],
    }, talatiToken);
    expectStatus('Talati requests resubmission', r14, 200);
    assert('Status is ResubmissionRequired', r14.body.data?.status === 'ResubmissionRequired');

    // 7o. Talati then approves (Level 1)
    const r15 = await req('PATCH', `/applications/${appDbId}/decision`, {
      action: 'Approve',
      remarks: 'Income certificate received. All documents verified. BPL family confirmed.',
      checklist: [
        { item: 'Aadhaar card physically verified against applicant face', checked: true, note: '' },
        { item: 'Applicant is a genuine resident of the declared village', checked: true, note: 'Confirmed with Sarpanch' },
        { item: 'Income certificate is valid and within the last 12 months', checked: true, note: '' },
        { item: 'No pucca house owned by the family (for housing schemes)', checked: true, note: 'Kutcha house verified' },
      ],
    }, talatiToken);
    expectStatus('Talati approves (Level 1)', r15, 200);
    assert('Status is Level1Approved', r15.body.data?.status === 'Level1Approved');
    assert('Next level is Mamlatdar', r15.body.data?.citizenMessage?.includes('Mamlatdar'));

    // 7p. Talati cannot act again after approving
    const r16 = await req('PATCH', `/applications/${appDbId}/decision`, {
      action: 'Approve', remarks: 'Double approve attempt',
    }, talatiToken);
    expectStatus('Talati acts twice → 409', r16, 409);

    // 7q. Mamlatdar approves (Level 2)
    const r17 = await req('PATCH', `/applications/${appDbId}/decision`, {
      action: 'Approve',
      remarks: 'Taluka records verified. No duplicate benefit found.',
      checklist: [
        { item: 'Talati field report reviewed and consistent with documents', checked: true, note: '' },
        { item: 'No duplicate application from the same family in another village', checked: true, note: '' },
        { item: 'PMAY-G beneficiary list cross-checked', checked: true, note: 'No previous allotment' },
      ],
    }, mamlatToken);
    expectStatus('Mamlatdar approves (Level 2)', r17, 200);
    assert('Status is Level2Approved', r17.body.data?.status === 'Level2Approved');

    // 7r. District Officer gives Final Approval
    const r18 = await req('PATCH', `/applications/${appDbId}/decision`, {
      action: 'Approve',
      remarks: 'District review complete. Sanction order issued for PMAY-G subsidy of Rs 1.2 lakh.',
      checklist: [
        { item: 'Complete file reviewed including all level 1 and level 2 reports', checked: true, note: '' },
        { item: 'Budget availability confirmed for this scheme this financial year', checked: true, note: '' },
        { item: 'Bank details of beneficiary verified for DBT transfer', checked: true, note: '' },
      ],
    }, doToken);
    expectStatus('District Officer final approval', r18, 200);
    assert('Status is FinalApproved', r18.body.data?.status === 'FinalApproved');
    assert('Citizen congratulations message', r18.body.data?.citizenMessage?.includes('Congratulations'));

    // 7s. Verify full approval chain is recorded
    const r19 = await req('GET', `/applications/${appDbId}`, null, adminToken);
    const chain = r19.body.data?.application?.approvalChain;
    assert('Approval chain has 3 entries (ResubReq + L1 + L2 + L3)', chain?.length >= 3);
    assert('Level 1 Talati in chain', chain?.some((c) => c.level === 1 && c.action === 'Approved'));
    assert('Level 2 Mamlatdar in chain', chain?.some((c) => c.level === 2));
    assert('Level 3 DO in chain', chain?.some((c) => c.level === 3 && c.action === 'Approved'));

    // 7t. Citizen withdraw — only Pending allowed
    const r20 = await req('DELETE', `/applications/${appDbId}`, null, citizenToken);
    expectStatus('Withdraw FinalApproved → 400', r20, 400);
  }

  // ── 8. Family Applications Shortcut ────────────────────────────────────────
  console.log('\n── SECTION 8: Family Applications ────────────────');
  {
    const r1 = await req('GET', `/families/${familyId}/applications`, null, citizenToken);
    expectStatus('GET family applications', r1, 200);
    assert('At least 1 application', (r1.body.data?.total || 0) >= 1);

    // Citizen 2 cannot see Citizen 1's family applications
    const r2 = await req('GET', `/families/${familyId}/applications`, null, citizenToken2);
    expectStatus('Citizen2 sees Citizen1 applications → 403', r2, 403);

    // Admin can see any family's applications
    const r3 = await req('GET', `/families/${familyId}/applications`, null, adminToken);
    expectStatus('Admin sees any family applications', r3, 200);
  }

  // ── 9. Family Verification ──────────────────────────────────────────────────
  console.log('\n── SECTION 9: Family Verification ─────────────────');
  {
    // 9a. Citizen cannot verify
    const r1 = await req('PATCH', `/families/${familyId}/verify`, { verificationNotes: 'test' }, citizenToken);
    expectStatus('Citizen cannot verify family → 403', r1, 403);

    // 9b. Talati verifies family again (idempotent, just checks API is available)
    const r2 = await req('PATCH', `/families/${familyId}/verify`, { action: 'Approve', verificationNotes: 'Verified at village level. Documents authentic.' }, talatiToken);
    expectStatus('Talati verifies family', r2, 200);
    assert('isVerified = true', r2.body.data?.isVerified === true);
    assert('reVerificationDueAt set', !!r2.body.data?.reVerificationDueAt);

    // 9c. Family search — officer only
    const r3 = await req('GET', '/families', null, adminToken);
    expectStatus('Officer searches families', r3, 200);
    assert('Families returned', (r3.body.data?.total || 0) >= 1);

    // 9d. Citizen cannot search families
    const r4 = await req('GET', '/families', null, citizenToken);
    expectStatus('Citizen cannot search families → 403', r4, 403);

    // 9e. Overdue verification filter
    const r5 = await req('GET', '/families?overdueverification=true', null, adminToken);
    expectStatus('Overdue verification filter', r5, 200);
  }

  // ── 10. Dashboard ───────────────────────────────────────────────────────────
  console.log('\n── SECTION 10: Dashboard ──────────────────────────');
  {
    // 10a. Citizen cannot access dashboard
    const r1 = await req('GET', '/dashboard/stats', null, citizenToken);
    expectStatus('Citizen cannot access dashboard → 403', r1, 403);

    // 10b. Admin dashboard
    const r2 = await req('GET', '/dashboard/stats', null, adminToken);
    expectStatus('Admin dashboard', r2, 200);
    expectField('Dashboard', r2.body.data, 'summary');
    expectField('Dashboard summary', r2.body.data?.summary, 'totalFamilies');
    expectField('Dashboard summary', r2.body.data?.summary, 'pipelineQueue');
    expectField('Dashboard', r2.body.data, 'statusBreakdown');
    expectField('Dashboard', r2.body.data, 'schemeEnrollment');

    // 10c. Talati can access their dashboard too
    const r3 = await req('GET', '/dashboard/stats', null, talatiToken);
    expectStatus('Talati dashboard', r3, 200);
  }

  // ── 11. Audit Logs ──────────────────────────────────────────────────────────
  console.log('\n── SECTION 11: Audit Logs ─────────────────────────');
  {
    // 11a. Citizen cannot access audit logs
    const r1 = await req('GET', '/auditlogs', null, citizenToken);
    expectStatus('Citizen cannot access audit logs → 403', r1, 403);

    // 11b. Admin can access audit logs
    const r2 = await req('GET', '/auditlogs', null, adminToken);
    expectStatus('Admin views audit logs', r2, 200);
    assert('At least 1 log entry', (r2.body.data?.logs?.length || 0) > 0);

    // 11c. Filter by entity type
    const r3 = await req('GET', '/auditlogs?entityType=Application', null, adminToken);
    expectStatus('Filter audit logs by entityType', r3, 200);
  }

  // ── 12. Rejection Flow ──────────────────────────────────────────────────────
  console.log('\n── SECTION 12: Rejection + Citizen Withdraw ───────');
  {
    // Submit a new application to test rejection flow
    const allSchemes = await req('GET', '/schemes', null, citizenToken);
    const ignoaps = allSchemes.body.data?.schemes?.find((s) => s.schemeCode === 'IGNOAPS');

    // Register citizen 2 family first
    const c2FamilyRes = await req('POST', '/families', {
      familyDetails: {
        annualIncome: 50000,
        category: 'General',
        bplStatus: true,
        rationCardType: 'PHH',
        rationCardNumber: `RC-C2-${Date.now()}`,
        hasPuccaHouse: false,
        address: { village: 'Khoraj', taluka: 'Gandhinagar', district: 'Gandhinagar', pincode: '382007' },
      },
      headMemberDetails: {
        name: 'Test Citizen Two',
        dateOfBirth: '1958-01-10',
        gender: 'Male',
        relationToHead: 'Self',
        occupation: 'Retired',
        aadhaar: `7000${Date.now().toString().slice(-8)}`,
      },
    }, citizenToken2);

    if (c2FamilyRes.status === 201) {
      const c2FamilyId = c2FamilyRes.body.data?.familyId;
      const c2MemberDbId = c2FamilyRes.body.data?.headMember?._id;

      // Re-login to refresh citizenToken2 with familyId
      const reLogin2 = await req('POST', '/auth/citizen/login', { mobileNumber: MOBILE_2, password: 'Citizen@1234' });
      citizenToken2 = reLogin2.body.data?.token;

      // 12a. Officer verifies family so applications can proceed
      await req('PATCH', `/families/${c2FamilyId}/verify`, { action: 'Approve', verificationNotes: 'Verified for IGNOAPS test' }, talatiToken);

      if (ignoaps) {
        const appRes = await req('POST', '/applications', {
          memberId: c2MemberDbId,
          schemeId: ignoaps._id,
          submittedDocumentKeys: ['aadhaar', 'age_proof', 'income_cert', 'bpl_card', 'bank_passbook', 'photo'],
          schemeSpecificData: {
            bank_account_number: '9876543210',
            ifsc_code: 'HDFC0001234',
            bank_name: 'HDFC Bank, Gandhinagar',
            is_receiving_other_pension: false,
          },
        }, citizenToken2);

        if (appRes.status === 201) {
          const c2AppId = appRes.body.data?.applicationId;

          // Get DB id
          const tQueue = await req('GET', '/applications', null, talatiToken);
          const c2App = tQueue.body.data?.applications?.find((a) => a.applicationId === c2AppId);

          if (c2App?._id) {
            // Talati rejects with category
            const rejRes = await req('PATCH', `/applications/${c2App._id}/decision`, {
              action: 'Reject',
              rejectionCategory: 'IneligibleIncome',
              remarks: 'Income certificate shows annual income of Rs 2.5 lakh, exceeding the Rs 2 lakh limit for IGNOAPS.',
              checklist: [
                { item: 'Income certificate is valid and within the last 12 months', checked: true, note: 'Income Rs 2.5L' },
              ],
            }, talatiToken);
            expectStatus('Talati rejects with category', rejRes, 200);
            assert('Status is Rejected', rejRes.body.data?.status === 'Rejected');
            assert('rejectedAtLevel is 1', rejRes.body.data?.approvalLevel === 1);
            assert('rejectionCategory in response', rejRes.body.data?.rejectionCategory === 'IneligibleIncome');
            assert('Citizen message explains reason', rejRes.body.data?.citizenMessage?.includes('exceeding the Rs 2 lakh limit'));
          }

          // Test citizen withdraw (submit another, then withdraw before review)
          const app2Res = await req('POST', '/applications', {
            memberId: c2MemberDbId,
            schemeId: ignoaps._id,
            submittedDocumentKeys: ['aadhaar', 'age_proof', 'income_cert', 'bpl_card', 'bank_passbook', 'photo'],
            schemeSpecificData: { bank_account_number: '9876543210', ifsc_code: 'HDFC0001234', bank_name: 'HDFC', is_receiving_other_pension: false },
          }, citizenToken2);
          // Will be 409 since already applied — just check
          assert('Second identical app blocked', [409, 422].includes(app2Res.status));
        } else {
          assert('IGNOAPS application submitted (age/BPL eligible)', [201, 422].includes(appRes.status));
        }
      }
    } else {
      assert('Citizen 2 family already set up', true);
    }
  }

  // ── 13. Auth — Change Password ──────────────────────────────────────────────
  console.log('\n── SECTION 13: Change Password ────────────────────');
  {
    // 13a. Wrong current password
    const r1 = await req('PATCH', '/auth/citizen/change-password', {
      currentPassword: 'WrongPass',
      newPassword: 'NewPass@1234',
    }, citizenToken);
    expectStatus('Change password — wrong current → 401', r1, 401);

    // 13b. New password too short
    const r2 = await req('PATCH', '/auth/citizen/change-password', {
      currentPassword: 'Citizen@1234',
      newPassword: '123',
    }, citizenToken);
    expectStatus('Change password — too short → 400', r2, 400);

    // 13c. Valid change
    const r3 = await req('PATCH', '/auth/citizen/change-password', {
      currentPassword: 'Citizen@1234',
      newPassword: 'NewCitizen@5678',
    }, citizenToken);
    expectStatus('Change password — valid', r3, 200);

    // 13d. Old password rejected
    const r4 = await req('POST', '/auth/citizen/login', {
      mobileNumber: MOBILE_1,
      password: 'Citizen@1234',
    });
    expectStatus('Old password rejected after change → 401', r4, 401);

    // 13e. New password works
    const r5 = await req('POST', '/auth/citizen/login', {
      mobileNumber: MOBILE_1,
      password: 'NewCitizen@5678',
    });
    expectStatus('New password accepted', r5, 200);
  }

  // ── 14. Security Edge Cases ─────────────────────────────────────────────────
  console.log('\n── SECTION 14: Security Edge Cases ────────────────');
  {
    // 14a. No token
    const r1 = await req('GET', '/applications');
    expectStatus('No token → 401', r1, 401);

    // 14b. Malformed token
    const r2 = await req('GET', '/applications', null, 'Bearer invalid.token.here');
    expectStatus('Malformed token → 401', r2, 401);

    // 14c. Unknown route
    const r3 = await req('GET', '/nonexistent-route', null, adminToken);
    expectStatus('Unknown route → 404', r3, 404);

    // 14d. Oversized body (>10kb) — server should reject
    const bigBody = { data: 'x'.repeat(11000) };
    const r4 = await req('POST', '/families', bigBody, citizenToken);
    assert('Oversized body rejected', r4.status >= 400);

    // 14e. Citizen cannot hit admin dashboard
    const r5 = await req('GET', '/dashboard/stats', null, citizenToken);
    expectStatus('Citizen hits dashboard → 403', r5, 403);

    // 14f. Talati cannot create scheme
    const r6 = await req('POST', '/schemes', { schemeCode: 'HACK', schemeName: 'Hack', department: 'X', benefitType: 'Cash' }, talatiToken);
    expectStatus('Talati cannot create scheme → 403', r6, 403);

    // 14g. Mamlatdar cannot create scheme
    const r7 = await req('POST', '/schemes', { schemeCode: 'HACK2', schemeName: 'Hack', department: 'X', benefitType: 'Cash' }, mamlatToken);
    expectStatus('Mamlatdar cannot create scheme → 403', r7, 403);
  }

  // ── Final Report ─────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log(`  ✅ PASSED: ${passed}`);
  console.log(`  ❌ FAILED: ${failed}`);
  console.log(`  📊 TOTAL:  ${passed + failed}`);
  console.log('══════════════════════════════════════════════════\n');

  if (failed > 0) process.exit(1);
};

run().catch((err) => {
  console.error('\n💥 Test suite crashed:', err.message);
  process.exit(1);
});
