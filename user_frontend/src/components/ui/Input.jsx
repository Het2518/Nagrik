import { forwardRef } from 'react';
import styles from './Input.module.css';

const Input = forwardRef(function Input({
  label,
  hint,
  error,
  id,
  required,
  className = '',
  ...props
}, ref) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '_');

  return (
    <div className={`${styles.wrapper} ${className}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {required && <span className={styles.required} aria-hidden="true"> *</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`${styles.input} ${error ? styles.inputError : ''}`}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}_error` : hint ? `${inputId}_hint` : undefined}
        {...props}
      />
      {hint && !error && (
        <p id={`${inputId}_hint`} className={styles.hint}>{hint}</p>
      )}
      {error && (
        <p id={`${inputId}_error`} role="alert" className={styles.error}>{error}</p>
      )}
    </div>
  );
});

export default Input;
