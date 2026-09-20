import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, CheckCircle, Clock, Network } from 'lucide-react';
import { familyService } from '../../services/adminServices';
import { useAdminStore } from '../../store/adminStore';
import styles from './FamiliesPage.module.css';

export default function FamiliesPage() {
  const { user } = useAdminStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['families', search, statusFilter],
    queryFn:  () => familyService.search({ search: search || undefined, status: statusFilter || undefined }),
  });

  const { mutate: verify, isPending } = useMutation({
    mutationFn: (id) => familyService.verify(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['families'] }),
  });

  const { mutate: setStatus } = useMutation({
    mutationFn: ({ id, status }) => familyService.setStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['families'] }),
  });

  const families = data?.families || [];

  return (
    <div className={`${styles.page} animate-fade-in`}>
      <div className={styles.header}>
        <div>
          <h1>Family Registry</h1>
          <p>Search, verify, and manage registered families</p>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder="Search by Family ID, village, or district..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={styles.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="Provisional">Provisional</option>
          <option value="Permanent">Permanent</option>
        </select>
      </div>

      <div className={styles.tableWrap}>
        {isLoading ? (
          <div style={{ padding: 'var(--space-5)' }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 50, borderRadius: 8, marginBottom: 8 }} />)}</div>
        ) : families.length === 0 ? (
          <div className={styles.empty}><p>No families found</p></div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Family ID</th>
                <th>District</th>
                <th>Income</th>
                <th>Category</th>
                <th>Status</th>
                <th>Verified</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {families.map(f => (
                <tr key={f._id} className={styles.row}>
                  <td><Link to={`/families/${f._id}`} className={styles.familyLink}>{f.familyId}</Link></td>
                  <td>{f.address?.district || '—'}</td>
                  <td>₹{Number(f.annualIncome || 0).toLocaleString('en-IN')}</td>
                  <td><span className="badge badge-navy">{f.category}</span></td>
                  <td>
                    <span className={`badge ${f.status === 'Permanent' ? 'badge-success' : 'badge-warning'}`}>
                      {f.status}
                    </span>
                  </td>
                  <td>
                    {f.isVerified
                      ? <span className="badge badge-success"><CheckCircle size={11} /> Verified</span>
                      : <span className="badge badge-neutral"><Clock size={11} /> Pending</span>
                    }
                  </td>
                  <td className={styles.actions}>
                    <Link to={`/families/${f._id}/case-view`} className={styles.caseViewBtn}>
                      <Network size={12} /> 360° Case View
                    </Link>
                    {!f.isVerified && (
                      <button className={styles.verifyBtn} onClick={() => verify(f._id)} disabled={isPending}>
                        Verify
                      </button>
                    )}
                    {f.status === 'Provisional' && (
                      <button className={styles.promoteBtn} onClick={() => setStatus({ id: f._id, status: 'Permanent' })}>
                        → Permanent
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
