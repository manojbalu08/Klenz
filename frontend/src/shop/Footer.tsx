import { whatsappLink, whatsappNumber } from '../lib/whatsapp'
import styles from './Footer.module.css'
import { useSite } from './SiteDataContext'

const YEAR = new Date().getFullYear()

/** "+91 90873 12905, +91 73973 83403" -> one entry per number. */
function phoneNumbers(text: string): string[] {
  return text
    .split(/[,/;]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export default function Footer() {
  const { settings, content } = useSite().data
  const waNumber = whatsappNumber(settings.whatsapp_number, settings.country_code)

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <span className={styles.wordmark}>Klenz</span>
            <span className={styles.tagline}>{content['site.footer_tagline']}</span>
          </div>
          <div className={styles.reach}>
            <span className={styles.reachTitle}>Reach us</span>
            {settings.phone ? (
              phoneNumbers(settings.phone).map((number) => (
                <a key={number} href={`tel:${number.replace(/[^\d+]/g, '')}`}>
                  {number}
                </a>
              ))
            ) : (
              <span>[Phone number]</span>
            )}
            {waNumber ? (
              <a href={whatsappLink(waNumber, 'Hello Klenz!')} target="_blank" rel="noreferrer">
                WhatsApp: {settings.whatsapp_number}
              </a>
            ) : (
              <span>[WhatsApp number]</span>
            )}
            {settings.email ? <a href={`mailto:${settings.email}`}>{settings.email}</a> : <span>[Email address]</span>}
          </div>
        </div>
        <div className={styles.bottom}>© {YEAR} Klenz. All rights reserved.</div>
      </div>
    </footer>
  )
}
