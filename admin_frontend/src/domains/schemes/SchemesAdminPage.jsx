import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BookOpen, Plus, Power, Search, Edit2, X } from 'lucide-react';
import { schemeService } from '../../services/adminServices';
import { useAdminStore } from '../../store/adminStore';
import styles from './SchemesAdminPage.module.css';

const schemeSchema = z.object({
  schemeName:       z.string().min(3, 'Name is required'),
  category:         z.enum(['Housing','Education','Health','Pension','Agriculture','Employment','Disability','Women','Other']),
  description:      z.string().min(10, 'Description is required'),
  maxBenefitAmount: z.coerce.number().min(0),
});

const CATEGORIES = ['Housing','Education','Health','Pension','Agriculture','Employment','Disability','Women','Other'];

function SchemeModal({ scheme, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!scheme;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schemeSchema),
    defaultValues: isEdit ? {
      schemeName:       scheme.schemeName,
      category:         scheme.category,
      description:      scheme.description,
      maxBenefitAmount: scheme.maxBenefitAmount,
    } : {},
  });

  const { mutateAsync: create } = useMutation({
    mutationFn: schemeService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schemes-admin'] }); onClose(); },
  });
  const { mutateAsync: update } = useMutation({
    mutationFn: (d) => schemeService.update(scheme.schemeCode, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schemes-admin'] }); onClose(); },
  });

  const onSubmit = async (data) => {
    if (isEdit) await update(data);
    else await create(data);
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit Scheme' : 'Create Scheme'}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>{isEdit ? 'Edit Scheme' : 'Create New Scheme'}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.field}>
            <label>Scheme Name *</label>
            <input className={`${styles.input} ${errors.schemeName ? styles.inputErr : ''}`} placeholder="e.g. PM Awas Yojana" {...register('schemeName')} />
            {errors.schemeName && <p className={styles.err}>{errors.schemeName.message}</p>}
          </div>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label>Category *</label>
              <select className={styles.select} {...register('category')}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Max Benefit (₹)</label>
              <input type="number" min="0" className={styles.input} {...register('maxBenefitAmount')} />
            </div>
          </div>
          <div className={styles.field}>
            <label>Description *</label>
            <textarea className={`${styles.textarea} ${errors.description ? styles.inputErr : ''}`} rows={4} placeholder="Describe the scheme benefits and purpose..." {...register('description')} />
            {errors.description && <p className={styles.err}>{errors.description.message}</p>}
          </div>
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Scheme'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SchemesAdminPage() {
  const { user } = useAdminStore();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'Admin';
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [modalScheme, setModalScheme] = useState(null);  // null = closed, {} = create, {...} = edit
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['schemes-admin', search, catFilter],
    queryFn: () => schemeService.list({ search: search || undefined, category: catFilter || undefined }),
  });

  const { mutate: deactivate } = useMutation({
    mutationFn: (code) => schemeService.deactivate(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schemes-admin'] }),
  });

  const schemes = data?.schemes || [];

  return (
    <div className={`${styles.page} animate-fade-in`}>
      <div className={styles.header}>
        <div>
          <h1>Scheme Management</h1>
          <p>Create and manage government welfare scheme definitions</p>
        </div>
        {isAdmin && (
          <button className={styles.createBtn} onClick={() => { setModalScheme({}); setShowModal(true); }}>
            <Plus size={16} /> New Scheme
          </button>
        )}
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder="Search schemes..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={styles.select} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Stats strip */}
      <div className={styles.statsStrip}>
        <div className={styles.stat}><span>Total Schemes</span><strong>{schemes.length}</strong></div>
        <div className={styles.stat}><span>Active</span><strong>{schemes.filter(s => s.isActive !== false).length}</strong></div>
        <div className={styles.stat}><span>Categories</span><strong>{new Set(schemes.map(s => s.category)).size}</strong></div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className={styles.grid}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="skeleton" style={{ height: 180, borderRadius: 16 }} />
          ))}
        </div>
      ) : schemes.length === 0 ? (
        <div className={styles.empty}>
          <BookOpen size={40} />
          <p>No schemes found</p>
          {isAdmin && <button className={styles.createBtn} onClick={() => { setModalScheme({}); setShowModal(true); }}>Create First Scheme</button>}
        </div>
      ) : (
        <div className={styles.grid}>
          {schemes.map(scheme => (
            <div key={scheme._id} className={`${styles.schemeCard} ${scheme.isActive === false ? styles.inactive : ''}`}>
              <div className={styles.cardTop}>
                <span className={styles.category}>{scheme.category}</span>
                <span className={`badge ${scheme.isActive !== false ? 'badge-success' : 'badge-neutral'}`}>
                  {scheme.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              <h2 className={styles.schemeName}>{scheme.schemeName}</h2>
              <p className={styles.schemeDesc}>{scheme.description?.slice(0, 90)}...</p>
              {scheme.maxBenefitAmount > 0 && (
                <p className={styles.benefit}>₹{scheme.maxBenefitAmount.toLocaleString('en-IN')}</p>
              )}
              <div className={styles.cardMeta}>
                <span className={styles.docsCount}>{scheme.requiredDocuments?.length || 0} docs required</span>
                <span className={styles.code}>{scheme.schemeCode}</span>
              </div>
              {isAdmin && (
                <div className={styles.cardActions}>
                  <button className={styles.editBtn} onClick={() => { setModalScheme(scheme); setShowModal(true); }}>
                    <Edit2 size={13} /> Edit
                  </button>
                  <button
                    className={`${styles.toggleBtn} ${scheme.isActive === false ? styles.activateBtn : styles.deactivateBtn}`}
                    onClick={() => { if (window.confirm(`${scheme.isActive !== false ? 'Deactivate' : 'Reactivate'} this scheme?`)) deactivate(scheme.schemeCode); }}
                  >
                    <Power size={13} /> {scheme.isActive !== false ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <SchemeModal scheme={Object.keys(modalScheme).length > 0 ? modalScheme : null} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
