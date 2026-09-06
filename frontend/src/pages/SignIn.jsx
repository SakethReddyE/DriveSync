import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { GOOGLE_CLIENT_ID } from '../lib/api'

const roleRoute = (role) =>
  role === 'admin' ? '/admin' : role === 'driver' || role === 'driver-pending' ? '/driver' : '/dashboard'

export default function SignIn() {
  const { login, signup, googleLogin } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const googleDiv = useRef(null)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    let cancelled = false
    const init = () => {
      if (cancelled || !window.google?.accounts?.id || !googleDiv.current) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (resp) => {
          setErr('')
          setBusy(true)
          try {
            const d = await googleLogin(resp.credential)
            navigate(roleRoute(d.role || 'user'))
          } catch (e) {
            setErr(e.message || 'Google sign-in failed')
          } finally {
            setBusy(false)
          }
        },
      })
      googleDiv.current.innerHTML = ''
      window.google.accounts.id.renderButton(googleDiv.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 330,
      })
    }
    if (window.google?.accounts?.id) init()
    else {
      const existing = document.getElementById('gsi-script')
      if (existing) existing.addEventListener('load', init)
      else {
        const s = document.createElement('script')
        s.id = 'gsi-script'
        s.src = 'https://accounts.google.com/gsi/client'
        s.async = true
        s.defer = true
        s.onload = init
        document.head.appendChild(s)
      }
    }
    return () => {
      cancelled = true
    }
  }, [googleLogin, navigate])

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
      navigate(roleRoute(d.role || d.user?.role || 'user'))
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

        <div className="google-wrap" ref={googleDiv} />
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
              <button onClick={() => { setMode('signup'); setErr('') }}>Create an account</button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => { setMode('login'); setErr('') }}>Sign in</button>
            </>
          )}
        </p>

        <p className="auth-demo mono">
          Demo — rider: create one · driver: suresh@drv.in / Drv@1234
        </p>
      </motion.div>
    </main>
  )
}
