import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Shield, Globe, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import styles from './ProfilePage.module.css';

const changePassSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword:     z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuthStore();
  const [showPass, setShowPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: authService.getMe,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting }, setError } = useForm({
    resolver: zodResolver(changePassSchema),
  });

  const { mutateAsync: changePassword } = useMutation({
    mutationFn: authService.changePassword,
  });

  const onSubmit = async (data) => {
    try {
      await changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      setPassSuccess(true);
      reset();
      setTimeout(() => setPassSuccess(false), 4000);
    } catch (err) {
      setError('currentPassword', { message: err.response?.data?.error || 'Incorrect password' });
    }
  };

  const switchLang = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('nagrik_lang', lang);
  };

  const me = meData || {};

  return (
    <div className={`${styles.page} animate-fade-in`}>
      <h1 className={styles.pageTitle}>My Profile</h1>

      {/* ── Account Info ──────────────────────────────── */}
      <Card className={styles.accountCard}>
        <div className={styles.avatarSection}>
          <div className={styles.bigAvatar}>
            <User size={32} />
          </div>
          <div>
            <p className={styles.mobileNum}>{me.mobileNumber || user?.mobileNumber || '—'}</p>
            <p className={styles.roleLabel}>Citizen Account</p>
          </div>
        </div>
        <div className={styles.infoGrid}>
          <div><span>Role</span><strong>Citizen</strong></div>
          <div><span>Family ID</span><strong>{user?.familyId || 'Not registered'}</strong></div>
          <div><span>Account Status</span><strong>Active</strong></div>
        </div>
      </Card>

      {/* ── Language ─────────────────────────────────── */}
      <Card>
        <div className={styles.sectionHeader}>
          <Globe size={18} />
          <h2>Language</h2>
        </div>
        <div className={styles.langButtons}>
          {[
            { code: 'en', label: 'English' },
            { code: 'gu', label: 'ગુજરાતી' },
          ].map(({ code, label }) => (
            <button
              key={code}
              className={`${styles.langBtn} ${i18n.language === code ? styles.langBtnActive : ''}`}
              onClick={() => switchLang(code)}
              aria-pressed={i18n.language === code}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* ── Change Password ───────────────────────────── */}
      <Card>
        <div className={styles.sectionHeader}>
          <Shield size={18} />
          <h2>{t('auth.change_password')}</h2>
        </div>

        {passSuccess && (
          <div className={styles.successMsg} role="status">
            ✓ Password changed successfully
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
          <div className={styles.passWrapper}>
            <Input
              label={t('auth.current_password')}
              type={showPass ? 'text' : 'password'}
              required
              error={errors.currentPassword?.message}
              {...register('currentPassword')}
            />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(s => !s)} aria-label="Toggle visibility">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <Input
            label={t('auth.new_password')}
            type={showPass ? 'text' : 'password'}
            required
            hint="Minimum 8 characters"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <Input
            label={t('auth.confirm_password')}
            type={showPass ? 'text' : 'password'}
            required
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <div className={styles.formAction}>
            <Button type="submit" size="md" variant="primary" loading={isSubmitting}>
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      {/* ── Danger Zone ──────────────────────────────── */}
      <Card className={styles.dangerCard}>
        <h2 className={styles.dangerTitle}>Sign Out</h2>
        <p className={styles.dangerText}>You will be signed out and returned to the login page.</p>
        <Button variant="danger" size="md" onClick={logout}>Sign Out</Button>
      </Card>
    </div>
  );
}
