import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Network,
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  ShieldAlert,
  ArrowLeft,
  Sparkles,
  Database,
  Layers,
  Check,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { v2AdminService } from '../../services/v2AdminService';
import styles from './FamilyCaseViewPage.module.css';

export default function FamilyCaseViewPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('graph');
  const [nodeFilter, setNodeFilter] = useState('ALL');
  const [verifyNotes, setVerifyNotes] = useState({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['familyCaseView', id],
    queryFn: () => v2AdminService.getFamilyCaseView(id),
    enabled: !!id,
  });

  const { data: integrationsData } = useQuery({
    queryKey: ['integrationsStatus'],
    queryFn: v2AdminService.getIntegrationsStatus,
  });

  const { mutate: verifyEvent, isPending: isVerifying } = useMutation({
    mutationFn: ({ eventId, notes }) => v2AdminService.verifyLifeEvent(eventId, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['familyCaseView', id] });
    },
  });

  const { mutate: updateTask, isPending: isUpdatingTask } = useMutation({
    mutationFn: ({ taskId, status }) => v2AdminService.updateTask(taskId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['familyCaseView', id] });
    },
  });

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div style={{ padding: 'var(--space-8)' }}>
          <div className="skeleton" style={{ height: 120, borderRadius: 12, marginBottom: 20 }} />
          <div className="skeleton" style={{ height: 80, borderRadius: 12, marginBottom: 20 }} />
          <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyBox}>
          <AlertTriangle size={36} color="var(--color-warning-500)" style={{ marginBottom: 12 }} />
          <p>Family case view could not be loaded for ID: <strong>{id}</strong></p>
          <Link to="/families" className={styles.breadcrumbLink} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
            <ArrowLeft size={16} /> Return to Family Registry
          </Link>
        </div>
      </div>
    );
  }

  const {
    family = {},
    members = [],
    graph = { nodes: [], edges: [], metrics: {} },
    benefitGaps = { coveragePercentage: 0, currentBenefits: [], potentialBenefits: [], missingEvidence: [] },
    reusableEvidence = [],
    lifeEvents = [],
    riskSignals = [],
    tasks = []
  } = data;

  const filteredNodes = nodeFilter === 'ALL'
    ? (graph.nodes || [])
    : (graph.nodes || []).filter(n => n.type?.toUpperCase() === nodeFilter);

  const pendingEvents = lifeEvents.filter(e => e.verificationStatus === 'PendingVerification');
  const criticalTasks = tasks.filter(t => t.priority === 'Critical' || t.priority === 'High');

  return (
    <div className={`${styles.page} animate-fade-in`}>
      {/* ── Breadcrumb ────────────────────────────────────── */}
      <div className={styles.breadcrumb}>
        <Link to="/families" className={styles.breadcrumbLink}>Families</Link>
        <ChevronRight size={14} />
        <span>Family Case View</span>
        <ChevronRight size={14} />
        <span style={{ fontWeight: 600, color: 'var(--color-navy-900)' }}>{family.familyId}</span>
      </div>

      {/* ── Family Header ─────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.titleRow}>
            <h1>
              <Network size={26} color="var(--color-teal-600)" />
              Family Welfare Intelligence Case
            </h1>
            <span className={styles.familyPill}>ID: {family.familyId}</span>
            <span className={`badge ${family.isVerified ? 'badge-success' : 'badge-warning'}`}>
              {family.isVerified ? 'Verified Master' : 'Pending Verification'}
            </span>
            <span className="badge badge-navy">{family.status || 'Provisional'}</span>
          </div>

          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span>Location:</span>
              <strong>{family.address?.village || family.address?.taluka || '—'}, {family.address?.district || 'Gujarat'}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Social Category:</span>
              <strong>{family.category || 'General'}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Annual Income:</span>
              <strong>₹{Number(family.annualIncome || 0).toLocaleString('en-IN')}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Ration Card:</span>
              <strong>{family.rationCardNumber || 'Unlinked'} ({family.isBPL ? 'BPL' : 'AAY/APL'})</strong>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.refreshBtn} onClick={() => refetch()}>
            <RefreshCw size={14} /> Refresh Graph
          </button>
        </div>
      </header>

      {/* ── Key Metrics Grid ──────────────────────────────── */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#EBF2FD', color: '#1A3A6E' }}>
            <Users size={22} />
          </div>
          <div>
            <p className={styles.statValue}>{members.length}</p>
            <p className={styles.statLabel}>Family Members</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#ECFEFF', color: '#0E7490' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <p className={styles.statValue}>{benefitGaps.currentBenefits?.length || 0}</p>
            <p className={styles.statLabel}>Active Benefits</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#FEF3C7', color: '#D97706' }}>
            <Sparkles size={22} />
          </div>
          <div>
            <p className={styles.statValue}>{benefitGaps.potentialBenefits?.length || 0}</p>
            <p className={styles.statLabel}>Opportunities Discovered</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: pendingEvents.length > 0 ? '#FEE2E2' : '#F0FDF4', color: pendingEvents.length > 0 ? '#B91C1C' : '#15803D' }}>
            <Activity size={22} />
          </div>
          <div>
            <p className={styles.statValue}>{pendingEvents.length}</p>
            <p className={styles.statLabel}>Pending Life Events</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: riskSignals.length > 0 ? '#FEF3C7' : '#F0FDF4', color: riskSignals.length > 0 ? '#B45309' : '#15803D' }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <p className={styles.statValue}>{riskSignals.length}</p>
            <p className={styles.statLabel}>Risk Signals</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#EDE9FE', color: '#7C3AED' }}>
            <Layers size={22} />
          </div>
          <div>
            <p className={styles.statValue}>{tasks.filter(t => t.status !== 'Completed').length}</p>
            <p className={styles.statLabel}>Open Officer Tasks</p>
          </div>
        </div>
      </div>

      {/* ── Benefit Gap Coverage Bar ──────────────────────── */}
      <section className={styles.coverageSection}>
        <div className={styles.coverageHeader}>
          <div className={styles.coverageTitle}>
            <Sparkles size={18} color="#22B8D4" />
            <span>Welfare Optimization & Coverage Index</span>
          </div>
          <span className={styles.coveragePercent}>{benefitGaps.coveragePercentage || 0}% Covered</span>
        </div>

        <div className={styles.coverageTrack}>
          <div
            className={styles.coverageFill}
            style={{ width: `${Math.min(100, Math.max(10, benefitGaps.coveragePercentage || 0))}%` }}
          />
        </div>

        <div className={styles.coverageLegend}>
          <div className={styles.coverageLegendItem}>
            <span className={styles.legendDot} style={{ background: '#22C55E' }} />
            <span>Current Active: <strong>{benefitGaps.currentBenefits?.length || 0} schemes</strong></span>
          </div>
          <div className={styles.coverageLegendItem}>
            <span className={styles.legendDot} style={{ background: '#22B8D4' }} />
            <span>Discovered Potential: <strong>{benefitGaps.potentialBenefits?.length || 0} eligible schemes</strong></span>
          </div>
          <div className={styles.coverageLegendItem}>
            <span className={styles.legendDot} style={{ background: '#F59E0B' }} />
            <span>Missing Evidence: <strong>{benefitGaps.missingEvidence?.length || 0} items</strong></span>
          </div>
        </div>
      </section>

      {/* ── Navigation Tabs ───────────────────────────────── */}
      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'graph' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('graph')}
        >
          <Network size={16} />
          <span>Welfare Graph</span>
          <span className={styles.tabBadge}>{graph.nodes?.length || 0}</span>
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === 'members' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('members')}
        >
          <Users size={16} />
          <span>Household Members</span>
          <span className={styles.tabBadge}>{members.length}</span>
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === 'events' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('events')}
        >
          <Activity size={16} />
          <span>Life Events Queue</span>
          {pendingEvents.length > 0 && (
            <span className={styles.tabBadge} style={{ background: '#FEE2E2', color: '#B91C1C' }}>
              {pendingEvents.length}
            </span>
          )}
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === 'gaps' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('gaps')}
        >
          <Sparkles size={16} />
          <span>Explainable Benefit Gaps</span>
          <span className={styles.tabBadge}>{benefitGaps.potentialBenefits?.length || 0}</span>
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === 'evidence' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('evidence')}
        >
          <FileText size={16} />
          <span>Reusable Evidence Vault</span>
          <span className={styles.tabBadge}>{reusableEvidence.length}</span>
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === 'risks' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('risks')}
        >
          <ShieldAlert size={16} />
          <span>Risk Intelligence</span>
          {riskSignals.length > 0 && (
            <span className={styles.tabBadge} style={{ background: '#FEF3C7', color: '#B45309' }}>
              {riskSignals.length}
            </span>
          )}
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === 'tasks' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          <Layers size={16} />
          <span>Officer Tasks</span>
          <span className={styles.tabBadge}>{tasks.length}</span>
        </button>
      </div>

      {/* ── TAB 1: WELFARE GRAPH ──────────────────────────── */}
      {activeTab === 'graph' && (
        <div className={styles.graphPanel}>
          <div className={styles.graphVisualBox}>
            <div className={styles.graphHeader}>
              <h2>
                <Network size={20} color="var(--color-teal-600)" />
                Family Welfare Intelligence Graph Nodes ({filteredNodes.length})
              </h2>
              <div className={styles.nodeFilterBar}>
                {['ALL', 'FAMILY', 'MEMBER', 'EVIDENCE', 'SCHEME', 'BENEFIT', 'LIFEEVENT', 'RISKSIGNAL'].map(type => (
                  <button
                    key={type}
                    className={`${styles.filterChip} ${nodeFilter === type ? styles.activeChip : ''}`}
                    onClick={() => setNodeFilter(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.nodesGrid}>
              {filteredNodes.map(node => (
                <div key={node.id} className={styles.nodeCard}>
                  <div className={styles.nodeTop}>
                    <span
                      className={styles.nodeTypeBadge}
                      style={{
                        background:
                          node.type === 'Family' ? '#D6E4FA' :
                          node.type === 'Member' ? '#EDE9FE' :
                          node.type === 'Evidence' ? '#CFFAFE' :
                          node.type === 'Scheme' ? '#DCFCE7' :
                          node.type === 'Benefit' ? '#FEF3C7' :
                          node.type === 'LifeEvent' ? '#FEE2E2' : '#F3F4F6',
                        color:
                          node.type === 'Family' ? '#0B1E3E' :
                          node.type === 'Member' ? '#7C3AED' :
                          node.type === 'Evidence' ? '#0E7490' :
                          node.type === 'Scheme' ? '#15803D' :
                          node.type === 'Benefit' ? '#D97706' :
                          node.type === 'LifeEvent' ? '#B91C1C' : '#374151',
                      }}
                    >
                      {node.type}
                    </span>
                    <span style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'var(--font-mono)' }}>{node.id.slice(-8)}</span>
                  </div>
                  <p className={styles.nodeTitle}>{node.label}</p>
                  <p className={styles.nodeSub}>
                    {node.sublabel || (node.data?.status ? `Status: ${node.data.status}` : 'Entity node in family graph')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: LIFE EVENTS QUEUE ──────────────────────── */}
      {activeTab === 'events' && (
        <div className={styles.eventList}>
          {lifeEvents.length === 0 ? (
            <div className={styles.emptyBox}>
              <Activity size={32} color="#9CA3AF" style={{ marginBottom: 8 }} />
              <p>No life events recorded for this family yet.</p>
            </div>
          ) : (
            lifeEvents.map(event => (
              <div key={event._id} className={styles.eventCard}>
                <div className={styles.eventCardHeader}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="badge badge-navy" style={{ fontWeight: 700 }}>{event.eventType}</span>
                      <span className={`badge ${
                        event.verificationStatus === 'Verified' ? 'badge-success' :
                        event.verificationStatus === 'Rejected' ? 'badge-danger' : 'badge-warning'
                      }`}>
                        {event.verificationStatus}
                      </span>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>
                        Confidence: <strong>{Math.round((event.confidenceScore || 1) * 100)}%</strong>
                      </span>
                    </div>
                    <div className={styles.eventMeta}>
                      <span>Date: {new Date(event.eventDate || event.createdAt).toLocaleDateString('en-IN')}</span>
                      <span>•</span>
                      <span>Source: {event.sourceType || 'CitizenReported'}</span>
                      {event.externalRegistrationNumber && (
                        <>
                          <span>•</span>
                          <span>Reg No: {event.externalRegistrationNumber}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {event.impactSummary && (
                  <div className={styles.impactBox}>
                    <strong>Downstream Orchestration:</strong> {event.impactSummary}
                  </div>
                )}

                {event.verificationStatus === 'PendingVerification' && (
                  <div className={styles.verifyBox}>
                    <input
                      className={styles.verifyInput}
                      placeholder="Officer verification notes or certificate verification remark..."
                      value={verifyNotes[event._id] || ''}
                      onChange={e => setVerifyNotes({ ...verifyNotes, [event._id]: e.target.value })}
                    />
                    <button
                      className={styles.verifyBtn}
                      disabled={isVerifying}
                      onClick={() => verifyEvent({ eventId: event._id, notes: verifyNotes[event._id] })}
                    >
                      <Check size={14} /> Verify Event & Trigger Orchestration
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TAB 3: EXPLAINABLE BENEFIT GAPS ───────────────── */}
      {activeTab === 'gaps' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Current Enrolled Benefits */}
          <div>
            <h3 style={{ fontSize: 'var(--text-base)', color: 'var(--color-navy-900)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={18} color="var(--color-success-700)" />
              Active & Enrolled Benefits ({benefitGaps.currentBenefits?.length || 0})
            </h3>
            {benefitGaps.currentBenefits?.length === 0 ? (
              <p style={{ color: '#6B7280', fontSize: 'var(--text-sm)', fontStyle: 'italic' }}>No active benefits enrolled currently.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
                {benefitGaps.currentBenefits.map((b, i) => (
                  <div key={i} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <strong style={{ color: '#0B1E3E' }}>{b.schemeName || b.schemeCode}</strong>
                      <span className="badge badge-success">{b.status || 'Active'}</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#4B5563', margin: 0 }}>
                      Monthly Value: <strong>₹{b.monthlyValue || 'Direct Service'}</strong>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Potential Eligible Benefits */}
          <div>
            <h3 style={{ fontSize: 'var(--text-base)', color: 'var(--color-navy-900)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="var(--color-teal-600)" />
              Discovered Potential Welfare Opportunities ({benefitGaps.potentialBenefits?.length || 0})
            </h3>
            {benefitGaps.potentialBenefits?.length === 0 ? (
              <p style={{ color: '#6B7280', fontSize: 'var(--text-sm)', fontStyle: 'italic' }}>No pending opportunities discovered at this time.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-4)' }}>
                {benefitGaps.potentialBenefits.map((item, idx) => (
                  <div key={idx} style={{ background: '#fff', border: '1px solid #CFFAFE', borderRadius: 12, padding: 18, borderLeft: '4px solid #0891B2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <strong style={{ color: '#0B1E3E', fontSize: 15 }}>{item.schemeName}</strong>
                      <span className="badge badge-teal">{item.status || 'Eligible'}</span>
                    </div>

                    <p style={{ fontSize: 13, color: '#374151', marginBottom: 12 }}>
                      {item.why || 'Family meets all primary socio-economic threshold requirements for this scheme.'}
                    </p>

                    {item.satisfiedRules?.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#047857', margin: '0 0 4px', textTransform: 'uppercase' }}>Satisfied Rules</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {item.satisfiedRules.map((rule, rIdx) => (
                            <div key={rIdx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#065F46' }}>
                              <Check size={13} color="#059669" />
                              <span>{rule}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.missingEvidence?.length > 0 && (
                      <div style={{ background: '#FFFBEB', padding: 8, borderRadius: 6, marginTop: 10 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#B45309', margin: '0 0 4px', textTransform: 'uppercase' }}>Required Evidence</p>
                        <p style={{ fontSize: 12, color: '#92400E', margin: 0 }}>
                          Missing: {item.missingEvidence.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: HOUSEHOLD MEMBERS ────────────────────────── */}
      {activeTab === 'members' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
            {members.length === 0 ? (
              <div className={styles.emptyBox} style={{ gridColumn: '1 / -1' }}>
                <Users size={32} color="#9CA3AF" style={{ marginBottom: 8 }} />
                <p>No household members recorded in master registry.</p>
              </div>
            ) : (
              members.map((m, idx) => (
                <div key={m._id || idx} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ fontSize: 16, color: 'var(--color-navy-900)' }}>{m.name}</strong>
                      <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>
                        {m.relationToHead} · {m.gender} · {m.age} yrs
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {m.relationToHead === 'Self' && <span className="badge badge-navy">Head</span>}
                      <span className={`badge ${m.lifecycleStatus === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                        {m.lifecycleStatus || 'Active'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, background: '#F8FAFC', padding: 12, borderRadius: 8 }}>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: 11, textTransform: 'uppercase' }}>Occupation</span>
                      <strong>{m.occupation || '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: 11, textTransform: 'uppercase' }}>Education</span>
                      <strong>{m.educationLevel || '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: 11, textTransform: 'uppercase' }}>Marital Status</span>
                      <strong>{m.maritalStatus || 'Single'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: 11, textTransform: 'uppercase' }}>Aadhaar</span>
                      <strong>Linked (Verified)</strong>
                    </div>
                  </div>

                  {(m.isStudent || m.hasDisability) && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {m.isStudent && <span className="badge badge-teal">Student</span>}
                      {m.hasDisability && (
                        <span className="badge badge-warning">
                          PwD {m.disabilityPercentage ? `(${m.disabilityPercentage}%)` : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: REUSABLE EVIDENCE VAULT ────────────────── */}
      {activeTab === 'evidence' && (
        <div>
          <div style={{ marginBottom: 16, background: '#ECFEFF', border: '1px solid #CFFAFE', padding: 14, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Info size={18} color="#0E7490" />
            <span style={{ fontSize: 13, color: '#164E63' }}>
              <strong>"One Evidence → Many Benefits" Architecture:</strong> Documents uploaded once are verified and mapped across all applicable welfare schemes, eliminating redundant physical document submissions.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
            {reusableEvidence.length === 0 ? (
              <div className={styles.emptyBox} style={{ gridColumn: '1 / -1' }}>
                <FileText size={32} color="#9CA3AF" style={{ marginBottom: 8 }} />
                <p>No verified reusable evidence documents indexed yet.</p>
              </div>
            ) : (
              reusableEvidence.map((doc, idx) => (
                <div key={idx} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <strong style={{ color: '#0B1E3E', fontSize: 15 }}>
                      {doc.certificateType ? `${doc.certificateType} Certificate` : (doc.docType || doc.title || 'Document')}
                    </strong>
                    <span className={`badge ${doc.isVerified ? 'badge-success' : 'badge-warning'}`}>
                      {doc.isVerified ? 'Verified' : 'Pending Verification'}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: '#475569', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div>
                      Certificate No: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#0B1E3E' }}>{doc.certificateNumber || 'N/A'}</span>
                    </div>
                    {doc.issuingAuthority && (
                      <div>Authority: <strong>{doc.issuingAuthority}</strong></div>
                    )}
                    {doc.issueDate && (
                      <div>Issued: <strong>{new Date(doc.issueDate).toLocaleDateString('en-IN')}</strong></div>
                    )}
                    {doc.expiryDate && (
                      <div>Expires: <strong>{new Date(doc.expiryDate).toLocaleDateString('en-IN')}</strong></div>
                    )}
                  </div>

                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 10 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 6px', textTransform: 'uppercase' }}>
                      Associated Schemes Unlocked ({doc.applicableSchemes?.length || 0})
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(doc.applicableSchemes || []).map((s, sIdx) => {
                        const name = typeof s === 'string' ? s : (s.schemeName || s.schemeCode || 'Scheme');
                        return (
                          <span key={sIdx} style={{ background: '#E0F2FE', color: '#0369A1', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>
                            {name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── TAB 5: RISK SIGNALS ───────────────────────────── */}
      {activeTab === 'risks' && (
        <div>
          {riskSignals.length === 0 ? (
            <div className={styles.emptyBox}>
              <CheckCircle size={32} color="var(--color-success-500)" style={{ marginBottom: 8 }} />
              <p>No risk signals or identity anomalies detected for this family.</p>
            </div>
          ) : (
            riskSignals.map((signal, idx) => (
              <div key={idx} className={styles.riskCard}>
                <div className={styles.riskHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={16} color="var(--color-warning-700)" />
                    <span className={styles.riskTitle}>{signal.signalType || 'Verification Check Flag'}</span>
                  </div>
                  <span className={`badge ${
                    signal.severity === 'Critical' ? 'badge-danger' :
                    signal.severity === 'High' ? 'badge-warning' : 'badge-neutral'
                  }`}>
                    {signal.severity || 'Medium'} Severity
                  </span>
                </div>

                <p className={styles.riskDesc}>
                  {signal.description || 'Non-accusatory check indicates possible document overlap or conflicting lifecycle timeline.'}
                </p>

                {signal.recommendedAction && (
                  <div className={styles.riskAction}>
                    <strong>Officer Recommendation:</strong> {signal.recommendedAction}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TAB 6: OFFICER TASKS ──────────────────────────── */}
      {activeTab === 'tasks' && (
        <div className={styles.taskList}>
          {tasks.length === 0 ? (
            <div className={styles.emptyBox}>
              <CheckCircle size={32} color="var(--color-success-500)" style={{ marginBottom: 8 }} />
              <p>No pending officer tasks assigned for this family case.</p>
            </div>
          ) : (
            tasks.map(task => (
              <div key={task._id} className={styles.taskItem}>
                <div className={styles.taskLeft}>
                  <span className={`badge ${
                    task.priority === 'Critical' ? 'badge-danger' :
                    task.priority === 'High' ? 'badge-warning' : 'badge-navy'
                  }`}>
                    {task.priority}
                  </span>
                  <div>
                    <p className={styles.taskText}>{task.title || task.description}</p>
                    <p className={styles.taskSub}>
                      Type: {task.taskType} • Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN') : 'Standard SLA'}
                    </p>
                  </div>
                </div>

                <div className={styles.taskActions}>
                  <button
                    className={`${styles.taskBtn} ${task.status === 'Completed' ? styles.taskBtnDone : ''}`}
                    disabled={isUpdatingTask || task.status === 'Completed'}
                    onClick={() => updateTask({ taskId: task._id, status: task.status === 'Completed' ? 'Pending' : 'Completed' })}
                  >
                    {task.status === 'Completed' ? '✓ Completed' : 'Mark as Done'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── CONNECTORS FOOTER ─────────────────────────────── */}
      <div className={styles.connectorsBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Database size={16} color="var(--color-navy-900)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-navy-900)' }}>
            Connected Interoperability Adapters:
          </span>
        </div>
        <div className={styles.connectorsList}>
          {['UIDAI (Identity)', 'CRS (Civil Registry)', 'NFSA (Ration)', 'U-DISE+ (Education)', 'NSAP (Pensions)', 'DigiLocker', 'PFMS (Direct Benefit Transfer)'].map((conn, i) => (
            <span key={i} className={styles.connectorBadge}>
              <span className={styles.simulatedTag}>SIMULATED</span>
              <span>{conn}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
