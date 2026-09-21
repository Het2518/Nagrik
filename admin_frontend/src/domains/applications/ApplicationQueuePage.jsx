import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Search,
  Filter,
  ChevronRight,
  AlertCircle,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';
import { applicationService } from '../../services/adminServices';
import { useAdminStore } from '../../store/adminStore';
import styles from './ApplicationQueuePage.module.css';

const STATUS_LABELS = {
  Pending:              { label: 'Pending',          cls: 'badge-warning' },
  Level1Review:         { label: 'Talati Review',    cls: 'badge-info' },
  Level1Approved:       { label: 'Talati Approved',  cls: 'badge-navy' },
  Level2Review:         { label: 'Mamlatdar Review', cls: 'badge-info' },
  Level2Approved:       { label: 'Mamlatdar Approved', cls: 'badge-navy' },
  Level3Review:         { label: 'DO Review',        cls: 'badge-info' },
  FinalApproved:        { label: 'Approved',         cls: 'badge-success' },
  Rejected:             { label: 'Rejected',         cls: 'badge-error' },
  ResubmissionRequired: { label: 'Action Required',  cls: 'badge-warning' },
  Withdrawn:            { label: 'Withdrawn',        cls: 'badge-neutral' },
};

const LEVEL_TO_STATUS = { Talati: 'Pending', Mamlatdar: 'Level1Approved', DistrictOfficer: 'Level2Approved' };

