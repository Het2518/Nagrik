import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  BookOpen,
  Plus,
  Power,
  Search,
  Edit2,
  X,
  Users,
  Zap,
  Bell,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import { schemeService } from '../../services/adminServices';
import { useAdminStore } from '../../store/adminStore';
import styles from './SchemesAdminPage.module.css';

const schemeSchema = z.object({
  schemeName:       z.string().min(3, 'Name is required'),
  category:         z.enum(['Housing','Education','Health','Pension','Agriculture','Employment','Disability','Women','Other']),
  description:      z.string().min(10, 'Description is required'),
  maxBenefitAmount: z.coerce.number().min(0),
});

const CATEGORIES = ['Housing','Education','Health','Pension','Agriculture','Employment','Disability','Women','Other'];

function SchemeModal({ scheme, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!scheme;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schemeSchema),
    defaultValues: isEdit ? {
      schemeName:       scheme.schemeName,
      category:         scheme.category,
      description:      scheme.description,
      maxBenefitAmount: scheme.maxBenefitAmount,
    } : {},
  });

  const { mutateAsync: create } = useMutation({
    mutationFn: schemeService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schemes-admin'] }); onClose(); },
  });
  const { mutateAsync: update } = useMutation({
    mutationFn: (d) => schemeService.update(scheme.schemeCode, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schemes-admin'] }); onClose(); },
  });

  const onSubmit = async (data) => {
    if (isEdit) await update(data);
    else await create(data);
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit Scheme' : 'Create Scheme'}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>{isEdit ? 'Edit Scheme' : 'Create New Scheme'}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.field}>
            <label>Scheme Name *</label>
            <input className={`${styles.input} ${errors.schemeName ? styles.inputErr : ''}`} placeholder="e.g. PM Awas Yojana" {...register('schemeName')} />
            {errors.schemeName && <p className={styles.err}>{errors.schemeName.message}</p>}
          </div>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label>Category *</label>
              <select className={styles.select} {...register('category')}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Max Benefit (₹)</label>
              <input type="number" min="0" className={styles.input} {...register('maxBenefitAmount')} />
            </div>
          </div>
          <div className={styles.field}>
            <label>Description *</label>
            <textarea className={`${styles.textarea} ${errors.description ? styles.inputErr : ''}`} rows={4} placeholder="Describe the scheme benefits and purpose..." {...register('description')} />
            {errors.description && <p className={styles.err}>{errors.description.message}</p>}
          </div>
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Scheme'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SchemesAdminPage() {
  const { user } = useAdminStore();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'Admin';

  // Navigation tabs
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'saturation'
  const [selectedSchemeCode, setSelectedSchemeCode] = useState('');

  // Catalog tab filters
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [modalScheme, setModalScheme] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Saturation tab filters & state
  const [beneficiaryStatus, setBeneficiaryStatus] = useState('ALL');
  const [beneficiarySearch, setBeneficiarySearch] = useState('');
  const [nudgeLoadingId, setNudgeLoadingId] = useState(null);
  const [cronRunning, setCronRunning] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch schemes
  const { data: schemesData, isLoading: isSchemesLoading } = useQuery({
    queryKey: ['schemes-admin', search, catFilter],
    queryFn: () => schemeService.list({ search: search || undefined, category: catFilter || undefined }),
  });

  const schemes = schemesData?.schemes || [];

  // Set default selected scheme for saturation board
  useEffect(() => {
    if (!selectedSchemeCode && schemes.length > 0) {
      setSelectedSchemeCode(schemes[0].schemeCode);
    }
  }, [schemes, selectedSchemeCode]);

  // Fetch saturation beneficiaries for selected scheme
  const {
    data: saturationData,
    isLoading: isSaturationLoading,
    refetch: refetchSaturation,
  } = useQuery({
    queryKey: ['scheme-saturation', selectedSchemeCode, beneficiaryStatus, beneficiarySearch],
    queryFn: () =>
      schemeService.getBeneficiaries(selectedSchemeCode, {
        status: beneficiaryStatus,
        search: beneficiarySearch || undefined,
      }),
    enabled: activeTab === 'saturation' && !!selectedSchemeCode,
  });

  const { mutate: deactivate } = useMutation({
    mutationFn: (code) => schemeService.deactivate(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schemes-admin'] }),
  });

  // Handle Proactive Nudge
  const handleNudge = async (beneficiary) => {
    try {
      setNudgeLoadingId(beneficiary.familyDbId);
      await schemeService.nudgeBeneficiary(selectedSchemeCode, {
        familyId: beneficiary.familyDbId,
        memberId: beneficiary.primaryQualifyingMember?.memberDbId,
      });
      showToast(`📢 Welfare nudge successfully dispatched to Family ${beneficiary.familyId}!`);
      refetchSaturation();
    } catch (err) {
      showToast(`❌ Error sending nudge: ${err.message}`);
    } finally {
      setNudgeLoadingId(null);
    }
  };

  // Handle Milestone Cron Trigger
  const handleRunCron = async () => {
    try {
      setCronRunning(true);
      const res = await schemeService.triggerCron(selectedSchemeCode);
      showToast(`⚡ ${res.message || 'Milestone cron recalculation completed successfully!'}`);
      refetchSaturation();
    } catch (err) {
      showToast(`❌ Cron trigger failed: ${err.message}`);
    } finally {
      setCronRunning(false);
    }
  };

  const summary = saturationData?.summary || {
    totalFamiliesEvaluated: 0,
    eligibleFamiliesCount: 0,
    enrolledCount: 0,
    appliedCount: 0,
    unreachedCount: 0,
    saturationRate: 0,
    coverageGapRate: 0,
  };

  const beneficiaries = saturationData?.beneficiaries || [];

  return (
    <div className={`${styles.page} animate-fade-in`}>
      {/* Page Header */}
      <div className={styles.header}>
        <div>
          <h1>Welfare Schemes & Saturation Board</h1>
          <p>Manage scheme definitions, track saturation metrics, and discover eligible citizens across Gujarat</p>
        </div>
        {isAdmin && activeTab === 'catalog' && (
          <button className={styles.createBtn} onClick={() => { setModalScheme({}); setShowModal(true); }}>
            <Plus size={16} /> New Scheme
          </button>
        )}
      </div>

      {/* Primary Tab Switcher */}
      <div className={styles.tabNav} role="tablist">
        <button
          className={`${styles.tabBtn} ${activeTab === 'catalog' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('catalog')}
          role="tab"
          aria-selected={activeTab === 'catalog'}
        >
          <BookOpen size={16} /> Scheme Definitions ({schemes.length})
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'saturation' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('saturation')}
          role="tab"
          aria-selected={activeTab === 'saturation'}
        >
          <BarChart3 size={16} /> Saturation & Beneficiary Discovery Board
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: SCHEME DEFINITIONS / CATALOG                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'catalog' && (
        <>
          {/* Filters */}
          <div className={styles.filters}>
            <div className={styles.searchBox}>
              <Search size={15} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Search schemes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className={styles.select} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Stats strip */}
          <div className={styles.statsStrip}>
            <div className={styles.stat}><span>Total Schemes</span><strong>{schemes.length}</strong></div>
            <div className={styles.stat}><span>Active Schemes</span><strong>{schemes.filter(s => s.isActive !== false).length}</strong></div>
            <div className={styles.stat}><span>Categories Covered</span><strong>{new Set(schemes.map(s => s.category)).size}</strong></div>
          </div>

          {/* Grid */}
          {isSchemesLoading ? (
            <div className={styles.grid}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton" style={{ height: 200, borderRadius: 16 }} />
              ))}
            </div>
          ) : schemes.length === 0 ? (
            <div className={styles.empty}>
              <BookOpen size={40} />
              <p>No schemes found</p>
              {isAdmin && (
                <button className={styles.createBtn} onClick={() => { setModalScheme({}); setShowModal(true); }}>
                  Create First Scheme
                </button>
              )}
            </div>
          ) : (
            <div className={styles.grid}>
              {schemes.map((scheme) => (
                <div key={scheme._id} className={`${styles.schemeCard} ${scheme.isActive === false ? styles.inactive : ''}`}>
                  <div className={styles.cardTop}>
                    <span className={styles.category}>{scheme.category}</span>
                    <span className={`badge ${scheme.isActive !== false ? 'badge-success' : 'badge-neutral'}`}>
                      {scheme.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h2 className={styles.schemeName}>{scheme.schemeName}</h2>
                  <p className={styles.schemeDesc}>{scheme.description?.slice(0, 90)}...</p>
                  {scheme.maxBenefitAmount > 0 && (
                    <p className={styles.benefit}>₹{scheme.maxBenefitAmount.toLocaleString('en-IN')}</p>
                  )}
                  <div className={styles.cardMeta}>
                    <span className={styles.docsCount}>{scheme.requiredDocuments?.length || 0} docs required</span>
                    <span className={styles.code}>{scheme.schemeCode}</span>
                  </div>

                  {/* Actions: View Saturation Board + Admin Controls */}
                  <div className={styles.cardActions}>
                    <button
                      className={styles.viewBoardBtn}
                      onClick={() => {
                        setSelectedSchemeCode(scheme.schemeCode);
                        setActiveTab('saturation');
                      }}
                      title="View eligible beneficiary saturation board"
                    >
                      <BarChart3 size={13} /> Saturation Board
                    </button>

                    {isAdmin && (
                      <>
                        <button className={styles.editBtn} onClick={() => { setModalScheme(scheme); setShowModal(true); }}>
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          className={`${styles.toggleBtn} ${scheme.isActive === false ? styles.activateBtn : styles.deactivateBtn}`}
                          onClick={() => {
                            if (window.confirm(`${scheme.isActive !== false ? 'Deactivate' : 'Reactivate'} this scheme?`)) {
                              deactivate(scheme.schemeCode);
                            }
                          }}
                        >
                          <Power size={13} /> {scheme.isActive !== false ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: SATURATION & BENEFICIARY DISCOVERY BOARD               */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'saturation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Scheme Selector Header & Cron Action */}
          <div className={styles.boardHeader}>
            <div className={styles.schemeSelectWrapper}>
              <label className={styles.schemeSelectLabel}>Selected Scheme</label>
              <select
                className={styles.schemeDropdown}
                value={selectedSchemeCode}
                onChange={(e) => setSelectedSchemeCode(e.target.value)}
              >
                {schemes.map((s) => (
                  <option key={s.schemeCode} value={s.schemeCode}>
                    {s.schemeCode} — {s.schemeName}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.boardActions}>
              <button
                className={styles.cronBtn}
                onClick={handleRunCron}
                disabled={cronRunning}
                title="Execute automated eligibility recalculation for age milestones and circumstances"
              >
                <Zap size={15} />
                {cronRunning ? 'Recalculating Milestones...' : 'Run Milestone Cron Recalculation'}
              </button>
            </div>
          </div>

          {/* 4 Saturation Funnel Cards */}
          <div className={styles.metricGrid}>
            <div className={styles.metricCard}>
              <span className={styles.metricTitle}>Total Eligible Pool</span>
              <div className={styles.metricValue}>{summary.eligibleFamiliesCount}</div>
              <span className={styles.metricSubtext}>
                Households meeting scheme rules ({summary.totalFamiliesEvaluated} evaluated)
              </span>
            </div>

            <div className={`${styles.metricCard} ${styles.metricCardSuccess}`}>
              <span className={styles.metricTitle}>Active Enrolled</span>
              <div className={styles.metricValue}>{summary.enrolledCount}</div>
              <span className={styles.metricSubtext}>
                <strong>{summary.saturationRate}%</strong> state saturation rate
              </span>
              <div className={styles.saturationBar}>
                <div
                  className={styles.saturationProgress}
                  style={{ width: `${Math.min(100, summary.saturationRate || 0)}%` }}
                />
              </div>
            </div>

            <div className={styles.metricCard}>
              <span className={styles.metricTitle}>In-Flight Applications</span>
              <div className={styles.metricValue}>{summary.appliedCount}</div>
              <span className={styles.metricSubtext}>Under verification by Talati/Mamlatdar</span>
            </div>

            <div className={`${styles.metricCard} ${styles.metricCardHighlight}`}>
              <span className={styles.metricTitle}>Unreached Coverage Gap</span>
              <div className={styles.metricValue} style={{ color: '#D97706' }}>
                {summary.unreachedCount}
              </div>
              <span className={styles.metricSubtext}>
                Eligible households who have <strong>not yet applied</strong> ({summary.coverageGapRate}% gap)
              </span>
            </div>
          </div>

          {/* Beneficiaries Table Filter Strip */}
          <div className={styles.beneficiaryFilterStrip}>
            <div className={styles.statusTabs}>
              <button
                className={`${styles.statusTabBtn} ${beneficiaryStatus === 'ALL' ? styles.statusTabBtnActive : ''}`}
                onClick={() => setBeneficiaryStatus('ALL')}
              >
                All Eligible ({summary.eligibleFamiliesCount})
              </button>
              <button
                className={`${styles.statusTabBtn} ${beneficiaryStatus === 'ELIGIBLE_UNREACHED' ? styles.statusTabBtnActive : ''}`}
                onClick={() => setBeneficiaryStatus('ELIGIBLE_UNREACHED')}
              >
                🔴 Unreached Gap ({summary.unreachedCount})
              </button>
              <button
                className={`${styles.statusTabBtn} ${beneficiaryStatus === 'APPLIED' ? styles.statusTabBtnActive : ''}`}
                onClick={() => setBeneficiaryStatus('APPLIED')}
              >
                🟡 Applied ({summary.appliedCount})
              </button>
              <button
                className={`${styles.statusTabBtn} ${beneficiaryStatus === 'ENROLLED' ? styles.statusTabBtnActive : ''}`}
                onClick={() => setBeneficiaryStatus('ENROLLED')}
              >
                🟢 Enrolled ({summary.enrolledCount})
              </button>
            </div>

            <div className={styles.searchBox} style={{ maxWidth: 320 }}>
              <Search size={15} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Search family ID, name, district..."
                value={beneficiarySearch}
                onChange={(e) => setBeneficiarySearch(e.target.value)}
              />
            </div>
          </div>

          {/* Beneficiaries Table */}
          <div className={styles.tableCard}>
            {isSaturationLoading ? (
              <div style={{ padding: 'var(--space-8)' }}>
                <div className="skeleton" style={{ height: 160, borderRadius: 12 }} />
              </div>
            ) : beneficiaries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-gray-400)' }}>
                <Users size={36} style={{ marginBottom: 8, opacity: 0.6 }} />
                <p>No eligible beneficiaries found matching current filters.</p>
              </div>
            ) : (
              <table className={styles.beneficiaryTable}>
                <thead>
                  <tr>
                    <th>Family ID & Region</th>
                    <th>Head of Household</th>
                    <th>Primary Qualifying Member</th>
                    <th>Income & Category</th>
                    <th>Status</th>
                    <th>Why Eligible</th>
                    <th>Officer Action</th>
                  </tr>
                </thead>
                <tbody>
                  {beneficiaries.map((b) => (
                    <tr key={b.familyId}>
                      <td>
                        <Link to={`/families/${b.familyId}`} className={styles.familyLink}>
                          {b.familyId}
                        </Link>
                        <div>
                          <span className={styles.districtPill}>
                            {b.taluka ? `${b.taluka}, ` : ''}{b.district}
                          </span>
                        </div>
                      </td>
                      <td>
                        <strong>{b.headOfFamilyName}</strong>
                      </td>
                      <td>
                        <div>
                          <strong>{b.primaryQualifyingMember?.name}</strong>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--color-gray-500)' }}>
                          Age {b.primaryQualifyingMember?.age} • {b.primaryQualifyingMember?.gender} • ({b.primaryQualifyingMember?.relationToHead})
                        </span>
                      </td>
                      <td>
                        <div>₹{b.annualIncome?.toLocaleString('en-IN')}</div>
                        <span style={{ fontSize: 11, color: 'var(--color-gray-500)' }}>
                          {b.category} {b.bplStatus ? '• BPL' : ''}
                        </span>
                      </td>
                      <td>
                        {b.beneficiaryStatus === 'ENROLLED' && (
                          <span className="badge badge-success">
                            <CheckCircle2 size={12} style={{ marginRight: 3 }} /> Enrolled
                          </span>
                        )}
                        {b.beneficiaryStatus === 'APPLIED' && (
                          <span className="badge badge-warning">
                            Applied ({b.applicationDetails?.status || 'In Review'})
                          </span>
                        )}
                        {b.beneficiaryStatus === 'ELIGIBLE_UNREACHED' && (
                          <span className="badge badge-error" style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
                            <AlertCircle size={12} style={{ marginRight: 3 }} /> Not Applied
                          </span>
                        )}
                      </td>
                      <td style={{ maxWidth: 220, fontSize: 12 }}>
                        {b.whyEligible && b.whyEligible.length > 0 ? (
                          <span>{b.whyEligible[0]}</span>
                        ) : (
                          <span style={{ color: 'var(--color-gray-400)' }}>All deterministic rules met</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {b.beneficiaryStatus === 'ELIGIBLE_UNREACHED' && (
                            <button
                              className={styles.nudgeBtn}
                              onClick={() => handleNudge(b)}
                              disabled={nudgeLoadingId === b.familyDbId}
                              title="Send proactive SMS/in-app alert to citizen"
                            >
                              <Bell size={12} />
                              {nudgeLoadingId === b.familyDbId ? 'Sending...' : 'Send Nudge'}
                            </button>
                          )}
                          <Link
                            to={`/families/${b.familyId}`}
                            className={styles.familyLink}
                            style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 2 }}
                            title="Inspect complete family case and welfare graph"
                          >
                            Inspect <ExternalLink size={11} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Admin Scheme Create/Edit Modal */}
      {showModal && (
        <SchemeModal
          scheme={Object.keys(modalScheme).length > 0 ? modalScheme : null}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className={styles.toast}>
          <CheckCircle2 size={18} style={{ color: '#34D399' }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
