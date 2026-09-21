import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, BookOpen, ScrollText, Settings, LogOut, ChevronRight, Shield, Layers, ShieldCheck } from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import styles from './AdminLayout.module.css';

const ROLE_NAV = {
  Talati: [
    { path: '/dashboard',       label: 'Dashboard',         icon: LayoutDashboard },
    { path: '/applications',    label: 'Application Queue', icon: FileText },
    { path: '/families',        label: 'Families',          icon: Users },
    { path: '/social-registry', label: 'Social Registry',   icon: Layers },
    { path: '/data-quality',    label: 'Data Quality',      icon: ShieldCheck },
  ],
  Mamlatdar: [
    { path: '/dashboard',       label: 'Dashboard',         icon: LayoutDashboard },
    { path: '/applications',    label: 'Application Queue', icon: FileText },
    { path: '/families',        label: 'Families',          icon: Users },
    { path: '/social-registry', label: 'Social Registry',   icon: Layers },
    { path: '/data-quality',    label: 'Data Quality',      icon: ShieldCheck },
  ],
  DistrictOfficer: [
    { path: '/dashboard',       label: 'Dashboard',         icon: LayoutDashboard },
    { path: '/applications',    label: 'All Applications',  icon: FileText },
    { path: '/families',        label: 'Families',          icon: Users },
    { path: '/social-registry', label: 'Social Registry',   icon: Layers },
    { path: '/data-quality',    label: 'Data Quality',      icon: ShieldCheck },
  ],
  Admin: [
    { path: '/dashboard',       label: 'Dashboard',         icon: LayoutDashboard },
    { path: '/applications',    label: 'All Applications',  icon: FileText },
    { path: '/families',        label: 'Families',          icon: Users },
    { path: '/social-registry', label: 'Social Registry',   icon: Layers },
    { path: '/data-quality',    label: 'Data Quality',      icon: ShieldCheck },
    { path: '/schemes',         label: 'Schemes',           icon: BookOpen },
    { path: '/auditlogs',       label: 'Audit Logs',        icon: ScrollText },
    { path: '/officers',        label: 'Officers',          icon: Shield },
  ],
};

const ROLE_COLORS = {
  Talati:         { bg: '#7C3AED', light: '#EDE9FE', label: 'Talati' },
  Mamlatdar:      { bg: '#0E7490', light: '#CFFAFE', label: 'Mamlatdar' },
  DistrictOfficer:{ bg: '#B45309', light: '#FEF3C7', label: 'District Officer' },
  Admin:          { bg: '#0B1E3E', light: '#D6E4FA', label: 'System Admin' },
};

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAdminStore();

  const role = user?.role || 'Talati';
  const navItems = ROLE_NAV[role] || ROLE_NAV.Talati;
  const roleConfig = ROLE_COLORS[role] || ROLE_COLORS.Talati;

  return (
    <div className={styles.shell}>
      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          {/* Logo */}
          <div className={styles.logo}>
            <div className={styles.logoMark}><span>N</span></div>
            <div>
              <p className={styles.logoTitle}>Nagrik Admin</p>
              <p className={styles.logoSub}>Officer Portal</p>
            </div>
          </div>

          {/* Role Badge */}
          <div className={styles.roleBadge} style={{ background: roleConfig.light, color: roleConfig.bg }}>
            <Shield size={12} />
            <span>{roleConfig.label}</span>
          </div>

          {/* Nav */}
          <nav className={styles.nav} aria-label="Admin navigation">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`${styles.navItem} ${location.pathname.startsWith(path) ? styles.navItemActive : ''}`}
                aria-current={location.pathname.startsWith(path) ? 'page' : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
                {location.pathname.startsWith(path) && <ChevronRight size={14} className={styles.navArrow} />}
              </Link>
            ))}
          </nav>
        </div>

        {/* Bottom */}
        <div className={styles.sidebarBottom}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar} style={{ background: roleConfig.bg }}>
              {user?.name?.[0] || user?.employeeId?.[0] || 'O'}
            </div>
            <div>
              <p className={styles.userName}>{user?.name || user?.employeeId || 'Officer'}</p>
              <p className={styles.userRole}>{roleConfig.label}</p>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={() => { logout(); navigate('/login'); }}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────── */}
      <main className={styles.main} id="main-content">
        {children}
      </main>
    </div>
  );
}
