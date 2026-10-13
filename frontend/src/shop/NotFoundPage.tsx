import { Link } from 'react-router'
import ThemeBackdrop from '../components/ThemeBackdrop'
import ui from './ui.module.css'

export default function NotFoundPage() {
  return (
    <section className={`${ui.pageHero} ${ui.themed} ${ui.section}`}>
      <title>Page not found — Klenz</title>
      <ThemeBackdrop tone="hero" />
      <div className={ui.heroInner} style={{ gap: 20 }}>
        <span className={ui.badge}>404</span>
        <h1 className={ui.title}>We couldn’t find that page</h1>
        <p className={ui.lead}>The link may be old or mistyped. Our products are just a click away.</p>
        <Link to="/" className={`${ui.button} ${ui.primary} ${ui.large}`} style={{ alignSelf: 'flex-start' }}>
          Back to the shop
        </Link>
      </div>
    </section>
  )
}
