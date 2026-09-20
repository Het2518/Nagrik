import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, CheckCircle2, AlertCircle, Info, Sparkles } from 'lucide-react';
import { schemeService } from '../../services/schemeService';
import { eligibilityService } from '../../services/eligibilityService';
import { useAuthStore } from '../../store/authStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import styles from './SchemesPage.module.css';

const CATEGORIES = ['All', 'Housing', 'Education', 'Health', 'Pension', 'Agriculture', 'Employment', 'Disability', 'Women'];

export default function SchemesPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [eligibilityFilter, setEligibilityFilter] = useState('ALL'); // 'ALL' | 'ELIGIBLE' | 'INELIGIBLE'

  const { data: schemesData, isLoading } = useQuery({
    queryKey: ['schemes'],
    queryFn: () => schemeService.list(),
  });

  const { data: eligibilityData } = useQuery({
    queryKey: ['eligibility', user?.familyId],
    queryFn: () => eligibilityService.check(user.familyId),
    enabled: !!user?.familyId,
  });

  // Build a comprehensive lookup map: schemeCode & schemeId → family eligibility
  const schemeEligibilityMap = {};
  if (eligibilityData?.eligibility) {
    for (const memberEl of eligibilityData.eligibility) {
      // 1. Eligible schemes for this member
      for (const s of memberEl.eligibleSchemes || []) {
        const codeKey = s.schemeCode;
        const idKey = s.schemeId?.toString();

        const record = schemeEligibilityMap[codeKey] || {
          isEligible: true,
          qualifyingMembers: [],
          satisfiedRules: s.satisfiedRules || s.why || [],
          failedRules: [],
          applicationStatus: s.applicationStatus || null,
        };

        record.isEligible = true;
        if (!record.qualifyingMembers.some((m) => m.memberId === memberEl.memberId)) {
          record.qualifyingMembers.push({
            memberId: memberEl.memberId,
            name: memberEl.memberName,
            age: memberEl.age,
          });
        }

        schemeEligibilityMap[codeKey] = record;
        if (idKey) schemeEligibilityMap[idKey] = record;
      }

      // 2. Ineligible schemes for this member
      for (const s of memberEl.ineligibleSchemes || []) {
        const codeKey = s.schemeCode;
        const idKey = s.schemeId?.toString();

        if (!schemeEligibilityMap[codeKey]) {
          const record = {
            isEligible: false,
            qualifyingMembers: [],
            satisfiedRules: [],
            failedRules: [...(s.failedRules || s.reasons || [])],
            applicationStatus: s.applicationStatus || null,
          };
          schemeEligibilityMap[codeKey] = record;
          if (idKey) schemeEligibilityMap[idKey] = record;
        } else if (!schemeEligibilityMap[codeKey].isEligible) {
          // Accumulate reasons if not already marked eligible by another member
          for (const r of s.failedRules || s.reasons || []) {
            if (!schemeEligibilityMap[codeKey].failedRules.includes(r)) {
              schemeEligibilityMap[codeKey].failedRules.push(r);
            }
          }
        }
      }
    }
  }

  const allSchemes = schemesData?.schemes || [];

  // Filter schemes
  const filteredSchemes = allSchemes.filter((s) => {
    const matchSearch = !search ||
      s.schemeName.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase()) ||
      s.schemeCode?.toLowerCase().includes(search.toLowerCase());

    const matchCategory = activeCategory === 'All' || s.category === activeCategory;

    const elig = schemeEligibilityMap[s.schemeCode] || schemeEligibilityMap[s._id];
    const isEligible = user?.familyId && eligibilityData ? (elig?.isEligible === true) : true;

    let matchEligibility = true;
    if (eligibilityFilter === 'ELIGIBLE') {
      matchEligibility = isEligible === true;
    } else if (eligibilityFilter === 'INELIGIBLE') {
      matchEligibility = isEligible === false;
    }

    return matchSearch && matchCategory && matchEligibility;
  });

  // Calculate counts for badges
  const eligibleCount = allSchemes.filter((s) => {
    const elig = schemeEligibilityMap[s.schemeCode] || schemeEligibilityMap[s._id];
    return elig?.isEligible === true;
  }).length;

  const ineligibleCount = allSchemes.length - eligibleCount;

  return (
    <div className={`${styles.page} animate-fade-in`}>
      <div className={styles.pageHeader}>
        <div>
          <h1>{t('schemes.title')}</h1>
          <p>{t('schemes.subtitle')}</p>
        </div>
      </div>

      {/* ── Search & Filter Controls ─────────────────────── */}
      <div className={styles.searchBar}>
        <Search size={18} className={styles.searchIcon} aria-hidden="true" />
        <input
          type="search"
          placeholder={t('schemes.search_placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
          aria-label={t('schemes.search_placeholder')}
        />
      </div>

      {/* ── Eligibility Quick Filter Bar (Citizen Specific) ─── */}
      {user?.familyId && eligibilityData && (
        <div className={styles.eligibilityFilterBar} role="group" aria-label="Filter by eligibility">
          <button
            className={`${styles.filterPill} ${eligibilityFilter === 'ALL' ? styles.filterPillActive : ''}`}
            onClick={() => setEligibilityFilter('ALL')}
          >
            All Schemes ({allSchemes.length})
          </button>
          <button
            className={`${styles.filterPill} ${styles.filterPillEligible} ${eligibilityFilter === 'ELIGIBLE' ? styles.filterPillActive : ''}`}
            onClick={() => setEligibilityFilter('ELIGIBLE')}
          >
            <Sparkles size={13} /> Eligible for My Family ({eligibleCount})
          </button>
          <button
            className={`${styles.filterPill} ${eligibilityFilter === 'INELIGIBLE' ? styles.filterPillActive : ''}`}
            onClick={() => setEligibilityFilter('INELIGIBLE')}
          >
            Other Schemes ({ineligibleCount})
          </button>
        </div>
      )}

      {/* ── Category Filters ─────────────────────────────── */}
      <div className={styles.categories} role="group" aria-label="Filter by category">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`${styles.catPill} ${activeCategory === cat ? styles.catPillActive : ''}`}
            onClick={() => setActiveCategory(cat)}
            aria-pressed={activeCategory === cat}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Schemes Grid ─────────────────────────────────── */}
      {isLoading ? (
        <div className={styles.grid}>
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className="skeleton" style={{ height: 14, width: '50%', marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 20, width: '80%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 16 }} />
              <div className="skeleton" style={{ height: 28, width: '40%', borderRadius: 99 }} />
            </div>
          ))}
        </div>
      ) : filteredSchemes.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-gray-400)' }}>
            <Filter size={40} style={{ marginBottom: 'var(--space-3)' }} />
            <p>{t('schemes.no_schemes')}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(''); setActiveCategory('All'); setEligibilityFilter('ALL'); }}
              style={{ marginTop: 'var(--space-3)' }}
            >
              Clear filters
            </Button>
          </div>
        </Card>
      ) : (
        <div className={styles.grid}>
          {filteredSchemes.map((scheme) => {
            const elig = schemeEligibilityMap[scheme.schemeCode] || schemeEligibilityMap[scheme._id];
            const hasChecked = !!user?.familyId && !!eligibilityData;
            const isEligible = hasChecked ? (elig?.isEligible === true) : true;
            const failedRules = elig?.failedRules || [];
            const qualifyingMembers = elig?.qualifyingMembers || [];

            return (
              <Link key={scheme._id} to={`/schemes/${scheme.schemeCode}`} className={styles.schemeLink}>
                <Card
                  hover
                  className={`${styles.schemeCard} ${
                    hasChecked ? (isEligible ? styles.eligibleCard : styles.ineligibleCard) : ''
                  }`}
                >
                  <div className={styles.schemeTop}>
                    <span className={styles.schemeCat}>{scheme.category}</span>
                    {hasChecked && (
                      isEligible ? (
                        <span className={styles.eligibleBadge}>
                          <CheckCircle2 size={12} /> Eligible
                        </span>
                      ) : (
                        <span className={styles.ineligibleBadge}>
                          <AlertCircle size={12} /> Not Eligible
                        </span>
                      )
                    )}
                  </div>

                  <h2 className={styles.schemeName}>{scheme.schemeName}</h2>

                  {scheme.maxBenefitAmount > 0 && (
                    <p className={styles.schemeBenefit}>
                      <span className={styles.benefitLabel}>{t('schemes.benefit')}</span>
                      <span className={styles.benefitAmount}>₹{scheme.maxBenefitAmount.toLocaleString('en-IN')}</span>
                    </p>
                  )}

                  <p className={styles.schemeDesc}>{scheme.description?.slice(0, 95)}...</p>

                  {/* If Eligible: Show which member qualifies */}
                  {hasChecked && isEligible && qualifyingMembers.length > 0 && (
                    <div className={styles.eligibleMemberNotice}>
                      <CheckCircle2 size={12} />
                      <span>Qualified: {qualifyingMembers.map((m) => m.name).slice(0, 2).join(', ')}</span>
                    </div>
                  )}

                  {/* If Not Eligible: Explanatory tooltip box */}
                  {hasChecked && !isEligible && failedRules.length > 0 && (
                    <div className={styles.ineligibleReasonBox}>
                      <span className={styles.reasonHeader}>
                        <Info size={12} /> Why Not Eligible:
                      </span>
                      <div>
                        {failedRules.slice(0, 2).map((r, idx) => (
                          <div key={idx} className={styles.reasonItem}>
                            {r}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={styles.schemeFooter}>
                    <span className={styles.docsCount}>
                      {scheme.requiredDocuments?.length || 0} {t('schemes.documents_required')}
                    </span>
                    <span
                      className={styles.viewMore}
                      style={{ color: isEligible ? 'var(--color-teal-600)' : 'var(--color-gray-600)' }}
                    >
                      {isEligible ? `${t('schemes.view_details')} →` : 'View Criteria →'}
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
