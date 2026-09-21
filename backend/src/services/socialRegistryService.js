'use strict';

const Family = require('../models/Family');
const Member = require('../models/Member');
const SocialRegistry = require('../models/SocialRegistry');

/**
 * Computes a multidimensional deprivation score (0-100) and vulnerability tier
 * for a family, modeled on established social registries (Haryana PPP, SECC, SPDP).
 */
const computeDeprivationScore = async (familyId) => {
  const family = await Family.findById(familyId);
  if (!family) {
    throw new Error(`Family ${familyId} not found`);
  }

  const members = await Member.find({ familyId: family._id, lifecycleStatus: 'Active' });
  const factors = [];
  let score = 0;

  // 1. Income Deprivation
  const income = Number(family.annualIncome || 0);
  if (income <= 50000) {
    score += 25;
    factors.push({
      factorCode: 'EXTREME_LOW_INCOME',
      factorName: 'Ultra-Low Income Household',
      scoreContribution: 25,
      explanation: `Annual family income ₹${income.toLocaleString('en-IN')} is below ₹50,000`,
    });
  } else if (income <= 100000) {
    score += 15;
    factors.push({
      factorCode: 'LOW_INCOME',
      factorName: 'Low Income Household',
      scoreContribution: 15,
      explanation: `Annual family income ₹${income.toLocaleString('en-IN')} is between ₹50,000 and ₹1,00,000`,
    });
  } else if (income <= 250000) {
    score += 8;
    factors.push({
      factorCode: 'BELOW_AVERAGE_INCOME',
      factorName: 'Below Average Income',
      scoreContribution: 8,
      explanation: `Annual family income ₹${income.toLocaleString('en-IN')} is between ₹1,00,000 and ₹2,50,000`,
    });
  }

  // 2. Ration & Food Security
  const rationType = family.rationCardType || '';
  if (rationType === 'AAY') {
    score += 20;
    factors.push({
      factorCode: 'AAY_RATION_CARD',
      factorName: 'Antyodaya Anna Yojana (Poorest of Poor)',
      scoreContribution: 20,
      explanation: 'Holds Antyodaya Anna Yojana (AAY) ration card',
    });
  } else if (family.isBPL || rationType === 'PHH') {
    score += 15;
    factors.push({
      factorCode: 'BPL_PHH_STATUS',
      factorName: 'Priority Household / Below Poverty Line',
      scoreContribution: 15,
      explanation: 'Verified BPL or Priority Household status under NFSA',
    });
  }

  // 3. Housing & Dwelling Conditions
  const dwelling = family.household?.dwellingType || (family.hasPuccaHouse ? 'Pucca' : 'Kutcha');
  if (dwelling === 'Kutcha' || !family.hasPuccaHouse) {
    score += 15;
    factors.push({
      factorCode: 'KUTCHA_DWELLING',
      factorName: 'Deprived Housing (Kutcha / Mud & Thatch)',
      scoreContribution: 15,
      explanation: 'Family resides in non-permanent kutcha housing without pucca construction',
    });
  } else if (dwelling === 'SemiPucca') {
    score += 8;
    factors.push({
      factorCode: 'SEMI_PUCCA_DWELLING',
      factorName: 'Semi-Pucca Housing',
      scoreContribution: 8,
      explanation: 'Family resides in semi-permanent dwelling',
    });
  }

  if (family.household && !family.household.toiletAvailable) {
    score += 5;
    factors.push({
      factorCode: 'NO_SANITARY_TOILET',
      factorName: 'Lack of Sanitary Toilet Facility',
      scoreContribution: 5,
      explanation: 'No individual household latrine available',
    });
  }

  if (family.household && !family.household.electricityConnection) {
    score += 5;
    factors.push({
      factorCode: 'NO_ELECTRICITY',
      factorName: 'Unelectrified Household',
      scoreContribution: 5,
      explanation: 'No domestic electricity connection',
    });
  }

  // 4. Land & Asset Deprivation
  const land = Number(family.socioeconomic?.landHolding || 0);
  if (land === 0 && (family.socioeconomic?.primaryLivelihood === 'Labour' || family.socioeconomic?.primaryLivelihood === 'Agriculture')) {
    score += 10;
    factors.push({
      factorCode: 'LANDLESS_LABOUR',
      factorName: 'Landless Agricultural/Daily Wage Labourer',
      scoreContribution: 10,
      explanation: 'No agricultural land ownership with primary dependence on manual labour',
    });
  } else if (land > 0 && land < 1.0) {
    score += 6;
    factors.push({
      factorCode: 'MARGINAL_FARMER',
      factorName: 'Marginal Land Holding (< 1 Acre)',
      scoreContribution: 6,
      explanation: `Land holding of ${land} acres qualifies as marginal agriculturalist`,
    });
  }

  // 5. Demographic Vulnerability & Dependency
  const total = members.length || 1;
  const earners = members.filter(m => m.occupation && m.occupation !== 'Unemployed' && m.age >= 18).length;
  const dependents = total - earners;
  const hasDisabled = members.some(m => m.hasDisability);
  const seniors = members.filter(m => m.age >= 60);
  const children = members.filter(m => m.age < 18);

  if (hasDisabled) {
    score += 12;
    factors.push({
      factorCode: 'DISABILITY_PRESENT',
      factorName: 'Member with Benchmark Disability',
      scoreContribution: 12,
      explanation: 'Household includes one or more persons with disabilities',
    });
  }

  if (seniors.length > 0 && earners === 0) {
    score += 15;
    factors.push({
      factorCode: 'ELDERLY_WITHOUT_EARNER',
      factorName: 'Senior Citizen Household with No Earning Adult',
      scoreContribution: 15,
      explanation: 'Senior citizens living without working age earning adult support',
    });
  }

  const dependencyRatio = dependents / total;
  if (dependencyRatio >= 0.75 && total >= 3) {
    score += 8;
    factors.push({
      factorCode: 'HIGH_DEPENDENCY_RATIO',
      factorName: 'High Demographic Dependency Burden',
      scoreContribution: 8,
      explanation: `${dependents} of ${total} household members are dependents`,
    });
  }

  // Cap at 100
  score = Math.min(100, Math.max(0, score));

  // Determine vulnerability tier
  let registryTier = 'AboveThreshold';
  if (score >= 70) {
    registryTier = 'MostVulnerable';
  } else if (score >= 45) {
    registryTier = 'Vulnerable';
  } else if (score >= 25) {
    registryTier = 'Moderate';
  }

  // Determine geographic classification
  let geographicClassification = 'Rural';
  const village = family.address?.village || '';
  const district = family.address?.district || '';
  if (/nagar|city|metro|urban|municipal/i.test(village)) {
    geographicClassification = 'Urban';
  } else if (/dangs|dahod|chhotaudepur|narmada|tapi/i.test(district)) {
    geographicClassification = 'Tribal';
  }

  // Save or update SocialRegistry record
  const updateData = {
    familyId: family._id,
    deprivationScore: score,
    registryTier,
    geographicClassification,
    deprivationFactors: factors,
    metrics: {
      annualIncome: income,
      isBPL: !!family.isBPL,
      rationCardType: rationType,
      dwellingType: dwelling,
      landHolding: land,
      hasDisabledMember: hasDisabled,
      hasSeniorCitizen: seniors.length > 0,
      hasChildren: children.length > 0,
      earningMemberCount: earners,
      dependentCount: dependents,
      deprivationRatio: Number(dependencyRatio.toFixed(2)),
    },
    district: family.address?.district || 'Gujarat',
    taluka: family.address?.taluka || '',
    village: family.address?.village || '',
    lastComputedAt: new Date(),
    computationVersion: 'v2.0',
  };

  const registryEntry = await SocialRegistry.findOneAndUpdate(
    { familyId: family._id },
    updateData,
    { upsert: true, new: true }
  );

  return registryEntry;
};

