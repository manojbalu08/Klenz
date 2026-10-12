import { useState, type FormEvent } from 'react'
import { api, ApiError } from '../lib/api'
import type { SiteSettings } from '../lib/types'
import ui from './admin.module.css'
import { useAuth } from './AuthContext'
import styles from './SettingsPage.module.css'
import { ErrorNotice, PageHeader, useFlash, useLoad } from './shared'

export default function SettingsPage() {
  const settings = useLoad(api.settings)
  return (
    <>
      <PageHeader title="Settings" subtitle="Business details and your password." />
      <ErrorNotice>{settings.error}</ErrorNotice>
      {settings.data && <SettingsForm initial={settings.data} onSaved={settings.setData} />}
      <PasswordForm />
    </>
  )
}

const TEXT_FIELDS: { key: keyof SiteSettings; label: string; help?: string; type?: string; wide?: boolean }[] = [
  { key: 'whatsapp_number', label: 'WhatsApp number for orders', help: 'Orders from the Contact page are sent here.', type: 'tel' },
  { key: 'country_code', label: 'Country code', help: 'Added to 10-digit numbers for WhatsApp links (91 for India).' },
  { key: 'phone', label: 'Phone numbers', help: 'Shown in the footer and on the Contact page.', wide: true },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'address', label: 'Factory / shop address', wide: true },
  { key: 'hours', label: 'Opening hours', help: 'For example: Mon–Sat, 9:00 – 18:00' },
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

      <div className={ui.actions}>
        <button type="submit" className={`${ui.button} ${ui.primary}`} disabled={busy || !dirty}>
          {busy ? 'Saving…' : 'Save settings'}
        </button>
        {saved && <span className={ui.saved}>{saved}</span>}
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
