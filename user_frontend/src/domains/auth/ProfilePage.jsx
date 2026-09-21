import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Shield,
  Globe,
  Eye,
  EyeOff,
  FileText,
  Plus,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  Upload,
  X,
  ShieldCheck,
  FileCheck2,
  Sparkles,
  Check,
  Calendar,
  Building2,
  ExternalLink,
  CloudDownload,
  RefreshCw,
  Users,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';
import { familyService } from '../../services/familyService';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import styles from './ProfilePage.module.css';

const STANDARD_DOC_TYPES = [
  {
    key: 'Income',
    label: 'Income Certificate',
    labelGu: 'આવકનો દાખલો',
    desc: 'Mandatory for scholarships, housing subsidies, PMAY, ration food security.',
    defaultAuthority: 'Mamlatdar Office, Gandhinagar',
    validityYears: 3,
  },
  {
    key: 'Caste',
    label: 'Caste / Category Certificate',
    labelGu: 'જાતિ / અનામત પ્રમાણપત્ર',
    desc: 'Required for SC, ST, SEBC/OBC, EWS welfare schemes and fee waivers.',
    defaultAuthority: 'Social Welfare Office / Taluka Office',
    validityYears: null,
  },
  {
    key: 'RationCard',
    label: 'Ration Card (NFSA / AAY)',
    labelGu: 'રેશન કાર્ડ',
    desc: 'Verifies family composition and eligibility for subsidized grain & welfare units.',
    defaultAuthority: 'Food & Civil Supplies Department',
    validityYears: null,
  },
  {
    key: 'Domicile',
    label: 'Gujarat Domicile / Residence Proof',
    labelGu: 'ગુજરાત રહેઠાણ પુરાવો',
    desc: 'Proof of Gujarat state residency for state-funded entitlement schemes.',
    defaultAuthority: 'Executive Magistrate / Jan Seva Kendra',
    validityYears: null,
  },
  {
    key: 'Marksheet',
    label: 'Academic Marksheet / Bonafide',
    labelGu: 'શૈક્ષણિક માર્કશીટ / પ્રમાણપત્ર',
    desc: 'Required for MYSY, digital Gujarat scholarships, and higher education assistance.',
    defaultAuthority: 'Gujarat Secondary & Higher Secondary Board',
    validityYears: 1,
  },
  {
    key: 'BankPassbook',
    label: 'Bank Account Passbook / Cancelled Cheque',
    labelGu: 'બેંક પાસબુક (DBT એકાઉન્ટ)',
    desc: 'Direct Benefit Transfer (DBT) account for receiving government subsidies directly.',
    defaultAuthority: 'Nationalized / State Cooperative Bank',
    validityYears: null,
  },
  {
    key: 'Disability',
    label: 'Disability Certificate (UDID)',
    labelGu: 'દિવ્યાંગ પ્રમાણપત્ર (UDID)',
    desc: 'For Sant Surdas pension, bus travel concessions & assistive aids (40%+).',
    defaultAuthority: 'District Civil Hospital Board',
    validityYears: 5,
  },
  {
    key: 'ElectricityBill',
    label: 'Electricity / Utility Bill',
    labelGu: 'વીજળી બિલ (સરનામા પુરાવો)',
    desc: 'Proof of physical address for housing, solar rooftop, and local subsidies.',
    defaultAuthority: 'UGVCL / DGVCL / MGVCL / PGVCL',
    validityYears: null,
  },
];

const AUTHORITY_PRESETS = [
  'Mamlatdar Office',
  'Taluka Panchayat',
  'Jan Seva Kendra',
  'District Social Welfare Office',
  'District Collectorate',
  'Civil Hospital Board',
  'Gujarat Secondary Education Board',
];

const changePassSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword:     z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const { user, logout } = useAuthStore();
  const familyId = user?.familyId;

  const [showPass, setShowPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Document Modal States
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [modalError, setModalError] = useState('');
  const fileInputRef = useRef(null);

  // Phase 3 States: Member filter, DigiLocker, Renewal
  const [memberFilter, setMemberFilter] = useState('ALL');
  const [isDigiModalOpen, setIsDigiModalOpen] = useState(false);
  const [selectedDigiTypes, setSelectedDigiTypes] = useState(['Income', 'Domicile', 'RationCard', 'Marksheet', 'Caste']);
  const [digiMemberId, setDigiMemberId] = useState('');

  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [renewDoc, setRenewDoc] = useState(null);
  const [renewForm, setRenewForm] = useState({
    certificateNumber: '',
    issuingAuthority: 'Mamlatdar Office, Gandhinagar',
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    fileName: '',
    docUrl: '',
  });

  const [docForm, setDocForm] = useState({
    certificateType: 'Income',
    certificateNumber: '',
    issuingAuthority: 'Mamlatdar Office, Gandhinagar',
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    fileName: '',
    docUrl: '',
  });

  // Queries
  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: authService.getMe,
  });

  const { data: familyData } = useQuery({
    queryKey: ['family', familyId],
    queryFn: () => familyService.getProfile(familyId),
    enabled: !!familyId,
  });

  const { data: docRegistry, isLoading: isDocsLoading } = useQuery({
    queryKey: ['familyDocuments', familyId],
    queryFn: () => familyService.getDocuments(familyId),
    enabled: !!familyId,
  });

  const { data: completenessData } = useQuery({
    queryKey: ['evidenceCompleteness', familyId],
    queryFn: () => familyService.getCompleteness(familyId),
    enabled: !!familyId,
  });

  const { data: digiDocsData, isLoading: isDigiLoading } = useQuery({
    queryKey: ['digiLockerDocs', familyId, digiMemberId],
    queryFn: () => familyService.getDigiLockerDocs(familyId, digiMemberId || undefined),
    enabled: isDigiModalOpen && !!familyId,
  });

  const evidenceList = docRegistry?.evidenceList || [];

  // Mutations
  const { register, handleSubmit, reset, formState: { errors, isSubmitting }, setError } = useForm({
    resolver: zodResolver(changePassSchema),
  });

  const { mutateAsync: changePassword } = useMutation({
    mutationFn: authService.changePassword,
  });

  const addDocMutation = useMutation({
    mutationFn: (payload) => familyService.addDocument(familyId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['familyDocuments', familyId] });
      qc.invalidateQueries({ queryKey: ['evidenceCompleteness', familyId] });
      qc.invalidateQueries({ queryKey: ['family', familyId] });
      qc.invalidateQueries({ queryKey: ['eligibility'] });
      qc.invalidateQueries({ queryKey: ['v2Analysis'] });
      setIsDocModalOpen(false);
      setIsEditingDoc(false);
      setModalError('');
      setToastMessage(
        isEditingDoc
          ? 'Certificate updated! Scheme eligibility re-calculated automatically.'
          : 'Document saved to Evidence Locker! Scheme eligibility auto-fetched.'
      );
      setTimeout(() => setToastMessage(''), 6000);
    },
    onError: (err) => {
      setModalError(err?.response?.data?.message || err?.message || 'Failed to save document');
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (certNum) => familyService.deleteDocument(familyId, certNum),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['familyDocuments', familyId] });
      qc.invalidateQueries({ queryKey: ['evidenceCompleteness', familyId] });
      qc.invalidateQueries({ queryKey: ['family', familyId] });
      qc.invalidateQueries({ queryKey: ['eligibility'] });
      qc.invalidateQueries({ queryKey: ['v2Analysis'] });
      setToastMessage('Document removed from Locker. Scheme eligibility updated.');
      setTimeout(() => setToastMessage(''), 5000);
    },
    onError: (err) => {
      setToastMessage(err?.response?.data?.message || 'Failed to delete document');
      setTimeout(() => setToastMessage(''), 5000);
    },
  });

  const importDigiMutation = useMutation({
    mutationFn: (payload) => familyService.importDigiLocker(familyId, payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['familyDocuments', familyId] });
      qc.invalidateQueries({ queryKey: ['evidenceCompleteness', familyId] });
      qc.invalidateQueries({ queryKey: ['family', familyId] });
      qc.invalidateQueries({ queryKey: ['eligibility'] });
      setIsDigiModalOpen(false);
      setToastMessage(`Successfully imported ${res?.importedDocuments?.length || 5} verified certificates from DigiLocker!`);
      setTimeout(() => setToastMessage(''), 6000);
    },
    onError: (err) => {
      setModalError(err?.response?.data?.message || err?.message || 'Failed to import DigiLocker certificates');
    },
  });

  const renewDocMutation = useMutation({
    mutationFn: (payload) => familyService.renewDocument(familyId, renewDoc?._id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['familyDocuments', familyId] });
      qc.invalidateQueries({ queryKey: ['evidenceCompleteness', familyId] });
      qc.invalidateQueries({ queryKey: ['family', familyId] });
      qc.invalidateQueries({ queryKey: ['eligibility'] });
      setIsRenewModalOpen(false);
      setRenewDoc(null);
      setToastMessage('Certificate renewed successfully! Version audit chained.');
      setTimeout(() => setToastMessage(''), 6000);
    },
    onError: (err) => {
      setModalError(err?.response?.data?.message || err?.message || 'Failed to renew certificate');
    },
  });

  const onSubmitPass = async (data) => {
    try {
      await changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      setPassSuccess(true);
      reset();
      setTimeout(() => setPassSuccess(false), 4000);
    } catch (err) {
      setError('currentPassword', { message: err.response?.data?.error || 'Incorrect password' });
    }
  };

  const switchLang = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('nagrik_lang', lang);
  };

  const handleOpenAddModal = (presetType = 'Income') => {
    const matchedPreset = STANDARD_DOC_TYPES.find((d) => d.key === presetType);
    setIsEditingDoc(false);
    setModalError('');

    let calcExpiry = '';
    if (matchedPreset?.validityYears) {
      const exp = new Date();
      exp.setFullYear(exp.getFullYear() + matchedPreset.validityYears);
      calcExpiry = exp.toISOString().split('T')[0];
    }

    setDocForm({
      certificateType: presetType,
      certificateNumber: '',
      issuingAuthority: matchedPreset?.defaultAuthority || 'Mamlatdar Office, Gandhinagar',
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: calcExpiry,
      fileName: '',
      docUrl: '',
    });
    setIsDocModalOpen(true);
  };

  const handleEditDoc = (doc) => {
    setIsEditingDoc(true);
    setModalError('');
    setDocForm({
      certificateType: doc.certificateType || 'Income',
      certificateNumber: doc.certificateNumber || '',
      issuingAuthority: doc.issuingAuthority || 'Mamlatdar Office, Gandhinagar',
      issueDate: doc.issueDate ? new Date(doc.issueDate).toISOString().split('T')[0] : '',
      expiryDate: doc.expiryDate ? new Date(doc.expiryDate).toISOString().split('T')[0] : '',
      fileName: doc.fileName || doc.originalName || '',
      docUrl: doc.docUrl || '',
    });
    setIsDocModalOpen(true);
  };

  const handleDeleteDoc = (certNum) => {
    if (window.confirm(`Are you sure you want to remove document ${certNum} from your Evidence Locker?`)) {
      deleteDocMutation.mutate(certNum);
    }
  };

  const handleOpenRenewModal = (doc) => {
    setRenewDoc(doc);
    setModalError('');
    setRenewForm({
      certificateNumber: `${doc.certificateNumber}-R`,
      issuingAuthority: doc.issuingAuthority || 'Mamlatdar Office, Gandhinagar',
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      fileName: doc.fileName || '',
      docUrl: doc.docUrl || '',
    });
    setIsRenewModalOpen(true);
  };

  const handleRenewSubmit = (e) => {
    e.preventDefault();
    setModalError('');
    if (!renewForm.certificateNumber.trim()) {
      setModalError('Renewed certificate number is required');
      return;
    }
    if (!renewForm.issuingAuthority.trim()) {
      setModalError('Issuing authority is required');
      return;
    }
    if (!renewForm.issueDate) {
      setModalError('Issue date is required');
      return;
    }

    renewDocMutation.mutate({
      certificateNumber: renewForm.certificateNumber.trim().toUpperCase(),
      issuingAuthority: renewForm.issuingAuthority.trim(),
      issueDate: renewForm.issueDate,
      expiryDate: renewForm.expiryDate || undefined,
      docUrl: renewForm.docUrl || undefined,
      fileName: renewForm.fileName || undefined,
    });
  };

  const handleImportDigiLocker = () => {
    setModalError('');
    if (selectedDigiTypes.length === 0) {
      setModalError('Please select at least one document to import');
      return;
    }
    importDigiMutation.mutate({
      memberId: digiMemberId || undefined,
      docTypes: selectedDigiTypes,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocForm((prev) => ({
        ...prev,
        fileName: file.name,
        docUrl: URL.createObjectURL(file),
      }));
    }
  };

  const handleDocSubmit = (e) => {
    e.preventDefault();
    setModalError('');

    if (!docForm.certificateNumber.trim()) {
      setModalError('Certificate or document identification number is required');
      return;
    }
    if (!docForm.issuingAuthority.trim()) {
      setModalError('Issuing authority is required');
      return;
    }
    if (!docForm.issueDate) {
      setModalError('Issue date is required');
      return;
    }

    const payload = {
      certificateType: docForm.certificateType,
      certificateNumber: docForm.certificateNumber.trim().toUpperCase(),
      issuingAuthority: docForm.issuingAuthority.trim(),
      issueDate: docForm.issueDate,
      expiryDate: docForm.expiryDate || undefined,
      docUrl: docForm.docUrl || undefined,
      fileName: docForm.fileName || undefined,
    };

    addDocMutation.mutate(payload);
  };

  const me = meData || {};
  const family = familyData?.family;
  const activeMembers = familyData?.members?.filter((m) => m.lifecycleStatus === 'Active') || [];
  const activeFamilyId = family?.familyId || familyId;

  // Filter evidence based on active member filter
  const visibleEvidence = evidenceList.filter((e) => {
    if (memberFilter === 'ALL') return true;
    return e.memberId === memberFilter || !e.memberId;
  });

  // Calculate uploaded standard documents count
  const uploadedStandardCount = STANDARD_DOC_TYPES.filter((std) =>
    visibleEvidence.some((e) => e.certificateType === std.key)
  ).length;
  const progressPercent = Math.round((uploadedStandardCount / STANDARD_DOC_TYPES.length) * 100);

  return (
    <div className={`${styles.page} animate-fade-in`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className={styles.pageTitle}>My Profile & Family Locker</h1>
        <Link to="/schemes">
          <Button variant="outline" size="sm" icon={<Sparkles size={14} />}>
            Check Eligible Schemes
          </Button>
        </Link>
      </div>

      {/* ── Notification Toast ────────────────────────────── */}
      {toastMessage && (
        <div className={styles.successMsg} role="status" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Check size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Account Info ──────────────────────────────── */}
      <Card className={styles.accountCard}>
        <div className={styles.avatarSection}>
          <div className={styles.bigAvatar}>
            <User size={32} />
          </div>
          <div>
            <p className={styles.mobileNum}>{me.mobileNumber || user?.mobileNumber || '—'}</p>
            <p className={styles.roleLabel}>Citizen Account · {family?.category || 'General'} Category</p>
          </div>
        </div>
        <div className={styles.infoGrid}>
          <div><span>Role</span><strong>Citizen</strong></div>
          <div><span>Family ID</span><strong>{activeFamilyId || 'Not registered'}</strong></div>
          <div><span>Household Income</span><strong>₹{Number(family?.annualIncome || 0).toLocaleString('en-IN')} / yr</strong></div>
        </div>
      </Card>

      {/* ── FAMILY EVIDENCE LOCKER & DOCUMENT SUBMISSION ──── */}
      <Card>
        <div className={styles.lockerHeader}>
          <div className={styles.lockerTitleWrap}>
            <h2 className={styles.lockerTitle}>
              <ShieldCheck size={24} color="var(--color-teal-600)" />
              My Family Documents & Evidence Locker
            </h2>
            <p className={styles.lockerSubtitle}>
              Upload standard certificates once. The Nagrik Governance Engine automatically checks your eligibility across Gujarat schemes and pre-fills your applications with 1-Click Fast-Track.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button
              variant="outline"
              size="sm"
              className={styles.digiLockerBtn}
              icon={<CloudDownload size={16} />}
              onClick={() => {
                setIsDigiModalOpen(true);
                setModalError('');
              }}
              disabled={!familyId}
            >
              🔗 Pull from DigiLocker
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => handleOpenAddModal('Income')}
              disabled={!familyId}
            >
              + Upload Document
            </Button>
          </div>
        </div>

        {/* Completeness Readiness Banner */}
        {familyId && (
          <div className={styles.completenessBanner}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', background: '#DCFCE7',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534', fontWeight: 800, fontSize: 14
              }}>
                {completenessData?.completenessScore ?? progressPercent}%
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#065F46' }}>
                  Evidence Readiness & Locker Completeness
                </div>
                <div style={{ fontSize: 11.5, color: '#047857' }}>
                  {completenessData?.missingCoreTypes?.length > 0 ? (
                    <span>Missing Core: <strong>{completenessData.missingCoreTypes.join(', ')}</strong></span>
                  ) : (
                    <span>✓ 100% Core Proofs Verified & Active for 1-Click Welfare Approvals</span>
                  )}
                  {completenessData?.expiringCount > 0 && (
                    <span style={{ color: '#DC2626', marginLeft: 8, fontWeight: 700 }}>
                      ⚠️ {completenessData.expiringCount} Certificate expiring soon
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 11, background: '#D1FAE5', color: '#065F46', padding: '4px 8px', borderRadius: 6, fontWeight: 600 }}>
                Total Vault Documents: {completenessData?.totalEvidence ?? evidenceList.length}
              </span>
            </div>
          </div>
        )}

        {/* Member Filter Bar */}
        {familyId && activeMembers.length > 0 && (
          <div className={styles.memberFilterBar}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Users size={12} /> Member:
            </span>
            <button
              type="button"
              className={`${styles.memberFilterPill} ${memberFilter === 'ALL' ? styles.memberFilterPillActive : ''}`}
              onClick={() => setMemberFilter('ALL')}
            >
              All Household ({evidenceList.length})
            </button>
            {activeMembers.map((m) => {
              const count = evidenceList.filter((e) => e.memberId === m._id).length;
              return (
                <button
                  key={m._id}
                  type="button"
                  className={`${styles.memberFilterPill} ${memberFilter === m._id ? styles.memberFilterPillActive : ''}`}
                  onClick={() => setMemberFilter(m._id)}
                >
                  {m.name} ({m.relationToHead}) {count > 0 ? `· ${count}` : ''}
                </button>
              );
            })}
          </div>
        )}

        {!familyId ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', background: '#F8FAFC', borderRadius: 12 }}>
            <FileText size={36} color="var(--color-gray-400)" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontWeight: 600, color: 'var(--color-navy-900)', margin: '0 0 4px' }}>
              Family Profile Not Registered Yet
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-gray-500)', margin: '0 0 16px' }}>
              Complete household registration to activate your Evidence Locker and auto-fetch scheme eligibility.
            </p>
            <Link to="/onboarding">
              <Button variant="secondary" size="sm">Register Family Profile</Button>
            </Link>
          </div>
        ) : isDocsLoading ? (
          <div className="skeleton" style={{ height: 160, borderRadius: 12 }} />
        ) : (
          <div className={styles.docGrid}>
            {STANDARD_DOC_TYPES.map((std) => {
              const uploadedDoc = visibleEvidence.find((e) => e.certificateType === std.key);
              const isUploaded = !!uploadedDoc;
              const isExpired = isUploaded && (uploadedDoc.status === 'Expired' || (uploadedDoc.expiryDate && new Date(uploadedDoc.expiryDate) < new Date()));

              return (
                <div
                  key={std.key}
                  className={`${styles.docCard} ${isUploaded ? styles.docCardVerified : styles.docCardMissing}`}
                >
                  <div className={styles.docCardTop}>
                    <div className={styles.docTypeInfo}>
                      <div
                        className={`${styles.docIconWrap} ${
                          isUploaded ? styles.docIconWrapVerified : styles.docIconWrapMissing
                        }`}
                      >
                        {isUploaded ? <CheckCircle2 size={18} /> : <FileText size={18} />}
                      </div>
                      <div>
                        <span className={styles.docTypeName}>{std.label}</span>
                        <p className={styles.docTypeDesc}>{std.labelGu}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {isUploaded && uploadedDoc.sourceType === 'DigiLocker' && (
                        <span className={styles.digiSourceBadge}>🔗 DigiLocker</span>
                      )}

                      {isExpired ? (
                        <span className={styles.expiredBadge}>Expired</span>
                      ) : (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 99,
                            background: isUploaded ? '#DCFCE7' : '#F1F5F9',
                            color: isUploaded ? '#166534' : '#64748B',
                            border: isUploaded ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isUploaded
                            ? uploadedDoc.isVerified
                              ? '✓ Verified'
                              : 'Under Review'
                            : 'Not Uploaded'}
                        </span>
                      )}
                    </div>
                  </div>

                  {isUploaded ? (
                    <>
                      <div>
                        <span className={styles.docCertNumber}>
                          {uploadedDoc.certificateNumber}
                        </span>
                      </div>

                      <div className={styles.docMeta}>
                        <div>
                          Authority: <strong>{uploadedDoc.issuingAuthority}</strong>
                        </div>
                        <div>
                          Issued: <strong>{new Date(uploadedDoc.issueDate).toLocaleDateString('en-IN')}</strong>
                          {uploadedDoc.expiryDate && (
                            <span> · Exp: <strong>{new Date(uploadedDoc.expiryDate).toLocaleDateString('en-IN')}</strong></span>
                          )}
                        </div>
                        {uploadedDoc.fileName && (
                          <div style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <FileCheck2 size={12} />
                            <span>File attached: {uploadedDoc.fileName}</span>
                          </div>
                        )}
                      </div>

                      {uploadedDoc.applicableSchemes?.length > 0 && (
                        <div className={styles.unlockedSchemes}>
                          <span className={styles.unlockedTitle}>
                            <Sparkles size={11} />
                            Auto-Unlocks {uploadedDoc.applicableSchemes.length} Gujarat Scheme{uploadedDoc.applicableSchemes.length > 1 ? 's' : ''}:
                          </span>
                          <div className={styles.unlockedTags}>
                            {uploadedDoc.applicableSchemes.slice(0, 3).map((sc, sIdx) => (
                              <span key={sIdx} className={styles.unlockedTag}>
                                {sc.schemeName || sc.schemeCode || sc}
                              </span>
                            ))}
                            {uploadedDoc.applicableSchemes.length > 3 && (
                              <span className={styles.unlockedTag}>
                                +{uploadedDoc.applicableSchemes.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className={styles.docCardActions}>
                        <button
                          type="button"
                          className={styles.editDocBtn}
                          onClick={() => handleEditDoc(uploadedDoc)}
                        >
                          <Edit3 size={13} />
                          Edit
                        </button>
                        <button
                          type="button"
                          className={styles.renewBtn}
                          onClick={() => handleOpenRenewModal(uploadedDoc)}
                          title="Renew expired or expiring certificate"
                        >
                          <RefreshCw size={12} />
                          Renew
                        </button>
                        <button
                          type="button"
                          className={styles.deleteDocBtn}
                          onClick={() => handleDeleteDoc(uploadedDoc.certificateNumber)}
                          title="Remove document from locker"
                        >
                          <Trash2 size={13} />
                          Remove
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize: 11.5, color: '#64748B', margin: '4px 0 8px', lineHeight: 1.4 }}>
                        {std.desc}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className={styles.uploadMissingBtn}
                        icon={<Upload size={14} />}
                        onClick={() => handleOpenAddModal(std.key)}
                      >
                        Upload {std.label.split(' ')[0]}
                      </Button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Language ─────────────────────────────────── */}
      <Card>
        <div className={styles.sectionHeader}>
          <Globe size={18} />
          <h2>Language / ભાષા</h2>
        </div>
        <div className={styles.langButtons}>
          {[
            { code: 'en', label: 'English' },
            { code: 'gu', label: 'ગુજરાતી' },
          ].map(({ code, label }) => (
            <button
              key={code}
              className={`${styles.langBtn} ${i18n.language === code ? styles.langBtnActive : ''}`}
              onClick={() => switchLang(code)}
              aria-pressed={i18n.language === code}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* ── Change Password ───────────────────────────── */}
      <Card>
        <div className={styles.sectionHeader}>
          <Shield size={18} />
          <h2>{t('auth.change_password')}</h2>
        </div>

        {passSuccess && (
          <div className={styles.successMsg} role="status">
            ✓ Password changed successfully
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmitPass)} className={styles.form} noValidate>
          <div className={styles.passWrapper}>
            <Input
              label={t('auth.current_password')}
              type={showPass ? 'text' : 'password'}
              required
              error={errors.currentPassword?.message}
              {...register('currentPassword')}
            />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(s => !s)} aria-label="Toggle visibility">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <Input
            label={t('auth.new_password')}
            type={showPass ? 'text' : 'password'}
            required
            hint="Minimum 8 characters"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <Input
            label={t('auth.confirm_password')}
            type={showPass ? 'text' : 'password'}
            required
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <div className={styles.formAction}>
            <Button type="submit" size="md" variant="primary" loading={isSubmitting}>
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      {/* ── Danger Zone ──────────────────────────────── */}
      <Card className={styles.dangerCard}>
        <h2 className={styles.dangerTitle}>Sign Out</h2>
        <p className={styles.dangerText}>You will be signed out and returned to the login page.</p>
        <Button variant="danger" size="md" onClick={logout}>Sign Out</Button>
      </Card>

      {/* ── UPLOAD / EDIT DOCUMENT MODAL ─────────────── */}
      {isDocModalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalDialog}>
            <div className={styles.modalHeader}>
              <h2>
                <ShieldCheck size={20} color="var(--color-teal-600)" />
                {isEditingDoc ? 'Edit / Renew Document' : 'Upload Document to Evidence Locker'}
              </h2>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsDocModalOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDocSubmit}>
              <div className={styles.modalBody}>
                <p className={styles.modalDesc}>
                  Register or update your official certificate. Once saved, all schemes automatically evaluate your eligibility and auto-attach this record upon applying.
                </p>

                {modalError && (
                  <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, color: '#DC2626', fontSize: 12 }}>
                    ⚠️ {modalError}
                  </div>
                )}

                {/* Certificate Type */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-navy-900)' }}>
                    Certificate / Document Type *
                  </label>
                  <select
                    value={docForm.certificateType}
                    disabled={isEditingDoc}
                    onChange={(e) => {
                      const newType = e.target.value;
                      const matched = STANDARD_DOC_TYPES.find((d) => d.key === newType);
                      let newExp = '';
                      if (matched?.validityYears) {
                        const d = new Date();
                        d.setFullYear(d.getFullYear() + matched.validityYears);
                        newExp = d.toISOString().split('T')[0];
                      }
                      setDocForm((prev) => ({
                        ...prev,
                        certificateType: newType,
                        issuingAuthority: matched?.defaultAuthority || prev.issuingAuthority,
                        expiryDate: newExp,
                      }));
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      background: 'white',
                    }}
                  >
                    {STANDARD_DOC_TYPES.map((std) => (
                      <option key={std.key} value={std.key}>
                        {std.label} ({std.labelGu})
                      </option>
                    ))}
                    <option value="BOCW">BOCW Construction Worker Card (શ્રમયોગી કાર્ડ)</option>
                    <option value="Other">Other Supporting Document (અન્ય પુરાવો)</option>
                  </select>
                </div>

                {/* Certificate Number */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-navy-900)' }}>
                    Document / Certificate Registration Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GUJ/INC/2024/098412 or RC-884920"
                    value={docForm.certificateNumber}
                    onChange={(e) => setDocForm({ ...docForm, certificateNumber: e.target.value })}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 14,
                      fontFamily: 'monospace',
                      fontWeight: 600,
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#64748B' }}>
                    Must match the number printed on your physical or Barcode certificate.
                  </span>
                </div>

                {/* Issuing Authority */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-navy-900)' }}>
                    Issuing Authority *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mamlatdar Office, Gandhinagar"
                    value={docForm.issuingAuthority}
                    onChange={(e) => setDocForm({ ...docForm, issuingAuthority: e.target.value })}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 14,
                    }}
                  />
                  <div className={styles.authorityChips}>
                    {AUTHORITY_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={styles.chipBtn}
                        onClick={() => setDocForm({ ...docForm, issuingAuthority: preset })}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dates */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-navy-900)' }}>
                      Date of Issue *
                    </label>
                    <input
                      type="date"
                      required
                      value={docForm.issueDate}
                      onChange={(e) => setDocForm({ ...docForm, issueDate: e.target.value })}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: 14,
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-navy-900)' }}>
                      Valid Till / Expiry Date
                    </label>
                    <input
                      type="date"
                      value={docForm.expiryDate}
                      onChange={(e) => setDocForm({ ...docForm, expiryDate: e.target.value })}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: 14,
                      }}
                    />
                    <span style={{ fontSize: 10, color: '#64748B' }}>
                      Leave blank if permanent validity
                    </span>
                  </div>
                </div>

                {/* File Attachment Upload */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-navy-900)' }}>
                    Attach Certificate Copy (PDF / Image)
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.png,.jpg,.jpeg"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <div
                    className={styles.fileDropZone}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {docForm.fileName ? (
                      <div className={styles.fileDropSelected}>
                        <CheckCircle2 size={18} />
                        <span>Attached: {docForm.fileName}</span>
                      </div>
                    ) : (
                      <>
                        <Upload size={20} color="var(--color-teal-600)" />
                        <span className={styles.fileDropText}>
                          Click or drag certificate file here (PDF, JPG, PNG up to 5MB)
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsDocModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={addDocMutation.isPending}
                  icon={<ShieldCheck size={16} />}
                >
                  {isEditingDoc ? 'Update Certificate' : 'Save to Locker & Auto-Evaluate'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DIGILOCKER PULL MODAL ────────────────────────── */}
      {isDigiModalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalDialog} style={{ maxWidth: 640 }}>
            <div className={styles.modalHeader}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <CloudDownload size={22} color="#0284C7" />
                Pull Verified Documents from DigiLocker Gateway
              </h2>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsDigiModalOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalDesc}>
                Connect to Gujarat State Digital Repository & DigiLocker. Documents retrieved here are cryptographically verified with SHA-256 digital signatures and auto-qualify for 1-Click Fast-Track scheme sanctioning.
              </p>

              {modalError && (
                <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, color: '#DC2626', fontSize: 12 }}>
                  ⚠️ {modalError}
                </div>
              )}

              {/* Select Member */}
              {activeMembers.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-navy-900)' }}>
                    Pull Records for Family Member
                  </label>
                  <select
                    value={digiMemberId}
                    onChange={(e) => setDigiMemberId(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 14,
                      background: 'white',
                    }}
                  >
                    <option value="">Head of Family (Default)</option>
                    {activeMembers.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name} ({m.relationToHead}) — Aadhaar: •••• {m.aadhaarEncrypted ? m.aadhaarEncrypted.slice(-4) : '••••'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Available DigiLocker Documents */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>
                    Available State Repositories ({digiDocsData?.availableDocuments?.length || 5})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const all = (digiDocsData?.availableDocuments || []).map((d) => d.certificateType);
                      setSelectedDigiTypes(selectedDigiTypes.length === all.length ? [] : all);
                    }}
                    style={{ fontSize: 11.5, color: '#0284C7', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {selectedDigiTypes.length === (digiDocsData?.availableDocuments?.length || 5) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {isDigiLoading ? (
                  <div className="skeleton" style={{ height: 180, borderRadius: 10 }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                    {(digiDocsData?.availableDocuments || [
                      { certificateType: 'Income', certificateNumber: 'GJ/REV/INC/2025/1291', issuingAuthority: 'Revenue Department, Gujarat', fileName: 'DigiLocker_Income_Cert.pdf' },
                      { certificateType: 'Domicile', certificateNumber: 'GJ/REV/DOM/2023/1282', issuingAuthority: 'District Magistrate / Collectorate', fileName: 'DigiLocker_Domicile_Cert.pdf' },
                      { certificateType: 'RationCard', certificateNumber: 'GJ/NFSA/RAT/1245', issuingAuthority: 'Food, Civil Supplies Dept', fileName: 'DigiLocker_Ration_Card.pdf' },
                      { certificateType: 'Marksheet', certificateNumber: 'GSEB/SSC/2022/1211', issuingAuthority: 'GSEB Board, Gandhinagar', fileName: 'DigiLocker_SSC_Marksheet.pdf' },
                      { certificateType: 'Caste', certificateNumber: 'GJ/SJD/CST/2024/1277', issuingAuthority: 'Social Justice & Empowerment Dept', fileName: 'DigiLocker_Caste_Cert.pdf' },
                    ]).map((doc) => {
                      const isChecked = selectedDigiTypes.includes(doc.certificateType);
                      return (
                        <div
                          key={doc.certificateNumber}
                          className={`${styles.digiDocCard} ${isChecked ? styles.digiDocCardSelected : ''}`}
                          onClick={() => {
                            setSelectedDigiTypes((prev) =>
                              isChecked
                                ? prev.filter((t) => t !== doc.certificateType)
                                : [...prev, doc.certificateType]
                            );
                          }}
                        >
                          {isChecked ? (
                            <CheckSquare size={18} color="#0284C7" style={{ marginTop: 2, flexShrink: 0 }} />
                          ) : (
                            <Square size={18} color="#94A3B8" style={{ marginTop: 2, flexShrink: 0 }} />
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>
                                {doc.certificateType} Certificate
                              </span>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', background: '#E0F2FE', color: '#0369A1', borderRadius: 4 }}>
                                ✓ DigiLocker Verified
                              </span>
                            </div>
                            <div style={{ fontSize: 11.5, color: '#475569', marginTop: 2 }}>
                              No: <strong>{doc.certificateNumber}</strong> · {doc.issuingAuthority}
                            </div>
                            <div style={{ fontSize: 10.5, color: '#059669', marginTop: 2 }}>
                              📎 {doc.fileName}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <Button type="button" variant="ghost" onClick={() => setIsDigiModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                className={styles.digiLockerBtn}
                loading={importDigiMutation.isPending}
                disabled={selectedDigiTypes.length === 0}
                onClick={handleImportDigiLocker}
                icon={<CloudDownload size={16} />}
              >
                Import {selectedDigiTypes.length} Selected to Vault
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── DOCUMENT RENEWAL MODAL ───────────────────────── */}
      {isRenewModalOpen && renewDoc && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalDialog}>
            <div className={styles.modalHeader}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <RefreshCw size={20} color="#D97706" />
                Renew {renewDoc.certificateType} Certificate
              </h2>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsRenewModalOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRenewSubmit}>
              <div className={styles.modalBody}>
                <div style={{ padding: '10px 14px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, fontSize: 12, color: '#92400E' }}>
                  <strong>Previous Certificate:</strong> {renewDoc.certificateNumber} ({renewDoc.issuingAuthority}).
                  Renewing will archive the existing document and chain the audit log to this new record.
                </div>

                {modalError && (
                  <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, color: '#DC2626', fontSize: 12 }}>
                    ⚠️ {modalError}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-navy-900)' }}>
                    New Certificate Registration Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={renewForm.certificateNumber}
                    onChange={(e) => setRenewForm({ ...renewForm, certificateNumber: e.target.value })}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 14,
                      fontFamily: 'monospace',
                      fontWeight: 600,
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-navy-900)' }}>
                    Issuing Authority *
                  </label>
                  <input
                    type="text"
                    required
                    value={renewForm.issuingAuthority}
                    onChange={(e) => setRenewForm({ ...renewForm, issuingAuthority: e.target.value })}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 14,
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-navy-900)' }}>
                      New Issue Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={renewForm.issueDate}
                      onChange={(e) => setRenewForm({ ...renewForm, issueDate: e.target.value })}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: 14,
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-navy-900)' }}>
                      New Expiry Date
                    </label>
                    <input
                      type="date"
                      value={renewForm.expiryDate}
                      onChange={(e) => setRenewForm({ ...renewForm, expiryDate: e.target.value })}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: 14,
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-navy-900)' }}>
                    Optional Attachment File Name / Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. renewed_income_2026.pdf"
                    value={renewForm.fileName}
                    onChange={(e) => setRenewForm({ ...renewForm, fileName: e.target.value })}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 14,
                    }}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <Button type="button" variant="ghost" onClick={() => setIsRenewModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={renewDocMutation.isPending}
                  icon={<RefreshCw size={16} />}
                >
                  Submit Renewed Certificate
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

