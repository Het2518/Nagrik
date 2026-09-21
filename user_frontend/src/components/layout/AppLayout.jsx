import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Home, BookOpen, FileText, Users, User, LogOut, Bell } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { v2WelfareService } from '../../services/v2WelfareService';
import styles from './AppLayout.module.css';

const NAV_ITEMS = [
  { path: '/home',          labelKey: 'nav.home',          icon: Home },
  { path: '/schemes',       labelKey: 'nav.schemes',        icon: BookOpen },
  { path: '/applications',  labelKey: 'nav.applications',   icon: FileText },
  { path: '/family',        labelKey: 'nav.family',         icon: Users },
  { path: '/notifications', labelKey: 'nav.notifications',  icon: Bell },
];

export default function AppLayout({ children }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();

  const { data: notifData } = useQuery({
    queryKey: ['notifications-badge'],
    queryFn: () => v2WelfareService.getNotifications({ isRead: false }),
    refetchInterval: 30000,
  });

  const unreadCount = notifData?.unreadCount ?? notifData?.notifications?.length ?? 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.shell}>
      {/* ── Desktop Sidebar ─────────────────────────────── */}
      <aside className={styles.sidebar} aria-label="Main navigation">
        <div className={styles.sidebarTop}>
          <Link to="/home" className={styles.logo}>
            <div className={styles.logoMark}>
              <span>N</span>
            </div>
            <div className={styles.logoText}>
              <span className={styles.logoTitle}>Nagrik</span>
              <span className={styles.logoSub}>Government Portal</span>
            </div>
          </Link>

          <nav className={styles.nav}>
            {NAV_ITEMS.map(({ path, labelKey, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={[
                  styles.navItem,
                  location.pathname.startsWith(path) ? styles.navItemActive : '',
                ].join(' ')}
                aria-current={location.pathname.startsWith(path) ? 'page' : undefined}
              >
                <Icon size={20} aria-hidden="true" />
                <span>{labelKey === 'nav.notifications' ? t(labelKey, 'Notifications') : t(labelKey)}</span>
                {path === '/notifications' && unreadCount > 0 && (
                  <span style={{
                    marginLeft: 'auto',
                    background: 'var(--color-saffron-500)',
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 999,
                  }}>
                    {unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className={styles.sidebarBottom}>
          <Link to="/profile" className={styles.userCard}>
            <div className={styles.avatar} aria-hidden="true">
              <User size={18} />
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>My Profile</span>
              <span className={styles.userRole}>Citizen</span>
            </div>
          </Link>
          <button onClick={handleLogout} className={styles.logoutBtn} aria-label="Logout">
            <LogOut size={18} aria-hidden="true" />
            <span>{t('auth.logout')}</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────── */}
      <div className={styles.main}>
        {/* Top bar (mobile) */}
        <header className={styles.topbar}>
          <Link to="/home" className={styles.topbarLogo}>
            <div className={styles.logoMarkSm}><span>N</span></div>
            <span className={styles.topbarTitle}>Nagrik</span>
          </Link>
          <Link to="/notifications" className={styles.bellBtn} aria-label={t('nav.notifications')}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={22} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  background: 'var(--color-saffron-500)',
                  color: 'white',
                  borderRadius: 999,
                  minWidth: 16,
                  height: 16,
                  padding: '0 3px',
                  fontSize: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
          </Link>
        </header>

        <main className={styles.content} id="main-content">
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Nav ─────────────────────────────── */}
      <nav className={styles.bottomNav} aria-label="Mobile navigation">
        {NAV_ITEMS.map(({ path, labelKey, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={[
              styles.bottomNavItem,
              location.pathname.startsWith(path) ? styles.bottomNavItemActive : '',
            ].join(' ')}
            aria-current={location.pathname.startsWith(path) ? 'page' : undefined}
          >
            <Icon size={22} aria-hidden="true" />
            <span>{t(labelKey)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
