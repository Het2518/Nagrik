'use strict';

const Scheme = require('../models/Scheme');

// ── Generic level checklists (apply to ALL schemes) ───────────────────────────
const GENERIC_LEVEL_CHECKLISTS = {
  1: [ // Talati — physical/field verification
    { item: 'Aadhaar card physically verified against applicant face' },
    { item: 'Applicant is a genuine resident of the declared village' },
    { item: 'Ration card type (AAY/PHH/APL) matches application claim' },
    { item: 'Income certificate is valid and within the last 12 months' },
    { item: 'Caste/category certificate is genuine and matches records' },
    { item: 'All scheme-specific required documents are present and original' },
    { item: 'Applicant is aware of the scheme terms and benefits' },
  ],
  2: [ // Mamlatdar — taluka-level records cross-check
    { item: 'Talati field report reviewed and consistent with uploaded documents' },
    { item: 'Income verified against 7/12 Utara (land records) where applicable' },
    { item: 'No duplicate application from the same family in another village' },
    { item: 'Caste certificate verified against taluka official records' },
    { item: 'BPL status cross-checked with SECC / ration card database' },
    { item: 'Applicant not already receiving a conflicting scheme benefit' },
  ],
  3: [ // District Officer / Admin — final sanction
    { item: 'Complete file reviewed including all level 1 and level 2 reports' },
    { item: 'Eligibility confirmed against district BPL / SECC data' },
    { item: 'All risk flags reviewed and resolved' },
    { item: 'Budget availability confirmed for this scheme this financial year' },
    { item: 'Bank details of beneficiary verified for DBT transfer' },
    { item: 'Sanction order can be legally issued under scheme guidelines' },
  ],
};

// ── Fetch merged checklist for a given scheme and officer level ───────────────
// Returns: generic items + scheme-specific additions, all unchecked by default.
const getChecklistForSchemeAndLevel = async (schemeId, level) => {
  const genericItems = (GENERIC_LEVEL_CHECKLISTS[level] || []).map((i) => ({
    ...i, checked: false, note: '', source: 'generic',
  }));

  const scheme = await Scheme.findById(schemeId).select('levelChecklistAdditions requiredDocuments schemeName');
  if (!scheme) return genericItems;

  // Add scheme-specific checklist items for this level
  const levelKey = `level${level}`;
  const schemeItems = (scheme.levelChecklistAdditions?.[levelKey] || []).map((i) => ({
    item: i.item, checked: false, note: '', source: 'scheme-specific',
  }));

  // Always add a document verification item per required document
  const docItems = (scheme.requiredDocuments || []).map((doc) => ({
    item: `Verified document: ${doc.label}${doc.description ? ` — ${doc.description}` : ''}`,
    checked: false,
    note: '',
    source: 'document',
  }));

  return [...genericItems, ...docItems, ...schemeItems];
};

// ── Sync version (uses pre-fetched scheme) — for use inside controllers ───────
const buildChecklist = (scheme, level) => {
  const genericItems = (GENERIC_LEVEL_CHECKLISTS[level] || []).map((i) => ({
    ...i, checked: false, note: '', source: 'generic',
  }));

  const levelKey = `level${level}`;
  const schemeItems = (scheme?.levelChecklistAdditions?.[levelKey] || []).map((i) => ({
    item: i.item, checked: false, note: '', source: 'scheme-specific',
  }));

  const docItems = (scheme?.requiredDocuments || []).map((doc) => ({
    item: `Verified document: ${doc.label}`,
    checked: false,
    note: '',
    source: 'document',
  }));

  return [...genericItems, ...docItems, ...schemeItems];
};

// ── Validate required scheme-specific form fields ─────────────────────────────
// Returns array of missing/invalid field labels. Empty = all valid.
const validateSchemeFormData = (scheme, submittedData = {}) => {
  const errors = [];
  for (const field of scheme.applicationFormFields || []) {
    if (!field.isRequired) continue;
    const value = submittedData[field.fieldKey];
    if (value === undefined || value === null || value === '') {
      errors.push(`'${field.label}' is required for ${scheme.schemeName}`);
      continue;
    }
    if (field.fieldType === 'number') {
      if (field.validation?.min !== undefined && Number(value) < field.validation.min)
        errors.push(`'${field.label}' must be at least ${field.validation.min}`);
      if (field.validation?.max !== undefined && Number(value) > field.validation.max)
        errors.push(`'${field.label}' must be at most ${field.validation.max}`);
    }
    if (field.fieldType === 'select' && field.options?.length && !field.options.includes(value))
      errors.push(`'${field.label}' must be one of: ${field.options.join(', ')}`);
  }
  return errors;
};

// ── Validate required documents ───────────────────────────────────────────────
// Returns array of missing required document labels. Empty = all good.
const validateRequiredDocuments = (scheme, submittedDocumentKeys = []) => {
  const missing = [];
  for (const doc of scheme.requiredDocuments || []) {
    if (doc.isRequired && !submittedDocumentKeys.includes(doc.docKey)) {
      missing.push(doc.label);
    }
  }
  return missing;
};

// Returns unchecked mandatory checklist items
const getUncheckedItems = (checklist) =>
  checklist.filter((item) => !item.checked).map((item) => item.item);

module.exports = {
  getChecklistForSchemeAndLevel,
  buildChecklist,
  validateSchemeFormData,
  validateRequiredDocuments,
  getUncheckedItems,
  GENERIC_LEVEL_CHECKLISTS,
};
