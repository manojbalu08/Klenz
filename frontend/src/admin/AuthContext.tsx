import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { api, setAuthToken, setUnauthorizedHandler } from '../lib/api'
import { readStored, writeStored } from '../lib/storage'
import type { AdminUser, TokenResponse } from '../lib/types'

interface Session {
  token: string
  expiresAt: string
  user: AdminUser
  /** "Keep me signed in": stored in localStorage instead of this tab's sessionStorage. */
  remember: boolean
}

interface AuthValue {
  session: Session | null
  login: (email: string, password: string, remember: boolean) => Promise<void>
  logout: () => void
  /** Swap in a new token (after a password change) without signing out. */
  replaceToken: (response: TokenResponse) => void
}

const SESSION_KEY = 'klenz.admin'
const AuthContext = createContext<AuthValue | null>(null)

function loadSession(): Session | null {
  const session = readStored<Session | null>('local', SESSION_KEY, null) ?? readStored<Session | null>('session', SESSION_KEY, null)
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) return null
  return session
}

function storeSession(session: Session | null): void {
  writeStored('local', SESSION_KEY, session?.remember ? session : null)
  writeStored('session', SESSION_KEY, session && !session.remember ? session : null)
  // Set straight away (not in an effect) so the first admin requests are signed in.
  setAuthToken(session?.token ?? null)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const restored = loadSession()
    setAuthToken(restored?.token ?? null)
    return restored
  })

  const logout = useCallback(() => {
    storeSession(null)
    setSession(null)
  }, [])

  // Any 401 from the API (expired or revoked token) signs the admin out.
  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  const value = useMemo<AuthValue>(
    () => ({
      session,
      logout,
      login: async (email, password, remember) => {
        const response = await api.login(email, password, remember)
        const next = { token: response.access_token, expiresAt: response.expires_at, user: response.user, remember }
        storeSession(next)
        setSession(next)
      },
      replaceToken: (response) => {
        const next = {
          token: response.access_token,
          expiresAt: response.expires_at,
          user: response.user,
          remember: session?.remember ?? false,
        }
        storeSession(next)
        setSession(next)
      },
    }),
    [session, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthValue {
  const value = use(AuthContext)
  if (!value) throw new Error('useAuth() must be used inside <AuthProvider>')
  return value
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const location = useLocation()
  if (!session) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  return children
}
