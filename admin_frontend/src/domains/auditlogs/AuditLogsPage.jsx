import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ScrollText, Search, Download, History, X, AlertTriangle, ShieldAlert, Info } from 'lucide-react';
import { auditService } from '../../services/adminServices';
import styles from './AuditLogsPage.module.css';

const ACTION_COLORS = {
  ApplicationDecision: 'badge-info',
  FamilyVerified: 'badge-success',
  FamilyStatusChanged: 'badge-navy',
  SchemeCreated: 'badge-success',
  SchemeUpdated: 'badge-navy',
  SchemeDeactivated: 'badge-error',
  OfficerRegistered: 'badge-navy',
  LoginSuccess: 'badge-neutral',
  LoginFailed: 'badge-error',
  APPLICATION_APPROVED: 'badge-success',
  APPLICATION_REJECTED: 'badge-error',
  APPLICATION_ESCALATED: 'badge-error',
  CLARIFICATION_REQUESTED: 'badge-warning',
};

export default function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [timelineEntityId, setTimelineEntityId] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['auditlogs', search, actionFilter, severityFilter, page],
    queryFn: () =>
      auditService.list({
        search: search || undefined,
        action: actionFilter || undefined,
        severity: severityFilter || undefined,
        page,
        limit,
      }),
    keepPreviousData: true,
  });

  const { data: timelineData, isLoading: isTimelineLoading } = useQuery({
    queryKey: ['audit-timeline', timelineEntityId],
    queryFn: () => auditService.getTimeline(timelineEntityId),
    enabled: Boolean(timelineEntityId),
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const pages = Math.ceil(total / limit);

  const handleExportCsv = () => {
    const url = auditService.exportUrl();
    window.open(url, '_blank');
  };

  return (
    <div className={`${styles.page} animate-fade-in`}>
      <div className={styles.header}>
        <div>
          <h1>System Audit Trail & Forensic Logs</h1>
          <p>Complete immutable append-only record of all administrative, workflow, and lifecycle decisions</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className={styles.totalBadge}>{total} entries</div>
          <button
            onClick={handleExportCsv}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              background: 'var(--color-navy-900)',
              color: 'white',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
            }}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search by action, entity ID (APP- / FAM-), or actor..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <select
          className={styles.select}
          value={severityFilter}
          onChange={(e) => {
            setSeverityFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="Warning">Warning</option>
          <option value="Info">Info</option>
        </select>

        <select
          className={styles.select}
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Actions</option>
          {Object.keys(ACTION_COLORS).map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        {isLoading ? (
          <div style={{ padding: 'var(--space-5)' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: 48, borderRadius: 8, marginBottom: 6 }}
              />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className={styles.empty}>
            <ScrollText size={40} />
            <p>No audit logs found matching criteria</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Severity</th>
                <th>Action</th>
                <th>Actor Role</th>
                <th>Entity Target</th>
                <th>IP / Client</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const ts = log.performedAt || log.timestamp;
                const severity = log.severity || 'Info';

                return (
                  <tr key={log._id} className={styles.row}>
                    <td className={styles.timestamp}>
                      {ts ? format(new Date(ts), 'd MMM yy, HH:mm') : '—'}
                    </td>
                    <td>
                      {severity === 'Critical' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#FEE2E2', color: '#DC2626', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                          <ShieldAlert size={12} /> Critical
                        </span>
                      ) : severity === 'Warning' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#FEF3C7', color: '#D97706', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                          <AlertTriangle size={12} /> Warning
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#F3F4F6', color: '#4B5563', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                          <Info size={12} /> Info
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${ACTION_COLORS[log.action] || 'badge-neutral'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-navy">{log.actorRole || 'System'}</span>
                    </td>
                    <td className={styles.target}>
                      <button
                        onClick={() => setTimelineEntityId(log.entityId)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          textAlign: 'left',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          color: '#0E7490',
                          fontWeight: 600,
                        }}
                        title="Click to view chronological entity timeline"
                      >
                        <span className={styles.targetType}>{log.entityType}:</span>
                        <span className={styles.targetId} style={{ textDecoration: 'underline' }}>{log.entityId || '—'}</span>
                        <History size={12} />
                      </button>
                    </td>
                    <td className={styles.ip}>
                      <div>{log.ipAddress || '127.0.0.1'}</div>
                      <div style={{ fontSize: 10, color: '#9CA3AF', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.userAgent || 'Web/Browser'}
                      </div>
                    </td>
                    <td className={styles.desc}>
                      {log.details?.reason || log.changedFields?.remarks || log.description || JSON.stringify(log.changedFields || {})}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className={styles.pagination} role="navigation" aria-label="Pagination">
          <button
            className={styles.pageBtn}
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <span className={styles.pageInfo}>
            Page {page} of {pages}
          </span>
          <button
            className={styles.pageBtn}
            disabled={page === pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}

      {/* ── Entity Timeline Modal ──────────────────────────── */}
      {timelineEntityId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setTimelineEntityId(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              maxWidth: 650,
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                  Audit History: {timelineEntityId}
                </h2>
                <span style={{ fontSize: 12, color: '#6B7280' }}>
                  Chronological immutable record of changes
                </span>
              </div>
              <button
                onClick={() => setTimelineEntityId(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={20} />
              </button>
            </div>

            {isTimelineLoading ? (
              <div style={{ padding: 20 }}>
                <div className="skeleton" style={{ height: 60, borderRadius: 8, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 60, borderRadius: 8 }} />
              </div>
            ) : timelineData?.timeline?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#9CA3AF' }}>
                No events recorded for this entity.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {timelineData?.timeline?.map((item, idx) => (
                  <div
                    key={item._id || idx}
                    style={{
                      background: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: 'var(--color-navy-900)' }}>
                        {item.action}
                      </span>
                      <span style={{ color: '#6B7280', fontSize: 11 }}>
                        {item.performedAt ? format(new Date(item.performedAt), 'dd MMM yyyy, HH:mm:ss') : ''}
                      </span>
                    </div>
                    <div style={{ color: '#4B5563', marginBottom: 4 }}>
                      Actor: <strong>{item.actorRole}</strong> {item.ipAddress ? `(IP: ${item.ipAddress})` : ''}
                    </div>
                    {item.details && Object.keys(item.details).length > 0 && (
                      <div style={{ background: 'white', padding: 6, borderRadius: 4, fontFamily: 'monospace', fontSize: 11, color: '#374151' }}>
                        {JSON.stringify(item.details)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