export default function ApplicationQueuePage() {
  const qc = useQueryClient();
  const { user } = useAdminStore();
  const role = user?.role;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [slaFilter, setSlaFilter] = useState('all');
  const [selectedAppIds, setSelectedAppIds] = useState([]);
  const [bulkError, setBulkError] = useState('');

  // Default to role-appropriate queue filter
  const defaultStatus = LEVEL_TO_STATUS[role] || '';
  const queryStatus = statusFilter === 'all' ? defaultStatus : statusFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['applications', queryStatus, search, priorityFilter, slaFilter],
    queryFn: () => applicationService.list({
      status: queryStatus || undefined,
      search: search || undefined,
      priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      isBreached: slaFilter === 'breached' ? 'true' : undefined,
    }),
  });

  const applications = data?.applications || [];
  const slaMetrics = data?.slaMetrics || {
    totalActive: applications.length,
    withinSLA: applications.length,
    approachingBreach: 0,
    breached: 0,
    escalated: 0,
    fastTrack: 0,
  };

  const bulkDecideMutation = useMutation({
    mutationFn: (payload) => applicationService.bulkDecide(payload),
    onSuccess: () => {
      setSelectedAppIds([]);
      setBulkError('');
      qc.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: (err) => {
      setBulkError(err?.response?.data?.message || 'Bulk action failed');
    },
  });

  const toggleSelectAll = () => {
    if (selectedAppIds.length === applications.length) {
      setSelectedAppIds([]);
    } else {
      setSelectedAppIds(applications.map((a) => a._id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedAppIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkApprove = () => {
    if (window.confirm(`Are you sure you want to bulk approve ${selectedAppIds.length} application(s)?`)) {
      bulkDecideMutation.mutate({
        applicationIds: selectedAppIds,
        action: 'Approved',
        remarks: `Bulk approved by ${role}`,
      });
    }
  };

  const handleBulkReject = () => {
    const reason = window.prompt(`Enter rejection reason for ${selectedAppIds.length} application(s):`, 'Ineligible criteria upon officer review');
    if (reason) {
      bulkDecideMutation.mutate({
        applicationIds: selectedAppIds,
        action: 'Rejected',
        remarks: reason,
        rejectionCategory: 'IneligibleCriteria',
      });
    }
  };

  return (
    <div className={`${styles.page} animate-fade-in`}>
      <div className={styles.header}>
        <div>
          <h1>Application & SLA Queue</h1>
          <p>Review and process welfare applications in your jurisdiction with turnaround tracking</p>
        </div>
        <span className={styles.countBadge}>{data?.total || applications.length} applications</span>
      </div>

      {/* ── Phase 4: SLA Queue KPI Strip ───────────────── */}
      <div className={styles.kpiStrip}>
        <div className={`${styles.kpiCard} ${styles.kpiTotal}`}>
          <span className={styles.kpiVal}>{slaMetrics.totalActive || applications.length}</span>
          <span className={styles.kpiLabel}>Total in Queue</span>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiInSLA}`}>
          <span className={styles.kpiVal}>{slaMetrics.withinSLA}</span>
          <span className={styles.kpiLabel}>Within SLA Target</span>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiApproaching}`}>
          <span className={styles.kpiVal}>{slaMetrics.approachingBreach}</span>
          <span className={styles.kpiLabel}>Due &lt; 48 Hours</span>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiBreached}`}>
          <span className={styles.kpiVal}>{slaMetrics.breached}</span>
          <span className={styles.kpiLabel}>SLA Breached / Overdue</span>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiFastTrack}`}>
          <span className={styles.kpiVal}>{slaMetrics.fastTrack || applications.filter(a => a.priority === 'FastTrack').length}</span>
          <span className={styles.kpiLabel}>Fast-Track Sanctions</span>
        </div>
      </div>

      {/* ── Bulk Actions Floating Toolbar ──────────────── */}
      {selectedAppIds.length > 0 && (
        <div className={styles.bulkToolbar}>
          <div className={styles.bulkInfo}>
            <CheckCircle2 size={18} color="#10B981" />
            <span>{selectedAppIds.length} application{selectedAppIds.length > 1 ? 's' : ''} selected</span>
          </div>

          <div className={styles.bulkActions}>
            <button
              type="button"
              className={styles.bulkApproveBtn}
              onClick={handleBulkApprove}
              disabled={bulkDecideMutation.isPending}
            >
              ✓ Bulk Approve ({selectedAppIds.length})
            </button>
            <button
              type="button"
              className={styles.bulkRejectBtn}
              onClick={handleBulkReject}
              disabled={bulkDecideMutation.isPending}
            >
              ✕ Bulk Reject ({selectedAppIds.length})
            </button>
            <button
              type="button"
              className={styles.bulkCancelBtn}
              onClick={() => setSelectedAppIds([])}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {bulkError && (
        <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: 8, fontSize: 12 }}>
          ⚠️ {bulkError}
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────── */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="search"
            placeholder="Search by Application ID or scheme..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <select
          className={styles.statusSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Level1Review">Talati Review</option>
          <option value="Level1Approved">Talati Approved</option>
          <option value="Level2Review">Mamlatdar Review</option>
          <option value="Level2Approved">Mamlatdar Approved</option>
          <option value="Level3Review">DO Review</option>
          <option value="ResubmissionRequired">Action Required</option>
          <option value="FinalApproved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>

        <select
          className={styles.statusSelect}
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          aria-label="Filter by priority"
        >
          <option value="all">All Priorities</option>
          <option value="FastTrack">⚡ Fast-Track</option>
          <option value="Urgent">🚨 Urgent</option>
          <option value="Normal">Normal</option>
        </select>

        <select
          className={styles.statusSelect}
          value={slaFilter}
          onChange={(e) => setSlaFilter(e.target.value)}
          aria-label="Filter by SLA"
        >
          <option value="all">All SLA Windows</option>
          <option value="within">Within SLA</option>
          <option value="breached">⚠️ SLA Breached</option>
        </select>
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      <div className={styles.tableWrap}>
        {isLoading ? (
          <div className={styles.skeletonRows}>
            {[1,2,3,4,5].map((i) => (
              <div key={i} className={`skeleton ${styles.skeletonRow}`} style={{ height: 56 }} />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className={styles.empty}>
            <Filter size={40} />
            <p>No applications found</p>
          </div>
        ) : (
          <table className={styles.table} role="table">
            <thead>
              <tr>
                <th style={{ width: 36, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedAppIds.length === applications.length && applications.length > 0}
                    onChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th>Application ID</th>
                <th>Priority</th>
                <th>Scheme</th>
                <th>Member</th>
                <th>SLA Countdown</th>
                <th>Status</th>
                <th>Risk</th>
                <th className={styles.actionCol}>Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => {
                const statusConfig = STATUS_LABELS[app.status] || { label: app.status, cls: 'badge-neutral' };
                const isSelected = selectedAppIds.includes(app._id);

                // Calculate SLA remaining days
                let slaBadge = null;
                if (app.sla?.isBreached || (app.sla?.targetCompletionDate && new Date(app.sla.targetCompletionDate) < new Date())) {
                  slaBadge = <span className={styles.slaBreached}>⚠️ Breached</span>;
                } else if (app.sla?.targetCompletionDate) {
                  const daysLeft = Math.max(0, Math.round((new Date(app.sla.targetCompletionDate) - new Date()) / (1000 * 60 * 60 * 24)));
                  if (daysLeft <= 2) {
                    slaBadge = <span className={styles.slaWarning}>⏱️ {daysLeft}d left</span>;
                  } else {
                    slaBadge = <span className={styles.slaOk}>✓ {daysLeft}d left</span>;
                  }
                } else {
                  slaBadge = <span className={styles.slaOk}>—</span>;
                }

                return (
                  <tr
                    key={app._id}
                    className={`${styles.tableRow} ${isSelected ? styles.urgentRow : ''}`}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(app._id)}
                        aria-label={`Select ${app.applicationId}`}
                      />
                    </td>
                    <td>
                      <div className={styles.appId}>
                        {app.status === 'ResubmissionRequired' && (
                          <AlertCircle size={13} color="var(--color-saffron-600)" title="Action Required" />
                        )}
                        <span className={styles.appIdText}>{app.applicationId}</span>
                      </div>
                    </td>
                    <td>
                      {app.priority === 'FastTrack' ? (
                        <span className={styles.fastTrackPill}>
                          <Zap size={11} /> FastTrack
                        </span>
                      ) : app.priority === 'Urgent' || app.escalated ? (
                        <span className={styles.urgentPill}>
                          <AlertTriangle size={11} /> Urgent
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#64748B' }}>Normal</span>
                      )}
                    </td>
                    <td className={styles.schemeName}>{app.schemeId?.schemeName || '—'}</td>
                    <td className={styles.memberName}>{app.memberId?.name || '—'}</td>
                    <td>{slaBadge}</td>
                    <td>
                      <span className={`badge ${statusConfig.cls}`}>{statusConfig.label}</span>
                    </td>
                    <td>
                      {app.riskFlag === 'High' ? (
                        <span className="badge badge-error">⚠ High</span>
                      ) : app.riskFlag === 'Medium' ? (
                        <span className="badge badge-warning">Medium</span>
                      ) : (
                        <span className="badge badge-success">Low</span>
                      )}
                    </td>
                    <td className={styles.actionCol}>
                      <Link to={`/applications/${app._id}`} className={styles.reviewLink}>
                        Review <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
