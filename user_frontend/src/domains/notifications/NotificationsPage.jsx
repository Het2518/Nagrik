import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  Sparkles,
  AlertTriangle,
  Clock,
  FileText,
  ArrowRight,
  ShieldCheck,
  Check,
  Calendar,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { v2WelfareService } from '../../services/v2WelfareService';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import styles from './NotificationsPage.module.css';

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => v2WelfareService.getNotifications(),
  });

  const { mutate: markRead } = useMutation({
    mutationFn: (id) => v2WelfareService.markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const { mutate: markAllRead, isPending: isMarkingAll } = useMutation({
    mutationFn: () => v2WelfareService.markAllNotificationsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount ?? notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (selectedTab === 'unread') return !n.isRead;
    if (selectedTab === 'actionRequired') return n.actionRequired;
    if (selectedTab === 'nudges') return ['BenefitDiscovered', 'WelfareNudge', 'LifeEventDetected'].includes(n.type);
    if (selectedTab === 'applications') return ['ApplicationStatusUpdate', 'SLABreach'].includes(n.type);
    return true;
  });

  const getCategoryIcon = (type, category) => {
    switch (type) {
      case 'BenefitDiscovered':
      case 'WelfareNudge':
        return <Sparkles size={20} color="#D97706" />;
      case 'BenefitRenewal':
        return <Calendar size={20} color="#2563EB" />;
      case 'SLABreach':
        return <Clock size={20} color="#DC2626" />;
      case 'EvidenceRequired':
      case 'DocumentExpiring':
      case 'DocumentExpiry':
        return <FileText size={20} color="#EA580C" />;
      case 'RiskAlert':
        return <AlertTriangle size={20} color="#DC2626" />;
      default:
        return <Bell size={20} color="var(--color-navy-700)" />;
    }
  };

  const getIconBackground = (type) => {
    switch (type) {
      case 'BenefitDiscovered':
      case 'WelfareNudge':
        return '#FEF3C7';
      case 'BenefitRenewal':
        return '#DBEAFE';
      case 'SLABreach':
      case 'RiskAlert':
        return '#FEE2E2';
      case 'EvidenceRequired':
      case 'DocumentExpiring':
        return '#FFEDD5';
      default:
        return '#F3F4F6';
    }
  };

  const getActionLabel = (notif) => {
    if (notif.type === 'BenefitDiscovered') return t('notifications.action_apply', 'Apply Now');
    if (notif.type === 'BenefitRenewal') return t('notifications.action_renew', 'Renew Certificate');
    if (notif.type === 'EvidenceRequired' || notif.type === 'DocumentExpiring')
      return t('notifications.action_upload', 'Upload Document');
    if (notif.type === 'SLABreach' || notif.type === 'ApplicationStatusUpdate')
      return t('notifications.action_view_app', 'View Status');
    return t('notifications.action_view', 'View Details');
  };

  const isGujarati = i18n.language === 'gu';

  return (
    <div className={`${styles.page} animate-fade-in`}>
      {/* ── Hero Header ───────────────────────────────────── */}
      <div className={styles.hero}>
        <div>
          <h1 className={styles.heroTitle}>
            <Bell size={26} />
            {t('notifications.title', 'Citizen Notification Center')}
            {unreadCount > 0 && <span className={styles.unreadBadge}>{unreadCount} new</span>}
          </h1>
          <p className={styles.heroSubtitle}>
            {t(
              'notifications.subtitle',
              'Proactive welfare discoveries, life milestone nudges, certificate renewal alerts, and status notifications.'
            )}
          </p>
        </div>
        {unreadCount > 0 && (
          <div className={styles.heroActions}>
            <Button
              variant="outline"
              size="sm"
              loading={isMarkingAll}
              onClick={() => markAllRead()}
              style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}
            >
              <CheckCheck size={16} style={{ marginRight: 6 }} />
              {t('notifications.mark_all_read', 'Mark All as Read')}
            </Button>
          </div>
        )}
      </div>

      {/* ── Filter Tabs ───────────────────────────────────── */}
      <div className={styles.filterTabs} role="tablist">
        <button
          className={`${styles.tabBtn} ${selectedTab === 'all' ? styles.tabActive : ''}`}
          onClick={() => setSelectedTab('all')}
        >
          All <span className={styles.tabCount}>{notifications.length}</span>
        </button>
        <button
          className={`${styles.tabBtn} ${selectedTab === 'actionRequired' ? styles.tabActive : ''}`}
          onClick={() => setSelectedTab('actionRequired')}
        >
          Action Required{' '}
          <span className={styles.tabCount}>
            {notifications.filter((n) => n.actionRequired).length}
          </span>
        </button>
        <button
          className={`${styles.tabBtn} ${selectedTab === 'unread' ? styles.tabActive : ''}`}
          onClick={() => setSelectedTab('unread')}
        >
          Unread <span className={styles.tabCount}>{unreadCount}</span>
        </button>
        <button
          className={`${styles.tabBtn} ${selectedTab === 'nudges' ? styles.tabActive : ''}`}
          onClick={() => setSelectedTab('nudges')}
        >
          Welfare Nudges{' '}
          <span className={styles.tabCount}>
            {
              notifications.filter((n) =>
                ['BenefitDiscovered', 'WelfareNudge', 'LifeEventDetected'].includes(n.type)
              ).length
            }
          </span>
        </button>
        <button
          className={`${styles.tabBtn} ${selectedTab === 'applications' ? styles.tabActive : ''}`}
          onClick={() => setSelectedTab('applications')}
        >
          Application Updates{' '}
          <span className={styles.tabCount}>
            {
              notifications.filter((n) =>
                ['ApplicationStatusUpdate', 'SLABreach'].includes(n.type)
              ).length
            }
          </span>
        </button>
      </div>

      {/* ── Notification List ─────────────────────────────── */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="skeleton" style={{ height: 90, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 90, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 90, borderRadius: 16 }} />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className={styles.emptyState}>
          <ShieldCheck size={48} className={styles.emptyIcon} />
          <h3>All Caught Up!</h3>
          <p>
            {selectedTab === 'unread'
              ? 'You have read all your notifications.'
              : selectedTab === 'actionRequired'
              ? 'No pending actions required on your family profile.'
              : 'No notifications found in this category.'}
          </p>
        </div>
      ) : (
        <div className={styles.notifList}>
          {filteredNotifications.map((notif) => {
            const title = isGujarati && notif.titleGu ? notif.titleGu : notif.titleEn;
            const message = isGujarati && notif.messageGu ? notif.messageGu : notif.messageEn;
            const priority = notif.priority || 'Normal';

            return (
              <div
                key={notif._id || notif.notificationId}
                className={`${styles.notifItem} ${!notif.isRead ? styles.notifUnread : ''}`}
              >
                <div
                  className={styles.iconWrapper}
                  style={{ background: getIconBackground(notif.type) }}
                >
                  {getCategoryIcon(notif.type, notif.category)}
                </div>

                <div className={styles.contentWrapper}>
                  <div className={styles.headerRow}>
                    <h3 className={styles.title}>{title}</h3>
                    <div className={styles.metaRow}>
                      {priority === 'Critical' && (
                        <span className={`${styles.priorityBadge} ${styles.priorityCritical}`}>
                          Urgent
                        </span>
                      )}
                      {priority === 'High' && (
                        <span className={`${styles.priorityBadge} ${styles.priorityHigh}`}>
                          Important
                        </span>
                      )}
                      <span className={styles.timestamp}>
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  <p className={styles.message}>{message}</p>

                  <div className={styles.actionRow}>
                    <div>
                      {notif.nextActionUrl && (
                        <Link to={notif.nextActionUrl} className={styles.actionBtn}>
                          {getActionLabel(notif)} <ArrowRight size={14} />
                        </Link>
                      )}
                    </div>
                    <div>
                      {!notif.isRead && (
                        <button
                          className={styles.markReadBtn}
                          onClick={() => markRead(notif._id)}
                          title="Mark as read"
                        >
                          <Check size={14} /> Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
