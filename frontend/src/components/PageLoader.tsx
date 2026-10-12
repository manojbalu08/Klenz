import Logo from './Logo'
import styles from './PageLoader.module.css'

export default function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className={styles.loader} role="status">
      <Logo size={64} className={styles.mark} />
      <span>{label}</span>
    </div>
  )
}
