import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, FileText, ArrowLeft, ArrowRight } from 'lucide-react';
import { schemeService } from '../../services/schemeService';
import { eligibilityService } from '../../services/eligibilityService';
import { familyService } from '../../services/familyService';
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

  const { data: docRegistry } = useQuery({
    queryKey: ['familyDocuments', user?.familyId],
    queryFn: () => familyService.getDocuments(user.familyId),
    enabled: !!user?.familyId,
  });

  const evidenceList = docRegistry?.evidenceList || [];

  const isDocInLocker = (docKey) => {
    if (!evidenceList.length || !docKey) return false;
    const k = docKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    return evidenceList.some((ev) => {
      const t = (ev.certificateType || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return (
        k.includes(t) ||
        t.includes(k) ||
        (k.includes('income') && t.includes('income')) ||
        (k.includes('caste') && t.includes('caste')) ||
        (k.includes('ration') && t.includes('ration')) ||
        (k.includes('domicile') && t.includes('domicile')) ||
        (k.includes('marksheet') && t.includes('marksheet')) ||
        (k.includes('education') && t.includes('marksheet')) ||
        (k.includes('disability') && t.includes('disability')) ||
        (k.includes('bocw') && t.includes('bocw')) ||
        (k.includes('bank') && t.includes('bank')) ||
        (k.includes('passbook') && t.includes('bank'))
      );
    });
  };

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
            <div>
              <Link to={`/schemes/${schemeCode}/apply`}>
                <Button variant="secondary" size="lg" icon={<ArrowRight size={20} />} iconPosition="right">
                  {t('schemes.apply')}
                </Button>
              </Link>
              {user?.familyId && (scheme.requiredDocuments?.filter((d) => d.required).length || 0) > 0 && (
                <p
                  style={{
                    fontSize: 12,
                    marginTop: 8,
                    color:
                      (scheme.requiredDocuments?.filter((d) => d.required).length || 0) -
                        (scheme.requiredDocuments?.filter((d) => d.required && isDocInLocker(d.docKey)).length || 0) ===
                      0
                        ? '#15803D'
                        : '#D97706',
                    fontWeight: 600,
                  }}
                >
                  {(scheme.requiredDocuments?.filter((d) => d.required).length || 0) -
                    (scheme.requiredDocuments?.filter((d) => d.required && isDocInLocker(d.docKey)).length || 0) ===
                  0
                    ? `✓ 1-Click Fast-Track: All ${
                        scheme.requiredDocuments?.filter((d) => d.required).length
                      } required certificates ready in Family Locker`
                    : `ℹ️ ${
                        scheme.requiredDocuments?.filter((d) => d.required && isDocInLocker(d.docKey)).length || 0
                      } of ${
                        scheme.requiredDocuments?.filter((d) => d.required).length || 0
                      } documents ready in Family Locker`}
                </p>
              )}
            </div>
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
        {/* ── Budget & Welfare Allocation (Req 24) ──────────── */}
        {scheme.budgetInfo && (
          <Card>
            <h2 className={styles.sectionTitle}>💰 Scheme Budget & Allocation ({scheme.budgetInfo.fiscalYear || 'FY 2024-25'})</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 14 }}>
              <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: 11, color: '#64748B', display: 'block' }}>Total Sanctioned Budget</span>
                <strong style={{ fontSize: 15, color: '#0F172A' }}>₹{(Number(scheme.budgetInfo.totalBudget || 0) / 10000000).toFixed(1)} Cr</strong>
              </div>
              <div style={{ background: '#ECFDF5', padding: '10px 14px', borderRadius: 8, border: '1px solid #A7F3D0' }}>
                <span style={{ fontSize: 11, color: '#065F46', display: 'block' }}>Disbursed to Date</span>
                <strong style={{ fontSize: 15, color: '#047857' }}>₹{(Number(scheme.budgetInfo.disbursedAmount || 0) / 10000000).toFixed(1)} Cr</strong>
              </div>
              <div style={{ background: '#EFF6FF', padding: '10px 14px', borderRadius: 8, border: '1px solid #BFDBFE' }}>
                <span style={{ fontSize: 11, color: '#1E40AF', display: 'block' }}>Available Uncommitted</span>
                <strong style={{ fontSize: 15, color: '#1D4ED8' }}>₹{(Number(scheme.budgetInfo.remainingBudget || 0) / 10000000).toFixed(1)} Cr</strong>
              </div>
            </div>
            <div style={{ height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, Math.round(((scheme.budgetInfo.disbursedAmount || 1) / (scheme.budgetInfo.totalBudget || 1)) * 100))}%`,
                background: '#059669'
              }} />
            </div>
          </Card>
        )}

        {/* ── Co-Enrollment & Stacking (Req 22) ─────────────── */}
        {(scheme.stackingRules?.allowsWith?.length > 0 || scheme.stackingRules?.blockedWith?.length > 0) && (
          <Card>
            <h2 className={styles.sectionTitle}>🔗 Co-Enrollment & Benefit Stacking Rules</h2>
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 10px' }}>
              Guidelines on receiving this benefit alongside other state and central schemes:
            </p>
            {scheme.stackingRules?.allowsWith?.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#15803D', display: 'block', marginBottom: 4 }}>
                  ✓ Can be combined with:
                </span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {scheme.stackingRules.allowsWith.map((s, idx) => (
                    <span key={idx} style={{ background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {scheme.stackingRules?.blockedWith?.length > 0 && (
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#B91C1C', display: 'block', marginBottom: 4 }}>
                  ✕ Incompatible with (Mutually Exclusive):
                </span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {scheme.stackingRules.blockedWith.map((s, idx) => (
                    <span key={idx} style={{ background: '#FEE2E2', color: '#991B1B', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ── Renewal Policy (Req 20) ──────────────────────── */}
        {scheme.renewalRules && (
          <Card>
            <h2 className={styles.sectionTitle}>🔄 Scheme Renewal & Lifecycle Rules</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: '#F8FAFC', borderRadius: 8 }}>
              <div>
                <strong>{scheme.renewalRules.autoRenewable ? 'Auto-Renewable via Social Registry' : 'Manual Annual Re-Verification Required'}</strong>
                <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>
                  Renewal period: {scheme.renewalRules.renewalPeriodMonths || 12} months • Grace period: {scheme.renewalRules.gracePeriodDays || 30} days after expiry
                </p>
              </div>
            </div>
          </Card>
        )}

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

        {/* ── Required Documents with Smart Locker Sync ── */}
        {scheme.requiredDocuments?.length > 0 && (
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 className={styles.sectionTitle} style={{ margin: 0 }}>{t('schemes.required_documents')}</h2>
              {user?.familyId && (
                <span style={{ fontSize: 11, color: '#059669', fontWeight: 700, background: '#DCFCE7', padding: '3px 8px', borderRadius: 12 }}>
                  ✓ Family Locker Sync
                </span>
              )}
            </div>
            <ul className={styles.docList}>
              {scheme.requiredDocuments.map((doc) => {
                const inLocker = isDocInLocker(doc.docKey);
                return (
                  <li key={doc.docKey} className={styles.docItem} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={16} color="var(--color-navy-700)" />
                      <div>
                        <span className={styles.docName}>{doc.label}</span>
                        {!doc.required && <span className={styles.optional}> (Optional)</span>}
                      </div>
                    </div>

                    {user?.familyId && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {inLocker ? (
                          <span style={{ background: '#DCFCE7', color: '#166534', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                            ✓ In Family Locker
                          </span>
                        ) : (
                          <>
                            <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                              Upload Needed
                            </span>
                            <Link
                              to="/profile"
                              style={{ fontSize: 11, color: '#0284C7', textDecoration: 'underline', fontWeight: 600 }}
                            >
                              Upload to Locker →
                            </Link>
                          </>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
