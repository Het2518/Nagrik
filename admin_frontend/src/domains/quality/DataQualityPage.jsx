import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  AlertTriangle,
  CreditCard,
  Fingerprint,
  Send,
  Building,
  CheckCircle,
  XCircle,
  ChevronRight,
  RefreshCw,
  MapPin,
} from 'lucide-react';
import { dataQualityService } from '../../services/adminServices';
import styles from './DataQualityPage.module.css';

export default function DataQualityPage() {
  const queryClient = useQueryClient();
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [nudgeToast, setNudgeToast] = useState('');

  const { data: report, isLoading: isReportLoading } = useQuery({
    queryKey: ['data-quality-report'],
    queryFn: () => dataQualityService.getReport(),
    refetchInterval: 30000,
  });

  const { data: incompleteData, isLoading: isIncompleteLoading } = useQuery({
    queryKey: ['data-quality-incomplete'],
    queryFn: () => dataQualityService.getIncomplete({ limit: 12 }),
    refetchInterval: 30000,
  });

  const { mutate: sendNudge, isPending: isSendingNudge } = useMutation({
    mutationFn: ({ id, field }) =>
      dataQualityService.sendNudge(id, {
        missingField: field,
        message: `Please update your family registry details (${field}) to prevent welfare subsidy interruption.`,
      }),
    onSuccess: (_, vars) => {
      setNudgeToast(`Remediation nudge successfully dispatched to family!`);
      setTimeout(() => setNudgeToast(''), 4000);
      queryClient.invalidateQueries({ queryKey: ['data-quality-incomplete'] });
    },
  });

  const criticalGaps = report?.criticalGaps || {};
  const distribution = report?.distribution || {};
  const incompleteRecords = incompleteData?.records || [];

  return (
    <div className={`${styles.page} animate-fade-in`}>
      {/* ── Header ───────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Social Registry Data Quality & Integrity</h1>
          <p>
            Field completeness scoring, Aadhaar/DBT seeding metrics, and proactive data remediation.
          </p>
        </div>
      </div>

      {nudgeToast && (
        <div style={{ background: '#DCFCE7', color: '#15803D', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
          ✓ {nudgeToast}
        </div>
      )}

      {/* ── Top Stat Cards ───────────────────────────────── */}
      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#DCFCE7', color: '#15803D' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className={styles.statVal}>{report?.averageScore ?? 84}%</div>
            <div className={styles.statLbl}>State Quality Health Index ({report?.healthIndex || 'Healthy'})</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#DBEAFE', color: '#2563EB' }}>
            <CreditCard size={22} />
          </div>
          <div>
            <div className={styles.statVal}>{criticalGaps.bankSeedingRatePct ?? 82}%</div>
            <div className={styles.statLbl}>DBT Bank Account Seeding</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#FEF3C7', color: '#D97706' }}>
            <Fingerprint size={22} />
          </div>
          <div>
            <div className={styles.statVal}>{criticalGaps.aadhaarCoverageRatePct ?? 88}%</div>
            <div className={styles.statLbl}>Aadhaar Member Verification</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#FEE2E2', color: '#DC2626' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className={styles.statVal}>{distribution.needsAttentionCount ?? 0}</div>
            <div className={styles.statLbl}>Records Needing Remediation (&lt; 60%)</div>
          </div>
        </div>
      </div>

      {/* ── 2-Column Main Section ────────────────────────── */}
      <div className={styles.gridCol2}>
        {/* Left Column: Quality Distribution & District Benchmark */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Quality Distribution Card */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <span>Completeness Tier Distribution</span>
              <span style={{ fontSize: 12, color: '#6B7280' }}>Total Evaluated: {report?.totalEvaluated || 0}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}>
                  <span style={{ color: '#15803D' }}>High Quality (85–100%)</span>
                  <span>{distribution.highQualityCount || 0} ({distribution.highQualityPct || 0}%)</span>
                </div>
                <div className={styles.scoreProgress}>
                  <div className={styles.scoreFill} style={{ width: `${distribution.highQualityPct || 0}%`, background: '#15803D' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}>
                  <span style={{ color: '#D97706' }}>Acceptable (60–84%)</span>
                  <span>{distribution.acceptableCount || 0}</span>
                </div>
                <div className={styles.scoreProgress}>
                  <div
                    className={styles.scoreFill}
                    style={{
                      width: `${report?.totalEvaluated ? Math.round((distribution.acceptableCount / report.totalEvaluated) * 100) : 0}%`,
                      background: '#D97706',
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}>
                  <span style={{ color: '#DC2626' }}>Needs Remediation (&lt; 60%)</span>
                  <span>{distribution.needsAttentionCount || 0}</span>
                </div>
                <div className={styles.scoreProgress}>
                  <div
                    className={styles.scoreFill}
                    style={{
                      width: `${report?.totalEvaluated ? Math.round((distribution.needsAttentionCount / report.totalEvaluated) * 100) : 0}%`,
                      background: '#DC2626',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* District Comparison Table */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={18} color="var(--color-navy-700)" />
                District Quality Benchmarks
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>District</th>
                    <th>Average Score</th>
                    <th>Families</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {report?.districtComparison?.length > 0 ? (
                    report.districtComparison.map((d) => (
                      <tr key={d.district}>
                        <td><strong>{d.district}</strong></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>{d.averageScore}%</span>
                            <div className={styles.scoreProgress} style={{ width: 60, margin: 0 }}>
                              <div
                                className={styles.scoreFill}
                                style={{
                                  width: `${d.averageScore}%`,
                                  background: d.averageScore >= 80 ? '#15803D' : d.averageScore >= 60 ? '#D97706' : '#DC2626',
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>{d.totalFamilies}</td>
                        <td>
                          {d.averageScore >= 80 ? (
                            <span className={styles.badgeGood}>A</span>
                          ) : d.averageScore >= 60 ? (
                            <span className={styles.badgeWarning}>B</span>
                          ) : (
                            <span className={styles.badgeCritical}>C</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: 16, color: '#9CA3AF' }}>
                        No district comparisons available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Incomplete Records & Remediation Nudges */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <span>Flagged Incomplete Records</span>
            <span style={{ fontSize: 12, color: '#6B7280' }}>Actionable remediation queue</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {incompleteRecords.length > 0 ? (
              incompleteRecords.map((rec) => (
                <div
                  key={rec.familyId}
                  style={{
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <strong style={{ color: 'var(--color-navy-900)' }}>{rec.headName}</strong>
                      <span style={{ marginLeft: 6, color: '#6B7280', fontFamily: 'monospace' }}>({rec.nagrikId})</span>
                      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                        {rec.taluka}, {rec.district}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: rec.qualityScore >= 80 ? '#DCFCE7' : rec.qualityScore >= 60 ? '#FEF3C7' : '#FEE2E2',
                        color: rec.qualityScore >= 80 ? '#15803D' : rec.qualityScore >= 60 ? '#D97706' : '#DC2626',
                      }}
                    >
                      {rec.qualityScore}% Quality
                    </span>
                  </div>

                  {/* Missing Fields list */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
                    {rec.missingFields?.map((mf, idx) => (
                      <span
                        key={idx}
                        className={mf.severity === 'Critical' ? styles.badgeCritical : styles.badgeWarning}
                        title={mf.label}
                      >
                        ✕ {mf.label}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTop: '1px solid #F3F4F6' }}>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>
                      Aadhaar: {rec.aadhaarCoveragePct}% • Bank: {rec.hasBankLinked ? '✓ Linked' : '✕ Missing'}
                    </span>
                    <button
                      className={styles.nudgeBtn}
                      disabled={isSendingNudge}
                      onClick={() =>
                        sendNudge({
                          id: rec.familyId,
                          field: rec.missingFields?.[0]?.label || 'Profile details',
                        })
                      }
                    >
                      <Send size={11} /> Send Update Nudge
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: 24, color: '#9CA3AF' }}>
                All records currently meet the high-quality threshold.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
