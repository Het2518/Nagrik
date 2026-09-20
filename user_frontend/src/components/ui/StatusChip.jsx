import { useTranslation } from 'react-i18next';
import { CheckCircle, Clock, XCircle, AlertCircle, MinusCircle } from 'lucide-react';
import styles from './StatusChip.module.css';

const STATUS_CONFIG = {
  // Application statuses
  Pending:             { label: 'applications.status_pending',    icon: Clock,        className: 'pending' },
  Level1Review:        { label: 'applications.status_level1',     icon: Clock,        className: 'review' },
  Level1Approved:      { label: 'applications.status_level1approved', icon: CheckCircle, className: 'approved' },
  Level2Review:        { label: 'applications.status_level2',     icon: Clock,        className: 'review' },
  Level2Approved:      { label: 'applications.status_level2approved', icon: CheckCircle, className: 'approved' },
  Level3Review:        { label: 'applications.status_level3',     icon: Clock,        className: 'review' },
  FinalApproved:       { label: 'applications.status_final',      icon: CheckCircle,  className: 'final' },
  Rejected:            { label: 'applications.status_rejected',   icon: XCircle,      className: 'rejected' },
  ResubmissionRequired:{ label: 'applications.status_resubmission', icon: AlertCircle, className: 'resubmission' },
  Withdrawn:           { label: 'applications.status_withdrawn',  icon: MinusCircle,  className: 'neutral' },
  // Family statuses
  Provisional:         { label: 'family.provisional_badge',       icon: Clock,        className: 'pending' },
  Permanent:           { label: 'family.permanent_badge',         icon: CheckCircle,  className: 'final' },
  // Eligibility statuses
  eligible:            { label: 'schemes.eligible',               icon: CheckCircle,  className: 'final' },
  ineligible:          { label: 'schemes.ineligible',             icon: XCircle,      className: 'rejected' },
  not_checked:         { label: 'schemes.not_checked',            icon: MinusCircle,  className: 'neutral' },
};

export default function StatusChip({ status, size = 'md' }) {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['not_checked'];
  const Icon = config.icon;

  return (
    <span
      className={`${styles.chip} ${styles[config.className]} ${styles[size]}`}
      role="status"
      aria-label={t(config.label)}
    >
      <Icon size={size === 'sm' ? 12 : 14} aria-hidden="true" />
      <span>{t(config.label)}</span>
    </span>
  );
}
