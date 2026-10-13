import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactElement, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Dialog from '../components/Dialog'
import { CheckIcon, QrIcon, WalletIcon, WhatsAppIcon } from '../components/icons'
import QrCode from '../components/QrCode'
import { api, ApiError } from '../lib/api'
import { orderTotal, packs, rupees } from '../lib/format'
import type { OrderCreated, PaymentMethod } from '../lib/types'
import { SAMPLE_QR_TEXT, upiLink, upiReady } from '../lib/upi'
import { orderMessage, whatsappLink, whatsappNumber, type CustomerDetails } from '../lib/whatsapp'
import { useCart } from './CartContext'
import styles from './CartDialog.module.css'
import { tintColor } from './ProductArt'
import { useSite } from './SiteDataContext'
import ui from './ui.module.css'

type Step = 'cart' | 'details' | 'payment' | 'done'
type FormField = keyof CustomerDetails | 'payment_ref'
type FieldErrors = Partial<Record<FormField, string>>

const STEPS = [
  { id: 'cart', label: 'Cart' },
  { id: 'details', label: 'Details' },
  { id: 'payment', label: 'Payment' },
] as const
const TITLES: Record<Step, string> = { cart: 'Your cart', details: 'Your details', payment: 'Payment', done: 'Order placed' }
const API_FIELDS: Record<string, FormField> = {
  customer_name: 'name',
  phone: 'phone',
  address: 'address',
  note: 'note',
  payment_ref: 'payment_ref',
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

/** Phones and tablets, where a upi:// link opens the payment apps. */
function useTouchScreen(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia('(pointer: coarse)')
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
    () => window.matchMedia('(pointer: coarse)').matches,
  )
}

interface Placed {
  order: OrderCreated
  customer: CustomerDetails
}

