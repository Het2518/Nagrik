import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  ArrowRight,
  Users,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Clock,
  Zap,
  TrendingUp,
  RefreshCw,
  X,
  FileText,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { familyService } from '../../services/familyService';
import { applicationService } from '../../services/applicationService';
import { v2WelfareService } from '../../services/v2WelfareService';
import StatusChip from '../../components/ui/StatusChip';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import styles from './HomePage.module.css';

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const isGu = i18n.language === 'gu';
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const familyId = user?.familyId;

  const [simModalOpen, setSimModalOpen] = useState(false);
  const [simulationType, setSimulationType] = useState('AgeThresholdReached');
  const [simulationResult, setSimulationResult] = useState(null);

  // 1. Core Family Data
  const { data: familyData, isLoading: familyLoading } = useQuery({
    queryKey: ['family', familyId],
    queryFn: () => familyService.getProfile(familyId),
    enabled: !!familyId,
  });

  // 2. V2 Intelligence Analysis
  const {
    data: analysisData,
    isLoading: analysisLoading,
    refetch: refetchAnalysis,
    isFetching: analysisFetching,
  } = useQuery({
    queryKey: ['v2Analysis', familyId],
    queryFn: () => v2WelfareService.analyzeFamily(familyId),
    enabled: !!familyId,
    staleTime: 60 * 1000,
  });

  // 3. Applications
  const { data: appsData } = useQuery({
    queryKey: ['applications'],
    queryFn: () => applicationService.list(),
    enabled: !!familyId,
  });

  // 4. Family Documents Locker
  const { data: docRegistry } = useQuery({
    queryKey: ['familyDocuments', familyId],
    queryFn: () => familyService.getDocuments(familyId),
    enabled: !!familyId,
  });

  const evidenceList = docRegistry?.evidenceList || [];

  // Simulation Mutation
  const simMutation = useMutation({
    mutationFn: (payload) => v2WelfareService.simulateLifeEvent(familyId, payload),
    onSuccess: (data) => {
      setSimulationResult(data);
    },
  });

  const family = familyData?.family;
  const members = familyData?.members || [];
  const recentApps = appsData?.applications?.slice(0, 3) || [];

  const handleSimulate = (type) => {
    setSimulationType(type);
    setSimulationResult(null);
    let payload = { eventType: type, simulatedChanges: {} };
    if (type === 'AgeThresholdReached') {
      const student = members.find((m) => m.relationToHead !== 'Self') || members[0];
      payload.affectedMemberId = student?._id;
      payload.simulatedChanges = { age: 18 };
    } else if (type === 'IncomeChange') {
      payload.simulatedChanges = { annualIncome: 45000 };
    }
    simMutation.mutate(payload);
  };

  return (
    <div className={`${styles.page} animate-fade-in`}>
      {/* ── Top Header & Flagship "Analyze My Family" ───────── */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <ShieldCheck size={16} />
            <span>Privacy-Preserving Welfare Intelligence</span>
          </div>
          <h1 className={styles.heroTitle}>
            {t('home.greeting')}, {family?.headOfFamilyMemberId?.name || 'Citizen'}
          </h1>
          <p className={styles.heroSubtitle}>
            {familyId
              ? `Unified Household Record: ${family?.familyId || '...'}`
              : 'Complete family onboarding to enable automated benefit orchestration.'}
          </p>
        </div>

        {familyId && (
          <div className={styles.heroActions}>
            <Button
              variant="primary"
              size="lg"
              className={styles.analyzeBtn}
              onClick={() => refetchAnalysis()}
              disabled={analysisFetching}
              icon={
                analysisFetching ? (
                  <RefreshCw size={20} className="animate-spin" />
                ) : (
                  <Sparkles size={20} />
                )
              }
            >
              {analysisFetching ? t('v2.analyzing') : t('v2.analyze_btn')}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setSimModalOpen(true);
                handleSimulate('AgeThresholdReached');
              }}
              icon={<Zap size={18} />}
            >
              {t('v2.simulate_event')}
            </Button>
          </div>
        )}
      </section>

      {/* ── Document Locker Onboarding / Action Banner ─────── */}
      {familyId && (
        <section className={styles.lockerNudgeCard}>
          <div className={styles.lockerNudgeLeft}>
            <div className={styles.lockerNudgeBadge}>
              <Sparkles size={14} />
              <span>Instant Scheme Eligibility Engine</span>
            </div>
            <h2 className={styles.lockerNudgeTitle}>
              {evidenceList.length === 0
                ? 'Upload Standard Household Documents in Profile'
                : `Family Evidence Locker: ${evidenceList.length} Certificates Active`}
            </h2>
            <p className={styles.lockerNudgeSubtitle}>
              {evidenceList.length === 0
                ? 'Upload your Income, Caste, and Ration certificates once. Nagrik automatically auto-matches which schemes your family qualifies for and unlocks 1-Click Fast-Track applying.'
                : 'Your certificates are securely stored in your Evidence Locker. All schemes automatically pre-fill your documents and auto-verify eligibility.'}
            </p>
            <div className={styles.lockerNudgePills}>
              <span className={evidenceList.some((d) => d.certificateType === 'Income') ? styles.pillReady : styles.pillPending}>
                {evidenceList.some((d) => d.certificateType === 'Income') ? '✓ Income Certificate' : '+ Income Certificate'}
              </span>
              <span className={evidenceList.some((d) => d.certificateType === 'Caste') ? styles.pillReady : styles.pillPending}>
                {evidenceList.some((d) => d.certificateType === 'Caste') ? '✓ Caste Certificate' : '+ Caste Certificate'}
              </span>
              <span className={evidenceList.some((d) => d.certificateType === 'RationCard') ? styles.pillReady : styles.pillPending}>
                {evidenceList.some((d) => d.certificateType === 'RationCard') ? '✓ Ration Card' : '+ Ration Card'}
              </span>
              <span className={evidenceList.some((d) => d.certificateType === 'Domicile') ? styles.pillReady : styles.pillPending}>
                {evidenceList.some((d) => d.certificateType === 'Domicile') ? '✓ Domicile' : '+ Domicile'}
              </span>
            </div>
          </div>

          <div className={styles.lockerNudgeActions}>
            <Link to="/profile">
              <Button variant="secondary" size="md" icon={<Upload size={16} />}>
                {evidenceList.length === 0 ? 'Upload Documents in Profile' : 'Manage Profile Locker'}
              </Button>
            </Link>
            <Link to="/schemes">
              <Button variant="outline" size="md" icon={<Sparkles size={16} />}>
                View Eligible Schemes
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* ── No Family CTA ──────────────────────────────────── */}
      {!familyId && !familyLoading && (
        <Card className={styles.ctaCard}>
          <div className={styles.ctaCardInner}>
            <div className={styles.ctaIcon}>
              <Users size={28} />
            </div>
            <div>
              <h2>Register your household</h2>
              <p>Onboard once to discover, verify, and orchestrate all eligible welfare benefits.</p>
            </div>
            <Link to="/onboarding">
              <Button variant="secondary" icon={<ArrowRight size={18} />} iconPosition="right">
                Start Registration
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* ── V2 Welfare Gap Meter & Coverage Tile ────────────── */}
      {analysisData && (
        <section className={styles.metricsGrid}>
          <Card className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>{t('v2.welfare_coverage')}</span>
              <TrendingUp size={20} className={styles.metricIconAccent} />
            </div>
            <div className={styles.coverageWrap}>
              <span className={styles.coverageValue}>{analysisData.coveragePercentage}%</span>
              <div className={styles.progressBarBg}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${analysisData.coveragePercentage}%` }}
                />
              </div>
            </div>
            <p className={styles.metricHint}>
              {analysisData.currentBenefits?.length || 0} active benefits claimed
            </p>
          </Card>

          <Card className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>{t('v2.potential_benefits')}</span>
              <Sparkles size={20} className={styles.metricIconAccent} />
            </div>
            <span className={styles.metricBigNum}>
              {analysisData.potentialBenefits?.length || 0}
            </span>
            <p className={styles.metricHint}>Schemes matching current household profile</p>
          </Card>

          <Card className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>{t('v2.unclaimed_value')}</span>
              <Zap size={20} className={styles.metricIconAccent} />
            </div>
            <span className={styles.metricBigNum}>
              ₹{(analysisData.potentialBenefits?.reduce((acc, b) => acc + (b.maxBenefitAmount || 0), 0) || 0).toLocaleString('en-IN')}
            </span>
            <p className={styles.metricHint}>Estimated annual entitlements to claim</p>
          </Card>

          <Card className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>{t('v2.missing_evidence')}</span>
              <FileCheck2 size={20} className={styles.metricIconAccent} />
            </div>
            <span className={styles.metricBigNum}>
              {analysisData.missingEvidence?.length || 0}
            </span>
            <p className={styles.metricHint}>Documents to unlock remaining benefits</p>
          </Card>
        </section>
      )}

      {/* ── Potential Opportunities with "Why You Qualify" ─── */}
      {analysisData?.potentialBenefits?.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>{t('v2.potential_benefits')}</h2>
              <p className={styles.sectionSubtitle}>
                Deterministic rule evaluation with explainable qualification rationale
              </p>
            </div>
            <Link to="/schemes" className={styles.seeAll}>
              Explore catalog <ArrowRight size={16} />
            </Link>
          </div>

          <div className={styles.potentialGrid}>
            {analysisData.potentialBenefits.map((item) => (
              <Card key={item.schemeCode} hover className={styles.opportunityCard}>
                <div className={styles.cardTop}>
                  <span className={styles.categoryPill}>{item.benefitType}</span>
                  <span className={styles.benefitAmount}>
                    Up to ₹{item.maxBenefitAmount?.toLocaleString('en-IN')}
                  </span>
                </div>

                <h3 className={styles.schemeHeading}>{item.schemeName}</h3>

                {/* Explainable "Why You Qualify" */}
                <div className={styles.whyBox}>
                  <span className={styles.whyTitle}>{t('v2.why_qualify')}:</span>
                  <ul className={styles.whyList}>
                    {item.why?.slice(0, 2).map((reason, idx) => (
                      <li key={idx} className={styles.whyItem}>
                        <CheckCircle2 size={14} className={styles.checkIcon} />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Required Documents checklist */}
                {item.requiredDocuments?.length > 0 && (
                  <div className={styles.docsRequired}>
                    <span className={styles.docsLabel}>Required:</span>
                    <span className={styles.docsList}>
                      {item.requiredDocuments.map((d) => d.label).join(', ')}
                    </span>
                  </div>
                )}

                <div className={styles.cardFooter}>
                  <Link to={`/schemes/${item.schemeCode}`} className={styles.applyLink}>
                    <Button variant="primary" size="sm" icon={<ArrowRight size={14} />} iconPosition="right">
                      {t('schemes.apply')}
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── Reusable Evidence ("One Evidence → Many Benefits") ─ */}
      {analysisData?.reusableEvidence?.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>{t('v2.reusable_evidence')}</h2>
              <p className={styles.sectionSubtitle}>{t('v2.reusable_evidence_desc')}</p>
            </div>
          </div>

          <div className={styles.evidenceGrid}>
            {analysisData.reusableEvidence.map((ev, idx) => (
              <Card key={idx} className={styles.evidenceCard}>
                <div className={styles.evidenceTop}>
                  <FileText size={24} className={styles.evidenceIcon} />
                  <div>
                    <h4 className={styles.evidenceType}>{ev.certificateType}</h4>
                    <span className={styles.evidenceNum}>ID: {ev.certificateNumber}</span>
                  </div>
                  {ev.isVerified && <StatusChip status="Verified" size="sm" />}
                </div>

                <div className={styles.applicableSchemesBox}>
                  <span className={styles.applicableLabel}>Applicable Schemes:</span>
                  <div className={styles.tagsRow}>
                    {ev.applicableSchemes?.map((s) => (
                      <span key={s.schemeCode} className={styles.schemeTag}>
                        {s.schemeCode}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── Recent Life Events & Change Timeline ───────────── */}
      {analysisData?.recentLifeEvents?.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>{t('v2.recent_life_events')}</h2>
              <p className={styles.sectionSubtitle}>
                Proactive life events triggering welfare re-evaluations
              </p>
            </div>
          </div>

          <div className={styles.timelineList}>
            {analysisData.recentLifeEvents.map((evt) => (
              <div key={evt.eventId} className={styles.timelineItem}>
                <div className={styles.timelineDot} />
                <div className={styles.timelineBody}>
                  <div className={styles.timelineHeader}>
                    <span className={styles.eventTitle}>{evt.eventType}</span>
                    <span className={styles.eventDate}>
                      {new Date(evt.eventDate).toLocaleDateString()}
                    </span>
                    <StatusChip status={evt.verificationStatus} size="sm" />
                  </div>
                  <p className={styles.eventImpact}>{evt.impactSummary || 'Recorded for review'}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Applications in Progress ───────────────────────── */}
      {recentApps.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t('home.your_applications')}</h2>
            <Link to="/applications" className={styles.seeAll}>
              View all <ArrowRight size={16} />
            </Link>
          </div>
          <div className={styles.applicationsList}>
            {recentApps.map((app) => (
              <Card key={app.applicationId} className={styles.appCard}>
                <div className={styles.appCardHeader}>
                  <span className={styles.appId}>{app.applicationId}</span>
                  <StatusChip status={app.status} size="sm" />
                </div>
                <h4 className={styles.appScheme}>{app.schemeId?.schemeName || 'Scheme'}</h4>
                <div className={styles.appMeta}>
                  <span>Member: {app.memberId?.name}</span>
                  <span>Pipeline Level: {app.currentPipelineLevel}/3</span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── Simulation Modal ───────────────────────────────── */}
      {simModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleWrap}>
                <Zap size={22} className={styles.zapIcon} />
                <h3>{t('v2.simulate_title')}</h3>
              </div>
              <button
                className={styles.closeBtn}
                onClick={() => setSimModalOpen(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <p className={styles.simDisclaimer}>{t('v2.simulation_disclaimer')}</p>

            {/* Event Options */}
            <div className={styles.simButtonGroup}>
              <button
                className={`${styles.simOptionBtn} ${simulationType === 'AgeThresholdReached' ? styles.simOptionActive : ''}`}
                onClick={() => handleSimulate('AgeThresholdReached')}
              >
                🎂 {t('v2.simulate_age')}
              </button>
              <button
                className={`${styles.simOptionBtn} ${simulationType === 'IncomeChange' ? styles.simOptionActive : ''}`}
                onClick={() => handleSimulate('IncomeChange')}
              >
                📉 {t('v2.simulate_income')}
              </button>
            </div>

            {/* Live Impact Results */}
            {simMutation.isPending && (
              <div className={styles.simLoading}>
                <RefreshCw size={24} className="animate-spin" />
                <span>Evaluating impact on scheme rules...</span>
              </div>
            )}

            {simulationResult && (
              <div className={styles.simResults}>
                <h4>{t('v2.simulated_results')}</h4>
                <p className={styles.simSummaryText}>
                  {isGu ? simulationResult.summaryGu : simulationResult.summaryEn}
                </p>

                {simulationResult.newlyAvailableSchemes?.length > 0 && (
                  <div className={styles.simBoxGreen}>
                    <strong>🎉 {t('v2.newly_unlocked')}:</strong>
                    <ul>
                      {simulationResult.newlyAvailableSchemes.map((s) => (
                        <li key={s.schemeCode}>
                          <strong>{s.schemeName}</strong> — Benefit up to ₹{s.maxBenefitAmount?.toLocaleString('en-IN')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {simulationResult.schemesAtRiskOfStoppage?.length > 0 && (
                  <div className={styles.simBoxAmber}>
                    <strong>⚠️ {t('v2.requires_review')}:</strong>
                    <ul>
                      {simulationResult.schemesAtRiskOfStoppage.map((s) => (
                        <li key={s.schemeCode}>{s.schemeName}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className={styles.modalFooter}>
              <Button variant="secondary" onClick={() => setSimModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
