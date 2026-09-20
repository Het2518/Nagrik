import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { authService } from '../../services/adminServices';
import { useAdminStore } from '../../store/adminStore';
import styles from './AdminLoginPage.module.css';

const schema = z.object({
  employeeId: z.string().min(3, 'Employee ID is required'),
  password:   z.string().min(6, 'Password is required'),
});

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const login = useAdminStore((s) => s.login);
  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState('');
  const [role, setRole] = useState('officer'); // 'talati' | 'officer'

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    try {
      setServerError('');
      // Talati uses a different endpoint
      const fn = role === 'talati' ? authService.loginTalati : authService.loginOfficer;
      const result = await fn(data);
      login(result.token);
      navigate('/dashboard');
    } catch (err) {
      setServerError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoArea}>
          <div className={styles.logoMark}><span>N</span></div>
          <div>
            <h1 className={styles.title}>Nagrik Officer Portal</h1>
            <p className={styles.subtitle}>Government of Gujarat — Secure Sign In</p>
          </div>
        </div>

        {/* Role Switcher */}
        <div className={styles.roleTabs} role="group" aria-label="Officer role">
          {['officer', 'talati'].map((r) => (
            <button
              key={r}
              type="button"
              className={`${styles.roleTab} ${role === r ? styles.roleTabActive : ''}`}
              onClick={() => setRole(r)}
              aria-pressed={role === r}
            >
              {r === 'talati' ? 'Talati' : 'Mamlatdar / DO / Admin'}
            </button>
          ))}
        </div>

        {serverError && (
          <div className={styles.errorBanner} role="alert">{serverError}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="employeeId">Employee ID</label>
            <input id="employeeId" className={`${styles.input} ${errors.employeeId ? styles.inputError : ''}`} placeholder="e.g. TAL-2024-001" {...register('employeeId')} />
            {errors.employeeId && <p className={styles.fieldError}>{errors.employeeId.message}</p>}
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <div className={styles.passWrap}>
              <input id="password" type={showPass ? 'text' : 'password'} className={`${styles.input} ${errors.password ? styles.inputError : ''}`} {...register('password')} />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(s => !s)} aria-label="Toggle password">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className={styles.fieldError}>{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
            {isSubmitting ? (
              <><span className={styles.spinner} /> Signing in...</>
            ) : (
              <><Shield size={16} /> Sign In Securely</>
            )}
          </button>
        </form>

        <p className={styles.disclaimer}>
          Authorised government personnel only. Unauthorised access is a criminal offence.
        </p>
      </div>
    </div>
  );
}
