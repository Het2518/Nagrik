import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, Clock, XCircle, AlertCircle, MinusCircle, ExternalLink, Upload, Send } from 'lucide-react';
import { format } from 'date-fns';
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
      let submittedDocuments = [];
      if (resubmitFile) {
        const uploaded = await uploadService.uploadDocument(resubmitFile, data?.application?.documentAffected || 'CorrectedDocument');
        submittedDocuments.push({
          docKey: data?.application?.documentAffected || 'CorrectedDocument',
          url: uploaded.url,
          publicId: uploaded.publicId,
          originalName: resubmitFile.name,
          format: uploaded.format,
          sizeBytes: uploaded.sizeBytes,
        });
      }
      return applicationService.resubmit(id, {
        remarks: resubmitRemarks,
        submittedDocuments,
      });
    },
    onSuccess: (res) => {
      setResubmitSuccess(res?.citizenMessage || 'Application resubmitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['application', id] });
    },
    onError: (err) => {
      setResubmitErr(err.response?.data?.error || 'Failed to resubmit application');
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

  return (
    <div className={`${styles.page} animate-fade-in`}>
      <Link to="/applications" className={styles.backLink}>
        <ArrowLeft size={16} /> Back to Applications
      </Link>

      {/* ── Hero ──────────────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.heroMeta}>
          <span className={styles.appId}>{app.applicationId}</span>
          <StatusChip status={app.status} size="lg" />
        </div>
        <h1 className={styles.schemeName}>{app.schemeId?.schemeName || 'Application'}</h1>
        <p className={styles.submittedOn}>
          Submitted on{' '}
          {format(new Date(app.submittedAt), 'd MMMM yyyy')}
        </p>
      </div>

      {/* ── Action Required Banner ────────────────────────── */}
      {app.status === 'ResubmissionRequired' && (
        <div className={styles.resubBanner} role="alert">
          <AlertCircle size={20} />
          <div>
            <strong>Documents Needed</strong>
            <p>
              The reviewing officer has requested additional or corrected documents.
              Please review the remarks below and update your application.
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
          {/* Action Required: Resubmission Card */}
          {app.status === 'ResubmissionRequired' && (
            <Card style={{ borderColor: 'var(--color-saffron-500)', background: '#FFFDF7' }}>
              <h2 className={styles.cardTitle} style={{ color: 'var(--color-saffron-700)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Upload size={18} />
                {t('v2.resubmission_title', 'Document Correction Requested')}
              </h2>
              <p style={{ fontSize: 13, color: '#4B5563', marginBottom: 12 }}>
                {t('v2.resubmission_desc', 'The reviewing officer requested a correction. You do not need to start over; your application continues once updated.')}
              </p>

              {app.officerRemarks && (
                <div style={{ background: '#FEF3C7', padding: 10, borderRadius: 8, marginBottom: 14, fontSize: 13, color: '#92400E' }}>
                  <strong>Officer Remarks:</strong> {app.officerRemarks}
                </div>
              )}

              {resubmitSuccess && (
                <div style={{ background: '#DCFCE7', color: '#15803D', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
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
                  Select Updated Document
                </label>
                <input
                  type="file"
                  style={{ fontSize: 12 }}
                  onChange={(e) => setResubmitFile(e.target.files?.[0] || null)}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Citizen Note / Explanation (Optional)
                </label>
                <textarea
                  rows={2}
                  style={{ width: '100%', padding: 8, fontSize: 12, borderRadius: 6, border: '1px solid #D1D5DB' }}
                  placeholder="e.g. Attached newly issued income certificate for current financial year."
                  value={resubmitRemarks}
                  onChange={(e) => setResubmitRemarks(e.target.value)}
                />
              </div>

              <Button
                variant="primary"
                size="md"
                loading={isResubmitting}
                onClick={() => resubmit()}
                style={{ width: '100%' }}
              >
                <Send size={14} style={{ marginRight: 6 }} />
                Resubmit Application
              </Button>
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
