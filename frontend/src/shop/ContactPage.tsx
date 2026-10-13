import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ClockIcon, MailIcon, PhoneIcon, PinIcon, WhatsAppIcon } from '../components/icons'
import { Reveal } from '../components/motion'
import ThemeBackdrop from '../components/ThemeBackdrop'
import { packs, phoneNumbers } from '../lib/format'
import { whatsappLink, whatsappNumber } from '../lib/whatsapp'
import { useCart } from './CartContext'
import styles from './ContactPage.module.css'
import Headline from './Headline'
import { useSite } from './SiteDataContext'
import ui from './ui.module.css'

/** Contact details. Ordering happens in the cart popup. */
export default function ContactPage() {
  const { settings, content: c } = useSite().data
  const { count, openCart } = useCart()
  const waNumber = whatsappNumber(settings.whatsapp_number, settings.country_code)
  const phones = phoneNumbers(settings.phone)
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Klenz ${settings.address}`)}`

  return (
    <>
      <title>Contact us — Klenz</title>

      <section className={`${ui.pageHero} ${ui.themed} ${styles.hero}`}>
        <ThemeBackdrop tone="hero" />
        <div className={`${ui.heroInner} ${styles.heroInner}`}>
          <span className={ui.badge}>{c['contact.badge']}</span>
          <h1 className={`${ui.display} ${styles.title}`}>
            <Headline text={c['contact.headline']} />
          </h1>
          <p className={`${ui.lead} ${styles.lead}`}>{c['contact.intro']}</p>
        </div>
      </section>

      <section className={`${ui.themed} ${styles.main}`}>
        <ThemeBackdrop layout={2} />
        <div className={styles.mainInner}>
          <ul className={styles.cards}>
            {phones.length > 0 && (
              <ContactCard index={0} icon={<PhoneIcon size={26} />} title="Call us">
                {phones.map((number) => (
                  <a key={number} className={styles.value} href={`tel:${number.replace(/[^\d+]/g, '')}`}>
                    {number}
                  </a>
                ))}
              </ContactCard>
            )}
            {waNumber && (
              <ContactCard index={1} icon={<WhatsAppIcon size={26} />} title="WhatsApp" tone="whatsapp">
                <span className={styles.text}>Orders, prices and delivery, the fastest way to reach us.</span>
                <a
                  className={styles.whatsapp}
                  href={whatsappLink(waNumber, 'Hello Klenz!')}
                  target="_blank"
                  rel="noreferrer"
                >
                  <WhatsAppIcon size={20} />
                  Chat on WhatsApp
                </a>
              </ContactCard>
            )}
            {settings.email && (
              <ContactCard index={2} icon={<MailIcon size={26} />} title="Email">
                <a className={styles.value} href={`mailto:${settings.email}`}>
                  {settings.email}
                </a>
              </ContactCard>
            )}
            {settings.address && (
              <ContactCard index={3} icon={<PinIcon size={26} />} title="Find us">
                <span className={styles.value}>{settings.address}</span>
                <a
                  className={styles.link}
                  href={mapsLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Google Maps →
                </a>
              </ContactCard>
            )}
            {settings.hours && (
              <ContactCard index={4} icon={<ClockIcon size={26} />} title="Opening hours">
                <span className={styles.value}>{settings.hours}</span>
              </ContactCard>
            )}
          </ul>

          <Reveal className={styles.order}>
            <div className={styles.orderText}>
              <h2 className={`${ui.display} ${styles.orderTitle}`}>Ready to order?</h2>
              <p>Add products to your cart, then pay now with the UPI QR or pay later.</p>
            </div>
            <div className={styles.orderActions}>
              <Link to="/#shop" className={`${ui.button} ${ui.accent} ${ui.large}`}>
                Browse products
              </Link>
              {count > 0 && (
                <button type="button" className={`${ui.button} ${ui.outline} ${ui.large}`} onClick={openCart}>
                  Open cart ({packs(count)})
                </button>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}

interface ContactCardProps {
  index: number
  icon: ReactNode
  title: string
  tone?: 'whatsapp'
  children: ReactNode
}

function ContactCard({ index, icon, title, tone, children }: ContactCardProps) {
  return (
    <li>
      <Reveal delay={index * 90} className={styles.card}>
        <span className={styles.icon} data-tone={tone}>
          {icon}
        </span>
        <h2 className={styles.cardTitle}>{title}</h2>
        {children}
      </Reveal>
    </li>
  )
}
