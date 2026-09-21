import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  FileText,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Activity,
  ShieldAlert,
  AlertTriangle,
  Zap,
  TrendingUp,
  MapPin,
  Send,
  RefreshCw,
  Coins,
} from 'lucide-react';
import { dashboardService, analyticsService } from '../../services/adminServices';
import { useAdminStore } from '../../store/adminStore';
import styles from './DashboardPage.module.css';

const STATUS_COLORS = {
  FinalApproved: '#15803D',
  Rejected: '#B91C1C',
  Pending: '#B45309',
  Level1Approved: '#1D4ED8',
  Level2Approved: '#0E7490',
  Level3Review: '#7C3AED',
  ResubmissionRequired: '#D97706',
};

function StatCard({ icon: Icon, value, label, color }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIcon} style={{ background: `${color}18`, color }}>
        <Icon size={22} />
      </div>
      <div>
        <p className={styles.statValue}>{value ?? '—'}</p>
        <p className={styles.statLabel}>{label}</p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className={`${styles.statCard} ${styles.skeleton}`} style={{ height: 88 }} />
  );
}

export default function DashboardPage() {
  const { user } = useAdminStore();
  const queryClient = useQueryClient();
  const [outreachToast, setOutreachToast] = useState('');
  const [cronMsg, setCronMsg] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardService.getSummary,
    refetchInterval: 30000,
  });

  const { data: priorityData, isLoading: priorityLoading } = useQuery({
    queryKey: ['priority-families'],
    queryFn: () => analyticsService.getPriorityFamilies({ limit: 5 }),
    refetchInterval: 60000,
  });

  const { mutate: runCron, isPending: isRunningCron } = useMutation({
    mutationFn: (job) => analyticsService.triggerCron({ job }),
    onSuccess: (res) => {
      setCronMsg(res?.message || 'Background execution completed successfully');
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setTimeout(() => setCronMsg(''), 4000);
    },
  });

  const summary = data?.summary || {};
  const slaMetrics = summary?.slaMetrics || {};
  const statusBreakdown = data?.statusBreakdown || [];
  const schemeEnrollment = data?.schemeEnrollment || [];
  const budgetOverview = data?.budgetOverview || [];
  const geographicSaturation = data?.geographicSaturation || {};
  const priorityFamilies = priorityData?.priorityFamilies || [];

  const pieData = statusBreakdown.map((s) => ({ name: s._id || s.status, value: s.count }));

  const handleDispatchOutreach = (family) => {
    setOutreachToast(`Field worker camp alert dispatched to ${family.headName} (${family.nagrikId}) in ${family.district}!`);
    setTimeout(() => setOutreachToast(''), 4000);
  };

  return (
    <div className={`${styles.page} animate-fade-in`}>
      {/* ── Header ───────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Welfare Intelligence & Governance Dashboard</h1>
          <p>
            {user?.jurisdiction?.district ? `${user.jurisdiction.district} District • ` : ''}
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className={styles.liveIndicator}>
            <span className={styles.liveDot} aria-hidden="true" />
            <span>Live Data</span>
          </div>
          <button
            className={styles.cronBtn}
            onClick={() => runCron('sla')}
            disabled={isRunningCron}
            title="Scan all applications and escalate overdue files"
          >
            <Clock size={14} /> Scan SLA Breaches
          </button>
          <button
            className={styles.cronBtn}
            onClick={() => runCron('milestones')}
            disabled={isRunningCron}
            title="Scan age thresholds and certificate renewals"
          >
            <RefreshCw size={14} className={isRunningCron ? 'animate-spin' : ''} /> Run Milestone Cron
          </button>
        </div>
      </div>

      {cronMsg && (
        <div style={{ background: '#DCFCE7', color: '#15803D', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
          ✓ {cronMsg}
        </div>
      )}

      {outreachToast && (
        <div style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #93C5FD', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
          📢 {outreachToast}
        </div>
      )}

      {/* ── SLA Governance Strip ──────────────────────────── */}
      <div className={styles.slaStrip}>
        <div className={styles.slaItem}>
          <div className={styles.slaIcon} style={{ background: '#DCFCE7', color: '#15803D' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div className={styles.slaNumber}>{slaMetrics.complianceRate ?? 100}%</div>
            <div className={styles.slaTitle}>SLA Compliance Rate</div>
          </div>
        </div>

        <div className={styles.slaItem}>
          <div className={styles.slaIcon} style={{ background: slaMetrics.breachedCount > 0 ? '#FEE2E2' : '#F3F4F6', color: slaMetrics.breachedCount > 0 ? '#DC2626' : '#6B7280' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className={styles.slaNumber} style={{ color: slaMetrics.breachedCount > 0 ? '#DC2626' : 'inherit' }}>
              {slaMetrics.breachedCount ?? 0}
            </div>
            <div className={styles.slaTitle}>SLA Breached Applications</div>
          </div>
        </div>

        <div className={styles.slaItem}>
          <div className={styles.slaIcon} style={{ background: '#FEF3C7', color: '#D97706' }}>
            <Clock size={20} />
          </div>
          <div>
            <div className={styles.slaNumber}>{slaMetrics.approachingBreachCount ?? 0}</div>
            <div className={styles.slaTitle}>Approaching SLA Breach (&lt; 48h)</div>
          </div>
        </div>

        <div className={styles.slaItem}>
          <div className={styles.slaIcon} style={{ background: '#EDE9FE', color: '#7C3AED' }}>
            <Zap size={20} />
          </div>
          <div>
            <div className={styles.slaNumber}>{slaMetrics.escalatedCount ?? 0}</div>
            <div className={styles.slaTitle}>Escalated / Urgent Files</div>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ───────────────────────────────────── */}
      <div className={styles.statGrid}>
        {isLoading ? (
          [1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard icon={Users} value={summary.totalFamilies} label="Registered Families" color="#0B1E3E" />
            <StatCard icon={Users} value={summary.totalMembers} label="Covered Citizens" color="#0E7490" />
            <StatCard icon={FileText} value={summary.totalApplications} label="Total Applications" color="#1D4ED8" />
            <StatCard icon={CheckCircle} value={summary.finalApprovedCount} label="Benefits Sanctioned" color="#15803D" />
            <StatCard icon={Activity} value={slaMetrics.totalActiveInReview || summary.pendingCount} label="Active In Queue" color="#7C3AED" />
            <StatCard icon={XCircle} value={summary.rejectedCount} label="Rejected Applications" color="#B91C1C" />
          </>
        )}
      </div>

      {/* ── Charts Row ────────────────────────────────────── */}
      <div className={styles.chartsRow}>
        {/* Application Status Pie */}
        <div className={`${styles.chartCard} card`}>
          <h2 className={styles.chartTitle}>Application Lifecycle Status</h2>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#6B7280'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.pieLegend}>
                {pieData.map((entry) => (
                  <div key={entry.name} className={styles.legendItem}>
                    <span
                      className={styles.legendDot}
                      style={{ background: STATUS_COLORS[entry.name] || '#6B7280' }}
                    />
                    <span className={styles.legendName}>{entry.name}</span>
                    <span className={styles.legendValue}>{entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.noData}>No application data yet</div>
          )}
        </div>

        {/* Applications by Scheme */}
        <div className={`${styles.chartCard} card`}>
          <h2 className={styles.chartTitle}>Sanctioned Entitlements by Scheme</h2>
          {schemeEnrollment.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={schemeEnrollment}
                layout="vertical"
                margin={{ left: 10, right: 20, top: 8, bottom: 8 }}
              >
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="schemeName" type="category" width={140} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="approvedCount" fill="#0E7490" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.noData}>No scheme data yet</div>
          )}
        </div>
      </div>

      {/* ── Welfare Intelligence Row: Saturation & Priority Families ──── */}
      <div className={styles.intelGrid}>
        {/* Geographic Saturation Table */}
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 className={styles.chartTitle} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={18} color="var(--color-navy-700)" />
                Geographic Welfare Saturation
              </h2>
              <span style={{ fontSize: 12, color: '#6B7280' }}>
                {geographicSaturation.district || 'State-Wide'} • Avg Penetration: {geographicSaturation.overallAverageSaturation || 0}%
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Scheme</th>
                  <th>Coverage / Saturation</th>
                  <th>Enrolled</th>
                  <th>Gap Families</th>
                </tr>
              </thead>
              <tbody>
                {geographicSaturation.schemes?.length > 0 ? (
                  geographicSaturation.schemes.slice(0, 5).map((s) => (
                    <tr key={s.schemeCode}>
                      <td>
                        <strong style={{ display: 'block', color: 'var(--color-navy-900)' }}>{s.schemeName}</strong>
                        <span style={{ fontSize: 11, color: '#6B7280' }}>{s.department}</span>
                      </td>
                      <td style={{ minWidth: 140 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                          <span>{s.saturationPct}%</span>
                          <span style={{ fontSize: 10, color: '#9CA3AF' }}>Target: {s.targetSaturationPct}%</span>
                        </div>
                        <div className={styles.progBarTrack}>
                          <div
                            className={styles.progBarFill}
                            style={{
                              width: `${s.saturationPct}%`,
                              background: s.saturationPct >= 70 ? '#15803D' : s.saturationPct >= 40 ? '#D97706' : '#DC2626',
                            }}
                          />
                        </div>
                      </td>
                      <td>{s.enrolledFamilies}</td>
                      <td>
                        <span style={{ color: s.unreachedFamilies > 0 ? '#DC2626' : '#15803D', fontWeight: 600 }}>
                          {s.unreachedFamilies}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: 20, color: '#9CA3AF' }}>
                      Saturation calculation in progress...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* High Priority Unserved Families */}
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 className={styles.chartTitle} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldAlert size={18} color="#DC2626" />
                Priority Outreach: Vulnerable Unreached
              </h2>
              <span style={{ fontSize: 12, color: '#6B7280' }}>
                Poorest households with zero active welfare entitlements
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {priorityFamilies.length > 0 ? (
              priorityFamilies.map((fam) => (
                <div
                  key={fam.familyId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--color-navy-900)' }}>
                      {fam.headName} ({fam.nagrikId})
                    </div>
                    <div style={{ color: '#4B5563', marginTop: 2 }}>
                      {fam.taluka}, {fam.district} • Card: <strong>{fam.rationCardType}</strong>
                    </div>
                    <div style={{ fontSize: 11, color: '#DC2626', marginTop: 2, fontWeight: 500 }}>
                      ⚠️ {fam.priorityReason} (Est. Unclaimed: ₹{fam.estimatedUnclaimedValue?.toLocaleString('en-IN')})
                    </div>
                  </div>
                  <div>
                    <button
                      className={styles.dispatchBtn}
                      onClick={() => handleDispatchOutreach(fam)}
                      title="Alert local Talati / field worker for home camp outreach"
                    >
                      <Send size={11} /> Nudge Camp
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: 24, color: '#9CA3AF' }}>
                No critical unreached families in current scope.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Scheme Budget Utilization ─────────────────────── */}
      <div className="card" style={{ padding: 'var(--space-5)' }}>
        <h2 className={styles.chartTitle} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <Coins size={18} color="var(--color-navy-700)" />
          Fiscal Budget Utilization by Scheme (FY 2026-27)
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {budgetOverview.slice(0, 4).map((b) => (
            <div key={b.schemeCode} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <strong style={{ fontSize: 13, color: 'var(--color-navy-900)' }}>{b.schemeName}</strong>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>{b.department}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, background: '#DCFCE7', color: '#15803D', padding: '2px 6px', borderRadius: 4 }}>
                  {b.utilizationPct}% Spent
                </span>
              </div>

              <div className={styles.progBarTrack} style={{ height: 8, margin: '8px 0' }}>
                <div className={styles.progBarFill} style={{ width: `${b.utilizationPct}%`, background: '#0E7490' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4B5563' }}>
                <span>Disbursed: ₹{(b.disbursedAmount / 10000000).toFixed(2)} Cr</span>
                <span>Remaining: ₹{(b.remainingBudget / 10000000).toFixed(2)} Cr</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

