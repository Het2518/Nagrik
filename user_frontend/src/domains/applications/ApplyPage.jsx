import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ArrowLeft, UploadCloud, CheckCircle, Trash2, FileText, Loader } from 'lucide-react';
import { schemeService } from '../../services/schemeService';
import { familyService } from '../../services/familyService';
import { applicationService, uploadService } from '../../services/applicationService';
import { eligibilityService } from '../../services/eligibilityService';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import styles from './ApplyPage.module.css';

// ── Document Upload Widget ─────────────────────────────────────
function DocUploadWidget({ doc, onUploaded, onRemoved, uploaded }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('File must be under 5 MB'); return; }
    setError('');
    setUploading(true);
    try {
      const result = await uploadService.uploadDocument(file, doc.docKey);
      onUploaded(result.document);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally { setUploading(false); }
  };

  return (
    <div className={`${styles.docWidget} ${uploaded ? styles.docWidgetDone : ''}`}>
      <div className={styles.docWidgetLeft}>
        <FileText size={20} className={styles.docIcon} aria-hidden="true" />
        <div>
          <p className={styles.docLabel}>
            {doc.label}
            {doc.required && <span className={styles.reqStar}> *</span>}
          </p>
          {uploaded ? (
            <p className={styles.docUploaded}>✓ {uploaded.originalName}</p>
          ) : (
            <p className={styles.docHint}>PDF, JPG or PNG · max 5 MB</p>
          )}
          {error && <p className={styles.docError}>{error}</p>}
        </div>
      </div>
      <div className={styles.docWidgetRight}>
        {uploading ? (
          <span className={styles.uploadingSpinner}><Loader size={16} className="animate-spin" /> Uploading...</span>
        ) : uploaded ? (
          <button
            type="button"
            className={styles.removeBtn}
            onClick={() => onRemoved(doc.docKey)}
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
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [uploadedDocs, setUploadedDocs] = useState({});   // docKey → document object
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [step, setStep] = useState(1); // 1=member 2=docs 3=form 4=review

  const { data: schemeData } = useQuery({
    queryKey: ['scheme', schemeCode],
    queryFn: () => schemeService.getByCode(schemeCode),
  });

  const { data: familyData } = useQuery({
    queryKey: ['family', user?.familyId],
    queryFn: () => familyService.getProfile(user.familyId),
    enabled: !!user?.familyId,
  });

  const { register, handleSubmit, getValues, formState: { errors } } = useForm();

  const { mutate: submitApp, isPending: submitting } = useMutation({
    mutationFn: (payload) => applicationService.submit(payload),
    onSuccess: (data) => {
      navigate(`/applications`);
    },
    onError: (err) => {
      setSubmitError(err.response?.data?.error || 'Submission failed. Please try again.');
    },
  });

  const scheme = schemeData?.scheme || schemeData;
  const members = familyData?.members?.filter((m) => m.lifecycleStatus === 'Active') || [];
  const requiredDocs = scheme?.requiredDocuments || [];
  const formFields = scheme?.applicationFormFields || [];

  const allRequiredDocsUploaded = requiredDocs
    .filter((d) => d.required)
    .every((d) => uploadedDocs[d.docKey]);

  const handleFinalSubmit = () => {
    const schemeSpecificData = getValues();
    const submittedDocuments = Object.values(uploadedDocs);

    submitApp({
      memberId: selectedMemberId,
      schemeId: scheme._id,
      submittedDocuments,
      schemeSpecificData,
    });
  };

  if (!scheme) {
    return <div className={styles.loading}><div className="skeleton" style={{ height: 200, borderRadius: 16 }} /></div>;
  }

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
            <div key={s} className={`${styles.progressStep} ${step === i + 1 ? styles.progressStepActive : step > i + 1 ? styles.progressStepDone : ''}`}>
              <span className={styles.progressNum}>{step > i + 1 ? <CheckCircle size={12} /> : i + 1}</span>
              <span className={styles.progressLabel}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {submitError && (
        <div className={styles.errorBanner} role="alert">{submitError}</div>
      )}

      <Card className={styles.stepCard}>
        {/* ── Step 1: Select Member ───────────────────── */}
        {step === 1 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Who is applying?</h2>
            <p className={styles.stepSubtitle}>Select the family member this scheme application is for</p>
            <div className={styles.memberList}>
              {members.map((m) => (
                <label key={m._id} className={`${styles.memberOption} ${selectedMemberId === m._id ? styles.memberOptionSelected : ''}`}>
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

        {/* ── Step 2: Documents ───────────────────────── */}
        {step === 2 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Upload Documents</h2>
            <p className={styles.stepSubtitle}>Upload all required documents to proceed. Files are stored securely.</p>
            <div className={styles.docList}>
              {requiredDocs.map((doc) => (
                <DocUploadWidget
                  key={doc.docKey}
                  doc={doc}
                  uploaded={uploadedDocs[doc.docKey]}
                  onUploaded={(docObj) => setUploadedDocs((d) => ({ ...d, [doc.docKey]: docObj }))}
                  onRemoved={(key) => setUploadedDocs((d) => { const n = { ...d }; delete n[key]; return n; })}
                />
              ))}
            </div>
            <div className={styles.stepActions}>
              <Button variant="outline" size="md" onClick={() => setStep(1)}>Back</Button>
              <Button
                variant="secondary"
                size="lg"
                disabled={!allRequiredDocsUploaded}
                onClick={() => setStep(formFields.length > 0 ? 3 : 4)}
              >
                {formFields.length > 0 ? 'Continue' : 'Review & Submit'}
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
                      {...register(field.fieldKey, { required: field.required ? `${field.label} is required` : false })}
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
                        {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
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
              <Button type="button" variant="outline" size="md" onClick={() => setStep(2)}>Back</Button>
              <Button type="submit" variant="secondary" size="lg">Review & Submit</Button>
            </div>
          </form>
        )}

        {/* ── Step 4: Review & Submit ──────────────────── */}
        {step === 4 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Review & Submit</h2>
            <p className={styles.stepSubtitle}>Check everything below before submitting your application</p>

            <div className={styles.reviewBlock}>
              <h3>Applicant</h3>
              <p>{members.find((m) => m._id === selectedMemberId)?.name}</p>
            </div>

            <div className={styles.reviewBlock}>
              <h3>Documents ({Object.keys(uploadedDocs).length} uploaded)</h3>
              {Object.values(uploadedDocs).map((d) => (
                <div key={d.docKey} className={styles.reviewDoc}>
                  <CheckCircle size={14} color="var(--color-success-700)" />
                  <span>{d.docKey} — {d.originalName}</span>
                </div>
              ))}
            </div>

            <div className={styles.declaration}>
              <p>
                By submitting this application, I declare that all information provided is true and accurate to the best of my knowledge. I understand that providing false information may result in rejection and legal action.
              </p>
            </div>

            <div className={styles.stepActions}>
              <Button variant="outline" size="md" onClick={() => setStep(formFields.length > 0 ? 3 : 2)}>Back</Button>
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
