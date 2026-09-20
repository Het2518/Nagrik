import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import styles from './AuthPage.module.css';

const registerSchema = z.object({
  mobileNumber: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async ({ mobileNumber, password }) => {
    try {
      setServerError('');
      const result = await authService.register({ mobileNumber, password });
      login(result.token);
      navigate('/onboarding');
    } catch (err) {
      setServerError(err.response?.data?.error || t('errors.server'));
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.logoArea}>
        <Link to="/" className={styles.logoLink}>
          <div className={styles.logoMark}><span>N</span></div>
          <span className={styles.logoName}>Nagrik</span>
        </Link>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <h1 className={styles.title}>{t('auth.register_title')}</h1>
          <p className={styles.subtitle}>{t('auth.register_subtitle')}</p>
        </div>

        {serverError && (
          <div className={styles.errorBanner} role="alert">{serverError}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
          <Input
            label={t('auth.mobile')}
            type="tel"
            placeholder={t('auth.mobile_placeholder')}
            required
            inputMode="numeric"
            maxLength={10}
            error={errors.mobileNumber?.message}
            {...register('mobileNumber')}
          />
          <div className={styles.passwordWrapper}>
            <Input
              label={t('auth.password')}
              type={showPass ? 'text' : 'password'}
              placeholder={t('auth.password_placeholder')}
              required
              error={errors.password?.message}
              {...register('password')}
            />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(!showPass)} aria-label="Toggle password">
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <Input
            label={t('auth.confirm_password')}
            type={showPass ? 'text' : 'password'}
            required
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
            {t('auth.register')}
          </Button>
        </form>

        <p className={styles.switchText}>
          {t('auth.have_account')}{' '}
          <Link to="/login">{t('auth.login')}</Link>
        </p>
      </div>
    </div>
  );
}
