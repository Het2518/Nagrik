import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, ArrowRight, AlertCircle } from 'lucide-react';
import { applicationService } from '../../services/applicationService';
import StatusChip from '../../components/ui/StatusChip';
import Card from '../../components/ui/Card';
import styles from './ApplicationsPage.module.css';

export default function ApplicationsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: () => applicationService.list(),
  });

  const applications = data?.applications || [];

  return (
    <div className={`${styles.page} animate-fade-in`}>
      <div className={styles.header}>
        <div>
          <h1>{t('applications.title')}</h1>
          <p>{t('applications.subtitle')}</p>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.list}>
          {[1,2,3].map((i) => (
            <div key={i} className={styles.skeletonRow}>
              <div className="skeleton" style={{ height: 16, width: '30%' }} />
              <div className="skeleton" style={{ height: 14, width: '20%' }} />
              <div className="skeleton" style={{ height: 28, width: 100, borderRadius: 99 }} />
            </div>
          ))}
        </div>
      ) : applications.length === 0 ? (
        <Card>
          <div className={styles.emptyState}>
            <FileText size={48} className={styles.emptyIcon} />
            <h2>{t('applications.no_applications')}</h2>
            <p>Browse schemes you qualify for and apply for benefits.</p>
            <Link to="/schemes">
              <span className={styles.exploreLink}>{t('home.explore_schemes')} →</span>
            </Link>
          </div>
        </Card>
      ) : (
        <div className={styles.list}>
          {applications.map((app) => (
            <Link key={app._id} to={`/applications/${app._id}`} className={styles.appLink}>
              <Card hover className={styles.appCard}>
                <div className={styles.appCardInner}>
                  <div className={styles.appLeft}>
                    {app.status === 'ResubmissionRequired' && (
                      <div className={styles.urgentBadge}>
                        <AlertCircle size={12} /> Action Required
                      </div>
                    )}
                    <h2 className={styles.schemeName}>
                      {app.schemeId?.schemeName || 'Scheme'}
                    </h2>
                    <p className={styles.appId}>ID: {app.applicationId}</p>
                    <p className={styles.submittedOn}>
                      {t('applications.submitted_on')}{' '}
                      {new Date(app.submittedAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className={styles.appRight}>
                    <StatusChip status={app.status} size="md" />
                    <ArrowRight size={16} className={styles.arrow} />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
