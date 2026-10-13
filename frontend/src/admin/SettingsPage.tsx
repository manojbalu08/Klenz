import { useState, type FormEvent } from 'react'
import QrCode from '../components/QrCode'
import { api, ApiError } from '../lib/api'
import type { OrderAlerts, SiteSettings } from '../lib/types'
import { upiLink } from '../lib/upi'
import ui from './admin.module.css'
import { useAuth } from './AuthContext'
import styles from './SettingsPage.module.css'
import { ErrorNotice, PageHeader, useFlash, useLoad } from './shared'

export default function SettingsPage() {
  const settings = useLoad(api.settings)
  const alerts = useLoad(api.orderAlerts)
  return (
    <>
      <PageHeader title="Settings" subtitle="Business details, payments, order alerts and your password." />
      <ErrorNotice>{settings.error ?? alerts.error}</ErrorNotice>
      {settings.data && <SettingsForm initial={settings.data} onSaved={settings.setData} />}
      {alerts.data && (
        <OrderAlertsForm
          initial={alerts.data}
          fallbackPhone={settings.data?.order_whatsapp || settings.data?.whatsapp_number || ''}
          onSaved={alerts.setData}
        />
      )}
      <PasswordForm />
    </>
  )
}

const TEXT_FIELDS: { key: keyof SiteSettings; label: string; help?: string; type?: string; wide?: boolean }[] = [
  {
    key: 'order_whatsapp',
    label: 'WhatsApp number that receives orders',
    help: 'WhatsApp opens with each placed order addressed to this number. Order alerts go here too.',
    type: 'tel',
  },
  { key: 'whatsapp_number', label: 'WhatsApp number on the website', help: 'Shown in the footer and on the Contact page.', type: 'tel' },
  { key: 'country_code', label: 'Country code', help: 'Added to 10-digit numbers for WhatsApp links (91 for India).' },
  { key: 'phone', label: 'Phone numbers', help: 'Shown in the footer and on the Contact page.', wide: true },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'address', label: 'Factory / shop address', wide: true },
  { key: 'hours', label: 'Opening hours', help: 'For example: Mon–Sat, 9:00 – 18:00' },
]

const PAYMENT_FIELDS: { key: keyof SiteSettings; label: string; help: string }[] = [
  {
    key: 'upi_id',
    label: 'UPI ID',
    help:
      'For example 9087312905@okicici (from GPay, PhonePe or your bank app). For a bank account: ' +
      'ACCOUNTNUMBER@IFSC.ifsc.npci. Empty shows a sample QR.',
  },
  { key: 'upi_name', label: 'Name shown in UPI apps', help: 'Usually the business or account holder name.' },
]

function SettingsForm({ initial, onSaved }: { initial: SiteSettings; onSaved: (settings: SiteSettings) => void }) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, flash] = useFlash(3500)
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)

  function set<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await api.updateSettings(values)
      setValues(result)
      onSaved(result)
      flash('Settings saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the settings.')
      if (err instanceof ApiError) setErrors(err.fields)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <section className={ui.card}>
        <h2 className={ui.cardTitle}>Business details</h2>
        <ErrorNotice>{error}</ErrorNotice>
        <div className={ui.formRow}>
          {TEXT_FIELDS.map(({ key, label, help, type, wide }) => (
            <label key={key} className={`${ui.field} ${wide ? ui.fieldWide : ''}`}>
              <span className={ui.label}>{label}</span>
              <input
                className={ui.input}
                type={type ?? 'text'}
                value={String(values[key])}
                onChange={(e) => set(key, e.target.value as never)}
                aria-invalid={Boolean(errors[key])}
              />
              {errors[key] ? <span className={ui.fieldError}>{errors[key]}</span> : help && <span className={ui.help}>{help}</span>}
            </label>
          ))}
        </div>
      </section>

      <section className={ui.card}>
        <h2 className={ui.cardTitle}>Payments (UPI QR)</h2>
        <p className={ui.muted}>
          The checkout shows a QR for the order total. Customers pay with any UPI app; the money goes straight to this
          UPI ID.
        </p>
        <div className={styles.payments}>
          <div className={ui.formRow}>
            {PAYMENT_FIELDS.map(({ key, label, help }) => (
              <label key={key} className={`${ui.field} ${ui.fieldWide}`}>
                <span className={ui.label}>{label}</span>
                <input
                  className={ui.input}
                  value={String(values[key])}
                  onChange={(e) => set(key, e.target.value as never)}
                  aria-invalid={Boolean(errors[key])}
                />
                {errors[key] ? (
                  <span className={ui.fieldError}>{errors[key]}</span>
                ) : (
                  <span className={ui.help}>{help}</span>
                )}
              </label>
            ))}
          </div>
          {values.upi_id.trim() && (
            <figure className={styles.qrPreview}>
              <QrCode value={upiLink(values, 0, 'Klenz test')} label="Test QR for this UPI ID" size={132} />
              <figcaption className={ui.help}>
                Scan it with your phone: your UPI app should show this name. Nothing is paid.
              </figcaption>
            </figure>
          )}
        </div>
      </section>

      <div className={ui.actions}>
        <button type="submit" className={`${ui.button} ${ui.primary}`} disabled={busy || !dirty}>
          {busy ? 'Saving…' : 'Save settings'}
        </button>
        {saved && <span className={ui.saved}>{saved}</span>}
      </div>
    </form>
  )
}

/** Opens WhatsApp with CallMeBot's activation message filled in. */
const CALLMEBOT_ACTIVATION = `https://wa.me/34644319565?text=${encodeURIComponent('I allow callmebot to send me messages')}`

interface OrderAlertsFormProps {
  initial: OrderAlerts
  /** Shown when no alert phone is saved: the WhatsApp number for orders is used. */
  fallbackPhone: string
  onSaved: (alerts: OrderAlerts) => void
}

