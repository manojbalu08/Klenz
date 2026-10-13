import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Order, OrderStatus } from '../lib/types'
import ui from './admin.module.css'
import { useAuth } from './AuthContext'

/** Title row of every admin page, with the signed-in admin and a sign-out button. */
export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const { session, logout } = useAuth()
  const name = session?.user.name || 'Admin'
  return (
    <div className={ui.pageHeader}>
      <title>{`${title} — Klenz Admin`}</title>
      <div className={ui.pageTitle}>
        <h1>{title}</h1>
        <span>{subtitle}</span>
      </div>
      <div className={ui.userPill}>
        <span className={ui.avatar} aria-hidden="true">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className={ui.userName}>{name}</span>
        <button type="button" className={ui.signOut} onClick={logout}>
          Sign out
        </button>
      </div>
    </div>
  )
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'New',
  quoted: 'Confirmed',
  closed: 'Closed',
}

const STATUS_TONES: Record<OrderStatus, string> = { new: 'warm', quoted: 'blue', closed: 'green' }

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={ui.pill} data-tone={STATUS_TONES[status]}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

/** "Paid", "UPI · to check" (the customer says they paid by QR) or "Pay later". */
export function PaymentPill({ order }: { order: Pick<Order, 'payment_method' | 'payment_status'> }) {
  const [label, tone] =
    order.payment_status === 'paid'
      ? ['Paid', 'green']
      : order.payment_status === 'reported'
        ? ['UPI · to check', 'blue']
        : order.payment_method === 'later'
          ? ['Pay later', 'warm']
          : ['Not paid', 'warm']
  return (
    <span className={ui.pill} data-tone={tone}>
      {label}
    </span>
  )
}

export function LivePill({ live }: { live: boolean }) {
  return (
    <span className={ui.pill} data-tone={live ? 'green' : 'warm'}>
      {live ? 'Live' : 'Draft'}
    </span>
  )
}

export function ErrorNotice({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <div className={`${ui.notice} ${ui.noticeError}`} role="alert">
      {children}
    </div>
  )
}

/** Loads data for a page; `reload` fetches again, `setData` applies a saved result. */
export function useLoad<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  const reload = useCallback(async () => {
    try {
      setData(await loadRef.current())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this page.')
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { data, error, reload, setData }
}

/** "Saved" message that disappears after a few seconds. */
export function useFlash(duration = 2500) {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const flash = useCallback(
    (text: string) => {
      setMessage(text)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setMessage(null), duration)
    },
    [duration],
  )
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return [message, flash] as const
}
