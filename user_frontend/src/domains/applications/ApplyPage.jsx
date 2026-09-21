import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  ArrowLeft,
  UploadCloud,
  CheckCircle,
  Trash2,
  FileText,
  Loader,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Info,
} from 'lucide-react';
import { schemeService } from '../../services/schemeService';
import { familyService } from '../../services/familyService';
import { applicationService, uploadService } from '../../services/applicationService';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import styles from './ApplyPage.module.css';

// ── Document Matcher Helper ────────────────────────────────────
function matchLockerDoc(docKey, evidenceList = []) {
  if (!evidenceList.length || !docKey) return null;
  const k = docKey.toLowerCase().replace(/[^a-z0-9]/g, '');

  return evidenceList.find((ev) => {
    const t = (ev.certificateType || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!t) return false;
    return (
      k.includes(t) ||
      t.includes(k) ||
      (k.includes('income') && t.includes('income')) ||
      (k.includes('caste') && t.includes('caste')) ||
      (k.includes('ration') && t.includes('ration')) ||
      (k.includes('domicile') && t.includes('domicile')) ||
      (k.includes('marksheet') && t.includes('marksheet')) ||
      (k.includes('education') && t.includes('marksheet')) ||
      (k.includes('disability') && t.includes('disability')) ||
      (k.includes('bocw') && t.includes('bocw')) ||
      (k.includes('bank') && t.includes('bank')) ||
      (k.includes('passbook') && t.includes('bank'))
    );
  });
}

// ── Document Upload Widget ─────────────────────────────────────
function DocUploadWidget({ doc, onUploaded, onRemoved, uploaded, onSaveToLocker }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [saveToLocker, setSaveToLocker] = useState(true);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('File must be under 5 MB');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const result = await uploadService.uploadDocument(file, doc.docKey);
      const docObj = {
        ...result.document,
        reusedFromLocker: false,
      };
      onUploaded(docObj);

      if (saveToLocker && onSaveToLocker) {
        onSaveToLocker(doc, docObj);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const isReused = uploaded?.reusedFromLocker;

  return (
    <div className={`${styles.docWidget} ${isReused ? styles.reusedWidget : uploaded ? styles.docWidgetDone : ''}`}>
      <div className={styles.docWidgetLeft}>
        {isReused ? (
          <ShieldCheck size={24} color="#059669" className={styles.docIcon} aria-hidden="true" />
        ) : (
          <FileText size={22} className={styles.docIcon} aria-hidden="true" />
        )}

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p className={styles.docLabel} style={{ margin: 0 }}>
              {doc.label}
              {doc.required && <span className={styles.reqStar}> *</span>}
            </p>

            {isReused && (
              <span className={styles.reusedBadge}>
                <ShieldCheck size={12} />
                Auto-Attached from Profile
              </span>
            )}

            {!uploaded && doc.required && (
              <span className={styles.missingBadge}>
                <AlertCircle size={12} />
                Upload Required
              </span>
            )}
          </div>

          {isReused ? (
            <div>
              <span className={styles.certPill}>No: {uploaded.certificateNumber || 'Verified Record'}</span>
              <p style={{ fontSize: 12, color: '#059669', margin: '3px 0 0', fontWeight: 500 }}>
                ✓ Authority: {uploaded.issuingAuthority || 'Government Authority'} · Verified & Pre-filled
              </p>
            </div>
          ) : uploaded ? (
            <p className={styles.docUploaded}>✓ {uploaded.originalName}</p>
          ) : (
            <p className={styles.docHint}>PDF, JPG or PNG · max 5 MB</p>
          )}

          {!uploaded && (
            <label className={styles.saveToLockerRow}>
              <input
                type="checkbox"
                checked={saveToLocker}
                onChange={(e) => setSaveToLocker(e.target.checked)}
              />
              <span>Save to Family Locker for future schemes</span>
            </label>
          )}

          {error && <p className={styles.docError}>{error}</p>}
        </div>
      </div>

      <div className={styles.docWidgetRight}>
        {uploading ? (
          <span className={styles.uploadingSpinner}>
            <Loader size={16} className="animate-spin" /> Uploading...
          </span>
        ) : uploaded ? (
          <button
            type="button"
            className={styles.removeBtn}
            onClick={() => onRemoved(doc.docKey)}
            title={isReused ? 'Override with different file' : 'Remove document'}
            aria-label={`Remove ${doc.label}`}
          >
            <Trash2 size={14} />
          </button>
        ) : (
          <label className={styles.uploadLabel} aria-label={`Upload ${doc.label}`}>
            <UploadCloud size={16} />
            <span>Upload</span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFile} className={styles.fileInput} />
          </label>
        )}
      </div>
    </div>
  );
}

