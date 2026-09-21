import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  Users,
  MapPin,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Filter,
  BarChart2,
  Layers,
  Search,
  Home,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { socialRegistryService } from '../../services/adminServices';

export default function SocialRegistryPage() {
  const qc = useQueryClient();
  const [districtFilter, setDistrictFilter] = useState('');
  const [talukaInput, setTalukaInput] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const { data: overview, isLoading, isError, refetch } = useQuery({
    queryKey: ['socialRegistryOverview', districtFilter],
    queryFn: () => socialRegistryService.getOverview(districtFilter ? { district: districtFilter } : {}),
  });

  const { mutate: triggerBatchRecalculation, isPending: isRecalculating } = useMutation({
    mutationFn: () => socialRegistryService.recalculate({
      district: districtFilter || undefined,
      taluka: talukaInput || undefined,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['socialRegistryOverview'] });
      setToastMsg(`Recalculation complete! Processed ${res.processed} families across jurisdiction.`);
      setTimeout(() => setToastMsg(''), 6000);
    },
    onError: (err) => {
      alert(err?.response?.data?.message || 'Recalculation failed');
    },
  });

  const tiers = overview?.tierBreakdown || {
    MostVulnerable: 0,
    Vulnerable: 0,
    Moderate: 0,
    AboveThreshold: 0,
  };

  const totalRegistered = overview?.totalRegistered || 0;
  const geo = overview?.geographicBreakdown || {};

  return (
    <div className="animate-fade-in" style={{ padding: 'var(--space-6) var(--space-8)', maxWidth: 1440, margin: '0 auto' }}>
      {/* ── Toast Notification ──────────────────────────────── */}
      {toastMsg && (
        <div style={{
          background: '#DCFCE7',
          border: '1px solid #86EFAC',
          color: '#166534',
          padding: '12px 18px',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 16,
          fontSize: 14,
          fontWeight: 600,
        }}>
          <CheckCircle2 size={18} color="#166534" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────── */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 16,
        background: '#FFFFFF',
        padding: '24px 28px',
        borderRadius: 14,
        border: '1px solid var(--color-gray-200)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        marginBottom: 24,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{
              background: '#FEE2E2',
              color: '#DC2626',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
            }}>
              SOCIAL REGISTRY
            </span>
            <span style={{ fontSize: 13, color: '#64748B' }}>State Social Welfare Registry & Deprivation Engine</span>
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700, color: 'var(--color-navy-900)' }}>
            Multidimensional Vulnerability Registry
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: '#64748B', maxWidth: 780 }}>
            Unified socioeconomic classification benchmarking deprivation across income, housing, landholding, 
            disability, and dependency metrics. Modeled on Haryana PPP, Rajasthan Jan Aadhaar & SECC criteria.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => triggerBatchRecalculation()}
            disabled={isRecalculating}
            style={{
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              color: '#FFFFFF',
              border: 'none',
              padding: '10px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 6px rgba(124,58,237,0.25)',
              opacity: isRecalculating ? 0.7 : 1,
            }}
          >
            <RefreshCw size={15} className={isRecalculating ? 'animate-spin' : ''} />
            <span>{isRecalculating ? 'Recalculating Scores...' : 'Batch Recalculate Index'}</span>
          </button>

          <button
            onClick={() => refetch()}
            style={{
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>
      </header>

      {/* ── Filter Bar ─────────────────────────────────────── */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--color-gray-200)',
        borderRadius: 12,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: 13, fontWeight: 600 }}>
          <Filter size={16} /> Filter Jurisdiction:
        </div>

        <select
          value={districtFilter}
          onChange={(e) => setDistrictFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, minWidth: 180 }}
        >
          <option value="">All Districts (Statewide)</option>
          <option value="Gandhinagar">Gandhinagar</option>
          <option value="Ahmedabad">Ahmedabad</option>
          <option value="Surat">Surat</option>
          <option value="Rajkot">Rajkot</option>
          <option value="Vadodara">Vadodara</option>
          <option value="Dahod">Dahod (Tribal)</option>
          <option value="Dang">Dang (Tribal)</option>
        </select>

        <input
          type="text"
          placeholder="Filter by Taluka..."
          value={talukaInput}
          onChange={(e) => setTalukaInput(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, minWidth: 180 }}
        />
      </div>

      {/* ── Tier Breakdown KPI Cards ───────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Card 1: Total Registered */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Total Households</span>
            <Users size={20} color="#1E293B" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#0F172A' }}>{totalRegistered}</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Scored in Social Registry</div>
        </div>

        {/* Card 2: Most Vulnerable (Tier 1) */}
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#991B1B', fontWeight: 700 }}>Tier 1: Most Vulnerable</span>
            <ShieldAlert size={20} color="#DC2626" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#DC2626' }}>{tiers.MostVulnerable}</div>
          <div style={{ fontSize: 12, color: '#B91C1C', marginTop: 4 }}>Score 70-100 • Automatic Priority</div>
        </div>

        {/* Card 3: Vulnerable (Tier 2) */}
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#92400E', fontWeight: 700 }}>Tier 2: Vulnerable</span>
            <AlertTriangle size={20} color="#D97706" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#D97706' }}>{tiers.Vulnerable}</div>
          <div style={{ fontSize: 12, color: '#B45309', marginTop: 4 }}>Score 45-69 • High Welfare Need</div>
        </div>

        {/* Card 4: Moderate (Tier 3) */}
        <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#075985', fontWeight: 700 }}>Tier 3: Moderate</span>
            <Layers size={20} color="#0284C7" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#0284C7' }}>{tiers.Moderate}</div>
          <div style={{ fontSize: 12, color: '#0369A1', marginTop: 4 }}>Score 25-44 • Scheme Specific</div>
        </div>

        {/* Card 5: Above Threshold (Tier 4) */}
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#166534', fontWeight: 700 }}>Tier 4: Self-Sufficient</span>
            <CheckCircle2 size={20} color="#16A34A" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#16A34A' }}>{tiers.AboveThreshold}</div>
          <div style={{ fontSize: 12, color: '#15803D', marginTop: 4 }}>Score &lt; 25 • Universal Schemes Only</div>
        </div>
      </div>

      {/* ── Two Column Insights ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24, marginBottom: 24 }}>
        {/* Left Column: Top Deprivation Indicators */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <BarChart2 size={18} color="#4F46E5" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--color-navy-900)' }}>
              Most Prevalent Deprivation Factors
            </h3>
          </div>
          <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px' }}>
            Systemic deprivation factors identified across registered households:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(!overview?.topDeprivationFactors || overview.topDeprivationFactors.length === 0) ? (
              <p style={{ fontSize: 13, color: '#94A3B8' }}>No deprivation data computed yet. Click Batch Recalculate.</p>
            ) : (
              overview.topDeprivationFactors.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: '#F8FAFC',
                    border: '1px solid #F1F5F9',
                  }}
                >
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{f._id}</span>
                    <div style={{ fontSize: 11, color: '#64748B' }}>Code: {f.factorCode} • Average Impact: +{Math.round(f.avgImpact)} pts</div>
                  </div>
                  <span style={{
                    background: '#EEF2FF',
                    color: '#4F46E5',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 6,
                  }}>
                    {f.count} Families
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Geographic Distribution */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <MapPin size={18} color="#059669" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--color-navy-900)' }}>
              Geographic Settlement Classification
            </h3>
          </div>
          <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px' }}>
            Settlement classification used to determine rural vs urban scheme allocation:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            <div style={{ textAlign: 'center', padding: '16px 12px', background: '#ECFDF5', borderRadius: 10, border: '1px solid #A7F3D0' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#059669' }}>{geo.Rural || 0}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#065F46', marginTop: 4 }}>Rural Villages</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px 12px', background: '#EFF6FF', borderRadius: 10, border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#2563EB' }}>{geo.Urban || 0}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1E40AF', marginTop: 4 }}>Urban / Municipal</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px 12px', background: '#FEF3C7', borderRadius: 10, border: '1px solid #FDE68A' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#D97706' }}>{geo.Tribal || 0}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#92400E', marginTop: 4 }}>Tribal Belts</div>
            </div>
          </div>

          <h4 style={{ margin: '0 0 10px', fontSize: 13, color: '#475569', textTransform: 'uppercase' }}>
            Top Districts by Deprivation Intensity:
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(overview?.topDistricts || []).slice(0, 5).map((d, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 13,
                  padding: '8px 12px',
                  background: '#F8FAFC',
                  borderRadius: 6,
                }}
              >
                <span><strong>{d._id || 'General District'}</strong> ({d.count} households)</span>
                <span style={{ color: '#DC2626', fontWeight: 600 }}>
                  Avg Score: {Math.round(d.avgScore)} / 100 • {d.mostVulnerableCount} Most Vulnerable
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
