import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react'
import Logo from '../components/Logo'
import PageLoader from '../components/PageLoader'
import { api, ApiError } from '../lib/api'
import type { SiteData } from '../lib/types'
import styles from './SiteDataContext.module.css'

const WAKE_RETRY_MS = 10_000

interface SiteDataValue {
  data: SiteData
  reload: () => Promise<void>
}

const SiteDataContext = createContext<SiteDataValue | null>(null)

/** Loads products, videos, page text and business details once for the whole shop. */
export function SiteDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SiteData | null>(null)
  const [error, setError] = useState<{ message: string; waking: boolean } | null>(null)

  const load = useCallback(async () => {
    try {
      setData(await api.site())
      setError(null)
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Could not load the shop.',
        // 503: the server is up but its database is waking up; 0: the server itself is starting.
        waking: err instanceof ApiError && (err.status === 503 || err.status === 0),
      })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // While the shop wakes up, keep trying by itself.
  useEffect(() => {
    if (!error?.waking) return
    const timer = window.setTimeout(() => void load(), WAKE_RETRY_MS)
    return () => window.clearTimeout(timer)
  }, [error, load])

  if (!data) {
    if (!error) return <PageLoader />
    return (
      <div className={styles.error} role="alert">
        <Logo size={64} />
        <h1>{error.waking ? 'The shop is waking up' : 'We couldn’t load the shop'}</h1>
        <p>{error.waking ? 'This takes about a minute. The page opens by itself.' : error.message}</p>
        <button type="button" onClick={() => void load()}>
          Try again
        </button>
      </div>
    )
  }

  return <SiteDataContext value={{ data, reload: load }}>{children}</SiteDataContext>
}

export function useSite(): SiteDataValue {
  const value = use(SiteDataContext)
  if (!value) throw new Error('useSite() must be used inside <SiteDataProvider>')
  return value
}
