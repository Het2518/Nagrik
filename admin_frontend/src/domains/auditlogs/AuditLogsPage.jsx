import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ScrollText, Search, Filter } from 'lucide-react';
import { auditService } from '../../services/adminServices';
import styles from './AuditLogsPage.module.css';

const ACTION_COLORS = {
  'ApplicationDecision': 'badge-info',
  'FamilyVerified':      'badge-success',
  'FamilyStatusChanged': 'badge-navy',
  'SchemeCreated':       'badge-success',
  'SchemeUpdated':       'badge-navy',
  'SchemeDeactivated':   'badge-error',
  'OfficerRegistered':   'badge-navy',
  'LoginSuccess':        'badge-neutral',
  'LoginFailed':         'badge-error',
};

export default function AuditLogsPage() {
  const [search,      setSearch]      = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['auditlogs', search, actionFilter, page],
    queryFn: () => auditService.list({
      search: search || undefined,
      action: actionFilter || undefined,
      page, limit,
    }),
    keepPreviousData: true,
  });

  const logs  = data?.logs || [];
  const total = data?.total || 0;
  const pages = Math.ceil(total / limit);

  return (
    <div className={`${styles.page} animate-fade-in`}>
      <div className={styles.header}>
        <div>
          <h1>Audit Logs</h1>
          <p>Complete immutable record of all system actions</p>
        </div>
        <div className={styles.totalBadge}>{total} entries</div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder="Search by officer, family ID, or description..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className={styles.select} value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}>
          <option value="">All Actions</option>
          {Object.keys(ACTION_COLORS).map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        {isLoading ? (
          <div style={{ padding: 'var(--space-5)' }}>
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8, marginBottom: 6 }} />)}
          </div>
        ) : logs.length === 0 ? (
          <div className={styles.empty}>
            <ScrollText size={40} />
            <p>No audit logs found</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Officer</th>
                <th>Role</th>
                <th>Target</th>
                <th>Description</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log._id} className={styles.row}>
                  <td className={styles.timestamp}>
                    {log.timestamp ? format(new Date(log.timestamp), 'd MMM yy, HH:mm') : '—'}
                  </td>
                  <td>
                    <span className={`badge ${ACTION_COLORS[log.action] || 'badge-neutral'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className={styles.officer}>{log.officerId?.name || log.officerEmployeeId || '—'}</td>
                  <td><span className="badge badge-navy">{log.officerRole || '—'}</span></td>
                  <td className={styles.target}>
                    {log.targetType && <span className={styles.targetType}>{log.targetType}:</span>}
                    <span className={styles.targetId}>{log.targetId || '—'}</span>
                  </td>
                  <td className={styles.desc}>{log.description || '—'}</td>
                  <td className={styles.ip}>{log.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className={styles.pagination} role="navigation" aria-label="Pagination">
          <button className={styles.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span className={styles.pageInfo}>Page {page} of {pages}</span>
          <button className={styles.pageBtn} disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
