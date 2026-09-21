import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, Clock, XCircle, AlertCircle, MinusCircle, ExternalLink, Upload, Send, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { applicationService, uploadService } from '../../services/applicationService';
import { useAuthStore } from '../../store/authStore';
import StatusChip from '../../components/ui/StatusChip';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import styles from './ApplicationDetailPage.module.css';

const PIPELINE = [
  { key: 'Pending',        label: 'Submitted',              role: 'Citizen' },
  { key: 'Level1Approved', label: 'Talati Verified',        role: 'Talati' },
  { key: 'Level2Approved', label: 'Mamlatdar Verified',     role: 'Mamlatdar' },
  { key: 'FinalApproved',  label: 'District Officer Approved', role: 'District Officer' },
];

const STATUS_ORDER = ['Pending','Level1Review','Level1Approved','Level2Review','Level2Approved','Level3Review','FinalApproved'];

function getTimelineState(appStatus, pipelineStatus) {
  const appIdx = STATUS_ORDER.indexOf(appStatus);
  const pipIdx = STATUS_ORDER.indexOf(pipelineStatus);
  if (appStatus === 'Rejected' || appStatus === 'Withdrawn') return 'neutral';
  if (appStatus === 'ResubmissionRequired' && pipelineStatus === 'Pending') return 'done';
  if (pipIdx <= appIdx) return 'done';
  if (pipIdx === appIdx + 1) return 'active';
  return 'upcoming';
}

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [resubmitRemarks, setResubmitRemarks] = useState('');
  const [resubmitFile, setResubmitFile] = useState(null);
  const [resubmitSuccess, setResubmitSuccess] = useState('');
  const [resubmitErr, setResubmitErr] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationService.getById(id),
  });

  const { mutate: withdraw, isPending: withdrawing } = useMutation({
    mutationFn: () => applicationService.withdraw(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['application', id] }),
  });

  const { mutate: resubmit, isPending: isResubmitting } = useMutation({
    mutationFn: async () => {
      setResubmitErr('');
      let updatedDocuments = [];
      const docKey = data?.application?.documentAffected || data?.application?.clarificationHistory?.[data?.application?.clarificationHistory?.length - 1]?.documentKey || 'ClarificationDocument';
      if (resubmitFile) {
        const uploaded = await uploadService.uploadDocument(resubmitFile, docKey);
        updatedDocuments.push({
          docKey,
          url: uploaded.url,
          publicId: uploaded.publicId,
          originalName: resubmitFile.name,
          format: uploaded.format,
          sizeBytes: uploaded.sizeBytes,
        });
      }
      return applicationService.respondClarification(id, {
        citizenResponse: resubmitRemarks,
        updatedDocuments,
      });
    },
    onSuccess: (res) => {
      setResubmitSuccess('Clarification & documents submitted successfully! Application review resumed.');
      setResubmitRemarks('');
      setResubmitFile(null);
      queryClient.invalidateQueries({ queryKey: ['application', id] });
    },
    onError: (err) => {
      setResubmitErr(err.response?.data?.error || 'Failed to submit response');
    },
  });

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--space-8)' }}>
        <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
      </div>
    );
  }

  const app = data?.application || data;
  if (!app) return <p>Application not found.</p>;

  const canWithdraw = app.status === 'Pending';
  const schemeCode = app.schemeId?.schemeCode;
  const targetDate = app.sla?.targetCompletionDate ? new Date(app.sla.targetCompletionDate) : null;
  const isSlaBreached = app.sla?.isBreached || (targetDate && isPast(targetDate) && !['FinalApproved', 'Rejected'].includes(app.status));
  const latestClarification = app.clarificationHistory?.[app.clarificationHistory.length - 1];

  return (
    <div className={`${styles.page} animate-fade-in`}>
      <Link to="/applications" className={styles.backLink}>
        <ArrowLeft size={16} /> Back to Applications
      </Link>

      {/* ── Hero ──────────────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.heroMeta} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <span className={styles.appId}>{app.applicationId}</span>
          <StatusChip status={app.status} size="lg" />

          {/* Priority Pill */}
          {app.priority === 'FastTrack' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(245, 158, 11, 0.25)', color: '#FDE68A', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, border: '1px solid rgba(245, 158, 11, 0.4)' }}>
              <Zap size={13} /> Fast-Track
            </span>
          )}
          {app.priority === 'Urgent' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(239, 68, 68, 0.25)', color: '#FCA5A5', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, border: '1px solid rgba(239, 68, 68, 0.4)' }}>
              <AlertTriangle size={13} /> High Priority / Urgent
            </span>
          )}

          {/* Auto-Approval Pill */}
          {app.autoApproved && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(16, 185, 129, 0.25)', color: '#A7F3D0', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.4)' }}>
              <ShieldCheck size={13} /> Instant Sanctioned
            </span>
          )}

          {/* SLA Turnaround Pill */}
          {targetDate && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: isSlaBreached ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.15)',
              color: isSlaBreached ? '#FCA5A5' : 'rgba(255,255,255,0.9)',
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 12,
              border: isSlaBreached ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255,255,255,0.2)'
            }}>
              <Clock size={13} />
              {isSlaBreached
                ? `⚠️ SLA Breached (Target was ${format(targetDate, 'dd MMM')})`
                : `Target Decision: ${format(targetDate, 'dd MMM yyyy')} (${formatDistanceToNow(targetDate, { addSuffix: true })})`
              }
            </span>
          )}
        </div>
        <h1 className={styles.schemeName}>{app.schemeId?.schemeName || 'Application'}</h1>
        <p className={styles.submittedOn}>
          Submitted on {format(new Date(app.submittedAt), 'd MMMM yyyy')}
        </p>
      </div>

      {/* ── Escalation Alert Banner ───────────────────────── */}
      {app.escalated && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: '#FEF2F2',
          border: '1px solid #F87171',
          borderLeft: '5px solid #EF4444',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 16px',
          color: '#991B1B'
        }}>
          <AlertTriangle size={20} color="#DC2626" />
          <div>
            <strong style={{ display: 'block', fontSize: 14 }}>Expedited Officer Escalation</strong>
            <p style={{ fontSize: 13, margin: 0, color: '#7F1D1D' }}>
              This application has been flagged for priority administrative handling: {app.escalationReason || 'Higher scrutiny / expedited resolution requested'}.
            </p>
          </div>
        </div>
      )}

      {/* ── Action Required Banner ────────────────────────── */}
      {app.status === 'ResubmissionRequired' && (
        <div className={styles.resubBanner} role="alert">
          <AlertCircle size={22} />
          <div>
            <strong>Action Required: Reviewer Clarification Needed</strong>
            <p>
              The verification officer has requested clarification or an updated document.
              Your file is paused until you provide the requested information below.
              {app.resubmissionDeadline && (
                <span style={{ display: 'block', marginTop: 4, fontWeight: 600, color: '#B45309' }}>
                  Resubmission Deadline: {format(new Date(app.resubmissionDeadline), 'd MMMM yyyy')} ({formatDistanceToNow(new Date(app.resubmissionDeadline), { addSuffix: true })})
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      <div className={styles.grid}>
        {/* ── Visual Timeline ───────────────────────────────── */}
        <Card className={styles.timelineCard}>
          <h2 className={styles.cardTitle}>Application Journey</h2>
          <div className={styles.timeline} role="list">
            {PIPELINE.map((stage, idx) => {
              const state = getTimelineState(app.status, stage.key);
              // Find matching approval chain entry
              const chainEntry = app.approvalChain?.find((e) => {
                if (stage.key === 'Level1Approved') return e.level === 1 && e.action === 'Approved';
                if (stage.key === 'Level2Approved') return e.level === 2 && e.action === 'Approved';
                if (stage.key === 'FinalApproved')  return e.level === 3 && e.action === 'Approved';
                return false;
              });
              const statusEntry = app.statusHistory?.find((s) => s.status === stage.key || s.status === 'Pending');

              return (
                <div key={stage.key} role="listitem" className={`${styles.timelineItem} ${styles[`tl_${state}`]}`}>
                  <div className={styles.timelineTrack}>
                    <div className={styles.timelineDot}>
                      {state === 'done' ? <CheckCircle size={18} /> :
                       state === 'active' ? <Clock size={18} /> :
                       <MinusCircle size={18} />}
                    </div>
                    {idx < PIPELINE.length - 1 && <div className={styles.timelineConnector} />}
                  </div>
                  <div className={styles.timelineContent}>
                    <p className={styles.timelineLabel}>{stage.label}</p>
                    <p className={styles.timelineRole}>{stage.role}</p>
                    {chainEntry && (
                      <p className={styles.timelineDate}>
                        {format(new Date(chainEntry.decidedAt), 'd MMM yyyy, h:mm a')}
                      </p>
                    )}
                    {chainEntry?.remarks && (
                      <p className={styles.timelineRemarks}>"{chainEntry.remarks}"</p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Rejection node */}
            {app.status === 'Rejected' && (
              <div role="listitem" className={`${styles.timelineItem} ${styles.tl_rejected}`}>
                <div className={styles.timelineTrack}>
                  <div className={styles.timelineDot}>
                    <XCircle size={18} />
                  </div>
                </div>
                <div className={styles.timelineContent}>
                  <p className={styles.timelineLabel}>Rejected at Level {app.rejectedAtLevel}</p>
                  <p className={styles.timelineRole}>{app.rejectionCategory}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* ── Right Column ──────────────────────────────────── */}
        <div className={styles.rightCol}>
          {/* SLA Turnaround & Governance Card */}
          <Card>
            <h2 className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color="var(--color-navy-700)" />
              Service Level Guarantee (SLA)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: 6 }}>
                <span style={{ color: '#6B7280' }}>Total SLA Window:</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>{app.sla?.slaDaysTotal || 15} Working Days</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: 6 }}>
                <span style={{ color: '#6B7280' }}>Target Date:</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>
                  {targetDate ? format(targetDate, 'dd MMMM yyyy') : 'Calculated upon review'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: 6 }}>
                <span style={{ color: '#6B7280' }}>Current Stage:</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>
                  {app.currentPipelineLevel === 1 ? 'Level 1 — Talati' :
                   app.currentPipelineLevel === 2 ? 'Level 2 — Mamlatdar' : 'Level 3 — District Officer'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 2 }}>
                <span style={{ color: '#6B7280' }}>Compliance Status:</span>
                {isSlaBreached ? (
                  <span style={{ fontWeight: 700, color: '#DC2626', background: '#FEE2E2', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                    ⚠️ SLA Breached
                  </span>
                ) : (
                  <span style={{ fontWeight: 600, color: '#16A34A', background: '#DCFCE7', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                    ✓ On Schedule
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Action Required: Resubmission / Clarification Card */}
          {app.status === 'ResubmissionRequired' && (
            <Card style={{ borderColor: 'var(--color-saffron-500)', background: '#FFFDF7' }}>
              <h2 className={styles.cardTitle} style={{ color: 'var(--color-saffron-700)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Upload size={18} />
                {t('v2.resubmission_title', 'Clarification / Correction Requested')}
              </h2>
              <p style={{ fontSize: 13, color: '#4B5563', marginBottom: 12 }}>
                {t('v2.resubmission_desc', 'The reviewing officer requested a correction or clarification. Your application remains in your queue and review resumes immediately upon reply.')}
              </p>

              {(app.officerRemarks || latestClarification?.remarks) && (
                <div style={{ background: '#FEF3C7', padding: 12, borderRadius: 8, marginBottom: 14, fontSize: 13, color: '#92400E', border: '1px solid #FDE68A' }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Officer Query ({latestClarification?.requestedBy || 'Reviewing Officer'}):</span>
                    {app.documentAffected && (
                      <span style={{ fontSize: 11, background: '#F59E0B', color: '#FFF', padding: '1px 6px', borderRadius: 4 }}>
                        Doc: {app.documentAffected}
                      </span>
                    )}
                  </div>
                  <div>{app.officerRemarks || latestClarification?.remarks}</div>
                  {app.resubmissionDeadline && (
                    <div style={{ marginTop: 6, fontSize: 11, color: '#B45309', fontWeight: 600 }}>
                      ⏱️ Please respond before {format(new Date(app.resubmissionDeadline), 'dd MMM yyyy')}
                    </div>
                  )}
                </div>
              )}

              {resubmitSuccess && (
                <div style={{ background: '#DCFCE7', color: '#15803D', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
                  ✓ {resubmitSuccess}
                </div>
              )}
              {resubmitErr && (
                <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                  ✕ {resubmitErr}
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Attach Corrected Document (Optional if only text clarification required)
                </label>
                <input
                  type="file"
                  style={{ fontSize: 12 }}
                  onChange={(e) => setResubmitFile(e.target.files?.[0] || null)}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Citizen Response / Remarks <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  style={{ width: '100%', padding: 8, fontSize: 12, borderRadius: 6, border: '1px solid #D1D5DB' }}
                  placeholder="Provide clarification, certificate update details, or explanation..."
                  value={resubmitRemarks}
                  onChange={(e) => setResubmitRemarks(e.target.value)}
                />
              </div>

              <Button
                variant="primary"
                size="md"
                loading={isResubmitting}
                disabled={!resubmitRemarks.trim() && !resubmitFile}
                onClick={() => resubmit()}
                style={{ width: '100%' }}
              >
                <Send size={14} style={{ marginRight: 6 }} />
                Submit Response & Resume Review
              </Button>
            </Card>
          )}

          {/* Clarification History Timeline */}
          {app.clarificationHistory?.length > 0 && (
            <Card>
              <h2 className={styles.cardTitle} style={{ fontSize: 14, marginBottom: 12 }}>
                Clarification Exchange History ({app.clarificationHistory.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {app.clarificationHistory.map((ch, idx) => (
                  <div key={idx} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 10, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B7280', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: '#374151' }}>{ch.requestedBy || 'Officer'}</span>
                      <span>{ch.requestedAt ? format(new Date(ch.requestedAt), 'dd MMM yyyy') : ''}</span>
                    </div>
                    <div style={{ color: '#1F2937', marginBottom: 6 }}>"{ch.remarks}"</div>
                    {ch.documentKey && (
                      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>
                        Target Document: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{ch.documentKey}</span>
                      </div>
                    )}
                    {ch.citizenResponse ? (
                      <div style={{ background: '#ECFDF5', borderLeft: '3px solid #10B981', padding: '6px 8px', borderRadius: 4, marginTop: 6 }}>
                        <div style={{ fontWeight: 600, color: '#065F46', fontSize: 11 }}>Citizen Answer:</div>
                        <div style={{ color: '#047857' }}>{ch.citizenResponse}</div>
                        {ch.respondedAt && (
                          <div style={{ fontSize: 10, color: '#059669', marginTop: 2 }}>
                            Replied on {format(new Date(ch.respondedAt), 'dd MMM yyyy, h:mm a')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: '#B45309', fontStyle: 'italic', marginTop: 4 }}>
                        ⏳ Awaiting response
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Documents */}
          {(app.submittedDocuments?.length > 0 || app.submittedDocumentKeys?.length > 0) && (
            <Card>
              <h2 className={styles.cardTitle}>Submitted Documents</h2>
              <ul className={styles.docList}>
                {app.submittedDocuments?.map((doc) => (
                  <li key={doc.docKey} className={styles.docItem}>
                    <div>
                      <p className={styles.docKey}>{doc.docKey}</p>
                      <p className={styles.docName}>{doc.originalName}</p>
                    </div>
                    {doc.url && (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className={styles.viewDoc} aria-label={`View ${doc.docKey}`}>
                        <ExternalLink size={14} /> View
                      </a>
                    )}
                  </li>
                ))}
                {/* Legacy key-only docs */}
                {!app.submittedDocuments?.length && app.submittedDocumentKeys?.map((key) => (
                  <li key={key} className={styles.docItem}>
                    <p className={styles.docKey}>{key}</p>
                    <span className={styles.docBadge}>Submitted</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Withdraw */}
          {canWithdraw && (
            <Card className={styles.withdrawCard}>
              <h2 className={styles.cardTitle}>Withdraw Application</h2>
              <p className={styles.withdrawText}>
                You can withdraw this application while it is still pending.
                This action cannot be undone.
              </p>
              <Button
                variant="danger"
                size="md"
                loading={withdrawing}
                onClick={() => {
                  if (window.confirm(t('applications.withdraw_confirm'))) withdraw();
                }}
              >
                Withdraw Application
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
