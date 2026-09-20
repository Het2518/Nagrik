import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, Users, CheckCircle, Clock, XCircle, Activity } from 'lucide-react';
import { dashboardService } from '../../services/adminServices';
import { useAdminStore } from '../../store/adminStore';
import styles from './DashboardPage.module.css';

const STATUS_COLORS = {
  FinalApproved: '#15803D', Rejected: '#B91C1C',
  Pending: '#B45309', Level1Approved: '#1D4ED8',
  Level2Approved: '#0E7490', Level3Review: '#7C3AED',
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

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardService.getSummary,
    refetchInterval: 30000, // auto-refresh every 30s
  });

  const summary = data?.summary || {};
  const statusBreakdown = data?.statusBreakdown || [];
  const schemeEnrollment = data?.schemeEnrollment || [];

  const pieData = statusBreakdown.map((s) => ({ name: s.status, value: s.count }));

  return (
    <div className={`${styles.page} animate-fade-in`}>
      {/* ── Header ───────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Dashboard</h1>
          <p>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className={styles.liveIndicator}>
          <span className={styles.liveDot} aria-hidden="true" />
          <span>Live data</span>
        </div>
      </div>

      {/* ── Stat Cards ───────────────────────────────────── */}
      <div className={styles.statGrid}>
        {isLoading ? (
          [1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard icon={Users}       value={summary.totalFamilies}         label="Registered Families" color="#0B1E3E" />
            <StatCard icon={CheckCircle} value={summary.permanentFamilies}     label="Permanent Families"  color="#15803D" />
            <StatCard icon={Clock}       value={summary.provisionalFamilies}   label="Provisional"         color="#B45309" />
            <StatCard icon={FileText}    value={summary.totalApplications}     label="Total Applications"  color="#1D4ED8" />
            <StatCard icon={Activity}    value={summary.pipelineQueue}         label="In Queue"            color="#7C3AED" />
            <StatCard icon={XCircle}     value={summary.rejectedApplications}  label="Rejected"            color="#B91C1C" />
          </>
        )}
      </div>

      <div className={styles.chartsRow}>
        {/* ── Application Status Pie ──────────────────────── */}
        <div className={`${styles.chartCard} card`}>
          <h2 className={styles.chartTitle}>Application Status Distribution</h2>
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
                    {pieData.map((entry, i) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#6B7280'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.pieLegend}>
                {pieData.map((entry) => (
                  <div key={entry.name} className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: STATUS_COLORS[entry.name] || '#6B7280' }} />
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

        {/* ── Scheme Enrollment Bar ──────────────────────── */}
        <div className={`${styles.chartCard} card`}>
          <h2 className={styles.chartTitle}>Applications by Scheme</h2>
          {schemeEnrollment.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={schemeEnrollment} layout="vertical" margin={{ left: 20, right: 20, top: 8, bottom: 8 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="schemeName" type="category" width={120} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0E7490" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.noData}>No scheme data yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
