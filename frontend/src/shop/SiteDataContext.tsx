import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react'
import Logo from '../components/Logo'
import PageLoader from '../components/PageLoader'
import { api } from '../lib/api'
import type { SiteData } from '../lib/types'
import styles from './SiteDataContext.module.css'

interface SiteDataValue {
  data: SiteData
  reload: () => Promise<void>
}

const SiteDataContext = createContext<SiteDataValue | null>(null)

/** Loads products, videos, page text and business details once for the whole shop. */
export function SiteDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SiteData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setData(await api.site())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the shop.')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (!data) {
    if (!error) return <PageLoader />
    return (
      <div className={styles.error} role="alert">
        <Logo size={64} />
        <h1>We couldn’t load the shop</h1>
        <p>{error}</p>
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