/** New-order alerts to the admin's WhatsApp through the free CallMeBot service. */
function OrderAlertsForm({ initial, fallbackPhone, onSaved }: OrderAlertsFormProps) {
  const [phone, setPhone] = useState(initial.phone)
  const [apikey, setApikey] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(changes: { phone: string; apikey?: string }, done: string) {
    setBusy(true)
    setMessage(null)
    try {
      const result = await api.updateOrderAlerts(changes)
      onSaved(result)
      setPhone(result.phone)
      setApikey('')
      setErrors({})
      setMessage({ ok: true, text: done })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Could not save the alert settings.' })
      if (err instanceof ApiError) setErrors(err.fields)
    } finally {
      setBusy(false)
    }
  }

  async function sendTest() {
    setBusy(true)
    setMessage(null)
    try {
      const result = await api.testOrderAlert()
      setMessage(
        result.ok
          ? { ok: true, text: 'Test message sent. Check WhatsApp on the alert phone.' }
          : { ok: false, text: `CallMeBot did not send it: ${result.detail || 'no answer'}` },
      )
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Could not send the test message.' })
    } finally {
      setBusy(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void save(apikey.trim() ? { phone, apikey: apikey.trim() } : { phone }, 'Alert settings saved.')
  }

  return (
    <form className={ui.card} onSubmit={handleSubmit} noValidate>
      <h2 className={ui.cardTitle}>Order alerts on WhatsApp</h2>
      <p className={ui.muted}>
        Every new order is also sent to this phone automatically, through the free CallMeBot service. One-time setup on
        that phone:
      </p>
      <ol className={styles.steps}>
        <li>
          On the phone that should get the alerts, send CallMeBot (<strong>+34 644 31 95 65</strong>) the WhatsApp
          message <strong>I allow callmebot to send me messages</strong>.{' '}
          <a href={CALLMEBOT_ACTIVATION} target="_blank" rel="noreferrer">
            Open it in WhatsApp
          </a>{' '}
          (open this page on that phone and tap the link, then press Send).
        </li>
        <li>CallMeBot replies within 2 minutes with an API key. Paste it below and save.</li>
        <li>
          Press <strong>Send test message</strong>. From then on every new order arrives on that phone by itself. If
          the number above stops working, check{' '}
          <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noreferrer">
            callmebot.com
          </a>{' '}
          for the current one.
        </li>
      </ol>
      <div className={ui.formRow}>
        <label className={ui.field}>
          <span className={ui.label}>WhatsApp number for alerts</span>
          <input
            className={ui.input}
            type="tel"
            value={phone}
            placeholder={fallbackPhone}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={Boolean(errors.phone)}
          />
          {errors.phone ? (
            <span className={ui.fieldError}>{errors.phone}</span>
          ) : (
            <span className={ui.help}>
              The phone that activated CallMeBot. Empty uses the WhatsApp number that receives orders.
            </span>
          )}
        </label>
        <label className={ui.field}>
          <span className={ui.label}>CallMeBot API key</span>
          <input
            className={ui.input}
            type="password"
            autoComplete="off"
            value={apikey}
            placeholder={initial.apikey_set ? 'Saved — type a new key to replace it' : 'e.g. 1234567'}
            onChange={(e) => setApikey(e.target.value)}
            aria-invalid={Boolean(errors.apikey)}
          />
          {errors.apikey ? (
            <span className={ui.fieldError}>{errors.apikey}</span>
          ) : (
            <span className={ui.help}>{initial.apikey_set ? 'Alerts are on.' : 'Alerts are off until a key is saved.'}</span>
          )}
        </label>
      </div>
      {message && (
        <p className={message.ok ? ui.saved : ui.fieldError} role="status">
          {message.text}
        </p>
      )}
      <div className={ui.actions}>
        <button type="submit" className={`${ui.button} ${ui.primary}`} disabled={busy}>
          {busy ? 'Saving…' : 'Save alerts'}
        </button>
        <button
          type="button"
          className={`${ui.button} ${ui.ghost}`}
          onClick={sendTest}
          disabled={busy || !initial.apikey_set}
        >
          Send test message
        </button>
        {initial.apikey_set && (
          <button
            type="button"
            className={`${ui.button} ${ui.ghost}`}
            disabled={busy}
            onClick={() => void save({ phone, apikey: '' }, 'Alerts switched off.')}
          >
            Switch off
          </button>
        )}
      </div>
    </form>
  )
}

function PasswordForm() {
  const { replaceToken } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, flash] = useFlash(4000)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (next.length < 8) return setError('The new password needs at least 8 characters.')
    if (next !== repeat) return setError('The two new passwords do not match.')
    setBusy(true)
    setError(null)
    try {
      replaceToken(await api.changePassword(current, next))
      setCurrent('')
      setNext('')
      setRepeat('')
      flash('Password changed. Other devices have been signed out.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className={ui.card} onSubmit={handleSubmit} noValidate>
      <h2 className={ui.cardTitle}>Change password</h2>
      <ErrorNotice>{error}</ErrorNotice>
      <div className={ui.formRow}>
        <label className={ui.field}>
          <span className={ui.label}>Current password</span>
          <input className={ui.input} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>New password</span>
          <input className={ui.input} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          <span className={ui.help}>At least 8 characters.</span>
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Repeat new password</span>
          <input className={ui.input} type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
        </label>
      </div>
      <div className={ui.actions}>
        <button type="submit" className={`${ui.button} ${ui.dark}`} disabled={busy || !current || !next}>
          {busy ? 'Saving…' : 'Change password'}
        </button>
        {saved && <span className={ui.saved}>{saved}</span>}
      </div>
    </form>
  )
}
