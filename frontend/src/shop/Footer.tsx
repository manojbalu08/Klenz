import { Link } from 'react-router'
import { MailIcon, PhoneIcon, WhatsAppIcon } from '../components/icons'
import Logo from '../components/Logo'
import { phoneNumbers } from '../lib/format'
import { whatsappLink, whatsappNumber } from '../lib/whatsapp'
import styles from './Footer.module.css'
import { useSite } from './SiteDataContext'

const YEAR = new Date().getFullYear()

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/#shop', label: 'Products' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact Us' },
]

export default function Footer() {
  const { settings, content } = useSite().data
  const waNumber = whatsappNumber(settings.whatsapp_number, settings.country_code)

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.main}>
          <div className={styles.brand}>
            <Link to="/" className={styles.brandLink} aria-label="Klenz home">
              <Logo size={44} />
              <span className={styles.wordmark}>Klenz</span>
            </Link>
            <p className={styles.tagline}>{content['site.footer_tagline']}</p>
          </div>

          <nav className={styles.links} aria-label="Footer">
            {LINKS.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className={styles.contact}>
            {phoneNumbers(settings.phone).map((number) => (
              <a key={number} className={styles.chip} href={`tel:${number.replace(/[^\d+]/g, '')}`}>
                <PhoneIcon size={16} />
                {number}
              </a>
            ))}
            {waNumber && (
              <a
                className={`${styles.chip} ${styles.whatsapp}`}
                href={whatsappLink(waNumber, 'Hello Klenz!')}
                target="_blank"
                rel="noreferrer"
              >
                <WhatsAppIcon size={16} />
                WhatsApp
              </a>
            )}
            {settings.email && (
              <a className={styles.chip} href={`mailto:${settings.email}`}>
                <MailIcon size={16} />
                {settings.email}
              </a>
            )}
          </div>
        </div>

        <div className={styles.bottom}>
          <span>
            © {YEAR} Klenz{settings.address ? ` · ${settings.address}` : ''}. All rights reserved.
          </span>
          <button type="button" className={styles.toTop} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Back to top ↑
          </button>
        </div>
      </div>
    </footer>
  )
}
