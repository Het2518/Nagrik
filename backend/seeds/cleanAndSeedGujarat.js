'use strict';

/**
 * Nagrik V2 — Clean Database & Rich Gujarat Seed Data Expansion
 *
 * 1. Completely cleans all collections in the database.
 * 2. Seeds authoritative Gujarat Government welfare schemes.
 * 3. Seeds 3-tier officer administrative hierarchy (Talati -> Mamlatdar -> District Officer -> Admin).
 * 4. Seeds 3 realistic Gujarat demo households with rich beneficiary profiles:
 *    - Family 1 (Ramesh Patel): 4 members, active PHH ration, pending resubmission application, senior life event.
 *    - Family 2 (Savitaben Vankar): Vulnerable widow household, active AAY, widow pension under Level 2 review.
 *    - Family 3 (Haresh Prajapati): Cross-family certificate collision generating a non-accusatory risk signal.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Models
const Scheme = require('../src/models/Scheme');
const Officer = require('../src/models/Officer');
const CitizenUser = require('../src/models/CitizenUser');
const Family = require('../src/models/Family');
const Member = require('../src/models/Member');
const Application = require('../src/models/Application');
const DocumentReference = require('../src/models/DocumentReference');
const LifeEvent = require('../src/models/LifeEvent');
const BenefitEntitlement = require('../src/models/BenefitEntitlement');
const BenefitAssessment = require('../src/models/BenefitAssessment');
const OfficerTask = require('../src/models/OfficerTask');
const Notification = require('../src/models/Notification');
const RiskSignal = require('../src/models/RiskSignal');
const AuditLog = require('../src/models/AuditLog');

const SCHEMES = require('./schemes');

async function cleanAndSeedGujarat() {
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB Atlas');

  // ── 1. CLEAN ALL COLLECTIONS ──────────────────────────────────────────────
  console.log('\n🧹 Cleaning database collections...');
  await Promise.all([
    CitizenUser.deleteMany({}),
    Family.deleteMany({}),
    Member.deleteMany({}),
    Application.deleteMany({}),
    DocumentReference.deleteMany({}),
    LifeEvent.deleteMany({}),
    BenefitEntitlement.deleteMany({}),
    BenefitAssessment.deleteMany({}),
    OfficerTask.deleteMany({}),
    Notification.deleteMany({}),
    RiskSignal.deleteMany({}),
    AuditLog.deleteMany({}),
    Officer.deleteMany({}),
  ]);
  console.log('✅ Database is completely clean (all old test records wiped)');

  // ── 2. SEED SCHEMES ───────────────────────────────────────────────────────
  console.log('\n📜 Seeding 20 Gujarat State & Central Welfare Schemes...');
  for (const scheme of SCHEMES) {
    await Scheme.findOneAndUpdate(
      { schemeCode: scheme.schemeCode },
      scheme,
      { upsert: true, returnDocument: 'after' }
    );
  }
  console.log(`✅ ${SCHEMES.length} schemes successfully seeded`);

  // ── 3. SEED OFFICERS (3-TIER PIPELINE) ────────────────────────────────────
  console.log('\n👮 Seeding 3-Tier Gujarat Administrative Officer Hierarchy...');

  const passwordStandard = await bcrypt.hash('Password123!', 10);
  const passwordAlt = await bcrypt.hash('Officer@12345', 10);
  const adminPassword = await bcrypt.hash('Admin@12345', 10);

  const officers = [
    // Level 1: Talati (Village Clerk) — Khoraj Village, Gandhinagar Taluka, Gandhinagar District
    {
      officerId: 'TAL-001',
      name: 'Ramesh Patel',
      email: 'ramesh.talati@nagrik.gov.in',
      passwordHash: 'Officer@12345',
      role: 'Talati',
      jurisdiction: { village: 'Khoraj', taluka: 'Gandhinagar', district: 'Gandhinagar' },
    },
    {
      officerId: 'TAL-002',
      name: 'Meena Chauhan',
      email: 'meena.talati@nagrik.gov.in',
      passwordHash: 'Officer@12345',
      role: 'Talati',
      jurisdiction: { village: 'Pethapur', taluka: 'Gandhinagar', district: 'Gandhinagar' },
    },

    // Level 2: Mamlatdar (Taluka Executive Magistrate) — Gandhinagar Taluka, Gandhinagar District
    {
      officerId: 'MAM-001',
      name: 'Sneha Shah',
      email: 'sneha.mamlatdar@nagrik.gov.in',
      passwordHash: 'Officer@12345',
      role: 'Mamlatdar',
      jurisdiction: { taluka: 'Gandhinagar', district: 'Gandhinagar' },
    },
    {
      officerId: 'MAM-002',
      name: 'Harish Desai',
      email: 'harish.mamlatdar@nagrik.gov.in',
      passwordHash: 'Officer@12345',
      role: 'Mamlatdar',
      jurisdiction: { taluka: 'Mansa', district: 'Gandhinagar' },
    },

    // Level 3: District Officer (Social Justice & Welfare) — Gandhinagar District
    {
      officerId: 'DST-001',
      name: 'Priya Mehta',
      email: 'priya.do@nagrik.gov.in',
      passwordHash: 'Officer@12345',
      role: 'DistrictOfficer',
      jurisdiction: { district: 'Gandhinagar' },
    },
    {
      officerId: 'DO-001', // alias for tests
      name: 'Priya Mehta',
      email: 'priya.do.alias@nagrik.gov.in',
      passwordHash: 'Officer@12345',
      role: 'DistrictOfficer',
      jurisdiction: { district: 'Gandhinagar' },
    },

    // Level 4: System Super Admin
    {
      officerId: 'ADM-001',
      name: 'Nagrik Gujarat Administrator',
      email: 'admin@nagrik.gov.in',
      passwordHash: 'Admin@12345',
      role: 'Admin',
      jurisdiction: { district: 'All' },
    },
    {
      officerId: 'ADMIN-001', // alias for tests
      name: 'Nagrik Gujarat Administrator Alias',
      email: 'admin.alias@nagrik.gov.in',
      passwordHash: 'Admin@12345',
      role: 'Admin',
      jurisdiction: { district: 'All' },
    },
  ];

  for (const off of officers) {
    const doc = new Officer(off);
    await doc.save();
  }
  console.log(`✅ ${officers.length} administrative officers created across village, taluka, and district tiers`);

  // Lookup schemes needed for demo applications and active benefits
  const [pmayScheme, aayScheme, phhScheme, maaScheme, preMatricScheme, ignoapsScheme, gangaSwarupaScheme] = await Promise.all([
    Scheme.findOne({ schemeCode: 'PMAY-G' }),
    Scheme.findOne({ schemeCode: 'AAY-RATION' }),
    Scheme.findOne({ schemeCode: 'NFSA-PHH' }),
    Scheme.findOne({ schemeCode: 'MAA-VAT' }),
    Scheme.findOne({ schemeCode: 'PRE-MAT-SC' }),
    Scheme.findOne({ schemeCode: 'IGNOAPS' }),
    Scheme.findOne({ schemeCode: 'GANGA-SWARUPA' }),
  ]);

  const talatiOfficer = await Officer.findOne({ officerId: 'TAL-001' });
  const mamlatdarOfficer = await Officer.findOne({ officerId: 'MAM-001' });

  // ── 4. SEED DEMO HOUSEHOLD 1: RAMESH PATEL (MAIN DEMO) ────────────────────
  console.log('\n🏡 Seeding Household 1: Ramesh Patel Family (GJ-GND-2024-001)...');

  const citizenUser1 = await CitizenUser.create({
    mobileNumber: '9876543210',
    passwordHash: 'Password123!',
    fullName: 'Ramesh Somabhai Patel',
  });

  const family1 = await Family.create({
    familyId: 'GJ-GND-2024-001',
    status: 'Permanent',
    isVerified: true,
    annualIncome: 72000,
    category: 'OBC',
    isBPL: true,
    rationCardType: 'PHH',
    rationCardNumber: 'RC-GJ-GND-78901',
    hasPuccaHouse: false,
    address: {
      village: 'Khoraj',
      taluka: 'Gandhinagar',
      district: 'Gandhinagar',
      pincode: '382421',
    },
    createdByUserId: citizenUser1._id,
    lastVerifiedAt: new Date(Date.now() - 15 * 86400000),
    reVerificationDueAt: new Date(Date.now() + 165 * 86400000),
    verificationNotes: 'Physical field inspection verified by Talati Ramesh Patel. All documents genuine.',
  });

  citizenUser1.familyId = family1._id;
  await citizenUser1.save();

  // Members for Family 1
  const m1_head = await Member.create({
    memberId: 'MEM-GND-001-01',
    familyId: family1._id,
    name: 'Ramesh Somabhai Patel',
    dateOfBirth: new Date('1978-05-12'),
    gender: 'Male',
    relationToHead: 'Self',
    maritalStatus: 'Married',
    occupation: 'Marginal Farmer',
    mobileNumber: '9876543210',
    lifecycleStatus: 'Active',
    aadhaarEncrypted: '880011223344',
    aadhaarHash: '880011223344',
  });

  const m1_wife = await Member.create({
    memberId: 'MEM-GND-001-02',
    familyId: family1._id,
    name: 'Geeta Rameshbhai Patel',
    dateOfBirth: new Date('1982-08-20'),
    gender: 'Female',
    relationToHead: 'Spouse',
    maritalStatus: 'Married',
    occupation: 'Homemaker',
    mobileNumber: '9876543213',
    lifecycleStatus: 'Active',
    aadhaarEncrypted: '880011223345',
    aadhaarHash: '880011223345',
  });

  const m1_daughter = await Member.create({
    memberId: 'MEM-GND-001-03',
    familyId: family1._id,
    name: 'Hetal Rameshbhai Patel',
    dateOfBirth: new Date('2007-09-14'), // Age 17, 12th standard student
    gender: 'Female',
    relationToHead: 'Daughter',
    maritalStatus: 'Single',
    isStudent: true,
    educationLevel: '12th Grade',
    occupation: 'Student',
    lifecycleStatus: 'Active',
    aadhaarEncrypted: '880011223346',
    aadhaarHash: '880011223346',
  });

  const m1_mother = await Member.create({
    memberId: 'MEM-GND-001-04',
    familyId: family1._id,
    name: 'Kankuben Somabhai Patel',
    dateOfBirth: new Date('1956-03-10'), // Age 68, Senior citizen
    gender: 'Female',
    relationToHead: 'Parent',
    maritalStatus: 'Widow',
    occupation: 'Senior Citizen',
    lifecycleStatus: 'Active',
    aadhaarEncrypted: '880011223347',
    aadhaarHash: '880011223347',
  });

  // Reusable Documents for Family 1
  const docIncome1 = await DocumentReference.create({
    certificateNumber: 'INC-2024-GND-00891',
    certificateType: 'Income',
    issuingAuthority: 'Taluka Seva Sadan Gandhinagar',
    issueDate: new Date('2024-04-10'),
    expiryDate: new Date('2025-03-31'),
    isVerifiedByOfficer: true,
    linkedFamilyIds: [family1._id],
  });

  const docCaste1 = await DocumentReference.create({
    certificateNumber: 'CST-2024-GND-00412',
    certificateType: 'Caste',
    issuingAuthority: 'Mamlatdar Office Gandhinagar',
    issueDate: new Date('2022-01-15'),
    isVerifiedByOfficer: true,
    linkedFamilyIds: [family1._id],
  });

  // Active Benefit for Family 1: Food Subsidy (PHH Ration)
  if (phhScheme) {
    await BenefitEntitlement.create({
      familyId: family1._id,
      memberId: m1_head._id,
      schemeId: phhScheme._id,
      schemeCode: phhScheme.schemeCode,
      schemeName: phhScheme.name,
      lifecycleState: 'Active',
      benefitType: 'InKind',
      disbursementFrequency: 'Monthly',
      sanctionedAmount: 850,
      startDate: new Date('2024-01-01'),
      statusHistory: [
        {
          state: 'Active',
          transitionedBy: 'Talati Ramesh Patel',
          reason: 'PHH ration entitlement sanctioned upon family verification',
          timestamp: new Date('2024-01-01'),
        },
      ],
    });
  }

  // Application in ResubmissionRequired for Family 1 (Ready to demo Problem D!)
  if (preMatricScheme) {
    await Application.create({
      applicationId: 'APP-RESUB-DEMO',
      familyId: family1._id,
      memberId: m1_daughter._id,
      schemeId: preMatricScheme._id,
      status: 'ResubmissionRequired',
      currentPipelineLevel: 1,
      riskFlag: 'Low',
      submittedDocumentKeys: ['income_certificate', 'caste_certificate'],
      submittedDocuments: [
        {
          docKey: 'income_certificate',
          url: 'https://res.cloudinary.com/demo/image/upload/sample_blurry.pdf',
          publicId: 'sample_blurry_income',
          originalName: 'income_cert_blurry.pdf',
          format: 'pdf',
          sizeBytes: 84200,
        },
        {
          docKey: 'caste_certificate',
          url: 'https://res.cloudinary.com/demo/image/upload/sample_caste.pdf',
          publicId: 'sample_caste_cert',
          originalName: 'caste_certificate_obc.pdf',
          format: 'pdf',
          sizeBytes: 104500,
        },
      ],
      documentAffected: 'income_certificate',
      correctionRequired: 'Clear, legible copy of current financial year Income Certificate issued by Taluka Seva Sadan.',
      officerRemarks: 'The uploaded Income Certificate scan is blurred and illegible. Please upload a clear photo or PDF scan so we can verify the income limit and approve your scholarship.',
      approvalChain: [
        {
          level: 1,
          officerId: talatiOfficer?._id,
          officerRole: 'Talati',
          action: 'ResubmissionRequested',
          remarks: 'Income certificate scan is blurred and illegible. Please upload a clear copy.',
          checklist: [
            { item: 'Aadhaar verified physically', checked: true },
            { item: 'Income certificate verified', checked: false, note: 'Scan is blurred' },
            { item: 'School enrollment confirmed', checked: true },
          ],
          decidedAt: new Date(Date.now() - 2 * 86400000),
        },
      ],
      statusHistory: [
        { status: 'Pending', remarks: 'Application submitted by citizen.' },
        { status: 'ResubmissionRequired', remarks: 'Talati Ramesh Patel requested a clearer income certificate scan.' },
      ],
    });
  }

  // Life Event for Family 1: Grandmother turned 68 (Unlocks IGNOAPS Old Age Pension!)
  await LifeEvent.create({
    affectedFamilyId: family1._id,
    affectedMemberId: m1_mother._id,
    eventType: 'AgeThresholdReached',
    eventDate: new Date('2024-03-10'),
    source: 'CitizenReported',
    verificationStatus: 'Verified',
    confidence: 'Verified',
    impactSummary: 'Senior age milestone (68 yrs) verified. Unlocks Indira Gandhi National Old Age Pension (IGNOAPS) eligibility.',
  });

  // Officer Task for Talati: Field Verification for Housing Grant
  await OfficerTask.create({
    title: 'Field Verification: Ramesh Patel Kutcha Dwelling (PMAY-G)',
    description: 'Verify kutcha dwelling and land possession for Ramesh Patel family in Khoraj village.',
    taskType: 'ApplicationReview',
    priority: 'Medium',
    familyId: family1._id,
    assignedRole: 'Talati',
    jurisdiction: { village: 'Khoraj', taluka: 'Gandhinagar', district: 'Gandhinagar' },
    status: 'Open',
    actionRequired: 'Inspect residential dwelling structure and upload geocoded report.',
  });

  // Notification for Family 1
  await Notification.create({
    userId: citizenUser1._id,
    familyId: family1._id,
    type: 'ApplicationStatusUpdate',
    titleEn: 'Document Correction Requested for Pre-Matric Scholarship',
    titleGu: 'પ્રી-મેટ્રિક શિષ્યવૃત્તિ માટે દસ્તાવેજ સુધારણા જરૂરી છે',
    messageEn: 'Talati Ramesh Patel requested a clearer scan of your Income Certificate. Please visit your application to update it.',
    messageGu: 'તલાટી રમેશભાઈ પટેલે આપના આવકના પ્રમાણપત્રની સ્પષ્ટ નકલ અપલોડ કરવા જણાવ્યું છે. કૃપા કરીને અરજીમાં જઈ સુધારો કરો.',
    nextActionUrl: '/applications',
    isRead: false,
  });

  // ── 5. SEED DEMO HOUSEHOLD 2: SAVITABEN VANKAR (VULNERABLE SC WIDOW) ──────
  console.log('\n🏡 Seeding Household 2: Savitaben Vankar Family (GJ-GND-2024-002)...');

  const citizenUser2 = await CitizenUser.create({
    mobileNumber: '9876543211',
    passwordHash: 'Password123!',
    fullName: 'Savitaben Dayabhai Vankar',
  });

  const family2 = await Family.create({
    familyId: 'GJ-GND-2024-002',
    status: 'Permanent',
    isVerified: true,
    annualIncome: 42000,
    category: 'SC',
    isBPL: true,
    rationCardType: 'AAY',
    rationCardNumber: 'RC-GJ-GND-33901',
    hasPuccaHouse: false,
    address: {
      village: 'Pethapur',
      taluka: 'Gandhinagar',
      district: 'Gandhinagar',
      pincode: '382610',
    },
    createdByUserId: citizenUser2._id,
    lastVerifiedAt: new Date(Date.now() - 30 * 86400000),
    reVerificationDueAt: new Date(Date.now() + 150 * 86400000),
    verificationNotes: 'Antyodaya Anna Yojana household. Verified by Talati Meena Chauhan.',
  });

  citizenUser2.familyId = family2._id;
  await citizenUser2.save();

  const m2_head = await Member.create({
    memberId: 'MEM-GND-002-01',
    familyId: family2._id,
    name: 'Savitaben Dayabhai Vankar',
    dateOfBirth: new Date('1972-04-18'), // Age 52, Widow
    gender: 'Female',
    relationToHead: 'Self',
    maritalStatus: 'Widow',
    occupation: 'Agricultural Labourer',
    mobileNumber: '9876543211',
    lifecycleStatus: 'Active',
    aadhaarEncrypted: '880011223351',
    aadhaarHash: '880011223351',
  });

  const m2_son = await Member.create({
    memberId: 'MEM-GND-002-02',
    familyId: family2._id,
    name: 'Rahul Dayabhai Vankar',
    dateOfBirth: new Date('2005-11-25'), // Age 19, Student
    gender: 'Male',
    relationToHead: 'Son',
    maritalStatus: 'Single',
    isStudent: true,
    educationLevel: 'College',
    occupation: 'Student',
    lifecycleStatus: 'Active',
    aadhaarEncrypted: '880011223352',
    aadhaarHash: '880011223352',
  });

  // Active Benefit for Family 2: AAY Food Subsidies
  if (aayScheme) {
    await BenefitEntitlement.create({
      familyId: family2._id,
      memberId: m2_head._id,
      schemeId: aayScheme._id,
      schemeCode: aayScheme.schemeCode,
      schemeName: aayScheme.name,
      lifecycleState: 'Active',
      benefitType: 'InKind',
      disbursementFrequency: 'Monthly',
      sanctionedAmount: 1200,
      startDate: new Date('2023-06-01'),
      statusHistory: [
        {
          state: 'Active',
          transitionedBy: 'Mamlatdar Office Gandhinagar',
          reason: 'Antyodaya Anna Yojana (AAY) monthly food grain entitlement active',
          timestamp: new Date('2023-06-01'),
        },
      ],
    });
  }

  // Application in Level 2 Review: Ganga Swarupa Destitute Widow Pension
  if (gangaSwarupaScheme) {
    await Application.create({
      applicationId: 'APP-WIDOW-PENSION',
      familyId: family2._id,
      memberId: m2_head._id,
      schemeId: gangaSwarupaScheme._id,
      status: 'Level1Approved',
      currentPipelineLevel: 2,
      riskFlag: 'Low',
      submittedDocumentKeys: ['aadhaar', 'income_certificate', 'death_certificate'],
      approvalChain: [
        {
          level: 1,
          officerId: talatiOfficer?._id,
          officerRole: 'Talati',
          action: 'Approved',
          remarks: 'Verified husband demise certificate and widow status. Income below ceiling. Strongly recommended for Level 2 sanction.',
          checklist: [
            { item: 'Aadhaar verified', checked: true },
            { item: 'Husband Death Certificate verified', checked: true },
            { item: 'Income below threshold', checked: true },
          ],
          decidedAt: new Date(Date.now() - 3 * 86400000),
        },
      ],
      statusHistory: [
        { status: 'Pending', remarks: 'Application submitted by citizen.' },
        { status: 'Level1Approved', remarks: 'Talati Ramesh Patel verified and forwarded to Mamlatdar for sanction.' },
      ],
    });
  }

  // Officer Task for Mamlatdar
  await OfficerTask.create({
    title: 'Sanction Review: Ganga Swarupa Widow Pension for Savitaben Vankar',
    description: 'Level 2 review and monthly direct benefit transfer sanction for Savitaben Vankar.',
    taskType: 'ApplicationReview',
    priority: 'High',
    familyId: family2._id,
    assignedRole: 'Mamlatdar',
    jurisdiction: { village: 'Pethapur', taluka: 'Gandhinagar', district: 'Gandhinagar' },
    status: 'Open',
    actionRequired: 'Verify Level 1 Talati recommendation and issue monthly sanction order.',
  });

  // ── 6. SEED DEMO HOUSEHOLD 3: RISK SIGNAL DEMO (HARESH PRAJAPATI) ─────────
  console.log('\n🏡 Seeding Household 3: Haresh Prajapati Family (Cross-Family Collision Demo)...');

  const citizenUser3 = await CitizenUser.create({
    mobileNumber: '9876543212',
    passwordHash: 'Password123!',
    fullName: 'Haresh Mohanbhai Prajapati',
  });

  const family3 = await Family.create({
    familyId: 'GJ-GND-2024-003',
    status: 'Provisional',
    isVerified: false,
    annualIncome: 95000,
    category: 'General',
    isBPL: false,
    address: {
      village: 'Khoraj',
      taluka: 'Gandhinagar',
      district: 'Gandhinagar',
      pincode: '382421',
    },
    createdByUserId: citizenUser3._id,
    verificationNotes: 'Pending field verification by Talati.',
  });

  citizenUser3.familyId = family3._id;
  await citizenUser3.save();

  const m3_head = await Member.create({
    memberId: 'MEM-GND-003-01',
    familyId: family3._id,
    name: 'Haresh Mohanbhai Prajapati',
    dateOfBirth: new Date('1984-06-18'),
    gender: 'Male',
    relationToHead: 'Self',
    maritalStatus: 'Married',
    occupation: 'Artisan / Potter',
    mobileNumber: '9876543212',
    lifecycleStatus: 'Active',
    aadhaarEncrypted: '880011223361',
    aadhaarHash: '880011223361',
  });

  // Link certificate number from Family 1 to Family 3 to simulate collision
  docIncome1.linkedFamilyIds.push(family3._id);
  await docIncome1.save();

  // Create Non-Accusatory Risk Signal (Problem E Demo)
  await RiskSignal.create({
    familyId: family3._id,
    memberId: m3_head._id,
    category: 'CrossFamilyDocumentReuse',
    riskLevel: 'High',
    reason: "Certificate 'INC-2024-GND-00891' submitted by this family is already registered under Family GJ-GND-2024-001 (Ramesh Patel).",
    evidenceSnapshot: {
      conflictingCertificateNumber: 'INC-2024-GND-00891',
      existingFamilyId: 'GJ-GND-2024-001',
      existingFamilyHead: 'Ramesh Patel',
      recommendation: 'Physical verification by Talati recommended before approving provisional family status or issuing scheme benefits.',
    },
    status: 'Active',
    source: 'AutomatedRiskEngine',
  });

  console.log('\n======================================================================');
  console.log('🎉 RICH GUJARAT SEEDING COMPLETED SUCCESSFULLY!');
  console.log('======================================================================');
  console.log('  🏛️  Administrative Officers:');
  console.log('      • Talati (Village Clerk):  TAL-001  / Password123! or Officer@12345 (Khoraj Village, Gandhinagar)');
  console.log('      • Mamlatdar (Taluka):      MAM-001  / Password123! or Officer@12345 (Gandhinagar Taluka)');
  console.log('      • District Officer:        DST-001  / Password123! or Officer@12345 (Gandhinagar District)');
  console.log('      • Super Administrator:     ADM-001  / Password123! or Admin@12345');
  console.log('');
  console.log('  👨‍👩‍👧‍👦 Demo Citizen Households:');
  console.log('      • Household 1 (Main Demo): 9876543210 / Password123! (Ramesh Patel)');
  console.log('        - Family ID: GJ-GND-2024-001 | 4 Members | Verified');
  console.log('        - Active Benefit: NFSA Priority Household (PHH) Ration');
  console.log('        - Resubmission Case: Pre-Matric Scholarship (APP-RESUB-DEMO)');
  console.log('        - Life Event: Senior Citizen Transition (Age 68 Mother)');
  console.log('');
  console.log('      • Household 2 (Widow/Vulnerable): 9876543211 / Password123! (Savitaben Vankar)');
  console.log('        - Family ID: GJ-GND-2024-002 | Active AAY Food Subsidy');
  console.log('        - Under Review: Ganga Swarupa Widow Pension (Level 2 Mamlatdar)');
  console.log('');
  console.log('      • Household 3 (Risk Signal Demo): 9876543212 / Password123! (Haresh Prajapati)');
  console.log('        - Family ID: GJ-GND-2024-003 | Certificate Collision Risk Signal');
  console.log('======================================================================\n');

  await mongoose.disconnect();
}

cleanAndSeedGujarat().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
