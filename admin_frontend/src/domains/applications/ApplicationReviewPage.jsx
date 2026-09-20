import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, CheckCircle, XCircle, RotateCcw, FileText, ExternalLink, AlertTriangle } from 'lucide-react';
import { applicationService } from '../../services/adminServices';
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

  const { data, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn:  () => applicationService.getById(id),
  });

  const { data: checklistData } = useQuery({
    queryKey: ['checklist', id],
    queryFn:  () => applicationService.getChecklist(id),
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
            <h2 className={styles.sectionTitle}>Submitted Documents</h2>
            {(app.submittedDocuments?.length > 0 || app.submittedDocumentKeys?.length > 0) ? (
              <ul className={styles.docList}>
                {app.submittedDocuments?.map((doc) => (
                  <li key={doc.docKey} className={styles.docItem}>
                    <FileText size={16} color="var(--color-navy-700)" />
                    <div className={styles.docInfo}>
                      <span className={styles.docKey}>{doc.docKey}</span>
                      <span className={styles.docName}>{doc.originalName}</span>
                    </div>
                    {doc.url && (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className={styles.viewDoc}>
                        <ExternalLink size={13} /> View
                      </a>
                    )}
                  </li>
                ))}
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
    </div>
  );
}