/** The cart popup and the whole checkout: cart → details → payment (UPI QR or later) → placed. */
export default function CartDialog() {
  const { data, reload } = useSite()
  const { settings } = data
  const { items, count, total, pricePending, isOpen, closeCart, setQuantity, customer, updateCustomer, clear } =
    useCart()
  const navigate = useNavigate()
  const touchScreen = useTouchScreen()
  const [step, setStep] = useState<Step>('cart')
  const [chosenMethod, setChosenMethod] = useState<PaymentMethod | null>(null)
  const [paymentRef, setPaymentRef] = useState('')
  const [placed, setPlaced] = useState<Placed | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const titleRef = useRef<HTMLHeadingElement>(null)

  // An emptied cart always shows the cart step; a placed order shows until the popup closes.
  const current: Step = step !== 'done' && items.length === 0 ? 'cart' : step
  const canPayNow = total > 0
  const method: PaymentMethod = canPayNow ? (chosenMethod ?? 'now') : 'later'
  const qrReady = upiReady(settings)
  const upiNote = `Klenz order ${customer.name}`.trim()

  // Screen readers hear the new step's title; keyboard users continue from the top.
  useEffect(() => {
    if (isOpen) titleRef.current?.focus()
  }, [current, isOpen])

  function close() {
    closeCart()
    if (step === 'done') {
      setStep('cart')
      setPlaced(null)
      setPaymentRef('')
      setChosenMethod(null)
    }
  }

  function go(next: Step) {
    setError(null)
    setStep(next)
  }

  function shop() {
    close()
    void navigate('/#shop')
  }

  function edit(field: keyof CustomerDetails, value: string) {
    updateCustomer({ [field]: value })
    if (fieldErrors[field]) setFieldErrors((errors) => ({ ...errors, [field]: undefined }))
  }

  function continueToPayment() {
    const errors = checkDetails(customer)
    setFieldErrors(errors)
    const firstInvalid = (['name', 'phone'] as const).find((field) => errors[field])
    if (firstInvalid) document.getElementById(`checkout-${firstInvalid}`)?.focus()
    else go('payment')
  }

  async function placeOrder() {
    setSaving(true)
    setError(null)
    try {
      const order = await api.createOrder({
        customer_name: customer.name,
        phone: customer.phone,
        address: customer.address,
        note: customer.note,
        items: items.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
        payment_method: method,
        payment_ref: method === 'now' ? paymentRef.trim() : '',
      })
      setPlaced({ order, customer: { ...customer } })
      clear()
      setStep('done')
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        await reload()
        setStep('cart')
        setError('Some items are no longer available and were taken out of your cart. Please check your order.')
      } else if (err instanceof ApiError) {
        const errors: FieldErrors = {}
        for (const [name, message] of Object.entries(err.fields)) {
          if (API_FIELDS[name]) errors[API_FIELDS[name]] = message
        }
        setFieldErrors(errors)
        setError(err.message)
        if (errors.name || errors.phone || errors.address || errors.note) setStep('details')
      } else {
        setError('Your order could not be placed. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  const alert = error && (
    <div className={styles.error} role="alert">
      {error}
    </div>
  )

  return (
    <Dialog open={isOpen} onClose={close} label="Cart and checkout" className={styles.dialog}>
      <div className={styles.panel}>
        <header className={styles.head}>
          <div className={styles.headText}>
            <h2 ref={titleRef} tabIndex={-1} className={`${ui.display} ${styles.title}`}>
              {TITLES[current]}
            </h2>
            {current !== 'done' && items.length > 0 && <Steps current={current} />}
          </div>
          <button type="button" className={styles.close} onClick={close} aria-label="Close">
            ×
          </button>
        </header>

        {current === 'cart' && (
          <>
            <div className={styles.content}>
              {alert}
              {items.length === 0 ? (
                <div className={styles.empty}>
                  <span className={styles.emptyTitle}>Your cart is empty</span>
                  <span className={styles.muted}>Add some tissue to get started.</span>
                  <button type="button" className={`${ui.button} ${ui.primary}`} onClick={shop}>
                    Shop products
                  </button>
                </div>
              ) : (
                <ul className={styles.lines}>
                  {items.map(({ product, quantity }) => (
                    <li key={product.id} className={styles.line}>
                      {product.image_url ? (
                        <img className={styles.thumb} src={product.image_url} alt="" />
                      ) : (
                        <span className={styles.thumb} style={{ background: tintColor(product.tint) }} />
                      )}
                      <div className={styles.lineInfo}>
                        <span className={styles.lineName}>{product.name}</span>
                        <span className={styles.muted}>
                          {[product.spec, product.price > 0 ? `${rupees(product.price)} / pack` : 'Price on request']
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                        <div className={styles.lineControls}>
                          <div className={`${ui.stepper} ${styles.stepper}`}>
                            <button
                              type="button"
                              className={ui.stepButton}
                              aria-label={`Decrease quantity of ${product.name}`}
                              onClick={() => setQuantity(product.id, quantity - 1)}
                            >
                              −
                            </button>
                            <span className={ui.stepCount}>{quantity}</span>
                            <button
                              type="button"
                              className={ui.stepButton}
                              aria-label={`Increase quantity of ${product.name}`}
                              onClick={() => setQuantity(product.id, quantity + 1)}
                            >
                              +
                            </button>
                          </div>
                          <button type="button" className={styles.remove} onClick={() => setQuantity(product.id, 0)}>
                            Remove
                          </button>
                        </div>
                      </div>
                      <span className={styles.lineTotal}>
                        {product.price > 0 ? rupees(product.price * quantity) : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {items.length > 0 && (
              <footer className={styles.foot}>
                <Total count={count} total={total} pending={pricePending} />
                <div className={styles.actions}>
                  <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={close}>
                    Continue shopping
                  </button>
                  <button type="button" className={`${ui.button} ${ui.primary}`} onClick={() => go('details')}>
                    Place order
                  </button>
                </div>
              </footer>
            )}
          </>
        )}

        {current === 'details' && (
          <>
            <div className={styles.content}>
              {alert}
              <div className={styles.row}>
                <Field label="Your name" error={fieldErrors.name}>
                  {(props) => (
                    <input
                      {...props}
                      id="checkout-name"
                      type="text"
                      autoComplete="name"
                      placeholder="Full name"
                      value={customer.name}
                      onChange={(event) => edit('name', event.target.value)}
                    />
                  )}
                </Field>
                <Field label="WhatsApp / phone" error={fieldErrors.phone}>
                  {(props) => (
                    <input
                      {...props}
                      id="checkout-phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="Phone number"
                      value={customer.phone}
                      onChange={(event) => edit('phone', event.target.value)}
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
                    onChange={(event) => edit('address', event.target.value)}
                  />
                )}
              </Field>
              <Field label="Note (optional)" error={fieldErrors.note}>
                {(props) => (
                  <textarea
                    {...props}
                    placeholder="Preferred delivery time, anything else…"
                    rows={2}
                    value={customer.note}
                    onChange={(event) => edit('note', event.target.value)}
                  />
                )}
              </Field>
            </div>
            <footer className={styles.foot}>
              <Total count={count} total={total} pending={pricePending} />
              <div className={styles.actions}>
                <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => go('cart')}>
                  Back
                </button>
                <button type="button" className={`${ui.button} ${ui.primary}`} onClick={continueToPayment}>
                  Continue to payment
                </button>
              </div>
            </footer>
          </>
        )}

        {current === 'payment' && (
          <>
            <div className={styles.content}>
              {alert}
              <fieldset className={styles.options}>
                <legend className={styles.legend}>How would you like to pay?</legend>
                <label className={styles.option} data-selected={method === 'now'} data-disabled={!canPayNow || undefined}>
                  <input
                    type="radio"
                    name="payment"
                    value="now"
                    checked={method === 'now'}
                    disabled={!canPayNow}
                    onChange={() => setChosenMethod('now')}
                  />
                  <span className={styles.optionIcon}>
                    <QrIcon />
                  </span>
                  <span className={styles.optionText}>
                    <span className={styles.optionTitle}>Pay now with UPI</span>
                    <span className={styles.muted}>
                      {canPayNow
                        ? 'Scan the QR with GPay, PhonePe, Paytm or any UPI app.'
                        : 'Available once your items have prices.'}
                    </span>
                  </span>
                </label>
                <label className={styles.option} data-selected={method === 'later'}>
                  <input
                    type="radio"
                    name="payment"
                    value="later"
                    checked={method === 'later'}
                    onChange={() => setChosenMethod('later')}
                  />
                  <span className={styles.optionIcon}>
                    <WalletIcon />
                  </span>
                  <span className={styles.optionText}>
                    <span className={styles.optionTitle}>Pay later</span>
                    <span className={styles.muted}>Cash or UPI on delivery. We confirm your order on WhatsApp first.</span>
                  </span>
                </label>
              </fieldset>

              {method === 'now' && (
                <div className={styles.qrPanel}>
                  <div className={styles.qrBox}>
                    <QrCode
                      value={qrReady ? upiLink(settings, total, upiNote) : SAMPLE_QR_TEXT}
                      label={qrReady ? `UPI payment QR code for ${rupees(total)}` : 'Sample QR code'}
                      size={196}
                      className={styles.qr}
                    />
                    {!qrReady && <span className={styles.sample}>Sample</span>}
                  </div>
                  <div className={styles.qrText}>
                    <span className={`${ui.display} ${styles.qrAmount}`}>Pay {rupees(total)}</span>
                    {qrReady ? (
                      <span className={styles.muted}>
                        To {settings.upi_name || 'Klenz'} · {settings.upi_id}
                      </span>
                    ) : (
                      <span className={styles.muted}>
                        Sample QR: online payment is not switched on yet. You can still place the order and we will
                        share the payment details on WhatsApp.
                      </span>
                    )}
                    {pricePending && <span className={styles.note}>Items on request are not in this amount.</span>}
                    {qrReady && touchScreen && (
                      <a className={`${ui.button} ${ui.outline} ${styles.upiApp}`} href={upiLink(settings, total, upiNote)}>
                        Open UPI app
                      </a>
                    )}
                    <Field
                      label="UPI reference no. (optional)"
                      error={fieldErrors.payment_ref}
                      hint="The 12-digit UTR in your payment app helps us find your payment."
                    >
                      {(props) => (
                        <input
                          {...props}
                          id="checkout-ref"
                          type="text"
                          autoComplete="off"
                          maxLength={40}
                          placeholder="e.g. 412345678901"
                          value={paymentRef}
                          onChange={(event) => {
                            setPaymentRef(event.target.value)
                            if (fieldErrors.payment_ref) setFieldErrors((errors) => ({ ...errors, payment_ref: undefined }))
                          }}
                        />
                      )}
                    </Field>
                  </div>
                </div>
              )}
            </div>
            <footer className={styles.foot}>
              <Total count={count} total={total} pending={pricePending} />
              <div className={styles.actions}>
                <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => go('details')} disabled={saving}>
                  Back
                </button>
                <button type="button" className={`${ui.button} ${ui.primary}`} onClick={placeOrder} disabled={saving}>
                  {saving ? 'Placing your order…' : method === 'now' && qrReady ? 'I have paid — place order' : 'Place order'}
                </button>
              </div>
            </footer>
          </>
        )}

        {current === 'done' && placed && (
          <>
            <div className={styles.content}>
              <div className={styles.done} role="status">
                <span className={styles.doneIcon}>
                  <CheckIcon size={34} />
                </span>
                <p className={`${ui.display} ${styles.doneTitle}`}>
                  Thank you{placed.customer.name ? `, ${placed.customer.name.trim().split(/\s+/)[0]}` : ''}!
                </p>
                <p className={styles.muted}>
                  Order <strong>{placed.order.reference}</strong> is saved. We will confirm it on WhatsApp.
                </p>
              </div>
              <dl className={styles.receipt}>
                <div>
                  <dt>Items</dt>
                  <dd>{packs(placed.order.item_count)}</dd>
                </div>
                <div>
                  <dt>Total</dt>
                  <dd>{orderTotal(placed.order.total, placed.order.price_pending)}</dd>
                </div>
                <div>
                  <dt>Payment</dt>
                  <dd>
                    {placed.order.payment_method === 'now'
                      ? 'Paid by UPI — we confirm once it reaches us'
                      : 'Pay later (cash or UPI on delivery)'}
                  </dd>
                </div>
              </dl>
            </div>
            <footer className={styles.foot}>
              <span className={styles.note}>Send the order on WhatsApp too, so you have it in your chat with us.</span>
              <div className={styles.actions}>
                <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={close}>
                  Done
                </button>
                <a
                  className={styles.whatsapp}
                  href={whatsappLink(
                    whatsappNumber(settings.whatsapp_number, settings.country_code),
                    orderMessage(placed.order, placed.customer),
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  <WhatsAppIcon size={22} />
                  Send on WhatsApp
                </a>
              </div>
            </footer>
          </>
        )}
      </div>
    </Dialog>
  )
}

function Steps({ current }: { current: Exclude<Step, 'done'> }) {
  const index = STEPS.findIndex((step) => step.id === current)
  return (
    <ol className={styles.steps} aria-label="Checkout steps">
      {STEPS.map((step, i) => (
        <li
          key={step.id}
          className={styles.step}
          data-state={i < index ? 'done' : i === index ? 'current' : 'next'}
          aria-current={i === index ? 'step' : undefined}
        >
          <span className={styles.stepNumber}>{i < index ? <CheckIcon size={13} /> : i + 1}</span>
          {step.label}
        </li>
      ))}
    </ol>
  )
}

function Total({ count, total, pending }: { count: number; total: number; pending: boolean }) {
  return (
    <>
      <div className={styles.totalRow}>
        <span>Total · {packs(count)}</span>
        <span className={ui.display}>{total > 0 || !pending ? rupees(total) : 'On request'}</span>
      </div>
      {pending && <span className={styles.note}>Items marked “Price on request” are confirmed on WhatsApp.</span>}
    </>
  )
}

interface FieldProps {
  label: string
  error?: string
  hint?: string
  children: (props: {
    className: string
    'aria-invalid': boolean
    'aria-describedby'?: string
    id?: string
  }) => ReactNode
}

/** A labelled input with its hint and error message wired up for screen readers. */
function Field({ label, error, hint, children }: FieldProps) {
  const id = useId()
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  const control = children({ className: styles.input, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy, id })
  // The control may set its own id (used to focus the first invalid field).
  const controlId = (control as ReactElement<{ id?: string }>).props.id ?? id
  return (
    <div className={styles.field}>
      <label htmlFor={controlId} className={styles.label}>
        {label}
      </label>
      {control}
      {hint && (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className={styles.fieldError}>
          {error}
        </span>
      )}
    </div>
  )
}
