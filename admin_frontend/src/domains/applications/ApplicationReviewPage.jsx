import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, CheckCircle, XCircle, RotateCcw, FileText, ExternalLink, AlertTriangle, ShieldCheck, Clock, Zap, Send, X, HelpCircle } from 'lucide-react';
import { applicationService, familyService } from '../../services/adminServices';
import { useAdminStore } from '../../store/adminStore';
import styles from './ApplicationReviewPage.module.css';

const REJECTION_CATEGORIES = [
  'IneligibleCriteria', 'DocumentsMissing', 'DocumentsTampered',
  'DuplicateApplication', 'FraudSuspected', 'OtherReason',
];

export default function ApplicationReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAdminStore();

  const [action, setAction]   = useState('');   // 'Approved' | 'Rejected' | 'ResubmissionRequired'
  const [remarks, setRemarks] = useState('');
  const [rejCat,  setRejCat]  = useState('');
  const [formErr, setFormErr] = useState('');

  // Phase 3 & 4 Workflow States
  const [docStatuses, setDocStatuses] = useState({});
  const [docRemarks, setDocRemarks]   = useState({});
  const [activeDocKey, setActiveDocKey] = useState(null);

  const [isClarifyModalOpen, setIsClarifyModalOpen] = useState(false);
  const [clarifyRemarks, setClarifyRemarks] = useState('');
  const [clarifyDocKey, setClarifyDocKey]   = useState('');
  const [clarifyDays, setClarifyDays]       = useState(7);
  const [clarifyError, setClarifyError]     = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn:  () => applicationService.getById(id),
  });

  const { data: checklistData } = useQuery({
    queryKey: ['checklist', id],
    queryFn:  () => applicationService.getChecklist(id),
  });

  const verifyDocMutation = useMutation({
    mutationFn: ({ certNumber, action, remarks }) => {
      const famId = data?.application?.familyId?._id || data?.application?.familyId?.familyId || data?.application?.familyId;
      return familyService.verifyDocument(famId, certNumber, { action, remarks });
    },
    onSuccess: (_, variables) => {
      setDocStatuses((prev) => ({ ...prev, [variables.docKey]: variables.action === 'Reject' ? 'Rejected' : 'Verified' }));
      setActiveDocKey(null);
      qc.invalidateQueries({ queryKey: ['application', id] });
    },
  });

  const clarifyMutation = useMutation({
    mutationFn: (payload) => applicationService.requestClarification(id, payload),
    onSuccess: () => {
      setIsClarifyModalOpen(false);
      setClarifyRemarks('');
      setClarifyError('');
      qc.invalidateQueries({ queryKey: ['application', id] });
    },
    onError: (err) => setClarifyError(err?.response?.data?.message || 'Failed to request clarification'),
  });

  const escalateMutation = useMutation({
    mutationFn: (payload) => applicationService.escalate(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application', id] });
    },
  });

  const { mutate: decide, isPending } = useMutation({
    mutationFn: (payload) => applicationService.decide(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application', id] });
      qc.invalidateQueries({ queryKey: ['applications'] });
      navigate('/applications');
    },
    onError: (err) => setFormErr(err.response?.data?.error || 'Decision failed'),
  });

  const handleDecide = () => {
    setFormErr('');
    if (!action)   return setFormErr('Please select an action');
    if (!remarks.trim()) return setFormErr('Remarks are required');
    if (action === 'Rejected' && !rejCat) return setFormErr('Please select a rejection category');
    decide({ action, remarks, rejectionCategory: action === 'Rejected' ? rejCat : undefined });
  };

  if (isLoading) return <div style={{ padding: 'var(--space-8)' }}><div className="skeleton" style={{ height: 200, borderRadius: 16 }} /></div>;

  const app = data?.application || data;
  if (!app) return <p>Application not found</p>;

  const checklist = checklistData?.checklist || [];
  const alreadyActed = app.approvalChain?.some((e) => e.officerId === user?.id);
  const scheme = app.schemeId;

  return (
    <div className={`${styles.page} animate-fade-in`}>
      <Link to="/applications" className={styles.back}>
        <ArrowLeft size={16} /> Back to Queue
      </Link>

      {/* ── Application Header ───────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.heroMeta}>
            <span className={styles.appId}>{app.applicationId}</span>
            {app.riskFlag === 'High' && (
              <span className={styles.riskBadge}>
                <AlertTriangle size={12} /> High Risk
              </span>
            )}
          </div>
          <h1 className={styles.schemeName}>{scheme?.schemeName || 'Application'}</h1>
          <p className={styles.submitted}>
            Submitted on {format(new Date(app.submittedAt), 'd MMMM yyyy')}
          </p>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.currentStatus}>
            Current Status: <strong>{app.status}</strong>
          </div>
        </div>
      </div>

      {/* ── Phase 4: SLA & Turnaround Window Tracker ─────── */}
      {(() => {
        const isBreached = app.sla?.isBreached || (app.sla?.targetCompletionDate && new Date(app.sla.targetCompletionDate) < new Date());
        const now = new Date();
        const targetDate = app.sla?.targetCompletionDate ? new Date(app.sla.targetCompletionDate) : null;
        const submittedDate = app.submittedAt ? new Date(app.submittedAt) : now;
        const totalMs = targetDate ? Math.max(1, targetDate.getTime() - submittedDate.getTime()) : 1;
        const elapsedMs = targetDate ? Math.max(0, now.getTime() - submittedDate.getTime()) : 0;
        const elapsedPercent = Math.min(100, Math.round((elapsedMs / totalMs) * 100));
        const daysLeft = targetDate ? Math.max(0, Math.round((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 14;

        return (
          <div className={styles.slaTracker}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: isBreached ? '#FEE2E2' : daysLeft <= 2 ? '#FEF3C7' : '#DCFCE7',
                color: isBreached ? '#DC2626' : daysLeft <= 2 ? '#D97706' : '#166534',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Clock size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>SLA Target: {targetDate ? format(targetDate, 'd MMMM yyyy') : '14 Days Window'}</span>
                  {app.priority === 'FastTrack' && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', background: '#EDE9FE', color: '#6D28D9', borderRadius: 4 }}>
                      ⚡ FastTrack SLA
                    </span>
                  )}
                  {app.escalated && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', background: '#FEE2E2', color: '#B91C1C', borderRadius: 4 }}>
                      🚨 Escalated
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: isBreached ? '#DC2626' : '#64748B', fontWeight: isBreached ? 700 : 500 }}>
                  {isBreached
                    ? '⚠️ Turnaround SLA Breached — Overdue for Sanction'
                    : `${daysLeft} days remaining (${elapsedPercent}% time elapsed)`}
                </div>
              </div>
            </div>

            <div className={styles.slaProgressWrap}>
              <div className={styles.slaBarBg}>
                <div
                  className={styles.slaBarFill}
                  style={{
                    width: `${elapsedPercent}%`,
                    background: isBreached ? '#DC2626' : daysLeft <= 2 ? '#F59E0B' : '#10B981',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {!app.escalated ? (
                <button
                  type="button"
                  onClick={() => {
                    const reason = window.prompt('Enter escalation justification:');
                    if (reason) escalateMutation.mutate({ reason });
                  }}
                  style={{
                    background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C',
                    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Escalate File
                </button>
              ) : (
                <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 700 }}>
                  Urgent Priority
                </span>
              )}
            </div>
          </div>
        );
      })()}

      <div className={styles.cols}>
        {/* ── Left: Application Details ────────────────── */}
        <div className={styles.leftCol}>

          {/* Member & Family */}
          <section className={`card ${styles.section}`}>
            <h2 className={styles.sectionTitle}>Applicant Details</h2>
            <div className={styles.detailGrid}>
              <div><span>Name</span><strong>{app.memberId?.name || '—'}</strong></div>
              <div><span>Age</span><strong>{app.memberId?.age || '—'}</strong></div>
              <div><span>Gender</span><strong>{app.memberId?.gender || '—'}</strong></div>
              <div><span>Occupation</span><strong>{app.memberId?.occupation || '—'}</strong></div>
              <div><span>Family ID</span><strong>{app.familyId?.familyId || '—'}</strong></div>
              <div><span>Category</span><strong>{app.familyId?.category || '—'}</strong></div>
              <div><span>Annual Income</span><strong>₹{Number(app.familyId?.annualIncome || 0).toLocaleString('en-IN')}</strong></div>
              <div><span>BPL</span><strong>{app.familyId?.isBPL ? 'Yes' : 'No'}</strong></div>
            </div>
          </section>

          {/* Submitted Documents */}
          <section className={`card ${styles.section}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Submitted Documents</h2>
              <Link
                to={`/families/${app.familyId?._id || app.familyId?.familyId || app.familyId}`}
                style={{ fontSize: 11.5, color: '#0284C7', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
              >
                <ExternalLink size={12} /> Family Evidence Dossier
              </Link>
            </div>

            {(app.submittedDocuments?.length > 0 || app.submittedDocumentKeys?.length > 0) ? (
              <ul className={styles.docList}>
                {app.submittedDocuments?.map((doc) => {
                  const status = docStatuses[doc.docKey] || (doc.isVerified ? 'Verified' : 'UnderReview');
                  return (
                    <li key={doc.docKey} className={styles.docItem} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <FileText size={18} color="var(--color-navy-700)" />
                        <div className={styles.docInfo}>
                          <span className={styles.docKey}>{doc.docKey}</span>
                          <span className={styles.docName}>{doc.originalName}</span>
                        </div>
                        {doc.url && (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className={styles.viewDoc}>
                            <ExternalLink size={13} /> View
                          </a>
                        )}
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 99,
                          background: status === 'Rejected' ? '#FEE2E2' : status === 'Verified' ? '#DCFCE7' : '#F1F5F9',
                          color: status === 'Rejected' ? '#991B1B' : status === 'Verified' ? '#166534' : '#64748B',
                          border: status === 'Rejected' ? '1px solid #FECACA' : status === 'Verified' ? '1px solid #BBF7D0' : '1px solid #CBD5E1',
                        }}>
                          {status === 'Rejected' ? '✕ Rejected' : status === 'Verified' ? '✓ Verified' : 'Under Review'}
                        </span>
                      </div>

                      {/* Scrutiny action controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 6, borderTop: '1px dashed #E2E8F0', justifyContent: 'flex-end' }}>
                        {activeDocKey === doc.docKey ? (
                          <div style={{ display: 'flex', gap: 6, width: '100%', alignItems: 'center' }}>
                            <input
                              type="text"
                              placeholder="Officer remarks / scrutiny finding..."
                              value={docRemarks[doc.docKey] || ''}
                              onChange={(e) => setDocRemarks({ ...docRemarks, [doc.docKey]: e.target.value })}
                              style={{ flex: 1, padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #CBD5E1' }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const certNum = doc.certificateNumber || doc.originalName?.match(/\(([^)]+)\)/)?.[1] || doc.docKey;
                                verifyDocMutation.mutate({ certNumber: certNum, action: 'Approve', remarks: docRemarks[doc.docKey], docKey: doc.docKey });
                              }}
                              style={{ background: '#16A34A', color: 'white', border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                            >
                              Confirm Verify
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const certNum = doc.certificateNumber || doc.originalName?.match(/\(([^)]+)\)/)?.[1] || doc.docKey;
                                verifyDocMutation.mutate({ certNumber: certNum, action: 'Reject', remarks: docRemarks[doc.docKey] || 'Document rejected', docKey: doc.docKey });
                              }}
                              style={{ background: '#DC2626', color: 'white', border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                            >
                              Reject Doc
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveDocKey(null)}
                              style={{ background: '#E2E8F0', color: '#475569', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => setActiveDocKey(doc.docKey)}
                              style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', padding: '3px 8px', borderRadius: 6, fontSize: 11, color: '#334155', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Scrutinize Document
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
                {!app.submittedDocuments?.length && app.submittedDocumentKeys?.map((k) => (
                  <li key={k} className={styles.docItem}>
                    <FileText size={16} />
                    <span className={styles.docKey}>{k}</span>
                    <span className="badge badge-neutral">Key only</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.noContent}>No documents submitted</p>
            )}
          </section>

          {/* Scheme-Specific Data */}
          {app.schemeSpecificData && Object.keys(app.schemeSpecificData).length > 0 && (
            <section className={`card ${styles.section}`}>
              <h2 className={styles.sectionTitle}>Scheme-Specific Information</h2>
              <div className={styles.detailGrid}>
                {Object.entries(app.schemeSpecificData).map(([k, v]) => (
                  <div key={k}><span>{k}</span><strong>{String(v)}</strong></div>
                ))}
              </div>
            </section>
          )}

          {/* Clarification History */}
          {app.clarificationHistory?.length > 0 && (
            <section className={`card ${styles.section}`}>
              <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <HelpCircle size={16} color="#D97706" /> Clarification & Correction History
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {app.clarificationHistory.map((cl, idx) => (
                  <div key={idx} style={{ padding: 12, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#92400E', fontWeight: 700, marginBottom: 4 }}>
                      <span>Query: {cl.documentKey ? `Regarding ${cl.documentKey}` : 'General Inquiry'}</span>
                      <span>{cl.requestedAt ? format(new Date(cl.requestedAt), 'd MMM yyyy, h:mm a') : '—'}</span>
                    </div>
                    <p style={{ margin: '0 0 6px', color: '#78350F' }}>"{cl.remarks}"</p>
                    {cl.citizenResponse ? (
                      <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed #FCD34D', color: '#166534' }}>
                        <strong>Citizen Reply ({cl.respondedAt ? format(new Date(cl.respondedAt), 'd MMM yyyy') : '—'}):</strong> "{cl.citizenResponse}"
                      </div>
                    ) : (
                      <div style={{ color: '#DC2626', fontWeight: 600 }}>Awaiting Citizen Response</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Approval Chain History */}
          <section className={`card ${styles.section}`}>
            <h2 className={styles.sectionTitle}>Review History</h2>
            {app.approvalChain?.length > 0 ? (
              <ul className={styles.chainList}>
                {app.approvalChain.map((entry, i) => (
                  <li key={i} className={`${styles.chainEntry} ${styles[`chain_${entry.action}`]}`}>
                    <div className={styles.chainMeta}>
                      <span className={styles.chainRole}>Level {entry.level}</span>
                      <span className={styles.chainDate}>{format(new Date(entry.decidedAt), 'd MMM yyyy, h:mm a')}</span>
                    </div>
                    <div className={styles.chainAction}>
                      {entry.action === 'Approved' ? <CheckCircle size={14} /> : entry.action === 'Rejected' ? <XCircle size={14} /> : <RotateCcw size={14} />}
                      <strong>{entry.action}</strong>
                    </div>
                    {entry.remarks && <p className={styles.chainRemarks}>"{entry.remarks}"</p>}
                  </li>
                ))}
              </ul>
            ) : <p className={styles.noContent}>No review history yet</p>}
          </section>
        </div>

        {/* ── Right: Checklist + Decision ──────────────── */}
        <div className={styles.rightCol}>
          {/* Checklist */}
          {checklist.length > 0 && (
            <section className={`card ${styles.section}`}>
              <h2 className={styles.sectionTitle}>Officer Checklist</h2>
              <ul className={styles.checklist}>
                {checklist.map((item, i) => (
                  <li key={i} className={styles.checkItem}>
                    <span className={styles.checkNum}>{i + 1}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Decision Panel */}
          {!alreadyActed && (
            <section className={`card ${styles.decisionCard}`}>
              <h2 className={styles.sectionTitle}>Your Decision</h2>

              {formErr && <p className={styles.formErr} role="alert">{formErr}</p>}

              {/* Clarification Trigger Button */}
              <button
                type="button"
                onClick={() => {
                  setClarifyError('');
                  setIsClarifyModalOpen(true);
                }}
                style={{
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  color: '#B45309',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  width: '100%',
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <HelpCircle size={15} /> Request Citizen Clarification / Correction
              </button>

              <div className={styles.actionButtons} role="group" aria-label="Select action">
                {[
                  { key: 'Approved',             label: 'Approve',     icon: CheckCircle, color: '#15803D' },
                  { key: 'Rejected',             label: 'Reject',      icon: XCircle,     color: '#B91C1C' },
                  { key: 'ResubmissionRequired', label: 'Request Docs', icon: RotateCcw,  color: '#B45309' },
                ].map(({ key, label, icon: Icon, color }) => (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.actionBtn} ${action === key ? styles.actionBtnActive : ''}`}
                    style={action === key ? { borderColor: color, background: `${color}10`, color } : {}}
                    onClick={() => setAction(key)}
                    aria-pressed={action === key}
                  >
                    <Icon size={16} /> {label}
                  </button>
                ))}
              </div>

              {action === 'Rejected' && (
                <div className={styles.formField}>
                  <label>Rejection Category *</label>
                  <select className={styles.select} value={rejCat} onChange={(e) => setRejCat(e.target.value)}>
                    <option value="">Select reason...</option>
                    {REJECTION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              <div className={styles.formField}>
                <label>Remarks * <span className={styles.hintText}>(visible to citizen)</span></label>
                <textarea
                  className={styles.textarea}
                  rows={4}
                  placeholder="Provide a clear reason for your decision..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              <button
                className={styles.submitDecision}
                disabled={isPending}
                onClick={handleDecide}
              >
                {isPending ? 'Submitting...' : 'Submit Decision'}
              </button>
            </section>
          )}

          {alreadyActed && (
            <section className={`card ${styles.alreadyActed}`}>
              <CheckCircle size={20} color="var(--color-success-700)" />
              <p>You have already submitted a decision on this application.</p>
            </section>
          )}
        </div>
      </div>

      {/* ── Clarification Modal ──────────────────────────── */}
      {isClarifyModalOpen && (
        <div className={styles.clarifyModalOverlay} role="dialog" aria-modal="true">
          <div className={styles.clarifyModal}>
            <div className={styles.clarifyHeader}>
              <h3>Request Document Correction / Clarification</h3>
              <button
                type="button"
                onClick={() => setIsClarifyModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.clarifyBody}>
              <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                Send formal query back to citizen. The application moves to <strong>ResubmissionRequired</strong> and a notification is dispatched with a deadline.
              </p>

              {clarifyError && (
                <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: 8, fontSize: 12 }}>
                  ⚠️ {clarifyError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                  Affected Document / Area (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Income Certificate or Bank Passbook"
                  value={clarifyDocKey}
                  onChange={(e) => setClarifyDocKey(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                  Instructions / Reason for Citizen *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Uploaded income certificate is blurred or expired. Please re-upload a clear copy showing Mamlatdar stamp."
                  value={clarifyRemarks}
                  onChange={(e) => setClarifyRemarks(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                  Resubmission Deadline (Days)
                </label>
                <select
                  value={clarifyDays}
                  onChange={(e) => setClarifyDays(Number(e.target.value))}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: 'white' }}
                >
                  <option value={3}>3 Days (Urgent)</option>
                  <option value={7}>7 Days (Standard)</option>
                  <option value={15}>15 Days (Extended)</option>
                </select>
              </div>
            </div>

            <div className={styles.clarifyFooter}>
              <button
                type="button"
                onClick={() => setIsClarifyModalOpen(false)}
                style={{ background: 'none', border: '1px solid #CBD5E1', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!clarifyRemarks.trim()) {
                    setClarifyError('Please enter instructions for the citizen');
                    return;
                  }
                  clarifyMutation.mutate({
                    remarks: clarifyRemarks,
                    documentKey: clarifyDocKey || undefined,
                    deadlineDays: clarifyDays,
                  });
                }}
                disabled={clarifyMutation.isPending}
                style={{ background: '#D97706', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                {clarifyMutation.isPending ? 'Sending...' : 'Send Clarification Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
