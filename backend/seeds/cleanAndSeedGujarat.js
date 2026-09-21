'use strict';

/**
 * Nagrik V2 — Clean Database & Rich Gujarat Seed Data Expansion
 *
 * 1. Completely cleans all collections in the database.
 * 2. Seeds authoritative Gujarat Government welfare schemes.
 * 3. Seeds 3-tier officer administrative hierarchy (Talati -> Mamlatdar -> District Officer -> Admin).
 * 4. Seeds 5 realistic Gujarat demo households with rich beneficiary profiles:
 *    - Family 1 (Ramesh Patel): 4 members, PHH ration, pending clarification app, senior life event (Gandhinagar - Rural).
 *    - Family 2 (Savitaben Vankar): Vulnerable widow household, active AAY, widow pension under Level 2 review (Gandhinagar - Rural).
 *    - Family 3 (Haresh Prajapati): Certificate collision risk signal, breached SLA, escalated application (Gandhinagar - Semi-Urban).
 *    - Family 4 (Dilipbhai Rathwa): Tribal household, high deprivation score, instant auto-sanctioned scheme (Dahod - Tribal).
 *    - Family 5 (Bharatbhai Joshi): General category, urban household, moderate tier (Rajkot - Urban).
 * 5. Pre-computes Social Registry deprivation scores across all tiers and geographies.
 * 6. Generates comprehensive audit trails with multi-tier severity and geo/IP tracking.
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
const SocialRegistry = require('../src/models/SocialRegistry');
const { computeDeprivationScore } = require('../src/services/socialRegistryService');

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
    SocialRegistry.deleteMany({}),
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
  const districtOfficer = await Officer.findOne({ officerId: 'DST-001' });

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
    familyType: 'Nuclear',
    isVerified: true,
    annualIncome: 72000,
    category: 'OBC',
    bplStatus: true,
    rationCardType: 'PHH',
    rationCardNumber: 'RC-GJ-GND-78901',
    hasPuccaHouse: false,
    address: {
      village: 'Khoraj',
      taluka: 'Gandhinagar',
      district: 'Gandhinagar',
      pincode: '382421',
      locality: 'Patel Vas',
    },
    socioeconomic: {
      landHolding: 0.8,
      primaryLivelihood: 'Agriculture',
      secondaryIncome: 12000,
      isFarmer: true,
      isBOCWWorker: false,
    },
    household: {
      dwellingType: 'SemiPucca',
      totalRooms: 2,
      drinkingWaterSource: 'Tap',
      toiletAvailable: true,
      electricityConnection: true,
      cookingFuel: 'LPG',
      vehicleOwned: false,
      mobilePhoneCount: 2,
      internetAccess: true,
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
    skills: ['Farming', 'Dairy Management'],
    healthStatus: { bloodGroup: 'B+', chronicConditions: [], immunizationComplete: true },
    bankDetails: {
      accountHolderName: 'Ramesh Somabhai Patel',
      bankName: 'State Bank of India',
      ifscCode: 'SBIN0001234',
    },
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
    skills: ['Tailoring'],
    healthStatus: { bloodGroup: 'A+', chronicConditions: [], immunizationComplete: true },
    bankDetails: {
      accountHolderName: 'Geeta Rameshbhai Patel',
      bankName: 'Bank of Baroda',
      ifscCode: 'BARB0KHORAJ',
    },
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
    skills: ['Computer Basics'],
    bankDetails: {
      accountHolderName: 'Hetal Rameshbhai Patel',
      bankName: 'State Bank of India',
      ifscCode: 'SBIN0001234',
    },
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
    skills: [],
    healthStatus: { bloodGroup: 'O+', chronicConditions: ['Hypertension'], immunizationComplete: true },
    bankDetails: {
      accountHolderName: 'Kankuben Somabhai Patel',
      bankName: 'State Bank of India',
      ifscCode: 'SBIN0001234',
    },
    aadhaarEncrypted: '880011223347',
    aadhaarHash: '880011223347',
  });

  // Update Head of Family and Composition for Family 1
  family1.headOfFamilyMemberId = m1_head._id;
  family1.familyComposition = {
    totalMembers: 4,
    activeMembers: 4,
    earningMembers: 1,
    dependentMembers: 3,
    seniorCitizens: 1,
    children: 1,
    women: 3,
    disabledMembers: 0,
    students: 1,
  };
  await family1.save();

  // Reusable Documents for Family 1
  const docIncome1 = await DocumentReference.create({
    certificateNumber: 'INC-2024-GND-00891',
    certificateType: 'Income',
    issuingAuthority: 'Taluka Seva Sadan Gandhinagar',
    issueDate: new Date('2024-04-10'),
    expiryDate: new Date('2025-03-31'),
    isVerifiedByOfficer: true,
    linkedFamilyIds: [family1._id],
    memberId: m1_head._id,
  });

  const docCaste1 = await DocumentReference.create({
    certificateNumber: 'CST-2024-GND-00412',
    certificateType: 'Caste',
    issuingAuthority: 'Mamlatdar Office Gandhinagar',
    issueDate: new Date('2022-01-15'),
    isVerifiedByOfficer: true,
    linkedFamilyIds: [family1._id],
    memberId: m1_head._id,
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

  // Application in ResubmissionRequired for Family 1 (Phase 4 SLA & Clarification Demo)
  if (preMatricScheme) {
    await Application.create({
      applicationId: 'APP-RESUB-DEMO',
      familyId: family1._id,
      memberId: m1_daughter._id,
      schemeId: preMatricScheme._id,
      status: 'ResubmissionRequired',
      currentPipelineLevel: 1,
      priority: 'Normal',
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
      sla: {
        targetCompletionDate: new Date(Date.now() + 5 * 86400000),
        slaDaysTotal: 15,
        isBreached: false,
      },
      clarificationHistory: [
        {
          requestedAt: new Date(Date.now() - 2 * 86400000),
          requestedBy: 'Talati Ramesh Patel',
          remarks: 'The uploaded Income Certificate scan is blurred and illegible. Please upload a clear copy.',
          documentKey: 'income_certificate',
          citizenResponse: 'I will scan the physical original at the Taluka Seva Sadan and re-upload today.',
          respondedAt: new Date(Date.now() - 1 * 86400000),
        },
      ],
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

  // Application 2: PMAY-G under Review
  if (pmayScheme) {
    await Application.create({
      applicationId: 'APP-PMAY-001',
      familyId: family1._id,
      memberId: m1_head._id,
      schemeId: pmayScheme._id,
      status: 'Level1Review',
      currentPipelineLevel: 1,
      priority: 'FastTrack',
      riskFlag: 'Low',
      sla: {
        targetCompletionDate: new Date(Date.now() + 8 * 86400000),
        slaDaysTotal: 21,
        isBreached: false,
      },
      statusHistory: [
        { status: 'Pending', remarks: 'Application submitted by citizen.' },
        { status: 'Level1Review', remarks: 'Talati initiated field inspection.' },
      ],
    });
  }

  // Life Event for Family 1: Grandmother turned 68
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

  // Officer Task for Talati
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

  // Notifications for Family 1
  await Notification.create({
    userId: citizenUser1._id,
    familyId: family1._id,
    type: 'ApplicationStatusUpdate',
    priority: 'High',
    category: 'ApplicationStatus',
    actionRequired: true,
    titleEn: 'Document Clarification Requested: Pre-Matric Scholarship',
    titleGu: 'પ્રી-મેટ્રિક શિષ્યવૃત્તિ માટે દસ્તાવેજ સ્પષ્ટતા જરૂરી છે',
    messageEn: 'Talati Ramesh Patel requested a clearer scan of your Income Certificate. Please visit your application to update it.',
    messageGu: 'તલાટી રમેશભાઈ પટેલે આપના આવકના પ્રમાણપત્રની સ્પષ્ટ નકલ અપલોડ કરવા જણાવ્યું છે. કૃપા કરીને અરજીમાં જઈ સુધારો કરો.',
    nextActionUrl: '/applications/APP-RESUB-DEMO',
    isRead: false,
  });

  await Notification.create({
    userId: citizenUser1._id,
    familyId: family1._id,
    type: 'WelfareNudge',
    priority: 'Normal',
    category: 'WelfareNudge',
    actionRequired: false,
    titleEn: 'Entitlement Opportunity: IGNOAPS Senior Citizen Pension',
    titleGu: 'યોજના લાભ: ઈન્દિરા ગાંધી રાષ્ટ્રીય વૃદ્ધાવસ્થા પેન્શન',
    messageEn: 'Kankuben Somabhai Patel has reached age 68 and qualifies for ₹1,000 monthly direct bank transfer under IGNOAPS.',
    messageGu: 'કંકુબેન સોમાભાઈ પટેલ ૬૮ વર્ષ પૂર્ણ કરી IGNOAPS હેઠળ દર મહિને ₹૧,૦૦૦ પેન્શન મેળવવા પાત્ર છે.',
    nextActionUrl: '/schemes',
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
    familyType: 'SingleParent',
    isVerified: true,
    annualIncome: 42000,
    category: 'SC',
    bplStatus: true,
    rationCardType: 'AAY',
    rationCardNumber: 'RC-GJ-GND-33901',
    hasPuccaHouse: false,
    address: {
      village: 'Pethapur',
      taluka: 'Gandhinagar',
      district: 'Gandhinagar',
      pincode: '382610',
    },
    socioeconomic: {
      landHolding: 0,
      primaryLivelihood: 'Labour',
      secondaryIncome: 0,
      isFarmer: false,
      isBOCWWorker: true,
    },
    household: {
      dwellingType: 'Kutcha',
      totalRooms: 1,
      drinkingWaterSource: 'Handpump',
      toiletAvailable: false,
      electricityConnection: true,
      cookingFuel: 'Firewood',
      vehicleOwned: false,
      mobilePhoneCount: 1,
      internetAccess: false,
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
    skills: ['Agricultural Labour', 'Embroidery'],
    bankDetails: {
      accountHolderName: 'Savitaben Dayabhai Vankar',
      bankName: 'State Bank of India',
      ifscCode: 'SBIN0001234',
    },
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
    skills: ['Electrician Apprentice'],
    bankDetails: {
      accountHolderName: 'Rahul Dayabhai Vankar',
      bankName: 'State Bank of India',
      ifscCode: 'SBIN0001234',
    },
    aadhaarEncrypted: '880011223352',
    aadhaarHash: '880011223352',
  });

  family2.headOfFamilyMemberId = m2_head._id;
  family2.familyComposition = {
    totalMembers: 2,
    activeMembers: 2,
    earningMembers: 1,
    dependentMembers: 1,
    seniorCitizens: 0,
    children: 0,
    women: 1,
    disabledMembers: 0,
    students: 1,
  };
  await family2.save();

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
      priority: 'Urgent',
      riskFlag: 'Low',
      sla: {
        targetCompletionDate: new Date(Date.now() + 2 * 86400000),
        slaDaysTotal: 10,
        isBreached: false,
      },
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

  // ── 6. SEED DEMO HOUSEHOLD 3: RISK SIGNAL & ESCALATION DEMO ───────────────
  console.log('\n🏡 Seeding Household 3: Haresh Prajapati Family (Cross-Family Collision Demo)...');

  const citizenUser3 = await CitizenUser.create({
    mobileNumber: '9876543212',
    passwordHash: 'Password123!',
    fullName: 'Haresh Mohanbhai Prajapati',
  });

  const family3 = await Family.create({
    familyId: 'GJ-GND-2024-003',
    status: 'Provisional',
    familyType: 'Nuclear',
    isVerified: false,
    annualIncome: 95000,
    category: 'General',
    bplStatus: false,
    address: {
      village: 'Khoraj',
      taluka: 'Gandhinagar',
      district: 'Gandhinagar',
      pincode: '382421',
    },
    socioeconomic: {
      landHolding: 0,
      primaryLivelihood: 'SelfEmployed',
      secondaryIncome: 0,
      isFarmer: false,
      isBOCWWorker: false,
    },
    household: {
      dwellingType: 'Pucca',
      totalRooms: 2,
      drinkingWaterSource: 'Tap',
      toiletAvailable: true,
      electricityConnection: true,
      cookingFuel: 'LPG',
      vehicleOwned: true,
      mobilePhoneCount: 1,
      internetAccess: true,
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
    skills: ['Pottery', 'Clay Art'],
    aadhaarEncrypted: '880011223361',
    aadhaarHash: '880011223361',
  });

  family3.headOfFamilyMemberId = m3_head._id;
  family3.familyComposition = {
    totalMembers: 1,
    activeMembers: 1,
    earningMembers: 1,
    dependentMembers: 0,
    seniorCitizens: 0,
    children: 0,
    women: 0,
    disabledMembers: 0,
    students: 0,
  };
  await family3.save();

  // Link certificate number from Family 1 to Family 3 to simulate collision
  docIncome1.linkedFamilyIds.push(family3._id);
  await docIncome1.save();

  // Create Non-Accusatory Risk Signal
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

  // Application with SLA Breach & Escalation
  if (maaScheme) {
    await Application.create({
      applicationId: 'APP-BREACH-003',
      familyId: family3._id,
      memberId: m3_head._id,
      schemeId: maaScheme._id,
      status: 'Level1Review',
      currentPipelineLevel: 1,
      priority: 'Normal',
      riskFlag: 'High',
      escalated: true,
      escalatedAt: new Date(Date.now() - 1 * 86400000),
      escalationReason: 'SLA turnaround expired (14 days) while awaiting document collision clarification.',
      sla: {
        targetCompletionDate: new Date(Date.now() - 2 * 86400000),
        slaDaysTotal: 14,
        isBreached: true,
        breachedAt: new Date(Date.now() - 2 * 86400000),
      },
      statusHistory: [
        { status: 'Pending', remarks: 'Application submitted by citizen.' },
        { status: 'Level1Review', remarks: 'Under scrutiny by Talati Ramesh Patel.' },
      ],
    });
  }

  // ── 7. SEED DEMO HOUSEHOLD 4: DILIPBHAI RATHWA (TRIBAL DAHOD DEMO) ────────
  console.log('\n🏡 Seeding Household 4: Dilipbhai Rathwa Family (Dahod - Tribal Auto-Approval Demo)...');

  const citizenUser4 = await CitizenUser.create({
    mobileNumber: '9876543213',
    passwordHash: 'Password123!',
    fullName: 'Dilipbhai Kalsingbhai Rathwa',
  });

  const family4 = await Family.create({
    familyId: 'GJ-DHD-2024-004',
    status: 'Permanent',
    familyType: 'Joint',
    isVerified: true,
    annualIncome: 36000,
    category: 'ST',
    bplStatus: true,
    rationCardType: 'AAY',
    rationCardNumber: 'RC-GJ-DHD-44912',
    hasPuccaHouse: false,
    address: {
      village: 'Garbada',
      taluka: 'Garbada',
      district: 'Dahod',
      pincode: '389155',
      locality: 'Rathwa Faliyu',
    },
    socioeconomic: {
      landHolding: 0.5,
      primaryLivelihood: 'Agriculture',
      secondaryIncome: 0,
      isFarmer: true,
      isBOCWWorker: false,
    },
    household: {
      dwellingType: 'Kutcha',
      totalRooms: 1,
      drinkingWaterSource: 'Well',
      toiletAvailable: false,
      electricityConnection: true,
      cookingFuel: 'Firewood',
      vehicleOwned: false,
      mobilePhoneCount: 1,
      internetAccess: false,
    },
    createdByUserId: citizenUser4._id,
    lastVerifiedAt: new Date(Date.now() - 40 * 86400000),
    reVerificationDueAt: new Date(Date.now() + 140 * 86400000),
    verificationNotes: 'Remote tribal hamlet field verification completed.',
  });

  citizenUser4.familyId = family4._id;
  await citizenUser4.save();

  const m4_head = await Member.create({
    memberId: 'MEM-DHD-004-01',
    familyId: family4._id,
    name: 'Dilipbhai Kalsingbhai Rathwa',
    dateOfBirth: new Date('1980-02-14'),
    gender: 'Male',
    relationToHead: 'Self',
    maritalStatus: 'Married',
    occupation: 'Small Farmer',
    mobileNumber: '9876543213',
    lifecycleStatus: 'Active',
    skills: ['Farming', 'Forest Produce'],
    bankDetails: {
      accountHolderName: 'Dilipbhai Kalsingbhai Rathwa',
      bankName: 'Bank of Baroda',
      ifscCode: 'BARB0GARBAD',
    },
    aadhaarEncrypted: '880011223371',
    aadhaarHash: '880011223371',
  });

  const m4_wife = await Member.create({
    memberId: 'MEM-DHD-004-02',
    familyId: family4._id,
    name: 'Sumitraben Dilipbhai Rathwa',
    dateOfBirth: new Date('1983-07-22'),
    gender: 'Female',
    relationToHead: 'Spouse',
    maritalStatus: 'Married',
    occupation: 'Agricultural Labourer',
    mobileNumber: '9876543213',
    lifecycleStatus: 'Active',
    bankDetails: {
      accountHolderName: 'Sumitraben Dilipbhai Rathwa',
      bankName: 'Bank of Baroda',
      ifscCode: 'BARB0GARBAD',
    },
    aadhaarEncrypted: '880011223372',
    aadhaarHash: '880011223372',
  });

  const m4_son = await Member.create({
    memberId: 'MEM-DHD-004-03',
    familyId: family4._id,
    name: 'Amit Dilipbhai Rathwa',
    dateOfBirth: new Date('2010-04-05'), // Age 14, School student
    gender: 'Male',
    relationToHead: 'Son',
    maritalStatus: 'Single',
    isStudent: true,
    educationLevel: '9th Grade',
    occupation: 'Student',
    lifecycleStatus: 'Active',
    bankDetails: {
      accountHolderName: 'Amit Dilipbhai Rathwa',
      bankName: 'Bank of Baroda',
      ifscCode: 'BARB0GARBAD',
    },
    aadhaarEncrypted: '880011223373',
    aadhaarHash: '880011223373',
  });

  family4.headOfFamilyMemberId = m4_head._id;
  family4.familyComposition = {
    totalMembers: 3,
    activeMembers: 3,
    earningMembers: 2,
    dependentMembers: 1,
    seniorCitizens: 0,
    children: 1,
    women: 1,
    disabledMembers: 0,
    students: 1,
  };
  await family4.save();

  // Instant Auto-Approved Application for Dilipbhai (Pre-Matric ST Scholarship)
  if (preMatricScheme) {
    await Application.create({
      applicationId: 'APP-AUTO-SANCTION',
      familyId: family4._id,
      memberId: m4_son._id,
      schemeId: preMatricScheme._id,
      status: 'FinalApproved',
      currentPipelineLevel: 3,
      priority: 'FastTrack',
      riskFlag: 'Low',
      autoApprovalEligible: true,
      autoApproved: true,
      decidedAt: new Date(Date.now() - 4 * 86400000),
      sla: {
        targetCompletionDate: new Date(Date.now() + 10 * 86400000),
        slaDaysTotal: 15,
        isBreached: false,
      },
      statusHistory: [
        { status: 'Pending', remarks: 'Application submitted via citizen portal.' },
        {
          status: 'FinalApproved',
          remarks: 'Automated Rule Engine matched 100% eligibility criteria from ST registry & school enrollment. Direct sanction order issued.',
        },
      ],
    });
  }

  // ── 8. SEED DEMO HOUSEHOLD 5: BHARATBHAI JOSHI (RAJKOT URBAN DEMO) ────────
  console.log('\n🏡 Seeding Household 5: Bharatbhai Joshi Family (Rajkot - Urban Moderate Tier)...');

  const citizenUser5 = await CitizenUser.create({
    mobileNumber: '9876543214',
    passwordHash: 'Password123!',
    fullName: 'Bharatbhai Narandas Joshi',
  });

  const family5 = await Family.create({
    familyId: 'GJ-RJK-2024-005',
    status: 'Permanent',
    familyType: 'Nuclear',
    isVerified: true,
    annualIncome: 280000,
    category: 'General',
    bplStatus: false,
    rationCardType: 'APL',
    rationCardNumber: 'RC-GJ-RJK-99120',
    hasPuccaHouse: true,
    address: {
      village: 'Gondal City',
      taluka: 'Gondal',
      district: 'Rajkot',
      pincode: '360311',
      locality: 'College Road',
    },
    socioeconomic: {
      landHolding: 0,
      primaryLivelihood: 'Business',
      secondaryIncome: 40000,
      isFarmer: false,
      isBOCWWorker: false,
    },
    household: {
      dwellingType: 'Pucca',
      totalRooms: 4,
      drinkingWaterSource: 'Tap',
      toiletAvailable: true,
      electricityConnection: true,
      cookingFuel: 'LPG',
      vehicleOwned: true,
      mobilePhoneCount: 3,
      internetAccess: true,
    },
    createdByUserId: citizenUser5._id,
    lastVerifiedAt: new Date(Date.now() - 10 * 86400000),
    reVerificationDueAt: new Date(Date.now() + 355 * 86400000),
  });

  citizenUser5.familyId = family5._id;
  await citizenUser5.save();

  const m5_head = await Member.create({
    memberId: 'MEM-RJK-005-01',
    familyId: family5._id,
    name: 'Bharatbhai Narandas Joshi',
    dateOfBirth: new Date('1976-10-10'),
    gender: 'Male',
    relationToHead: 'Self',
    maritalStatus: 'Married',
    occupation: 'Retail Shopkeeper',
    mobileNumber: '9876543214',
    lifecycleStatus: 'Active',
    skills: ['Retail Management', 'Bookkeeping'],
    bankDetails: {
      accountHolderName: 'Bharatbhai Narandas Joshi',
      bankName: 'HDFC Bank',
      ifscCode: 'HDFC0001234',
    },
    aadhaarEncrypted: '880011223381',
    aadhaarHash: '880011223381',
  });

  family5.headOfFamilyMemberId = m5_head._id;
  family5.familyComposition = {
    totalMembers: 1,
    activeMembers: 1,
    earningMembers: 1,
    dependentMembers: 0,
    seniorCitizens: 0,
    children: 0,
    women: 0,
    disabledMembers: 0,
    students: 0,
  };
  await family5.save();

  // ── 9. PRE-COMPUTE SOCIAL REGISTRY DEPRIVATION SCORES ─────────────────────
  console.log('\n📊 Pre-computing Social Registry Deprivation Scores across all Households...');
  const allFamilies = [family1, family2, family3, family4, family5];
  for (const fam of allFamilies) {
    const regDoc = await computeDeprivationScore(fam._id);
    console.log(`   • ${fam.familyId} (${fam.address.district}): Score ${regDoc.deprivationScore}/100 -> Tier: ${regDoc.registryTier} (${regDoc.geographicClassification})`);
  }

  // ── 10. SEED COMPREHENSIVE AUDIT TRAIL ────────────────────────────────────
  console.log('\n🛡️ Seeding Multi-Tier Audit Logs with Geo & IP Tracking...');
  const sampleAuditLogs = [
    {
      action: 'FAMILY_VERIFIED',
      actorId: talatiOfficer._id,
      actorRole: 'Talati',
      entityType: 'Family',
      entityId: family1.familyId,
      severity: 'Info',
      ipAddress: '103.24.188.42',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
      geoInfo: { district: 'Gandhinagar', taluka: 'Gandhinagar', location: 'Talati Office Khoraj' },
      details: { verificationNotes: 'Physical residence and land record verified in person.' },
      performedAt: new Date(Date.now() - 15 * 86400000),
    },
    {
      action: 'RESUBMISSION_REQUESTED',
      actorId: talatiOfficer._id,
      actorRole: 'Talati',
      entityType: 'Application',
      entityId: 'APP-RESUB-DEMO',
      severity: 'Warning',
      ipAddress: '103.24.188.42',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
      geoInfo: { district: 'Gandhinagar', taluka: 'Gandhinagar', location: 'Talati Office Khoraj' },
      details: {
        documentAffected: 'income_certificate',
        reason: 'Image blurred and illegible for scholarship ceiling verification.',
      },
      performedAt: new Date(Date.now() - 2 * 86400000),
    },
    {
      action: 'SLA_BREACH_DETECTED',
      actorId: 'SYSTEM_CRON',
      actorRole: 'System',
      entityType: 'Application',
      entityId: 'APP-BREACH-003',
      severity: 'Critical',
      ipAddress: '127.0.0.1',
      userAgent: 'Nagrik-Cron-Daemon/2.0',
      geoInfo: { district: 'Gandhinagar', taluka: 'Gandhinagar', location: 'Gujarat State Data Center' },
      details: {
        breachHours: 48,
        slaTargetDays: 14,
        escalatedToRole: 'Mamlatdar',
      },
      performedAt: new Date(Date.now() - 2 * 86400000),
    },
    {
      action: 'APPLICATION_ESCALATED',
      actorId: mamlatdarOfficer._id,
      actorRole: 'Mamlatdar',
      entityType: 'Application',
      entityId: 'APP-BREACH-003',
      severity: 'Critical',
      ipAddress: '117.211.88.12',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      geoInfo: { district: 'Gandhinagar', taluka: 'Gandhinagar', location: 'Taluka Seva Sadan' },
      details: {
        escalationReason: 'SLA turnaround expired while awaiting document collision clarification.',
        targetOfficer: 'Sneha Shah (Mamlatdar)',
      },
      performedAt: new Date(Date.now() - 1 * 86400000),
    },
    {
      action: 'BENEFIT_AUTO_APPROVED',
      actorId: 'SYSTEM_RULES_ENGINE',
      actorRole: 'System',
      entityType: 'Application',
      entityId: 'APP-AUTO-SANCTION',
      severity: 'Info',
      ipAddress: '127.0.0.1',
      userAgent: 'Nagrik-Welfare-Engine/2.0',
      geoInfo: { district: 'Dahod', taluka: 'Garbada', location: 'Gujarat State Data Center' },
      details: {
        schemeCode: 'PRE-MAT-SC',
        matchedCriteria: ['ST Category', 'Valid Aadhaar', 'BPL Verified', 'School Enrolled'],
        sanctionOrderNumber: 'SANC-2024-DHD-9941',
      },
      performedAt: new Date(Date.now() - 4 * 86400000),
    },
    {
      action: 'LEVEL1_APPROVED',
      actorId: talatiOfficer._id,
      actorRole: 'Talati',
      entityType: 'Application',
      entityId: 'APP-WIDOW-PENSION',
      severity: 'Info',
      ipAddress: '103.24.188.42',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0',
      geoInfo: { district: 'Gandhinagar', taluka: 'Gandhinagar', location: 'Talati Office Khoraj' },
      details: {
        recommendedRole: 'Mamlatdar',
        remarks: 'Husband death certificate verified against civil registration registry.',
      },
      performedAt: new Date(Date.now() - 3 * 86400000),
    },
  ];

  for (const log of sampleAuditLogs) {
    await AuditLog.create(log);
  }
  console.log(`✅ ${sampleAuditLogs.length} audit trail logs created across Info, Warning, and Critical tiers`);

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
  console.log('        - Family ID: GJ-GND-2024-001 | 4 Members | Verified | Gandhinagar');
  console.log('        - Active Benefit: NFSA Priority Household (PHH) Ration');
  console.log('        - Resubmission Case: Pre-Matric Scholarship (APP-RESUB-DEMO)');
  console.log('        - Life Event: Senior Citizen Transition (Age 68 Mother)');
  console.log('');
  console.log('      • Household 2 (Widow/Vulnerable): 9876543211 / Password123! (Savitaben Vankar)');
  console.log('        - Family ID: GJ-GND-2024-002 | Active AAY Food Subsidy | Gandhinagar');
  console.log('        - Under Review: Ganga Swarupa Widow Pension (APP-WIDOW-PENSION, Level 2 Mamlatdar)');
  console.log('');
  console.log('      • Household 3 (Collision & Escalation): 9876543212 / Password123! (Haresh Prajapati)');
  console.log('        - Family ID: GJ-GND-2024-003 | Certificate Collision Risk Signal');
  console.log('        - Breached Case: MAA-VAT Scheme (APP-BREACH-003, Escalated to Mamlatdar)');
  console.log('');
  console.log('      • Household 4 (Tribal Auto-Sanction): 9876543213 / Password123! (Dilipbhai Rathwa)');
  console.log('        - Family ID: GJ-DHD-2024-004 | Dahod District | Most Vulnerable Tier');
  console.log('        - Auto-Approved: Pre-Matric ST Scholarship (APP-AUTO-SANCTION)');
  console.log('');
  console.log('      • Household 5 (Urban Moderate): 9876543214 / Password123! (Bharatbhai Joshi)');
  console.log('        - Family ID: GJ-RJK-2024-005 | Rajkot District | General Category');
  console.log('======================================================================\n');

  await mongoose.disconnect();
}

cleanAndSeedGujarat().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
