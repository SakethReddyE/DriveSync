import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.1 0 24 0 14.6 0 6.4 5.4 2.6 13.2l7.8 6.1C12.2 13.5 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16z" />
      <path fill="#FBBC05" d="M10.4 28.3c-.5-1.4-.7-3-.7-4.6s.3-3.2.7-4.6l-7.8-6.1C.9 16.2 0 20 0 23.7s.9 7.5 2.6 10.7l7.8-6.1z" />
      <path fill="#34A853" d="M24 47.4c6.1 0 11.3-2 15.1-5.5l-7.1-5.5c-2 1.3-4.6 2.1-8 2.1-6.4 0-11.8-4-13.6-9.8l-7.8 6.1C6.4 42 14.6 47.4 24 47.4z" />
    </svg>
  )
}

export default function SignIn() {
  const { login, signup } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const routeFor = (role) => (role === 'user' ? '/book' : '/')

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const d =
        mode === 'login'
          ? await login(form.email.trim(), form.password)
          : await signup({
              name: form.name.trim(),
              email: form.email.trim(),
              phone: form.phone.trim(),
              password: form.password,
            })
      navigate(routeFor(d.role || d.user?.role || 'user'))
    } catch (e2) {
      setErr(e2.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <span className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Get started'}</span>
        <h1 className="auth-title">
          {mode === 'login' ? (
            <>
              Sign <span className="it accent">in.</span>
            </>
          ) : (
            <>
              Create <span className="it accent">account.</span>
            </>
          )}
        </h1>
        <p className="auth-sub">
          {mode === 'login'
            ? 'Log in to book a driver or manage your rides.'
            : 'Hire a verified driver for your own car.'}
        </p>

        <button
          type="button"
          className="btn btn-ghost auth-google"
          disabled
          title="Google sign-in — coming soon"
        >
          <GoogleIcon /> Continue with Google
        </button>
        <div className="auth-divider">
          <span>or</span>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === 'signup' && (
            <>
              <label className="field">
                <span>Full name</span>
                <input value={form.name} onChange={set('name')} required placeholder="Your name" />
              </label>
              <label className="field">
                <span>Phone</span>
                <input value={form.phone} onChange={set('phone')} required placeholder="9876543210" />
              </label>
            </>
          )}
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              required
              placeholder="you@email.com"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </label>

          {err && <div className="auth-err">{err}</div>}

          <button className="btn btn-primary btn-lg auth-submit" disabled={busy}>
            {busy ? (
              <Loader2 className="spin" size={18} />
            ) : (
              <>
                {mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? (
            <>
              New here?{' '}
              <button
                onClick={() => {
                  setMode('signup')
                  setErr('')
                }}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => {
                  setMode('login')
                  setErr('')
                }}
              >
                Sign in
              </button>
            </>
          )}
        </p>

        <p className="auth-demo mono">Try a demo driver — suresh@drv.in · Drv@1234</p>
      </motion.div>
    </main>
  )
}
