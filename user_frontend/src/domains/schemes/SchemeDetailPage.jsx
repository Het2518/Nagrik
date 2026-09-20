import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, FileText, ArrowLeft, ArrowRight } from 'lucide-react';
import { schemeService } from '../../services/schemeService';
import { eligibilityService } from '../../services/eligibilityService';
import { useAuthStore } from '../../store/authStore';
import StatusChip from '../../components/ui/StatusChip';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import styles from './SchemeDetailPage.module.css';

export default function SchemeDetailPage() {
  const { schemeCode } = useParams();
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const { data: schemeData, isLoading } = useQuery({
    queryKey: ['scheme', schemeCode],
    queryFn: () => schemeService.getByCode(schemeCode),
  });

  const { data: eligibilityData } = useQuery({
    queryKey: ['eligibility', user?.familyId],
    queryFn: () => eligibilityService.check(user.familyId),
    enabled: !!user?.familyId,
  });

  if (isLoading) {
    return <div className={styles.loading}><div className="skeleton" style={{ height: 200, borderRadius: 16 }} /></div>;
  }

  const scheme = schemeData?.scheme || schemeData;
  if (!scheme) return <div>Scheme not found</div>;

  // Find this specific scheme's eligibility across all members
  const memberEligibility = eligibilityData?.eligibility?.map((memberEl) => {
    const eligible = memberEl.eligibleSchemes?.find((s) => s.schemeCode === schemeCode);
    const ineligible = memberEl.ineligibleSchemes?.find((s) => s.schemeCode === schemeCode);
    return { memberName: memberEl.memberName, eligible: !!eligible, reasons: ineligible?.reasons || [] };
  }).filter(Boolean);

  const anyEligible = memberEligibility?.some((m) => m.eligible);
  const canApply = anyEligible && user?.familyId;

  return (
    <div className={`${styles.page} animate-fade-in`}>
      <Link to="/schemes" className={styles.backLink}>
        <ArrowLeft size={16} /> Back to schemes
      </Link>

      {/* ── Scheme Header ──────────────────────────────── */}
      <div className={styles.heroSection}>
        <div className={styles.heroMeta}>
          <span className={styles.category}>{scheme.category}</span>
          <StatusChip status={anyEligible ? 'eligible' : user?.familyId ? 'ineligible' : 'not_checked'} size="md" />
        </div>
        <h1 className={styles.schemeName}>{scheme.schemeName}</h1>
        {scheme.maxBenefitAmount > 0 && (
          <p className={styles.benefit}>
            {t('schemes.benefit')} <strong>₹{scheme.maxBenefitAmount.toLocaleString('en-IN')}</strong>
          </p>
        )}
        <p className={styles.description}>{scheme.description}</p>

        <div className={styles.applySection}>
          {canApply ? (
            <Link to={`/schemes/${schemeCode}/apply`}>
              <Button variant="secondary" size="lg" icon={<ArrowRight size={20} />} iconPosition="right">
                {t('schemes.apply')}
              </Button>
            </Link>
          ) : !user?.familyId ? (
            <Link to="/onboarding">
              <Button variant="outline" size="lg">Register Family to Apply</Button>
            </Link>
          ) : (
            <Button variant="outline" size="lg" disabled>
              Not eligible for this scheme
            </Button>
          )}
        </div>
      </div>

      <div className={styles.columns}>
        {/* ── Your Eligibility ─────────────────────────── */}
        {memberEligibility?.length > 0 && (
          <Card className={styles.eligCard}>
            <h2 className={styles.sectionTitle}>{t('schemes.your_eligibility')}</h2>
            {memberEligibility.map((m, i) => (
              <div key={i} className={styles.memberElig}>
                <div className={styles.memberEligHeader}>
                  <span className={styles.memberName}>{m.memberName || `Member ${i + 1}`}</span>
                  <StatusChip status={m.eligible ? 'eligible' : 'ineligible'} size="sm" />
                </div>
                {!m.eligible && m.reasons.length > 0 && (
                  <ul className={styles.reasons}>
                    {m.reasons.map((r, j) => (
                      <li key={j} className={styles.reason}>
                        <XCircle size={13} color="var(--color-error-700)" />
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </Card>
        )}

        {/* ── Eligibility Criteria ─────────────────────── */}
        {scheme.eligibilityCriteria?.conditions?.length > 0 && (
          <Card>
            <h2 className={styles.sectionTitle}>{t('schemes.eligibility_criteria')}</h2>
            <ul className={styles.criteriaList}>
              {scheme.eligibilityCriteria.conditions.map((c, i) => (
                <li key={i} className={styles.criteriaItem}>
                  <CheckCircle size={16} color="var(--color-teal-600)" />
                  <span>{c.field} {c.operator} {String(c.value)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* ── Required Documents ───────────────────────── */}
        {scheme.requiredDocuments?.length > 0 && (
          <Card>
            <h2 className={styles.sectionTitle}>{t('schemes.required_documents')}</h2>
            <ul className={styles.docList}>
              {scheme.requiredDocuments.map((doc) => (
                <li key={doc.docKey} className={styles.docItem}>
                  <FileText size={16} color="var(--color-navy-700)" />
                  <div>
                    <span className={styles.docName}>{doc.label}</span>
                    {!doc.required && <span className={styles.optional}>(Optional)</span>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
