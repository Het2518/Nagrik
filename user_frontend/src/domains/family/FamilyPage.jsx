import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Users, MapPin, BadgeCheck, AlertCircle, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { familyService } from '../../services/familyService';
import StatusChip from '../../components/ui/StatusChip';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { Link } from 'react-router-dom';
import styles from './FamilyPage.module.css';

function MemberCard({ member }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={styles.memberCard}>
      <button
        className={styles.memberCardHeader}
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <div className={styles.memberAvatarWrap}>
          <div className={styles.memberAvatar}>{member.name[0]}</div>
          <div>
            <p className={styles.memberName}>{member.name}</p>
            <p className={styles.memberRole}>{member.relationToHead} · {member.gender}</p>
          </div>
        </div>
        <div className={styles.memberCardRight}>
          {member.relationToHead === 'Self' && (
            <span className={styles.headBadge}>Head</span>
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
            <div><span>Date of Birth</span><strong>{member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString('en-IN') : '—'}</strong></div>
            <div><span>Age</span><strong>{member.age} years</strong></div>
            <div><span>Occupation</span><strong>{member.occupation || '—'}</strong></div>
            <div><span>Marital Status</span><strong>{member.maritalStatus || '—'}</strong></div>
            <div><span>Education</span><strong>{member.educationLevel || '—'}</strong></div>
            <div><span>Aadhaar</span><strong>XXXX XXXX ****</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FamilyPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const familyId = user?.familyId;

  const { data, isLoading } = useQuery({
    queryKey: ['family', familyId],
    queryFn: () => familyService.getProfile(familyId),
    enabled: !!familyId,
  });

  const family  = data?.family;
  const members = data?.members || [];

  if (!familyId) {
    return (
      <div className={styles.page}>
        <div className={styles.noFamily}>
          <Users size={48} className={styles.noFamilyIcon} />
          <h1>No Family Registered</h1>
          <p>Register your family to access government welfare schemes.</p>
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
        {[1,2,3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />
        ))}
      </div>
    );
  }

  return (
    <div className={`${styles.page} animate-fade-in`}>
      {/* ── Header ──────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h1>{t('family.title')}</h1>
          <p className={styles.familyId}>ID: {family?.familyId}</p>
        </div>
        <StatusChip status={family?.status} size="lg" />
      </div>

      {/* ── Provisional Warning ─────────────────────────── */}
      {family?.status === 'Provisional' && (
        <div className={styles.warningBanner} role="alert">
          <AlertCircle size={18} />
          <p>{t('family.provisional_warning')}</p>
        </div>
      )}

      {/* ── Family Summary Cards ──────────────────────── */}
      <div className={styles.summaryGrid}>
        <Card className={styles.summaryCard}>
          <Users size={22} className={styles.summaryIcon} />
          <div>
            <p className={styles.summaryValue}>{members.length}</p>
            <p className={styles.summaryLabel}>Family Members</p>
          </div>
        </Card>
        <Card className={styles.summaryCard}>
          <MapPin size={22} className={styles.summaryIcon} />
          <div>
            <p className={styles.summaryValue}>{family?.address?.district || '—'}</p>
            <p className={styles.summaryLabel}>{family?.address?.taluka || 'District'}</p>
          </div>
        </Card>
        <Card className={styles.summaryCard}>
          <BadgeCheck size={22} className={styles.summaryIcon} />
          <div>
            <p className={styles.summaryValue}>{family?.category || '—'}</p>
            <p className={styles.summaryLabel}>Social Category</p>
          </div>
        </Card>
        <Card className={styles.summaryCard}>
          <div className={styles.incomeIcon}>₹</div>
          <div>
            <p className={styles.summaryValue}>
              ₹{Number(family?.annualIncome || 0).toLocaleString('en-IN')}
            </p>
            <p className={styles.summaryLabel}>Annual Income</p>
          </div>
        </Card>
      </div>

      {/* ── Address ─────────────────────────────────────── */}
      <Card>
        <h2 className={styles.sectionTitle}>Address</h2>
        <div className={styles.addressGrid}>
          <div><span>Ration Card</span><strong>{family?.rationCardNumber || '—'} ({family?.rationCardType || '—'})</strong></div>
          <div><span>Village</span><strong>{family?.address?.village || '—'}</strong></div>
          <div><span>Taluka</span><strong>{family?.address?.taluka || '—'}</strong></div>
          <div><span>District</span><strong>{family?.address?.district || '—'}</strong></div>
          <div><span>Pincode</span><strong>{family?.address?.pincode || '—'}</strong></div>
          <div><span>State</span><strong>{family?.address?.state || 'Gujarat'}</strong></div>
        </div>
      </Card>

      {/* ── Members ─────────────────────────────────────── */}
      <div className={styles.membersSection}>
        <div className={styles.membersSectionHeader}>
          <h2 className={styles.sectionTitle}>{t('family.members')}</h2>
          <Link to="/family/add-member">
            <Button variant="outline" size="sm" icon={<UserPlus size={16} />}>
              {t('family.add_member')}
            </Button>
          </Link>
        </div>
        <div className={styles.membersList}>
          {members.map((m) => (
            <MemberCard key={m._id} member={m} />
          ))}
        </div>
      </div>
    </div>
  );
}
