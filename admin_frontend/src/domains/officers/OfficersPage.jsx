import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Shield, Eye, EyeOff, X, CheckCircle } from 'lucide-react';
import { authService } from '../../services/adminServices';
import { useAdminStore } from '../../store/adminStore';
import styles from './OfficersPage.module.css';

const officerSchema = z.object({
  name:        z.string().min(2, 'Name is required'),
  employeeId:  z.string().min(3, 'Employee ID is required'),
  role:        z.enum(['Talati','Mamlatdar','DistrictOfficer','Admin']),
  district:    z.string().min(2, 'District is required'),
  taluka:      z.string().optional(),
  password:    z.string().min(8, 'Minimum 8 characters'),
  confirmPass: z.string(),
}).refine(d => d.password === d.confirmPass, { message: 'Passwords do not match', path: ['confirmPass'] });

const ROLES = [
  { key: 'Talati',         label: 'Talati',           color: '#7C3AED', desc: 'Village-level first review' },
  { key: 'Mamlatdar',      label: 'Mamlatdar',        color: '#0E7490', desc: 'Taluka-level second review' },
  { key: 'DistrictOfficer',label: 'District Officer', color: '#B45309', desc: 'District-level final approval' },
  { key: 'Admin',          label: 'System Admin',     color: '#0B1E3E', desc: 'Full system access' },
];

function CreateOfficerModal({ onClose, onSuccess }) {
  const [showPass, setShowPass] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm({
    resolver: zodResolver(officerSchema),
    defaultValues: { role: 'Talati' },
  });

  const { mutateAsync: registerOfficer } = useMutation({
    mutationFn: authService.registerOfficer,
    onSuccess: () => { onSuccess(); onClose(); },
  });

  const onSubmit = async ({ confirmPass, ...data }) => {
    await registerOfficer(data);
  };

  const selectedRole = watch('role');

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Register Officer">
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Register New Officer</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label>Full Name *</label>
              <input className={`${styles.input} ${errors.name ? styles.inputErr : ''}`} placeholder="Officer full name" {...register('name')} />
              {errors.name && <p className={styles.err}>{errors.name.message}</p>}
            </div>
            <div className={styles.field}>
              <label>Employee ID *</label>
              <input className={`${styles.input} ${errors.employeeId ? styles.inputErr : ''}`} placeholder="e.g. TAL-2024-001" {...register('employeeId')} />
              {errors.employeeId && <p className={styles.err}>{errors.employeeId.message}</p>}
            </div>
          </div>

          <div className={styles.field}>
            <label>Role *</label>
            <div className={styles.roleGrid}>
              {ROLES.map(r => (
                <label
                  key={r.key}
                  className={`${styles.roleCard} ${selectedRole === r.key ? styles.roleCardActive : ''}`}
                  style={selectedRole === r.key ? { borderColor: r.color, background: `${r.color}08` } : {}}
                >
                  <input type="radio" value={r.key} className={styles.radioHidden} {...register('role')} />
                  <div className={styles.roleIcon} style={{ background: r.color }}>
                    <Shield size={14} color="white" />
                  </div>
                  <div>
                    <p className={styles.roleLabel}>{r.label}</p>
                    <p className={styles.roleDesc}>{r.desc}</p>
                  </div>
                  {selectedRole === r.key && <CheckCircle size={16} color={r.color} className={styles.roleCheck} />}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label>District *</label>
              <input className={`${styles.input} ${errors.district ? styles.inputErr : ''}`} placeholder="e.g. Surat" {...register('district')} />
              {errors.district && <p className={styles.err}>{errors.district.message}</p>}
            </div>
            <div className={styles.field}>
              <label>Taluka <span className={styles.optional}>(optional)</span></label>
              <input className={styles.input} placeholder="e.g. Olpad" {...register('taluka')} />
            </div>
          </div>

          <div className={styles.passRow}>
            <div className={styles.field}>
              <label>Password *</label>
              <div className={styles.passWrap}>
                <input type={showPass ? 'text' : 'password'} className={`${styles.input} ${errors.password ? styles.inputErr : ''}`} placeholder="Min 8 characters" {...register('password')} />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(s => !s)}>{showPass ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              </div>
              {errors.password && <p className={styles.err}>{errors.password.message}</p>}
            </div>
            <div className={styles.field}>
              <label>Confirm Password *</label>
              <input type={showPass ? 'text' : 'password'} className={`${styles.input} ${errors.confirmPass ? styles.inputErr : ''}`} {...register('confirmPass')} />
              {errors.confirmPass && <p className={styles.err}>{errors.confirmPass.message}</p>}
            </div>
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
              {isSubmitting ? 'Registering...' : 'Register Officer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OfficersPage() {
  const { user } = useAdminStore();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  return (
    <div className={`${styles.page} animate-fade-in`}>
      <div className={styles.header}>
        <div>
          <h1>Officer Management</h1>
          <p>Register and manage government officers across all levels</p>
        </div>
        {user?.role === 'Admin' && (
          <button className={styles.createBtn} onClick={() => setShowModal(true)}>
            <UserPlus size={16} /> Register Officer
          </button>
        )}
      </div>

      {successMsg && (
        <div className={styles.successBanner} role="status">
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}

      {/* Pipeline Overview */}
      <div className={styles.pipelineCard}>
        <h2 className={styles.pipelineTitle}>Approval Pipeline Structure</h2>
        <div className={styles.pipeline}>
          {ROLES.slice(0,3).map((r, i) => (
            <div key={r.key} className={styles.pipelineStep}>
              <div className={styles.pipelineIcon} style={{ background: r.color }}>
                <Shield size={20} color="white" />
              </div>
              <div>
                <p className={styles.pipelineRole}>{r.label}</p>
                <p className={styles.pipelineDesc}>Level {i + 1} — {r.desc}</p>
              </div>
              {i < 2 && <div className={styles.pipelineArrow}>→</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Role Cards */}
      <div className={styles.rolesGrid}>
        {ROLES.map(r => (
          <div key={r.key} className={styles.roleCard} style={{ borderTopColor: r.color }}>
            <div className={styles.roleIcon} style={{ background: r.color }}>
              <Shield size={22} color="white" />
            </div>
            <h3 className={styles.roleName}>{r.label}</h3>
            <p className={styles.roleDesc}>{r.desc}</p>
            <div className={styles.roleKey}>
              <span>Role Key:</span> <code>{r.key}</code>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.infoCard}>
        <h2>Registration Instructions</h2>
        <ol className={styles.instructions}>
          <li>Only <strong>System Admin</strong> can register new officers.</li>
          <li>Assign the correct <strong>Role</strong> — it determines which pipeline level the officer operates at.</li>
          <li>Set <strong>District</strong> to match the officer's jurisdiction. Taluka is required for Talati officers.</li>
          <li>Officers log in with their <strong>Employee ID</strong> and password at <code>localhost:5174/login</code>.</li>
          <li>Passwords must be at least 8 characters. Officers should change their password after first login.</li>
        </ol>
      </div>

      {showModal && (
        <CreateOfficerModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setSuccessMsg('Officer registered successfully.');
            setTimeout(() => setSuccessMsg(''), 5000);
          }}
        />
      )}
    </div>
  );
}
