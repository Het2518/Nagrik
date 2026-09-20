import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Shield, Search, CheckCircle, ChevronRight } from 'lucide-react';
import Button from '../../components/ui/Button';
import styles from './LandingPage.module.css';

const FEATURES = [
  { icon: Search,       titleKey: 'Discover Schemes',    desc: 'Find government schemes tailored to your family profile automatically.' },
  { icon: CheckCircle,  titleKey: 'Check Eligibility',   desc: 'Our engine instantly matches your family data against scheme rules.' },
  { icon: Shield,       titleKey: 'Secure & Private',    desc: 'Military-grade encryption protects your Aadhaar and sensitive data.' },
];

const STATS = [
  { value: '20+',    label: 'Active Schemes' },
  { value: '3-Level', label: 'Verified Pipeline' },
  { value: '100%',   label: 'Secure' },
];

export default function LandingPage() {
  const { t, i18n } = useTranslation();

  return (
    <div className={styles.page}>
      {/* ── Header ─────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <div className={styles.logoMark}><span>N</span></div>
            <span className={styles.logoName}>Nagrik</span>
          </div>
          <nav className={styles.headerNav} aria-label="Header navigation">
            <button
              className={styles.langBtn}
              onClick={() => {
                const next = i18n.language === 'en' ? 'gu' : 'en';
                i18n.changeLanguage(next);
                localStorage.setItem('nagrik_lang', next);
              }}
              aria-label="Switch language"
            >
              {i18n.language === 'en' ? 'ગુજ' : 'ENG'}
            </button>
            <Link to="/login">
              <Button variant="outline" size="sm">{t('auth.login')}</Button>
            </Link>
            <Link to="/register">
              <Button variant="secondary" size="sm">{t('auth.register')}</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className={styles.hero} aria-labelledby="hero-heading">
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <Shield size={14} aria-hidden="true" />
            <span>Government of Gujarat — Official Portal</span>
          </div>
          <h1 id="hero-heading" className={styles.heroTitle}>
            सरकारी योजनाओं का
            <span className={styles.heroAccent}> सरल रास्ता</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Nagrik connects your family to Gujarat government welfare schemes — eligibility checking, 
            document upload, and real-time tracking in one secure platform.
          </p>
          <div className={styles.heroCta}>
            <Link to="/register">
              <Button size="lg" variant="secondary" icon={<ArrowRight size={20} />} iconPosition="right">
                Get Started — It's Free
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="ghost">
                I already have an account
              </Button>
            </Link>
          </div>
        </div>
        <div className={styles.heroVisual} aria-hidden="true">
          <div className={styles.heroCard}>
            <div className={styles.heroCardHeader}>
              <div className={styles.heroCardDot} style={{ background: '#22C55E' }} />
              <span>Eligible Schemes</span>
            </div>
            {['PMAY-G Housing', 'Education Support', 'PM Pension Yojana'].map((s, i) => (
              <div key={s} className={styles.heroCardRow} style={{ animationDelay: `${i * 0.2}s` }}>
                <CheckCircle size={16} color="#22C55E" />
                <span>{s}</span>
                <ChevronRight size={14} color="#9CA3AF" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      <section className={styles.stats} aria-label="Platform statistics">
        {STATS.map(({ value, label }) => (
          <div key={label} className={styles.statItem}>
            <span className={styles.statValue}>{value}</span>
            <span className={styles.statLabel}>{label}</span>
          </div>
        ))}
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className={styles.features} aria-labelledby="features-heading">
        <div className={styles.sectionHeader}>
          <h2 id="features-heading">Everything you need, in one place</h2>
          <p>Designed for citizens who deserve a simple, dignified experience with government services.</p>
        </div>
        <div className={styles.featureGrid}>
          {FEATURES.map(({ icon: Icon, titleKey, desc }) => (
            <div key={titleKey} className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Icon size={24} aria-hidden="true" />
              </div>
              <h3>{titleKey}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className={styles.ctaSection}>
        <h2>Ready to find your benefits?</h2>
        <p>Join thousands of Gujarat families discovering their entitlements.</p>
        <Link to="/register">
          <Button size="xl" variant="secondary" icon={<ArrowRight size={22} />} iconPosition="right">
            Register Your Family
          </Button>
        </Link>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLogo}>
            <div className={styles.logoMark}><span>N</span></div>
            <div>
              <p className={styles.footerBrand}>Nagrik</p>
              <p className={styles.footerGovt}>Government of Gujarat</p>
            </div>
          </div>
          <p className={styles.footerCopy}>
            Helpline: 1800-XXX-XXXX &nbsp;|&nbsp; support@nagrik.gujarat.gov.in
          </p>
        </div>
      </footer>
    </div>
  );
}
