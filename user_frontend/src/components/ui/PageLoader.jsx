import styles from './PageLoader.module.css';

export default function PageLoader() {
  return (
    <div className={styles.wrapper} role="status" aria-label="Loading">
      <div className={styles.logoMark}>
        <span>N</span>
      </div>
      <div className={styles.dots}>
        <span /><span /><span />
      </div>
    </div>
  );
}
