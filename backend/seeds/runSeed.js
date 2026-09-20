'use strict';

// Run with:  npm run seed
// Seeds 20 schemes + full officer hierarchy for the 3-level approval pipeline.

require('dotenv').config();
const mongoose = require('mongoose');
const Scheme = require('../src/models/Scheme');
const Officer = require('../src/models/Officer');
const SCHEMES = require('./schemes');

// Level 3 — Super Admin (can override any level, sees all districts)
const SUPER_ADMIN = {
  officerId: 'ADMIN-001',
  name: 'Nagrik Super Admin',
  email: 'admin@nagrik.gov.in',
  passwordHash: 'Admin@12345',
  role: 'Admin',
  jurisdiction: { district: 'All' },
};

// Full demo officer hierarchy for Gandhinagar district
const DEMO_OFFICERS = [
  // ── Level 1: Village Clerks (Talati) ────────────────────────────────────
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

  // ── Level 2: Taluka Supervisors (Mamlatdar) ──────────────────────────────
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

  // ── Level 3: District Officers ───────────────────────────────────────────
  {
    officerId: 'DO-001',
    name: 'Priya Mehta',
    email: 'priya.do@nagrik.gov.in',
    passwordHash: 'Officer@12345',
    role: 'DistrictOfficer',
    jurisdiction: { district: 'Gandhinagar' },
  },
];

const runSeed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to Atlas for seeding');

  // Upsert schemes — safe to re-run
  for (const scheme of SCHEMES) {
    await Scheme.findOneAndUpdate(
      { schemeCode: scheme.schemeCode },
      scheme,
      { upsert: true, returnDocument: 'after' }
    );
  }
  console.log(`✅ ${SCHEMES.length} schemes seeded`);

  // Create officers only if missing — use new+save() so bcrypt pre-save hook fires
  for (const officerData of [SUPER_ADMIN, ...DEMO_OFFICERS]) {
    const exists = await Officer.findOne({ officerId: officerData.officerId });
    if (!exists) {
      const officer = new Officer(officerData);
      await officer.save();
    }
  }
  console.log(`✅ ${1 + DEMO_OFFICERS.length} officers seeded (3-level hierarchy)`);

  await mongoose.disconnect();
  console.log('✅ Seeding complete');
};

runSeed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
