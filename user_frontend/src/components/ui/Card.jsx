import styles from './Card.module.css';

export default function Card({ children, className = '', hover = false, padding = 'md', ...props }) {
  return (
    <div
      className={[
        styles.card,
        hover ? styles.hover : '',
        styles[`pad_${padding}`],
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return <div className={`${styles.header} ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }) {
  return <div className={`${styles.body} ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return <div className={`${styles.footer} ${className}`}>{children}</div>;
}
