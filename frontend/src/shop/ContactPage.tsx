import { useId, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router'
import { WhatsAppIcon } from '../components/icons'
import { api, ApiError } from '../lib/api'
import { packs } from '../lib/format'
import type { OrderCreated } from '../lib/types'
import { orderMessage, whatsappLink, whatsappNumber, type CustomerDetails } from '../lib/whatsapp'
import { useCart } from './CartContext'
import styles from './ContactPage.module.css'
import Headline from './Headline'
import { tintColor } from './ProductArt'
import { useSite } from './SiteDataContext'
import ui from './ui.module.css'

type FieldErrors = Partial<Record<keyof CustomerDetails, string>>

const API_FIELDS: Record<string, keyof CustomerDetails> = {
  customer_name: 'name',
  phone: 'phone',
  address: 'address',
  note: 'note',
}

interface PlacedOrder {
  order: OrderCreated
  /** Cart and details at the moment of saving; any change means a new order. */
  signature: string
  sentOnWhatsApp: boolean
}

function checkDetails(customer: CustomerDetails): FieldErrors {
  const errors: FieldErrors = {}
  if (!customer.name.trim()) errors.name = 'Please enter your name.'
  const digits = customer.phone.replace(/\D/g, '').length
  if (!customer.phone.trim()) errors.phone = 'Please enter your WhatsApp or phone number.'
  else if (/[^\d+()\-.\s]/.test(customer.phone) || digits < 6 || digits > 15)
    errors.phone = 'Please enter a valid phone number.'
  return errors
}

export default function ContactPage() {
  const { data, reload } = useSite()
  const { settings, content: c } = data
  const { items, count, customer, updateCustomer, clear } = useCart()
  const [placed, setPlaced] = useState<PlacedOrder | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const signature = JSON.stringify([items.map((i) => [i.product.id, i.quantity]), customer])
  const current = placed?.signature === signature ? placed : null

  function edit(field: keyof CustomerDetails) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      updateCustomer({ [field]: event.target.value })
      if (fieldErrors[field]) setFieldErrors((errors) => ({ ...errors, [field]: undefined }))
    }
  }

  function detailsAreValid(): boolean {
    const errors = checkDetails(customer)
    setFieldErrors(errors)
    const firstInvalid = (['name', 'phone'] as const).find((field) => errors[field])
    if (firstInvalid) document.getElementById(`contact-${firstInvalid}`)?.focus()
    return !firstInvalid
  }

  async function saveOrder(sentOnWhatsApp: boolean): Promise<OrderCreated | null> {
    if (current) {
      setPlaced({ ...current, sentOnWhatsApp: current.sentOnWhatsApp || sentOnWhatsApp })
      return current.order
    }
    setSaving(true)
    setError(null)
    try {
      const order = await api.createOrder({
        customer_name: customer.name,
        phone: customer.phone,
        address: customer.address,
        note: customer.note,
        items: items.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
      })
      setPlaced({ order, signature, sentOnWhatsApp })
      return order
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        await reload()
        setError('Some items are no longer available and were taken out of your cart. Please check your order.')
      } else if (err instanceof ApiError) {
        const errors: FieldErrors = {}
        for (const [name, message] of Object.entries(err.fields)) {
          if (API_FIELDS[name]) errors[API_FIELDS[name]] = message
        }
        setFieldErrors(errors)
        setError(err.message)
      } else {
        setError('Your order could not be saved. Please try again.')
      }
      return null
    } finally {
      setSaving(false)
    }
  }

  async function sendOnWhatsApp() {
    if (!detailsAreValid()) return
    // Open the tab during the click so pop-up blockers allow it, then point it at WhatsApp.
    const tab = window.open('', '_blank')
    const order = await saveOrder(true)
    if (!order) {
      tab?.close()
      return
    }
    const link = whatsappLink(whatsappNumber(settings.whatsapp_number, settings.country_code), orderMessage(order, customer))
    if (tab) {
      tab.opener = null
      tab.location.href = link
    } else {
      window.location.href = link
    }
  }

  async function saveRequest() {
    if (detailsAreValid()) await saveOrder(false)
  }

  function startNewOrder() {
    clear()
    setPlaced(null)
  }

  return (
    <>
      <title>Contact & checkout — Klenz</title>

      <section className={`${ui.pageHero} ${styles.hero}`}>
        <div
          className={ui.circle}
          style={{ right: -60, top: -90, width: 340, height: 340, background: 'var(--accent)', opacity: 0.55 }}
        />
        <div className={`${ui.heroInner} ${styles.heroInner}`}>
          <span className={ui.badge}>{c['contact.badge']}</span>
          <h1 className={`${ui.display} ${styles.title}`}>
            <Headline text={c['contact.headline']} />
          </h1>
          <p className={`${ui.lead} ${styles.lead}`}>{c['contact.intro']}</p>
        </div>
      </section>

      <section className={styles.main}>
        <div className={styles.columns}>
          <div className={styles.details}>
            <h2 className={`${ui.display} ${styles.cardTitle}`}>Your details</h2>
            <div className={styles.row}>
              <Field label="Your name" error={fieldErrors.name}>
                {(props) => (
                  <input
                    {...props}
                    id="contact-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Full name"
                    value={customer.name}
                    onChange={edit('name')}
                  />
                )}
              </Field>
              <Field label="WhatsApp / phone" error={fieldErrors.phone}>
                {(props) => (
                  <input
                    {...props}
                    id="contact-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="Phone number"
                    value={customer.phone}
                    onChange={edit('phone')}
                  />
                )}
              </Field>
            </div>
            <Field label="Delivery address" error={fieldErrors.address}>
              {(props) => (
                <textarea
                  {...props}
                  autoComplete="street-address"
                  placeholder="Street, area, city, PIN"
                  rows={3}
                  value={customer.address}
                  onChange={edit('address')}
                />
              )}
            </Field>
            <Field label="Note (optional)" error={fieldErrors.note}>
              {(props) => (
                <textarea
                  {...props}
                  className={`${props.className} ${styles.short}`}
                  placeholder="Preferred delivery time, bulk quantity, anything else…"
                  rows={2}
                  value={customer.note}
                  onChange={edit('note')}
                />
              )}
            </Field>
            <div className={styles.findUs}>
              <span className={`${ui.display} ${styles.findUsTitle}`}>Find us</span>
              <dl className={styles.findUsList}>
                <dt>Phone:</dt>
                <dd>{settings.phone || '[Phone number]'}</dd>
                <dt>Email:</dt>
                <dd>{settings.email || '[Email address]'}</dd>
                <dt>Factory:</dt>
                <dd>{settings.address || '[Street address, city, PIN]'}</dd>
                <dt>Hours:</dt>
                <dd>{settings.hours || '[Mon–Sat, 9:00 – 18:00]'}</dd>
              </dl>
            </div>
          </div>

          <div className={styles.order}>
            <h2 className={`${ui.display} ${styles.cardTitle}`}>Your order</h2>

            {items.length === 0 ? (
              <div className={styles.empty}>
                <span>Your cart is empty. Add some products first and they will appear here.</span>
                <Link to="/#shop" className={`${ui.button} ${ui.primary} ${styles.browse}`}>
                  Browse products
                </Link>
              </div>
            ) : (
              <div className={styles.summary}>
                <ul className={styles.lines}>
                  {items.map(({ product, quantity }) => (
                    <li key={product.id} className={styles.line}>
                      {product.image_url ? (
                        <img className={styles.swatch} src={product.image_url} alt="" />
                      ) : (
                        <div className={styles.swatch} style={{ background: tintColor(product.tint) }} />
                      )}
                      <div className={styles.lineText}>
                        <span className={styles.lineName}>{product.name}</span>
                        {product.spec && <span className={styles.lineMeta}>{product.spec}</span>}
                      </div>
                      <span className={styles.lineQty}>× {quantity}</span>
                    </li>
                  ))}
                </ul>
                <div className={styles.total}>
                  <span>In your order</span>
                  <span className={ui.display}>{packs(count)}</span>
                </div>
                <span className={styles.small}>We reply on WhatsApp with prices and delivery details.</span>

                {error && (
                  <div className={styles.error} role="alert">
                    {error}
                  </div>
                )}

                <button type="button" className={styles.whatsapp} onClick={sendOnWhatsApp} disabled={saving}>
                  <WhatsAppIcon />
                  {saving ? 'Saving your order…' : 'Send order on WhatsApp'}
                </button>
                <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={saveRequest} disabled={saving}>
                  Save order request
                </button>

                {current && (
                  <div className={styles.placed} role="status">
                    {current.sentOnWhatsApp ? (
                      <>
                        <span className={styles.placedTitle}>Order {current.order.reference} sent</span>
                        <span>We’ll reply on WhatsApp with the final price and delivery time.</span>
                      </>
                    ) : (
                      <>
                        <span className={styles.placedTitle}>Order request {current.order.reference} saved</span>
                        <span>Tap “Send order on WhatsApp” so we receive the details.</span>
                      </>
                    )}
                    <button type="button" className={styles.newOrder} onClick={startNewOrder}>
                      Start a new order
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

interface FieldProps {
  label: string
  error?: string
  children: (props: {
    className: string
    'aria-invalid': boolean
    'aria-describedby'?: string
    id?: string
  }) => React.ReactNode
}

/** A labelled input with its error message wired up for screen readers. */
function Field({ label, error, children }: FieldProps) {
  const id = useId()
  const control = children({
    className: styles.input,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? `${id}-error` : undefined,
    id,
  })
  // The control may set its own id (the name and phone fields do, for focusing).
  const controlId = (control as React.ReactElement<{ id?: string }>).props.id ?? id
  return (
    <div className={styles.field}>
      <label htmlFor={controlId} className={styles.label}>
        {label}
      </label>
      {control}
      {error && (
        <span id={`${id}-error`} className={styles.fieldError}>
          {error}
        </span>
      )}
    </div>
  )
}
