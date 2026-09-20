import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  MapPin,
  BadgeCheck,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Plus,
  X,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Clock,
  AlertTriangle,
  FileCheck2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { familyService } from '../../services/familyService';
import StatusChip from '../../components/ui/StatusChip';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import styles from './FamilyPage.module.css';

function MemberCard({ member }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={styles.memberCard}>
      <button
        type="button"
        className={styles.memberCardHeader}
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <div className={styles.memberAvatarWrap}>
          <div className={styles.memberAvatar}>{(member.name || 'M')[0].toUpperCase()}</div>
          <div>
            <p className={styles.memberName}>{member.name}</p>
            <p className={styles.memberRole}>
              {member.relationToHead} · {member.gender} · {member.age} yrs
            </p>
          </div>
        </div>
        <div className={styles.memberCardRight}>
          {member.relationToHead === 'Self' && (
            <span className={styles.headBadge}>Head</span>
          )}
          {member.isStudent && (
            <span className={styles.studentBadge}>Student</span>
          )}
          {member.hasDisability && (
            <span className={styles.disabilityBadge}>
              PwD {member.disabilityPercentage ? `(${member.disabilityPercentage}%)` : ''}
            </span>
          )}
          {member.lifecycleStatus === 'Deceased' && (
            <span className={styles.deceasedBadge}>Deceased</span>
          )}
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {expanded && (
        <div className={styles.memberCardBody}>
          <div className={styles.memberDetailGrid}>
            <div>
              <span>Date of Birth</span>
              <strong>{member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString('en-IN') : '—'}</strong>
            </div>
            <div>
              <span>Age</span>
              <strong>{member.age} years</strong>
            </div>
            <div>
              <span>Occupation</span>
              <strong>{member.occupation || '—'}</strong>
            </div>
            <div>
              <span>Education</span>
              <strong>{member.educationLevel || '—'}</strong>
            </div>
            <div>
              <span>Marital Status</span>
              <strong>{member.maritalStatus || 'Single'}</strong>
            </div>
            <div>
              <span>Lifecycle Status</span>
              <strong style={{ color: member.lifecycleStatus === 'Active' ? '#059669' : '#DC2626' }}>
                {member.lifecycleStatus || 'Active'}
              </strong>
            </div>
            <div>
              <span>Aadhaar Status</span>
              <strong>Linked (XXXX XXXX ****)</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FamilyPage({ openAddModal = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const familyId = user?.familyId;

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(openAddModal);
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [docFormError, setDocFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Auto-open modal if requested via prop or route
  useEffect(() => {
    if (openAddModal) {
      setIsAddMemberOpen(true);
    }
  }, [openAddModal]);

  // Query: Family Profile & Members
  const { data, isLoading } = useQuery({
    queryKey: ['family', familyId],
    queryFn: () => familyService.getProfile(familyId),
    enabled: !!familyId,
  });

  const family = data?.family;
  const members = data?.members || [];
  const activeFamilyId = family?.familyId || familyId;

  // Query: Reusable Evidence & Verified Documents
  const { data: docRegistry, isLoading: isDocsLoading } = useQuery({
    queryKey: ['familyDocuments', activeFamilyId],
    queryFn: () => familyService.getDocuments(activeFamilyId),
    enabled: !!activeFamilyId,
  });

  const evidenceList = docRegistry?.evidenceList || [];

  // Member Form State
  const [memberForm, setMemberForm] = useState({
    name: '',
    relationToHead: 'Spouse',
    gender: 'Female',
    dateOfBirth: '',
    occupation: 'Homemaker',
    educationLevel: 'Secondary',
    maritalStatus: 'Married',
    isStudent: false,
    hasDisability: false,
    disabilityPercentage: '',
    aadhaar: '',
  });

  // Document Form State
  const [docForm, setDocForm] = useState({
    certificateType: 'Income',
    certificateNumber: '',
    issuingAuthority: 'Mamlatdar Office, Gandhinagar',
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
  });

  // Mutation: Add Member
  const addMemberMutation = useMutation({
    mutationFn: (payload) => familyService.addMember(activeFamilyId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family', familyId] });
      qc.invalidateQueries({ queryKey: ['eligibility'] });
      setIsAddMemberOpen(false);
      setFormError('');
      setMemberForm({
        name: '',
        relationToHead: 'Spouse',
        gender: 'Female',
        dateOfBirth: '',
        occupation: 'Homemaker',
        educationLevel: 'Secondary',
        maritalStatus: 'Married',
        isStudent: false,
        hasDisability: false,
        disabilityPercentage: '',
        aadhaar: '',
      });
      setSuccessToast('New family member added successfully! Scheme eligibility has been re-evaluated.');
      setTimeout(() => setSuccessToast(''), 6000);
      if (openAddModal) {
        navigate('/family', { replace: true });
      }
    },
    onError: (err) => {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to add family member');
    },
  });

  // Mutation: Add Document
  const addDocMutation = useMutation({
    mutationFn: (payload) => familyService.addDocument(activeFamilyId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['familyDocuments', activeFamilyId] });
      qc.invalidateQueries({ queryKey: ['family', familyId] });
      qc.invalidateQueries({ queryKey: ['eligibility'] });
      setIsAddDocOpen(false);
      setDocFormError('');
      setDocForm({
        certificateType: 'Income',
        certificateNumber: '',
        issuingAuthority: 'Mamlatdar Office, Gandhinagar',
        issueDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
      });
      setSuccessToast('Document registered into Evidence Locker! Unlocked schemes have been updated.');
      setTimeout(() => setSuccessToast(''), 6000);
    },
    onError: (err) => {
      setDocFormError(err?.response?.data?.message || err?.message || 'Failed to register document');
    },
  });

  const handleAddMemberSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    if (!memberForm.name.trim()) {
      setFormError('Member name is required');
      return;
    }
    if (!memberForm.dateOfBirth) {
      setFormError('Date of birth is required');
      return;
    }

    const payload = {
      name: memberForm.name.trim(),
      relationToHead: memberForm.relationToHead,
      gender: memberForm.gender,
      dateOfBirth: memberForm.dateOfBirth,
      occupation: memberForm.occupation,
      educationLevel: memberForm.educationLevel,
      maritalStatus: memberForm.maritalStatus,
      isStudent: Boolean(memberForm.isStudent),
      hasDisability: Boolean(memberForm.hasDisability),
      disabilityPercentage: memberForm.hasDisability && memberForm.disabilityPercentage ? Number(memberForm.disabilityPercentage) : undefined,
    };

    if (memberForm.aadhaar.trim()) {
      payload.aadhaar = memberForm.aadhaar.replace(/\s+/g, '');
    }

    addMemberMutation.mutate(payload);
  };

  const handleAddDocSubmit = (e) => {
    e.preventDefault();
    setDocFormError('');
    if (!docForm.certificateNumber.trim()) {
      setDocFormError('Certificate or document registration number is required');
      return;
    }
    if (!docForm.issuingAuthority.trim()) {
      setDocFormError('Issuing authority is required');
      return;
    }
    if (!docForm.issueDate) {
      setDocFormError('Issue date is required');
      return;
    }

    const payload = {
      certificateType: docForm.certificateType,
      certificateNumber: docForm.certificateNumber.trim().toUpperCase(),
      issuingAuthority: docForm.issuingAuthority.trim(),
      issueDate: docForm.issueDate,
      expiryDate: docForm.expiryDate || undefined,
    };

    addDocMutation.mutate(payload);
  };

  if (!familyId) {
    return (
      <div className={styles.page}>
        <div className={styles.noFamily}>
          <Users size={48} className={styles.noFamilyIcon} />
          <h1>No Family Registered</h1>
          <p>Register your family to access government welfare schemes in Gujarat.</p>
          <Link to="/onboarding">
            <Button variant="secondary" size="lg">Register Family</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 90, borderRadius: 12 }} />
        ))}
      </div>
    );
  }

  return (
    <div className={`${styles.page} animate-fade-in`}>
      {/* ── Success Toast ──────────────────────────────────── */}
      {successToast && (
        <div className={`${styles.alertBox} ${styles.alertSuccess}`} role="status">
          <Check size={18} />
          <span>{successToast}</span>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <h1>{t('family.title', 'Family Profile')}</h1>
          <p className={styles.familyId}>
            Master ID: <strong>{family?.familyId || activeFamilyId}</strong>
            {family?.headOfFamilyMemberId?.name && (
              <span> · Head: {family.headOfFamilyMemberId.name}</span>
            )}
          </p>
        </div>

        <div className={styles.headerActions}>
          <StatusChip status={family?.status || 'Permanent'} size="lg" />
          <Link to="/schemes" className={styles.eligibilityBtn}>
            <Sparkles size={16} />
            Check Eligibility
          </Link>
        </div>
      </div>

      {/* ── Provisional Warning ─────────────────────────── */}
      {family?.status === 'Provisional' && (
        <div className={styles.warningBanner} role="alert">
          <AlertCircle size={20} />
          <p>{t('family.provisional_warning')}</p>
        </div>
      )}

      {/* ── Eligibility Banner Card ─────────────────────── */}
      <div className={styles.eligibilityBanner}>
        <div className={styles.eligibilityContent}>
          <h3>Automated Scheme Re-evaluation Active</h3>
          <p>
            Any update to your household members or registered certificates automatically checks your eligibility across all 50+ Gujarat welfare schemes.
          </p>
        </div>
        <Link to="/schemes" className={styles.eligibilityBtn}>
          View Available Schemes
          <ExternalLink size={14} />
        </Link>
      </div>

      {/* ── Family Summary KPI Grid ─────────────────────── */}
      <div className={styles.summaryGrid}>
        <Card className={styles.summaryCard}>
          <Users size={24} className={styles.summaryIcon} />
          <div>
            <p className={styles.summaryValue}>{members.length}</p>
            <p className={styles.summaryLabel}>Household Members</p>
          </div>
        </Card>

        <Card className={styles.summaryCard}>
          <MapPin size={24} className={styles.summaryIcon} />
          <div>
            <p className={styles.summaryValue}>{family?.address?.district || 'Gandhinagar'}</p>
            <p className={styles.summaryLabel}>{family?.address?.taluka || 'District'}</p>
          </div>
        </Card>

        <Card className={styles.summaryCard}>
          <BadgeCheck size={24} className={styles.summaryIcon} />
          <div>
            <p className={styles.summaryValue}>{family?.category || 'General'}</p>
            <p className={styles.summaryLabel}>Social Category</p>
          </div>
        </Card>

        <Card className={styles.summaryCard}>
          <div className={styles.incomeIcon}>₹</div>
          <div>
            <p className={styles.summaryValue}>
              ₹{Number(family?.annualIncome || 0).toLocaleString('en-IN')}
            </p>
            <p className={styles.summaryLabel}>Annual Household Income</p>
          </div>
        </Card>
      </div>

      {/* ── Address & Ration Card ───────────────────────── */}
      <Card>
        <h2 className={styles.sectionTitle}>Household Address & Ration Card</h2>
        <div className={styles.addressGrid}>
          <div>
            <span>Ration Card Number</span>
            <strong>{family?.rationCardNumber || '—'} ({family?.rationCardType || 'NFSA/AAY'})</strong>
          </div>
          <div>
            <span>Village / Area</span>
            <strong>{family?.address?.village || '—'}</strong>
          </div>
          <div>
            <span>Taluka</span>
            <strong>{family?.address?.taluka || '—'}</strong>
          </div>
          <div>
            <span>District</span>
            <strong>{family?.address?.district || 'Gandhinagar'}</strong>
          </div>
          <div>
            <span>Pincode</span>
            <strong>{family?.address?.pincode || '382010'}</strong>
          </div>
          <div>
            <span>State</span>
            <strong>{family?.address?.state || 'Gujarat'}</strong>
          </div>
        </div>
      </Card>

      {/* ── Household Members ───────────────────────────── */}
      <div className={styles.membersSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
            {t('family.members', 'Family Members')} ({members.length})
          </h2>
          <Button
            variant="secondary"
            size="sm"
            icon={<UserPlus size={16} />}
            onClick={() => setIsAddMemberOpen(true)}
          >
            {t('family.add_member', 'Add Family Member')}
          </Button>
        </div>

        <div className={styles.membersList}>
          {members.length === 0 ? (
            <div className={styles.emptyDocBox}>
              <Users size={32} />
              <p>No family members listed yet. Click "+ Add Family Member" to add members.</p>
            </div>
          ) : (
            members.map((m) => <MemberCard key={m._id || m.memberId} member={m} />)
          )}
        </div>
      </div>

      {/* ── Evidence Locker & Documents ─────────────────── */}
      <div className={styles.documentsSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={22} color="var(--color-teal-600)" />
              Family Documents & Evidence Locker
            </h2>
            <p style={{ fontSize: 'var(--text-xs)', color: '#64748B', margin: '4px 0 0' }}>
              "One Evidence → Many Benefits": Upload your certificates once to unlock all relevant welfare schemes.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={<Plus size={16} />}
            onClick={() => setIsAddDocOpen(true)}
          >
            Add Document / Certificate
          </Button>
        </div>

        {isDocsLoading ? (
          <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
        ) : evidenceList.length === 0 ? (
          <div className={styles.emptyDocBox}>
            <FileText size={36} color="var(--color-teal-600)" />
            <p>
              <strong>No certificates registered yet.</strong> Add your Income Certificate, Caste Certificate, Domicile, or Ration Card to automatically verify and qualify for welfare schemes!
            </p>
            <Button
              variant="outline"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setIsAddDocOpen(true)}
            >
              Add First Certificate
            </Button>
          </div>
        ) : (
          <div className={styles.docGrid}>
            {evidenceList.map((doc, idx) => (
              <div key={idx} className={styles.docCard}>
                <div className={styles.docCardTop}>
                  <div className={styles.docTitleWrap}>
                    <FileCheck2 size={20} className={styles.docIcon} />
                    <span className={styles.docTypeName}>{doc.certificateType} Certificate</span>
                  </div>
                  <span className={`badge ${doc.isVerified ? 'badge-success' : 'badge-warning'}`}>
                    {doc.isVerified ? 'Verified' : 'Pending Review'}
                  </span>
                </div>

                <div>
                  <span className={styles.docCertNumber}>{doc.certificateNumber}</span>
                </div>

                <div className={styles.docMetaDetails}>
                  <div>
                    Issuing Authority: <strong>{doc.issuingAuthority}</strong>
                  </div>
                  <div>
                    Issued: <strong>{new Date(doc.issueDate).toLocaleDateString('en-IN')}</strong>
                    {doc.expiryDate && (
                      <span> · Valid till: <strong>{new Date(doc.expiryDate).toLocaleDateString('en-IN')}</strong></span>
                    )}
                  </div>
                </div>

                {doc.applicableSchemes?.length > 0 && (
                  <div className={styles.unlockedSchemesBox}>
                    <span className={styles.unlockedSchemesTitle}>
                      <Sparkles size={12} />
                      Unlocks {doc.applicableSchemes.length} Scheme{doc.applicableSchemes.length > 1 ? 's' : ''}:
                    </span>
                    <div className={styles.schemeTags}>
                      {doc.applicableSchemes.map((sc, sIdx) => (
                        <span key={sIdx} className={styles.schemeTag}>
                          {sc.schemeName || sc.schemeCode || sc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL: Add Family Member ─────────────────────── */}
      {isAddMemberOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalDialog}>
            <div className={styles.modalHeader}>
              <h2>
                <UserPlus size={20} color="var(--color-teal-600)" />
                Add Family Member
              </h2>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => {
                  setIsAddMemberOpen(false);
                  setFormError('');
                  if (openAddModal) navigate('/family', { replace: true });
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMemberSubmit}>
              <div className={styles.modalBody}>
                <p className={styles.modalDescription}>
                  Enter the personal and socio-economic details of the household member. Scheme eligibility will automatically re-evaluate upon submission.
                </p>

                {formError && (
                  <div className={`${styles.alertBox} ${styles.alertError}`} role="alert">
                    <AlertTriangle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className={styles.formGrid}>
                  <div className={`${styles.formGroup} ${styles.formFull}`}>
                    <label className={styles.formLabel}>Full Legal Name *</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="e.g. Ramesh Patel"
                      value={memberForm.name}
                      onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Relation to Head *</label>
                    <select
                      className={styles.formSelect}
                      value={memberForm.relationToHead}
                      onChange={(e) => setMemberForm({ ...memberForm, relationToHead: e.target.value })}
                    >
                      <option value="Spouse">Spouse</option>
                      <option value="Son">Son</option>
                      <option value="Daughter">Daughter</option>
                      <option value="Mother">Mother</option>
                      <option value="Father">Father</option>
                      <option value="Brother">Brother</option>
                      <option value="Sister">Sister</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Gender *</label>
                    <select
                      className={styles.formSelect}
                      value={memberForm.gender}
                      onChange={(e) => setMemberForm({ ...memberForm, gender: e.target.value })}
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Date of Birth *</label>
                    <input
                      type="date"
                      className={styles.formInput}
                      value={memberForm.dateOfBirth}
                      onChange={(e) => setMemberForm({ ...memberForm, dateOfBirth: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Occupation</label>
                    <select
                      className={styles.formSelect}
                      value={memberForm.occupation}
                      onChange={(e) => setMemberForm({ ...memberForm, occupation: e.target.value })}
                    >
                      <option value="Farmer">Farmer (Kisan)</option>
                      <option value="Laborer">Agricultural / Daily Laborer</option>
                      <option value="Homemaker">Homemaker</option>
                      <option value="Student">Student</option>
                      <option value="Salaried">Salaried / Private Employee</option>
                      <option value="Self-Employed">Self-Employed / Small Business</option>
                      <option value="Unemployed">Unemployed</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Education Level</label>
                    <select
                      className={styles.formSelect}
                      value={memberForm.educationLevel}
                      onChange={(e) => setMemberForm({ ...memberForm, educationLevel: e.target.value })}
                    >
                      <option value="Primary">Primary (Class 1-5)</option>
                      <option value="Secondary">Secondary (Class 6-10)</option>
                      <option value="Higher Secondary">Higher Secondary (11-12)</option>
                      <option value="Graduate">Graduate (Bachelor's)</option>
                      <option value="Post Graduate">Post Graduate / Doctorate</option>
                      <option value="Illiterate">Illiterate</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Marital Status</label>
                    <select
                      className={styles.formSelect}
                      value={memberForm.maritalStatus}
                      onChange={(e) => setMemberForm({ ...memberForm, maritalStatus: e.target.value })}
                    >
                      <option value="Married">Married</option>
                      <option value="Single">Single</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Divorced">Divorced</option>
                    </select>
                  </div>

                  <div className={`${styles.formGroup} ${styles.formFull}`}>
                    <label className={styles.formLabel}>Aadhaar Number (Optional)</label>
                    <input
                      type="text"
                      maxLength={12}
                      className={styles.formInput}
                      placeholder="12-digit Aadhaar number"
                      value={memberForm.aadhaar}
                      onChange={(e) => setMemberForm({ ...memberForm, aadhaar: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>

                  <div className={`${styles.formGroup} ${styles.formFull}`}>
                    <label className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={memberForm.isStudent}
                        onChange={(e) => setMemberForm({ ...memberForm, isStudent: e.target.checked })}
                      />
                      <span>Member is currently enrolled as a student (unlocks scholarships)</span>
                    </label>
                  </div>

                  <div className={`${styles.formGroup} ${styles.formFull}`}>
                    <label className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={memberForm.hasDisability}
                        onChange={(e) => setMemberForm({ ...memberForm, hasDisability: e.target.checked })}
                      />
                      <span>Member has a recognized physical or mental disability (PwD)</span>
                    </label>
                  </div>

                  {memberForm.hasDisability && (
                    <div className={`${styles.formGroup} ${styles.formFull}`}>
                      <label className={styles.formLabel}>Disability Percentage (%)</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        className={styles.formInput}
                        placeholder="e.g. 40"
                        value={memberForm.disabilityPercentage}
                        onChange={(e) => setMemberForm({ ...memberForm, disabilityPercentage: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.modalFooter}>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setIsAddMemberOpen(false);
                    setFormError('');
                    if (openAddModal) navigate('/family', { replace: true });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={addMemberMutation.isPending}
                >
                  {addMemberMutation.isPending ? 'Adding Member...' : 'Add Member'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Add Document / Evidence ────────────────── */}
      {isAddDocOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalDialog}>
            <div className={styles.modalHeader}>
              <h2>
                <ShieldCheck size={20} color="var(--color-teal-600)" />
                Register Document into Evidence Locker
              </h2>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => {
                  setIsAddDocOpen(false);
                  setDocFormError('');
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddDocSubmit}>
              <div className={styles.modalBody}>
                <p className={styles.modalDescription}>
                  Registered certificates automatically satisfy application prerequisites across multiple schemes.
                </p>

                {docFormError && (
                  <div className={`${styles.alertBox} ${styles.alertError}`} role="alert">
                    <AlertTriangle size={16} />
                    <span>{docFormError}</span>
                  </div>
                )}

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Certificate / Evidence Type *</label>
                    <select
                      className={styles.formSelect}
                      value={docForm.certificateType}
                      onChange={(e) => setDocForm({ ...docForm, certificateType: e.target.value })}
                    >
                      <option value="Income">Income Certificate</option>
                      <option value="Caste">Caste / Category Certificate</option>
                      <option value="Domicile">Domicile Certificate</option>
                      <option value="RationCard">Ration Card</option>
                      <option value="Marksheet">Marksheet / Education Proof</option>
                      <option value="Disability">Disability Certificate</option>
                      <option value="BOCW">BOCW Construction Worker Card</option>
                      <option value="ElectricityBill">Electricity Bill / Address Proof</option>
                      <option value="BankPassbook">Bank Passbook / Account Proof</option>
                      <option value="Other">Other Official Document</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Certificate / Registration No. *</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="e.g. INC-2024-94812"
                      value={docForm.certificateNumber}
                      onChange={(e) => setDocForm({ ...docForm, certificateNumber: e.target.value })}
                      required
                    />
                  </div>

                  <div className={`${styles.formGroup} ${styles.formFull}`}>
                    <label className={styles.formLabel}>Issuing Authority *</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="e.g. Mamlatdar Office, Gandhinagar"
                      value={docForm.issuingAuthority}
                      onChange={(e) => setDocForm({ ...docForm, issuingAuthority: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Issue Date *</label>
                    <input
                      type="date"
                      className={styles.formInput}
                      value={docForm.issueDate}
                      onChange={(e) => setDocForm({ ...docForm, issueDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Expiry Date (If applicable)</label>
                    <input
                      type="date"
                      className={styles.formInput}
                      value={docForm.expiryDate}
                      onChange={(e) => setDocForm({ ...docForm, expiryDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setIsAddDocOpen(false);
                    setDocFormError('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={addDocMutation.isPending}
                >
                  {addDocMutation.isPending ? 'Registering...' : 'Register Document'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
