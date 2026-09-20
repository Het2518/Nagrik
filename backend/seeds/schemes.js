'use strict';

// 20 real Gujarat + Central Government schemes.
// Each scheme has its OWN: requiredDocuments, applicationFormFields, levelChecklistAdditions.
// This is the per-scheme dynamic schema — no two schemes ask for the same exact information.

const SCHEMES = [

  // ── IGNOAPS: Old Age Pension ────────────────────────────────────────────────
  {
    schemeCode: 'IGNOAPS',
    schemeName: 'Indira Gandhi National Old Age Pension Scheme',
    department: 'Social Justice & Empowerment',
    benefitType: 'Cash',
    maxBenefitAmount: 1000,
    benefitFrequency: 'Monthly',
    eligibilityRules: { minAge: 60, maxAnnualIncome: 200000, requiredBplStatus: true },
    requiredDocuments: [
      { docKey: 'aadhaar',        label: 'Aadhaar Card',                       isRequired: true },
      { docKey: 'age_proof',      label: 'Age Proof (Birth Certificate / School Leaving)', isRequired: true },
      { docKey: 'income_cert',    label: 'Income Certificate (< 12 months old)', isRequired: true },
      { docKey: 'bpl_card',       label: 'BPL Ration Card',                    isRequired: true },
      { docKey: 'bank_passbook',  label: 'Bank Passbook (first page)',          isRequired: true },
      { docKey: 'photo',          label: 'Recent Passport-size Photograph',     isRequired: true },
    ],
    applicationFormFields: [
      { fieldKey: 'bank_account_number', label: 'Bank Account Number',    fieldType: 'text',   isRequired: true },
      { fieldKey: 'ifsc_code',           label: 'IFSC Code',              fieldType: 'text',   isRequired: true },
      { fieldKey: 'bank_name',           label: 'Bank Name & Branch',     fieldType: 'text',   isRequired: true },
      { fieldKey: 'is_receiving_other_pension', label: 'Are you receiving any other government pension?', fieldType: 'boolean', isRequired: true },
    ],
    levelChecklistAdditions: {
      level1: [
        { item: 'Applicant is 60 years or above — age verified physically against age proof' },
        { item: 'Confirmed applicant is NOT receiving any other pension from any govt scheme' },
      ],
      level2: [{ item: 'Bank account is in applicant\'s own name for direct DBT transfer' }],
      level3: [{ item: 'Pension amount confirmed as per IGNOAPS current government order' }],
    },
  },

  // ── IGNWPS: Widow Pension ───────────────────────────────────────────────────
  {
    schemeCode: 'IGNWPS',
    schemeName: 'Indira Gandhi National Widow Pension Scheme',
    department: 'Social Justice & Empowerment',
    benefitType: 'Cash',
    maxBenefitAmount: 1000,
    benefitFrequency: 'Monthly',
    eligibilityRules: { minAge: 40, maxAge: 79, maxAnnualIncome: 200000, requiredBplStatus: true, requiredMaritalStatus: ['Widow'], conflictingSchemes: ['IGNOAPS', 'GANGA-SWARUPA'] },
    requiredDocuments: [
      { docKey: 'aadhaar',           label: 'Aadhaar Card',                         isRequired: true },
      { docKey: 'husband_death_cert',label: 'Husband\'s Death Certificate (original)', isRequired: true },
      { docKey: 'marriage_cert',     label: 'Marriage Certificate or Proof of Marriage', isRequired: true },
      { docKey: 'income_cert',       label: 'Income Certificate (< 12 months old)',  isRequired: true },
      { docKey: 'bpl_card',          label: 'BPL Ration Card',                       isRequired: true },
      { docKey: 'bank_passbook',     label: 'Bank Passbook (first page)',             isRequired: true },
      { docKey: 'photo',             label: 'Recent Passport-size Photograph',        isRequired: true },
    ],
    applicationFormFields: [
      { fieldKey: 'husband_name',        label: 'Husband\'s Name',              fieldType: 'text', isRequired: true },
      { fieldKey: 'husband_death_date',  label: 'Date of Husband\'s Death',     fieldType: 'date', isRequired: true },
      { fieldKey: 'bank_account_number', label: 'Bank Account Number',          fieldType: 'text', isRequired: true },
      { fieldKey: 'ifsc_code',           label: 'IFSC Code',                    fieldType: 'text', isRequired: true },
      { fieldKey: 'adult_son_present',   label: 'Do you have an adult son (21+) who is capable of supporting you?', fieldType: 'boolean', isRequired: true },
    ],
    levelChecklistAdditions: {
      level1: [
        { item: 'Death certificate of husband verified — original seen and copy taken' },
        { item: 'Confirmed widow has no adult son supporting her' },
        { item: 'Confirmed she is NOT receiving Ganga Swarupa or any other widow pension' },
      ],
    },
  },

  // ── IGNDPS: Disability Pension ──────────────────────────────────────────────
  {
    schemeCode: 'IGNDPS',
    schemeName: 'Indira Gandhi National Disability Pension Scheme',
    department: 'Social Justice & Empowerment',
    benefitType: 'Cash',
    maxBenefitAmount: 1000,
    benefitFrequency: 'Monthly',
    eligibilityRules: { minAge: 18, maxAge: 79, maxAnnualIncome: 200000, requiredBplStatus: true, requiresDisability: true },
    requiredDocuments: [
      { docKey: 'aadhaar',            label: 'Aadhaar Card',                       isRequired: true },
      { docKey: 'disability_cert',    label: 'Disability Certificate (issued by Medical Board)', isRequired: true },
      { docKey: 'income_cert',        label: 'Income Certificate (< 12 months old)', isRequired: true },
      { docKey: 'bpl_card',           label: 'BPL Ration Card',                    isRequired: true },
      { docKey: 'bank_passbook',      label: 'Bank Passbook (first page)',          isRequired: true },
      { docKey: 'photo',              label: 'Recent Passport-size Photograph',     isRequired: true },
    ],
    applicationFormFields: [
      { fieldKey: 'disability_type',       label: 'Type of Disability',              fieldType: 'select', options: ['Visual', 'Hearing', 'Locomotor', 'Mental Illness', 'Intellectual', 'Multiple', 'Other'], isRequired: true },
      { fieldKey: 'disability_percentage', label: 'Disability Percentage (%)',        fieldType: 'number', isRequired: true, validation: { min: 40, max: 100 } },
      { fieldKey: 'disability_cert_number',label: 'Disability Certificate Number',   fieldType: 'text',   isRequired: true },
      { fieldKey: 'issuing_medical_board', label: 'Issuing Medical Board / Hospital', fieldType: 'text',   isRequired: true },
      { fieldKey: 'bank_account_number',   label: 'Bank Account Number',             fieldType: 'text',   isRequired: true },
      { fieldKey: 'ifsc_code',             label: 'IFSC Code',                       fieldType: 'text',   isRequired: true },
    ],
    levelChecklistAdditions: {
      level1: [
        { item: 'Disability certificate is from an authorised Medical Board — not a private doctor' },
        { item: 'Disability percentage ≥ 40% confirmed on certificate' },
        { item: 'Physical condition of applicant observed and consistent with certificate' },
      ],
      level2: [{ item: 'Medical Board issuing the disability certificate is valid for this district' }],
    },
  },

  // ── GANGA-SWARUPA: Gujarat Widow Pension ────────────────────────────────────
  {
    schemeCode: 'GANGA-SWARUPA',
    schemeName: 'Ganga Swarupa Yojana (Widow Pension)',
    department: 'Women & Child Development, Gujarat',
    benefitType: 'Cash',
    maxBenefitAmount: 1250,
    benefitFrequency: 'Monthly',
    eligibilityRules: { minAge: 18, maxAnnualIncome: 120000, requiredMaritalStatus: ['Widow'], conflictingSchemes: ['IGNWPS'] },
    requiredDocuments: [
      { docKey: 'aadhaar',            label: 'Aadhaar Card',                       isRequired: true },
      { docKey: 'husband_death_cert', label: 'Husband\'s Death Certificate',        isRequired: true },
      { docKey: 'income_cert',        label: 'Income Certificate',                  isRequired: true },
      { docKey: 'residence_proof',    label: 'Gujarat Residence Proof (10 years)',   isRequired: true },
      { docKey: 'bank_passbook',      label: 'Bank Passbook',                       isRequired: true },
    ],
    applicationFormFields: [
      { fieldKey: 'husband_name',       label: 'Husband\'s Name',         fieldType: 'text', isRequired: true },
      { fieldKey: 'husband_death_date', label: 'Date of Death of Husband', fieldType: 'date', isRequired: true },
      { fieldKey: 'bank_account_number',label: 'Bank Account Number',     fieldType: 'text', isRequired: true },
      { fieldKey: 'ifsc_code',          label: 'IFSC Code',               fieldType: 'text', isRequired: true },
    ],
    levelChecklistAdditions: {
      level1: [{ item: 'Verified applicant is a 10+ year resident of Gujarat' }],
    },
  },

  // ── VIKLANG-SAHAY: Gujarat Disability ──────────────────────────────────────
  {
    schemeCode: 'VIKLANG-SAHAY',
    schemeName: 'Gujarat Viklang Divyang Sahay Yojana',
    department: 'Social Justice & Empowerment, Gujarat',
    benefitType: 'Cash',
    maxBenefitAmount: 1200,
    benefitFrequency: 'Monthly',
    eligibilityRules: { minAge: 18, maxAnnualIncome: 150000, requiresDisability: true, conflictingSchemes: ['IGNDPS'] },
    requiredDocuments: [
      { docKey: 'aadhaar',         label: 'Aadhaar Card',                       isRequired: true },
      { docKey: 'disability_cert', label: 'Disability Certificate (40%+ from Medical Board)', isRequired: true },
      { docKey: 'income_cert',     label: 'Income Certificate',                  isRequired: true },
      { docKey: 'bank_passbook',   label: 'Bank Passbook',                       isRequired: true },
    ],
    applicationFormFields: [
      { fieldKey: 'disability_type',       label: 'Type of Disability', fieldType: 'select', options: ['Visual', 'Hearing', 'Locomotor', 'Mental Illness', 'Intellectual', 'Multiple', 'Other'], isRequired: true },
      { fieldKey: 'disability_percentage', label: 'Disability Percentage (%)', fieldType: 'number', isRequired: true, validation: { min: 40, max: 100 } },
      { fieldKey: 'bank_account_number',   label: 'Bank Account Number', fieldType: 'text', isRequired: true },
      { fieldKey: 'ifsc_code',             label: 'IFSC Code', fieldType: 'text', isRequired: true },
    ],
    levelChecklistAdditions: {
      level1: [{ item: 'Disability certificate ≥ 40% verified from authorised Medical Board' }],
    },
  },

  // ── SANJAY-VRIDDHA: Destitute Elderly ──────────────────────────────────────
  {
    schemeCode: 'SANJAY-VRIDDHA',
    schemeName: 'Sanjay Niradhar Vriddha Pension Yojana',
    department: 'Social Justice & Empowerment, Gujarat',
    benefitType: 'Cash',
    maxBenefitAmount: 1000,
    benefitFrequency: 'Monthly',
    eligibilityRules: { minAge: 60, maxAnnualIncome: 150000, conflictingSchemes: ['IGNOAPS'] },
    requiredDocuments: [
      { docKey: 'aadhaar',       label: 'Aadhaar Card',                         isRequired: true },
      { docKey: 'age_proof',     label: 'Age Proof',                             isRequired: true },
      { docKey: 'income_cert',   label: 'Income Certificate',                    isRequired: true },
      { docKey: 'residence_proof',label: 'Gujarat Residence Proof (10 years)',   isRequired: true },
      { docKey: 'bank_passbook', label: 'Bank Passbook',                         isRequired: true },
    ],
    applicationFormFields: [
      { fieldKey: 'has_capable_son',     label: 'Do you have an adult son capable of supporting you?', fieldType: 'boolean', isRequired: true },
      { fieldKey: 'bank_account_number', label: 'Bank Account Number', fieldType: 'text', isRequired: true },
      { fieldKey: 'ifsc_code',           label: 'IFSC Code',           fieldType: 'text', isRequired: true },
    ],
    levelChecklistAdditions: {
      level1: [{ item: 'Confirmed applicant has no capable adult son — destitute status verified with neighbours/sarpanch' }],
    },
  },

  // ── PMAY-G: Housing Gramin ──────────────────────────────────────────────────
  {
    schemeCode: 'PMAY-G',
    schemeName: 'Pradhan Mantri Awas Yojana (Gramin)',
    department: 'Rural Development',
    benefitType: 'Subsidy',
    maxBenefitAmount: 120000,
    benefitFrequency: 'OneTime',
    eligibilityRules: { requiredBplStatus: true },
    requiredDocuments: [
      { docKey: 'aadhaar',       label: 'Aadhaar Card',                              isRequired: true },
      { docKey: 'bpl_card',      label: 'BPL Ration Card',                           isRequired: true },
      { docKey: 'land_document', label: 'Land / Plot Ownership Document',             isRequired: true },
      { docKey: 'house_photo',   label: 'Photograph of existing kutcha/temporary house', isRequired: true },
      { docKey: 'bank_passbook', label: 'Bank Passbook',                              isRequired: true },
    ],
    applicationFormFields: [
      { fieldKey: 'land_ownership_type', label: 'Land Ownership Type', fieldType: 'select', options: ['Own Land', 'Government Allotted', 'Patta Land'], isRequired: true },
      { fieldKey: 'current_house_type',  label: 'Current House Type',  fieldType: 'select', options: ['Kutcha', 'Semi-Pucca', 'None'], isRequired: true },
      { fieldKey: 'bank_account_number', label: 'Bank Account Number', fieldType: 'text', isRequired: true },
      { fieldKey: 'ifsc_code',           label: 'IFSC Code',           fieldType: 'text', isRequired: true },
    ],
    levelChecklistAdditions: {
      level1: [
        { item: 'Physically confirmed applicant does NOT own a pucca house' },
        { item: 'Land/plot for construction verified on ground' },
        { item: 'Photograph of existing house matches current site' },
      ],
      level2: [{ item: 'PMAY-G beneficiary list cross-checked — no previous allotment to this family' }],
      level3: [{ item: 'Sanction order issued as per PMAY-G current unit cost guidelines' }],
    },
  },

  // ── MMGY: CM Housing Scheme ─────────────────────────────────────────────────
  {
    schemeCode: 'MMGY',
    schemeName: 'Mukhyamantri Gruh Yojana (CM Housing Scheme)',
    department: 'Urban Development & Urban Housing, Gujarat',
    benefitType: 'Subsidy',
    maxBenefitAmount: 267000,
    benefitFrequency: 'OneTime',
    eligibilityRules: { maxAnnualIncome: 300000, allowedCategories: ['SC', 'ST', 'OBC', 'EWS'] },
    requiredDocuments: [
      { docKey: 'aadhaar',        label: 'Aadhaar Card',                   isRequired: true },
      { docKey: 'income_cert',    label: 'Income Certificate',              isRequired: true },
      { docKey: 'caste_cert',     label: 'Caste Certificate',               isRequired: true },
      { docKey: 'plot_document',  label: 'Plot/Land Ownership Document',    isRequired: true },
      { docKey: 'bank_passbook',  label: 'Bank Passbook',                   isRequired: true },
      { docKey: 'loan_sanction',  label: 'Home Loan Sanction Letter (if applying for CLSS)', isRequired: false },
    ],
    applicationFormFields: [
      { fieldKey: 'applying_for_clss', label: 'Are you applying for Credit Linked Subsidy Scheme (CLSS)?', fieldType: 'boolean', isRequired: true },
      { fieldKey: 'loan_amount',       label: 'Loan Amount (if CLSS)',   fieldType: 'number', isRequired: false },
      { fieldKey: 'bank_account_number',label: 'Bank Account Number',   fieldType: 'text', isRequired: true },
      { fieldKey: 'ifsc_code',         label: 'IFSC Code',              fieldType: 'text', isRequired: true },
    ],
    levelChecklistAdditions: {
      level1: [{ item: 'Applicant is an urban resident and plot is within municipal limits' }],
      level2: [{ item: 'Plot is within the area covered by this scheme — municipal record verified' }],
    },
  },

  // ── HALPATI-AWAS: Tribal Housing ────────────────────────────────────────────
  {
    schemeCode: 'HALPATI-AWAS',
    schemeName: 'Halpati Housing Scheme',
    department: 'Tribal Development, Gujarat',
    benefitType: 'Subsidy',
    maxBenefitAmount: 120000,
    benefitFrequency: 'OneTime',
    eligibilityRules: { maxAnnualIncome: 120000, allowedCategories: ['ST'], requiredBplStatus: true },
    requiredDocuments: [
      { docKey: 'aadhaar',       label: 'Aadhaar Card',                             isRequired: true },
      { docKey: 'st_cert',       label: 'Scheduled Tribe Certificate',               isRequired: true },
      { docKey: 'bpl_card',      label: 'BPL Ration Card',                           isRequired: true },
      { docKey: 'residence_cert',label: 'Residence Certificate (South Gujarat area)', isRequired: true },
      { docKey: 'bank_passbook', label: 'Bank Passbook',                              isRequired: true },
    ],
    applicationFormFields: [
      { fieldKey: 'tribal_community_name', label: 'Tribal Community/Sub-group Name', fieldType: 'text', isRequired: true },
      { fieldKey: 'bank_account_number',   label: 'Bank Account Number',             fieldType: 'text', isRequired: true },
      { fieldKey: 'ifsc_code',             label: 'IFSC Code',                       fieldType: 'text', isRequired: true },
    ],
    levelChecklistAdditions: {
      level1: [{ item: 'ST community membership confirmed with tribal panchayat/headman letter' }],
    },
  },

  // ── PMSSS: Post Matric Scholarship ─────────────────────────────────────────
  {
    schemeCode: 'PMSSS',
    schemeName: 'Post Matric Scholarship for SC/ST/OBC Students',
    department: 'Tribal Development Department',
    benefitType: 'Scholarship',
    maxBenefitAmount: 75000,
    benefitFrequency: 'Annual',
    eligibilityRules: { maxAnnualIncome: 250000, allowedCategories: ['SC', 'ST', 'OBC'], requiresStudentStatus: true },
    requiredDocuments: [
      { docKey: 'aadhaar',        label: 'Aadhaar Card',                     isRequired: true },
      { docKey: 'caste_cert',     label: 'Caste Certificate (SC/ST/OBC)',     isRequired: true },
      { docKey: 'income_cert',    label: 'Family Income Certificate',         isRequired: true },
      { docKey: 'mark_sheet',     label: 'Previous Year Mark Sheet',          isRequired: true },
      { docKey: 'admission_proof',label: 'College/Institution Admission Letter', isRequired: true },
      { docKey: 'fee_receipt',    label: 'Fee Receipt from Institution',       isRequired: true },
      { docKey: 'bank_passbook',  label: 'Bank Passbook (student\'s own account)', isRequired: true },
    ],
    applicationFormFields: [
      { fieldKey: 'institution_name', label: 'College / Institution Name',   fieldType: 'text',   isRequired: true },
      { fieldKey: 'course_name',      label: 'Course Name',                  fieldType: 'text',   isRequired: true },
      { fieldKey: 'year_of_study',    label: 'Current Year of Study',        fieldType: 'number', isRequired: true, validation: { min: 1, max: 7 } },
      { fieldKey: 'enrollment_number',label: 'Enrollment / Roll Number',     fieldType: 'text',   isRequired: true },
      { fieldKey: 'bank_account_number',label: 'Bank Account Number (Student)', fieldType: 'text', isRequired: true },
      { fieldKey: 'ifsc_code',        label: 'IFSC Code',                    fieldType: 'text',   isRequired: true },
    ],
    levelChecklistAdditions: {
      level1: [
        { item: 'Student is currently enrolled — admission letter and fee receipt verified' },
        { item: 'Caste certificate is valid and from an authorised issuing authority' },
      ],
      level2: [{ item: 'Institution is recognised by UGC/AICTE/State Board as applicable' }],
    },
  },

  // ── NAMO-LAKSHMI: Girl Education ────────────────────────────────────────────
  {
    schemeCode: 'NAMO-LAKSHMI',
    schemeName: 'Namo Lakshmi Yojana (Girl Education Support)',
    department: 'Education Department, Gujarat',
    benefitType: 'Scholarship',
    maxBenefitAmount: 50000,
    benefitFrequency: 'Annual',
    eligibilityRules: { minAge: 14, maxAge: 18, maxAnnualIncome: 600000, requiresStudentStatus: true },
    requiredDocuments: [
      { docKey: 'aadhaar',         label: 'Aadhaar Card (Girl Student)',      isRequired: true },
      { docKey: 'school_id',       label: 'School ID Card',                   isRequired: true },
      { docKey: 'income_cert',     label: 'Family Income Certificate',         isRequired: true },
      { docKey: 'bank_passbook',   label: 'Bank Passbook (parent/guardian)',   isRequired: true },
    ],
    applicationFormFields: [
      { fieldKey: 'school_name',      label: 'School Name',                        fieldType: 'text',   isRequired: true },
      { fieldKey: 'school_dise_code', label: 'School DISE Code',                   fieldType: 'text',   isRequired: true, helpText: '11-digit code on school\'s official registration' },
      { fieldKey: 'current_class',    label: 'Current Class (9 / 10 / 11 / 12)',   fieldType: 'select', options: ['9', '10', '11', '12'], isRequired: true },
      { fieldKey: 'enrollment_number',label: 'School Enrollment Number',           fieldType: 'text',   isRequired: true },
      { fieldKey: 'bank_account_number',label: 'Parent/Guardian Bank Account Number', fieldType: 'text', isRequired: true },
      { fieldKey: 'ifsc_code',        label: 'IFSC Code',                          fieldType: 'text',   isRequired: true },
    ],
    levelChecklistAdditions: {
      level1: [
        { item: 'Confirmed the school is a government, government-aided, or registered private school in Gujarat' },
        { item: 'Student is enrolled in Class 9–12 as per school records' },
      ],
    },
  },

  // ── EDU-LOAN-SUBSIDY ────────────────────────────────────────────────────────
  {
    schemeCode: 'EDU-LOAN-SUBSIDY',
    schemeName: 'Interest Subsidy on Education Loan (Gujarat)',
    department: 'Education Department, Gujarat',
    benefitType: 'Subsidy',
    maxBenefitAmount: null,
    benefitFrequency: 'Annual',
    eligibilityRules: { maxAnnualIncome: 450000, requiresStudentStatus: true },
    requiredDocuments: [
      { docKey: 'aadhaar',          label: 'Aadhaar Card',                         isRequired: true },
      { docKey: 'loan_sanction',    label: 'Education Loan Sanction Letter (Bank)', isRequired: true },
      { docKey: 'admission_proof',  label: 'Institution Admission Letter',          isRequired: true },
      { docKey: 'income_cert',      label: 'Family Income Certificate',              isRequired: true },
      { docKey: 'loan_passbook',    label: 'Loan Account Passbook / Statement',     isRequired: true },
    ],
    applicationFormFields: [
      { fieldKey: 'bank_name',       label: 'Lending Bank Name',        fieldType: 'text',   isRequired: true },
      { fieldKey: 'loan_account_no', label: 'Loan Account Number',      fieldType: 'text',   isRequired: true },
      { fieldKey: 'loan_amount',     label: 'Sanctioned Loan Amount (₹)', fieldType: 'number', isRequired: true },
      { fieldKey: 'course_name',     label: 'Course / Degree Name',     fieldType: 'text',   isRequired: true },
      { fieldKey: 'institution_name',label: 'Institution Name',         fieldType: 'text',   isRequired: true },
    ],
    levelChecklistAdditions: {
      level1: [{ item: 'Loan sanction letter is from a scheduled bank and is for a qualifying course' }],
      level2: [{ item: 'Loan amount and interest rate verified against bank statement' }],
    },
  },

  // ── NFSA-PHH: PHH Ration Card ────────────────────────────────────────────────
  {
    schemeCode: 'NFSA-PHH',
    schemeName: 'NFSA Priority Household Ration Card',
    department: 'Food, Civil Supplies & Consumer Affairs',
    benefitType: 'InKind',
    maxBenefitAmount: null,
    benefitFrequency: 'Monthly',
    eligibilityRules: { maxAnnualIncome: 150000 },
    requiredDocuments: [
      { docKey: 'aadhaar',        label: 'Aadhaar Card of all family members', isRequired: true },
      { docKey: 'income_cert',    label: 'Family Income Certificate',           isRequired: true },
      { docKey: 'residence_proof',label: 'Residence Proof',                     isRequired: true },
    ],
    applicationFormFields: [
      { fieldKey: 'total_family_members', label: 'Total Family Members', fieldType: 'number', isRequired: true, validation: { min: 1, max: 20 } },
      { fieldKey: 'existing_ration_card', label: 'Existing Ration Card Number (if any)', fieldType: 'text', isRequired: false },
    ],
    levelChecklistAdditions: {
      level1: [
        { item: 'Confirmed family does not already have a valid PHH/AAY ration card' },
        { item: 'All family members\' Aadhaar cards collected and seeding done' },
      ],
    },
  },

  // ── NFSA-AAY: Antyodaya Ration Card ─────────────────────────────────────────
  {
    schemeCode: 'NFSA-AAY',
    schemeName: 'Antyodaya Anna Yojana Ration Card',
    department: 'Food, Civil Supplies & Consumer Affairs',
    benefitType: 'InKind',
    maxBenefitAmount: null,
    benefitFrequency: 'Monthly',
    eligibilityRules: { requiredBplStatus: true, maxAnnualIncome: 60000, allowedRationTypes: ['AAY'] },
    requiredDocuments: [
      { docKey: 'aadhaar',        label: 'Aadhaar Card of all family members',        isRequired: true },
      { docKey: 'income_cert',    label: 'Income Certificate (< ₹60,000 annual)',      isRequired: true },
      { docKey: 'bpl_cert',       label: 'BPL Certificate / Poverty Proof',            isRequired: true },
    ],
    applicationFormFields: [
      { fieldKey: 'total_family_members', label: 'Total Family Members', fieldType: 'number', isRequired: true, validation: { min: 1, max: 20 } },
    ],
    levelChecklistAdditions: {
      level1: [{ item: 'Confirmed family is in the destitute/poorest category — AAY criteria met' }],
    },
  },

  // ── MANAV-GARIMA: SC Self-Employment ────────────────────────────────────────
  {
    schemeCode: 'MANAV-GARIMA',
    schemeName: 'Manav Garima Yojana (SC Self-Employment Toolkit)',
    department: 'Social Justice & Empowerment, Gujarat',
    benefitType: 'InKind',
    maxBenefitAmount: 4000,
    benefitFrequency: 'OneTime',
    eligibilityRules: { maxAnnualIncome: 120000, allowedCategories: ['SC'], requiredBplStatus: true },
    requiredDocuments: [
      { docKey: 'aadhaar',     label: 'Aadhaar Card',                    isRequired: true },
      { docKey: 'caste_cert',  label: 'Scheduled Caste Certificate',      isRequired: true },
      { docKey: 'income_cert', label: 'Income Certificate',               isRequired: true },
      { docKey: 'bpl_card',    label: 'BPL Ration Card',                  isRequired: true },
    ],
    applicationFormFields: [
      { fieldKey: 'trade_type', label: 'Trade / Occupation for which toolkit is requested', fieldType: 'select',
        options: ['Carpenter', 'Tailor', 'Welder', 'Plumber', 'Electrician', 'Cobbler', 'Barber', 'Potter', 'Blacksmith', 'Vegetable Vendor', 'Washer Man', 'Papad Making', 'Embroidery', 'Other'],
        isRequired: true,
      },
      { fieldKey: 'trade_experience_years', label: 'Years of Experience in this Trade', fieldType: 'number', isRequired: true, validation: { min: 0, max: 50 } },
    ],
    levelChecklistAdditions: {
      level1: [
        { item: 'Applicant\'s trade/occupation confirmed through observation or demonstration' },
        { item: 'Toolkit type matches the declared trade' },
      ],
    },
  },

  // ── KUVARBAINU-MAMERU: Marriage Assistance ──────────────────────────────────
  {
    schemeCode: 'KUVARBAINU-MAMERU',
    schemeName: 'Kuvarbainu Mameru Yojana (Marriage Assistance)',
    department: 'Social Justice & Empowerment, Gujarat',
    benefitType: 'Cash',
    maxBenefitAmount: 12000,
    benefitFrequency: 'OneTime',
    eligibilityRules: { minAge: 18, maxAge: 35, maxAnnualIncome: 600000, allowedCategories: ['SC', 'ST', 'OBC', 'EWS'] },
    requiredDocuments: [
      { docKey: 'aadhaar',       label: 'Aadhaar Card (Bride)',                          isRequired: true },
      { docKey: 'caste_cert',    label: 'Caste Certificate',                              isRequired: true },
      { docKey: 'income_cert',   label: 'Family Income Certificate',                      isRequired: true },
      { docKey: 'marriage_cert', label: 'Marriage Registration Certificate',              isRequired: true },
      { docKey: 'groom_age_proof',label: 'Age Proof of Groom (must be 21+)',             isRequired: true },
      { docKey: 'bank_passbook', label: 'Bank Passbook (Bride\'s own account)',           isRequired: true },
    ],
    applicationFormFields: [
      { fieldKey: 'groom_name',          label: 'Groom\'s Name',          fieldType: 'text', isRequired: true },
      { fieldKey: 'groom_date_of_birth', label: 'Groom\'s Date of Birth', fieldType: 'date', isRequired: true },
      { fieldKey: 'marriage_date',       label: 'Date of Marriage',        fieldType: 'date', isRequired: true },
      { fieldKey: 'registration_number', label: 'Marriage Registration Number', fieldType: 'text', isRequired: true },
      { fieldKey: 'bank_account_number', label: 'Bride\'s Bank Account Number', fieldType: 'text', isRequired: true },
      { fieldKey: 'ifsc_code',           label: 'IFSC Code',              fieldType: 'text', isRequired: true },
    ],
    levelChecklistAdditions: {
      level1: [
        { item: 'Bride\'s age confirmed ≥ 18 years at marriage date' },
        { item: 'Groom\'s age confirmed ≥ 21 years at marriage date' },
        { item: 'This is the first or second marriage in the family (max 2 daughters benefit)' },
      ],
    },
  },

  // ── PM-KISAN: Farmer Income Support ─────────────────────────────────────────
  {
    schemeCode: 'PM-KISAN',
    schemeName: 'PM Kisan Samman Nidhi',
    department: 'Agriculture & Farmers Welfare',
    benefitType: 'Cash',
    maxBenefitAmount: 6000,
    benefitFrequency: 'Annual',
    eligibilityRules: { maxAnnualIncome: 200000, requiresFarmerStatus: true },
    requiredDocuments: [
      { docKey: 'aadhaar',       label: 'Aadhaar Card',                   isRequired: true },
      { docKey: 'land_record',   label: '7/12 Utara (Land Record)',        isRequired: true, description: 'Must show land ownership in applicant\'s name' },
      { docKey: 'bank_passbook', label: 'Bank Passbook',                   isRequired: true },
    ],
    applicationFormFields: [
      { fieldKey: 'land_area_hectares',  label: 'Total Agricultural Land (in Hectares)', fieldType: 'number', isRequired: true, validation: { min: 0.01 } },
      { fieldKey: 'survey_number',       label: 'Land Survey Number (7/12)',             fieldType: 'text',   isRequired: true },
      { fieldKey: 'bank_account_number', label: 'Bank Account Number',                  fieldType: 'text',   isRequired: true },
      { fieldKey: 'ifsc_code',           label: 'IFSC Code',                            fieldType: 'text',   isRequired: true },
    ],
    levelChecklistAdditions: {
      level1: [
        { item: 'Applicant is an active farmer — verified with 7/12 Utara land record' },
        { item: 'Land ownership is in the applicant\'s name (not rented/leased)' },
        { item: 'Applicant is NOT a government employee, income taxpayer, or institutional land owner' },
      ],
      level2: [{ item: 'Land records cross-checked with taluka land record office (e-Dhara)' }],
    },
  },

  // ── MAHILA-KISAN: Women Farmer ──────────────────────────────────────────────
  {
    schemeCode: 'MAHILA-KISAN',
    schemeName: 'Mukhya Mantri Mahila Kisan Sashaktikaran Yojana',
    department: 'Agriculture, Gujarat',
    benefitType: 'Cash',
    maxBenefitAmount: 10000,
    benefitFrequency: 'OneTime',
    eligibilityRules: { maxAnnualIncome: 200000, allowedCategories: ['SC', 'ST', 'OBC', 'EWS'], requiresFarmerStatus: true },
    requiredDocuments: [
      { docKey: 'aadhaar',       label: 'Aadhaar Card',          isRequired: true },
      { docKey: 'land_record',   label: '7/12 Utara (Land)',      isRequired: true },
      { docKey: 'caste_cert',    label: 'Caste Certificate',       isRequired: true },
      { docKey: 'bank_passbook', label: 'Bank Passbook',           isRequired: true },
    ],
    applicationFormFields: [
      { fieldKey: 'land_area_hectares',  label: 'Agricultural Land (hectares)',    fieldType: 'number', isRequired: true },
      { fieldKey: 'crop_type',           label: 'Main Crop Cultivated',            fieldType: 'text',   isRequired: true },
      { fieldKey: 'bank_account_number', label: 'Bank Account Number (in own name)', fieldType: 'text', isRequired: true },
      { fieldKey: 'ifsc_code',           label: 'IFSC Code',                       fieldType: 'text',   isRequired: true },
    ],
    levelChecklistAdditions: {
      level1: [{ item: 'Applicant is a woman farmer — land record and gender confirmed' }],
    },
  },

  // ── PMJAY: Ayushman Bharat ──────────────────────────────────────────────────
  {
    schemeCode: 'PMJAY',
    schemeName: 'Pradhan Mantri Jan Arogya Yojana (Ayushman Bharat)',
    department: 'Health & Family Welfare',
    benefitType: 'InKind',
    maxBenefitAmount: 500000,
    benefitFrequency: 'Annual',
    eligibilityRules: { requiredBplStatus: true, allowedRationTypes: ['PHH', 'AAY'] },
    requiredDocuments: [
      { docKey: 'aadhaar',        label: 'Aadhaar Card (all family members)',   isRequired: true },
      { docKey: 'ration_card',    label: 'PHH or AAY Ration Card',              isRequired: true },
      { docKey: 'income_cert',    label: 'Income / BPL Certificate',            isRequired: true },
    ],
    applicationFormFields: [
      { fieldKey: 'total_family_members', label: 'Total Family Members to be covered', fieldType: 'number', isRequired: true },
      { fieldKey: 'existing_ayushman_id', label: 'Existing Ayushman Bharat ID (if any)', fieldType: 'text', isRequired: false },
    ],
    levelChecklistAdditions: {
      level1: [
        { item: 'Family has a valid PHH or AAY ration card — verified physically' },
        { item: 'Family does NOT already have an active Ayushman Bharat card' },
      ],
    },
  },

  // ── BOCW-WELFARE: Construction Worker ──────────────────────────────────────
  {
    schemeCode: 'BOCW-WELFARE',
    schemeName: 'Gujarat BOCW Construction Worker Welfare Scheme',
    department: 'Labour & Employment, Gujarat',
    benefitType: 'Cash',
    maxBenefitAmount: 200000,
    benefitFrequency: 'AsNeeded',
    eligibilityRules: { minAge: 18, maxAge: 60, maxAnnualIncome: 180000, requiresBOCWWorker: true },
    requiredDocuments: [
      { docKey: 'aadhaar',        label: 'Aadhaar Card',                          isRequired: true },
      { docKey: 'bocw_reg_card',  label: 'BOCW (Building & Other Construction Workers) Registration Card', isRequired: true },
      { docKey: 'employer_cert',  label: 'Employer Certificate / Work Site Certificate', isRequired: true },
      { docKey: 'income_cert',    label: 'Income Certificate',                    isRequired: true },
      { docKey: 'bank_passbook',  label: 'Bank Passbook',                         isRequired: true },
    ],
    applicationFormFields: [
      { fieldKey: 'bocw_reg_number',     label: 'BOCW Registration Number',         fieldType: 'text',   isRequired: true },
      { fieldKey: 'bocw_reg_date',       label: 'BOCW Registration Date',           fieldType: 'date',   isRequired: true },
      { fieldKey: 'employer_name',       label: 'Current / Last Employer Name',     fieldType: 'text',   isRequired: true },
      { fieldKey: 'work_site_address',   label: 'Work Site Address',               fieldType: 'text',   isRequired: true },
      { fieldKey: 'years_in_construction', label: 'Years Working in Construction', fieldType: 'number', isRequired: true, validation: { min: 1 } },
      { fieldKey: 'benefit_requested',   label: 'Benefit Being Claimed',           fieldType: 'select',
        options: ['Accident Insurance', 'Death Benefit', 'House Construction Aid', 'Skill Development', 'Education of Children', 'Medical Benefit', 'Pension'],
        isRequired: true,
      },
      { fieldKey: 'bank_account_number', label: 'Bank Account Number',             fieldType: 'text',   isRequired: true },
      { fieldKey: 'ifsc_code',           label: 'IFSC Code',                       fieldType: 'text',   isRequired: true },
    ],
    levelChecklistAdditions: {
      level1: [
        { item: 'BOCW registration card is valid and not expired' },
        { item: 'Employer certificate confirms at least 90 days of work in the last 12 months' },
        { item: 'Work site is within Gujarat — confirmed on employer certificate' },
      ],
      level2: [{ item: 'BOCW registration verified against Gujarat Labour Department database' }],
      level3: [{ item: 'Benefit type confirmed as covered under current BOCW welfare fund guidelines' }],
    },
  },
];

module.exports = SCHEMES;