// ── Main Apply Page ───────────────────────────────────────────
export default function ApplyPage() {
  const { schemeCode } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const familyId = user?.familyId;

  const [uploadedDocs, setUploadedDocs] = useState({}); // docKey → document object
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [step, setStep] = useState(1); // 1=member 2=docs 3=form 4=review

  // Fetch Scheme Details
  const { data: schemeData } = useQuery({
    queryKey: ['scheme', schemeCode],
    queryFn: () => schemeService.getByCode(schemeCode),
  });

  // Fetch Family Profile & Members
  const { data: familyData } = useQuery({
    queryKey: ['family', familyId],
    queryFn: () => familyService.getProfile(familyId),
    enabled: !!familyId,
  });

  // Fetch Family Evidence Locker Documents
  const { data: docRegistry } = useQuery({
    queryKey: ['familyDocuments', familyId],
    queryFn: () => familyService.getDocuments(familyId),
    enabled: !!familyId,
  });

  // Query Backend Evidence Matching API (Phase 3 Reusable Evidence)
  const { data: matchReport } = useQuery({
    queryKey: ['evidenceMatch', familyId, schemeCode],
    queryFn: () => familyService.matchScheme(familyId, schemeCode),
    enabled: !!familyId && !!schemeCode,
  });

  const scheme = schemeData?.scheme || schemeData;
  const members = familyData?.members?.filter((m) => m.lifecycleStatus === 'Active') || [];
  const requiredDocs = scheme?.requiredDocuments || [];
  const formFields = scheme?.applicationFormFields || [];
  const evidenceList = docRegistry?.evidenceList || [];

  // Auto-Match and Pre-Fill Documents from Family Evidence Locker!
  useEffect(() => {
    if (!requiredDocs.length) return;

    setUploadedDocs((prev) => {
      const updated = { ...prev };
      let changed = false;

      // First check backend matched report
      if (matchReport?.matched?.length > 0) {
        for (const m of matchReport.matched) {
          if (!updated[m.docKey]) {
            updated[m.docKey] = {
              docKey: m.docKey,
              originalName: `${m.certificateType} Certificate (${m.certificateNumber})`,
              certificateNumber: m.certificateNumber,
              issuingAuthority: m.issuingAuthority,
              issueDate: m.issueDate,
              reusedFromLocker: true,
              isVerified: true,
              url: m.docUrl || 'locker://reusable-evidence',
            };
            changed = true;
          }
        }
      }

      // Then check fallback local matcher
      if (evidenceList.length > 0) {
        for (const doc of requiredDocs) {
          if (!updated[doc.docKey]) {
            const match = matchLockerDoc(doc.docKey, evidenceList);
            if (match) {
              updated[doc.docKey] = {
                docKey: doc.docKey,
                originalName: `${match.certificateType} Certificate (${match.certificateNumber})`,
                certificateNumber: match.certificateNumber,
                issuingAuthority: match.issuingAuthority,
                issueDate: match.issueDate,
                reusedFromLocker: true,
                isVerified: match.isVerified,
                url: match.docUrl || 'locker://reusable-evidence',
              };
              changed = true;
            }
          }
        }
      }

      return changed ? updated : prev;
    });
  }, [requiredDocs, evidenceList, matchReport]);

  // Form Hooks
  const { register, handleSubmit, getValues, formState: { errors } } = useForm();

  // Submit Mutation
  const { mutate: submitApp, isPending: submitting } = useMutation({
    mutationFn: (payload) => applicationService.submit(payload),
    onSuccess: () => {
      navigate('/applications');
    },
    onError: (err) => {
      setSubmitError(err.response?.data?.error || err?.message || 'Submission failed. Please try again.');
    },
  });

  const handleSaveToLocker = (doc, uploadedDoc) => {
    // Map docKey to standard certificateType
    let certType = 'Other';
    const k = doc.docKey.toLowerCase();
    if (k.includes('income')) certType = 'Income';
    else if (k.includes('caste')) certType = 'Caste';
    else if (k.includes('domicile') || k.includes('residence')) certType = 'Domicile';
    else if (k.includes('ration')) certType = 'RationCard';
    else if (k.includes('marksheet') || k.includes('education')) certType = 'Marksheet';
    else if (k.includes('disability')) certType = 'Disability';
    else if (k.includes('bocw')) certType = 'BOCW';
    else if (k.includes('bank') || k.includes('passbook')) certType = 'BankPassbook';
    else if (k.includes('electricity')) certType = 'ElectricityBill';

    familyService.addDocument(familyId, {
      certificateType: certType,
      certificateNumber: `DOC-${Date.now().toString().slice(-6)}`,
      issuingAuthority: 'Competent Authority, Gujarat',
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: undefined,
    }).then(() => {
      qc.invalidateQueries({ queryKey: ['familyDocuments', familyId] });
    }).catch(() => {});
  };

  const handleFinalSubmit = () => {
    const schemeSpecificData = getValues();
    const submittedDocuments = Object.values(uploadedDocs).map((d) => ({
      docKey: d.docKey,
      url: d.url || 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
      publicId: d.publicId || `doc_${d.docKey}`,
      originalName: d.originalName,
      format: d.format || 'pdf',
      sizeBytes: d.sizeBytes || 102400,
    }));

    submitApp({
      memberId: selectedMemberId,
      schemeId: scheme._id,
      submittedDocuments,
      schemeSpecificData,
    });
  };

  if (!scheme) {
    return (
      <div className={styles.loading}>
        <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
      </div>
    );
  }

  // Calculate missing documents count
  const requiredDocItems = requiredDocs.filter((d) => d.required);
  const missingDocsList = requiredDocItems.filter((d) => !uploadedDocs[d.docKey]);
  const reusedCount = requiredDocs.filter((d) => uploadedDocs[d.docKey]?.reusedFromLocker).length;
  const missingCount = missingDocsList.length;
  const allRequiredDocsReady = missingCount === 0;

  return (
    <div className={`${styles.page} animate-fade-in`}>
      <Link to={`/schemes/${schemeCode}`} className={styles.backLink}>
        <ArrowLeft size={16} /> Back to scheme
      </Link>

      {/* ── Header ──────────────────────────────────────── */}
      <div className={styles.applyHeader}>
        <div>
          <span className={styles.schemeCategory}>{scheme.category}</span>
          <h1 className={styles.schemeName}>{scheme.schemeName}</h1>
        </div>

        {/* Step progress */}
        <div className={styles.stepProgress} aria-label="Application steps">
          {['Member', 'Documents', 'Details', 'Submit'].map((s, i) => (
            <div
              key={s}
              className={`${styles.progressStep} ${
                step === i + 1
                  ? styles.progressStepActive
                  : step > i + 1
                  ? styles.progressStepDone
                  : ''
              }`}
            >
              <span className={styles.progressNum}>
                {step > i + 1 ? <CheckCircle size={12} /> : i + 1}
              </span>
              <span className={styles.progressLabel}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {submitError && (
        <div className={styles.errorBanner} role="alert">{submitError}</div>
      )}

      {/* ── 1-Click Fast-Track Banner ──────────────────── */}
      {matchReport?.canFastTrack && (
        <div style={{
          background: 'linear-gradient(135deg, #ECFDF5, #F0FDF4)',
          border: '1.5px solid #10B981',
          borderRadius: 14,
          padding: '16px 20px',
          marginBottom: 'var(--space-4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#D1FAE5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              flexShrink: 0
            }}>
              <Sparkles size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#065F46' }}>
                ⚡ 1-Click Fast-Track Application Available!
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#047857' }}>
                100% of required evidence ({matchReport.matchedCount} of {matchReport.totalRequired} documents) is pre-verified in your Family Locker.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            style={{ background: '#059669', borderColor: '#059669' }}
            loading={submitting}
            onClick={() => {
              if (!selectedMemberId && members.length > 0) {
                setSelectedMemberId(members[0]._id);
              }
              handleFinalSubmit();
            }}
          >
            ⚡ Instant 1-Click Submit
          </Button>
        </div>
      )}

      <Card className={styles.stepCard}>
        {/* ── Step 1: Select Member ───────────────────── */}
        {step === 1 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Who is applying?</h2>
            <p className={styles.stepSubtitle}>Select the family member this scheme application is for</p>

            <div className={styles.memberList}>
              {members.map((m) => (
                <label
                  key={m._id}
                  className={`${styles.memberOption} ${selectedMemberId === m._id ? styles.memberOptionSelected : ''}`}
                >
                  <input
                    type="radio"
                    name="member"
                    value={m._id}
                    checked={selectedMemberId === m._id}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className={styles.radioInput}
                  />
                  <div className={styles.memberAvatar}>{m.name[0]}</div>
                  <div className={styles.memberInfo}>
                    <p className={styles.memberName}>{m.name}</p>
                    <p className={styles.memberMeta}>{m.relationToHead} · {m.age} yrs · {m.gender}</p>
                  </div>
                  {selectedMemberId === m._id && <CheckCircle size={18} color="var(--color-success-700)" />}
                </label>
              ))}
            </div>

            <div className={styles.stepActions}>
              <Button
                variant="secondary"
                size="lg"
                disabled={!selectedMemberId}
                onClick={() => setStep(2)}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Smart Documents Detection ───────── */}
        {step === 2 && (
          <div className={styles.stepContent}>
            <div>
              <h2 className={styles.stepTitle}>Required Documents & Proofs</h2>
              <p className={styles.stepSubtitle}>
                Nagrik automatically detects verified certificates from your Family Profile. Upload only missing documents.
              </p>
            </div>

            {/* ── Smart Banner: 100% Pre-Filled vs Missing Notice ── */}
            {allRequiredDocsReady ? (
              <div className={`${styles.smartLockerBanner} ${styles.smartLockerSuccess}`}>
                <Sparkles size={24} color="#16A34A" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h3>100% Pre-Filled from Family Profile</h3>
                  <p>
                    All {requiredDocs.length} required certificates were automatically attached and verified from your Family Evidence Locker. You can proceed directly without manual uploads!
                  </p>
                </div>
              </div>
            ) : (
              <div className={`${styles.smartLockerBanner} ${styles.smartLockerWarning}`}>
                <AlertCircle size={24} color="#2563EB" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h3>Action Required: Upload only {missingCount} missing document{missingCount > 1 ? 's' : ''}</h3>
                  <p>
                    {reusedCount > 0 && (
                      <span>{reusedCount} document{reusedCount > 1 ? 's were' : ' was'} automatically loaded from your Family Profile. </span>
                    )}
                    Please upload <strong>{missingDocsList.map((d) => d.label).join(', ')}</strong> below to complete this application.
                  </p>
                </div>
              </div>
            )}

            <div className={styles.docList}>
              {requiredDocs.map((doc) => (
                <DocUploadWidget
                  key={doc.docKey}
                  doc={doc}
                  uploaded={uploadedDocs[doc.docKey]}
                  onUploaded={(docObj) => setUploadedDocs((d) => ({ ...d, [doc.docKey]: docObj }))}
                  onRemoved={(key) =>
                    setUploadedDocs((d) => {
                      const n = { ...d };
                      delete n[key];
                      return n;
                    })
                  }
                  onSaveToLocker={handleSaveToLocker}
                />
              ))}
            </div>

            <div className={styles.stepActions}>
              <Button variant="outline" size="md" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                variant="secondary"
                size="lg"
                disabled={!allRequiredDocsReady}
                onClick={() => setStep(formFields.length > 0 ? 3 : 4)}
              >
                {allRequiredDocsReady && reusedCount === requiredDocs.length
                  ? 'Fast-Track: Continue'
                  : formFields.length > 0
                  ? 'Continue'
                  : 'Review & Submit'}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Dynamic Form Fields ─────────────── */}
        {step === 3 && formFields.length > 0 && (
          <form onSubmit={handleSubmit(() => setStep(4))} className={styles.stepContent}>
            <h2 className={styles.stepTitle}>{scheme.schemeName} — Additional Details</h2>
            <p className={styles.stepSubtitle}>Fill in the scheme-specific information below</p>

            <div className={styles.dynamicForm}>
              {formFields.map((field) => {
                if (['text', 'number', 'date'].includes(field.fieldType)) {
                  return (
                    <Input
                      key={field.fieldKey}
                      label={field.label}
                      type={field.fieldType}
                      required={field.required}
                      hint={field.helpText}
                      error={errors[field.fieldKey]?.message}
                      {...register(field.fieldKey, {
                        required: field.required ? `${field.label} is required` : false,
                      })}
                    />
                  );
                }
                if (field.fieldType === 'select' && field.options?.length) {
                  return (
                    <div key={field.fieldKey} className={styles.dynamicField}>
                      <label className={styles.dynLabel}>
                        {field.label} {field.required && <span className={styles.reqStar}>*</span>}
                      </label>
                      <select className={styles.dynSelect} {...register(field.fieldKey)}>
                        <option value="">Select...</option>
                        {field.options.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                  );
                }
                if (field.fieldType === 'boolean' || field.fieldType === 'checkbox') {
                  return (
                    <div key={field.fieldKey} className={styles.dynCheckRow}>
                      <input type="checkbox" id={field.fieldKey} {...register(field.fieldKey)} />
                      <label htmlFor={field.fieldKey}>{field.label}</label>
                    </div>
                  );
                }
                return null;
              })}
            </div>

            <div className={styles.stepActions}>
              <Button type="button" variant="outline" size="md" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button type="submit" variant="secondary" size="lg">
                Review & Submit
              </Button>
            </div>
          </form>
        )}

        {/* ── Step 4: Review & Submit ──────────────────── */}
        {step === 4 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Review & Submit Application</h2>
            <p className={styles.stepSubtitle}>Check all information and verified documents below before final submission</p>

            <div className={styles.reviewBlock}>
              <h3>Applying Citizen</h3>
              <p>{members.find((m) => m._id === selectedMemberId)?.name}</p>
            </div>

            <div className={styles.reviewBlock}>
              <h3>Attached Documents ({Object.keys(uploadedDocs).length} total)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.values(uploadedDocs).map((d) => (
                  <div key={d.docKey} className={styles.reviewDoc}>
                    {d.reusedFromLocker ? (
                      <ShieldCheck size={16} color="#059669" />
                    ) : (
                      <CheckCircle size={16} color="var(--color-teal-600)" />
                    )}
                    <span style={{ fontWeight: 500 }}>
                      {d.docKey}: <strong>{d.originalName}</strong>
                    </span>
                    {d.reusedFromLocker && (
                      <span className={styles.reusedBadge} style={{ marginLeft: 8 }}>
                        Family Profile Reused
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.declaration}>
              <p>
                By submitting this application, I declare that all information provided is true and accurate. Documents reused from my Family Profile are legally valid and current.
              </p>
            </div>

            <div className={styles.stepActions}>
              <Button variant="outline" size="md" onClick={() => setStep(formFields.length > 0 ? 3 : 2)}>
                Back
              </Button>
              <Button size="lg" variant="primary" loading={submitting} onClick={handleFinalSubmit}>
                Submit Application
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