/**
 * Recalculates deprivation scores for all families in a given filter.
 */
const batchRecalculate = async (filters = {}) => {
  const query = {};
  if (filters.district) query['address.district'] = new RegExp(filters.district, 'i');
  if (filters.taluka) query['address.taluka'] = new RegExp(filters.taluka, 'i');

  const families = await Family.find(query).select('_id');
  const results = { total: families.length, processed: 0, errors: 0 };

  for (const f of families) {
    try {
      await computeDeprivationScore(f._id);
      results.processed++;
    } catch (err) {
      results.errors++;
    }
  }

  return results;
};

/**
 * Returns comprehensive aggregate stats for the Social Registry overview.
 */
const getRegistryOverview = async (filters = {}) => {
  const query = {};
  if (filters.district) query.district = new RegExp(filters.district, 'i');

  const totalRegistered = await SocialRegistry.countDocuments(query);

  const tierAggregation = await SocialRegistry.aggregate([
    { $match: query },
    { $group: { _id: '$registryTier', count: { $sum: 1 }, avgScore: { $avg: '$deprivationScore' } } },
  ]);

  const geoAggregation = await SocialRegistry.aggregate([
    { $match: query },
    { $group: { _id: '$geographicClassification', count: { $sum: 1 } } },
  ]);

  const districtAggregation = await SocialRegistry.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$district',
        count: { $sum: 1 },
        avgScore: { $avg: '$deprivationScore' },
        mostVulnerableCount: {
          $sum: { $cond: [{ $eq: ['$registryTier', 'MostVulnerable'] }, 1, 0] },
        },
      },
    },
    { $sort: { avgScore: -1 } },
    { $limit: 10 },
  ]);

  const topFactors = await SocialRegistry.aggregate([
    { $match: query },
    { $unwind: '$deprivationFactors' },
    {
      $group: {
        _id: '$deprivationFactors.factorName',
        count: { $sum: 1 },
        factorCode: { $first: '$deprivationFactors.factorCode' },
        avgImpact: { $avg: '$deprivationFactors.scoreContribution' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 8 },
  ]);

  const tierMap = {
    MostVulnerable: 0,
    Vulnerable: 0,
    Moderate: 0,
    AboveThreshold: 0,
  };
  tierAggregation.forEach(t => {
    if (tierMap[t._id] !== undefined) tierMap[t._id] = t.count;
  });

  return {
    totalRegistered,
    tierBreakdown: tierMap,
    geographicBreakdown: geoAggregation.reduce((acc, g) => ({ ...acc, [g._id]: g.count }), {}),
    topDistricts: districtAggregation,
    topDeprivationFactors: topFactors,
  };
};

module.exports = {
  computeDeprivationScore,
  batchRecalculate,
  getRegistryOverview,
};
