import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Search, Filter, ChevronRight, AlertCircle } from 'lucide-react';
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
  const { user } = useAdminStore();
  const role = user?.role;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Default to role-appropriate queue filter
  const defaultStatus = LEVEL_TO_STATUS[role] || '';
  const queryStatus = statusFilter === 'all' ? defaultStatus : statusFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['applications', queryStatus, search],
    queryFn: () => applicationService.list({ status: queryStatus || undefined, search: search || undefined }),
  });

  const applications = data?.applications || [];

  return (
    <div className={`${styles.page} animate-fade-in`}>
      <div className={styles.header}>
        <div>
          <h1>Application Queue</h1>
          <p>Review and process welfare applications in your jurisdiction</p>
        </div>
        <span className={styles.countBadge}>{data?.total || applications.length} applications</span>
      </div>

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
                <th>Application ID</th>
                <th>Scheme</th>
                <th>Member</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Risk</th>
                <th className={styles.actionCol}>Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => {
                const statusConfig = STATUS_LABELS[app.status] || { label: app.status, cls: 'badge-neutral' };
                return (
                  <tr key={app._id} className={`${styles.tableRow} ${app.status === 'ResubmissionRequired' ? styles.urgentRow : ''}`}>
                    <td>
                      <div className={styles.appId}>
                        {app.status === 'ResubmissionRequired' && (
                          <AlertCircle size={13} color="var(--color-saffron-600)" title="Action Required" />
                        )}
                        <span className={styles.appIdText}>{app.applicationId}</span>
                      </div>
                    </td>
                    <td className={styles.schemeName}>{app.schemeId?.schemeName || '—'}</td>
                    <td className={styles.memberName}>{app.memberId?.name || '—'}</td>
                    <td className={styles.dateCell}>
                      {app.submittedAt ? format(new Date(app.submittedAt), 'd MMM yyyy') : '—'}
                    </td>
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
