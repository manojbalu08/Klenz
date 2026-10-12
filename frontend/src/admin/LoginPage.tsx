import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import Logo from '../components/Logo'
import { useAuth } from './AuthContext'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const { session, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/admin'
  if (session) return <Navigate to={from} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError(null)
    try {
      await login(String(form.get('email') ?? ''), String(form.get('password') ?? ''), remember)
      void navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.')
      setBusy(false)
    }
  }

  return (
    <div className={styles.page}>
      <title>Admin sign in — Klenz</title>

      <div className={styles.welcome}>
        <div className={styles.sun} aria-hidden="true" />
        <div className={styles.glow} aria-hidden="true" />
        <div className={styles.tile} aria-hidden="true" />
        <Link to="/" className={styles.brand}>
          <Logo size={48} />
          <span>Klenz</span>
        </Link>
        <div className={styles.welcomeText}>
          <h1>Welcome back to your Klenz dashboard</h1>
          <p>See new orders from WhatsApp, update products and change your website videos.</p>
        </div>
        <div className={styles.chips}>
          <span>Orders</span>
          <span>Products</span>
          <span>Videos</span>
        </div>
      </div>

      <div className={styles.formSide}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formHead}>
            <h2>Admin sign in</h2>
            <span>Only Klenz staff can open the dashboard.</span>
          </div>

          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="username" placeholder="admin@klenz.com" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <div className={styles.passwordWrap}>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className={styles.toggle}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((shown) => !shown)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className={styles.row}>
            <label className={styles.remember}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Keep me signed in
            </label>
            <button type="button" className={styles.forgot} onClick={() => setForgotOpen((open) => !open)}>
              Forgot password?
            </button>
          </div>
          {forgotOpen && (
            <p className={styles.hint}>
              Ask the person who manages the website to reset it. On the server they run{' '}
              <code>python -m app.cli set-password your@email</code>.
            </p>
          )}

          <button type="submit" className={styles.submit} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <Link to="/" className={styles.back}>
            ← Back to website
          </Link>
        </form>
      </div>
    </div>
  )
}
