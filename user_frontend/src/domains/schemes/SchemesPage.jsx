import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter } from 'lucide-react';
import { schemeService } from '../../services/schemeService';
import { eligibilityService } from '../../services/eligibilityService';
import { useAuthStore } from '../../store/authStore';
import StatusChip from '../../components/ui/StatusChip';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import styles from './SchemesPage.module.css';

const CATEGORIES = ['All', 'Housing', 'Education', 'Health', 'Pension', 'Agriculture', 'Employment', 'Disability', 'Women'];

export default function SchemesPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const { data: schemesData, isLoading } = useQuery({
    queryKey: ['schemes'],
    queryFn: () => schemeService.list(),
  });

  const { data: eligibilityData } = useQuery({
    queryKey: ['eligibility', user?.familyId],
    queryFn: () => eligibilityService.check(user.familyId),
    enabled: !!user?.familyId,
  });

  // Build a quick lookup map: schemeId → eligibility
  const eligibilityMap = {};
  if (eligibilityData?.eligibility) {
    eligibilityData.eligibility.forEach((memberEl) => {
      (memberEl.eligibleSchemes || []).forEach((s) => { eligibilityMap[s._id] = 'eligible'; });
      (memberEl.ineligibleSchemes || []).forEach((s) => { eligibilityMap[s._id] = 'ineligible'; });
    });
  }

  const schemes = (schemesData?.schemes || []).filter((s) => {
    const matchSearch = !search ||
      s.schemeName.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === 'All' || s.category === activeCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className={`${styles.page} animate-fade-in`}>
      <div className={styles.pageHeader}>
        <div>
          <h1>{t('schemes.title')}</h1>
          <p>{t('schemes.subtitle')}</p>
        </div>
      </div>

      {/* ── Search ──────────────────────────────────────── */}
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
      ) : schemes.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-gray-400)' }}>
            <Filter size={40} style={{ marginBottom: 'var(--space-3)' }} />
            <p>{t('schemes.no_schemes')}</p>
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setActiveCategory('All'); }} style={{ marginTop: 'var(--space-3)' }}>
              Clear filters
            </Button>
          </div>
        </Card>
      ) : (
        <div className={styles.grid}>
          {schemes.map((scheme) => {
            const eligStatus = eligibilityMap[scheme._id] || (user?.familyId ? 'not_checked' : 'not_checked');
            return (
              <Link key={scheme._id} to={`/schemes/${scheme.schemeCode}`} className={styles.schemeLink}>
                <Card hover className={styles.schemeCard}>
                  <div className={styles.schemeTop}>
                    <span className={styles.schemeCat}>{scheme.category}</span>
                    <StatusChip status={eligStatus} size="sm" />
                  </div>
                  <h2 className={styles.schemeName}>{scheme.schemeName}</h2>
                  {scheme.maxBenefitAmount > 0 && (
                    <p className={styles.schemeBenefit}>
                      <span className={styles.benefitLabel}>{t('schemes.benefit')}</span>
                      <span className={styles.benefitAmount}>₹{scheme.maxBenefitAmount.toLocaleString('en-IN')}</span>
                    </p>
                  )}
                  <p className={styles.schemeDesc}>{scheme.description?.slice(0, 100)}...</p>
                  <div className={styles.schemeFooter}>
                    <span className={styles.docsCount}>
                      {scheme.requiredDocuments?.length || 0} {t('schemes.documents_required')}
                    </span>
                    <span className={styles.viewMore}>{t('schemes.view_details')} →</span>
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
