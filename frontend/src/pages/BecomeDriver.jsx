import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2, Check } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const EXP = ['Less than 1 year', '1–3 years', '3–5 years', '5–10 years', '10+ years']

export default function BecomeDriver() {
  const { user } = useAuth()
  const [form, setForm] = useState({
    name: user?.name || '',
    age: '',
    phone: '',
    licence: '',
    experience: '',
    location: '',
    pastExperience: '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  if (!user) {
    return (
      <main className="auth-page">
        <div className="auth-card center">
          <span className="eyebrow" style={{ justifyContent: 'center' }}>
            Become a driver
          </span>
          <h1 className="auth-title">
            Sign in <span className="it accent">first.</span>
          </h1>
          <p className="auth-sub">
            Create a rider account (or sign in), then apply to drive — we link the application to
            your account email.
          </p>
          <Link to="/signin" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
            Sign in <ArrowRight size={18} />
          </Link>
        </div>
      </main>
    )
  }

  if (user.role !== 'user') {
    return (
      <main className="auth-page">
        <div className="auth-card center">
          <h1 className="auth-title">
            Already <span className="it accent">on the team.</span>
          </h1>
          <p className="auth-sub">This account can’t submit a new rider-to-driver application.</p>
          <Link to="/" className="btn btn-ghost">
            Back home
          </Link>
        </div>
      </main>
    )
  }

  if (done) {
    return (
      <main className="auth-page">
        <motion.div
          className="auth-card center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="confirm-check">
            <Check size={28} strokeWidth={3} />
          </span>
          <h1 className="auth-title">
            Application <span className="it accent">sent.</span>
          </h1>
          <p className="auth-sub">
            An admin will review it within 24–48 hrs. Once approved, log in with your email and the
            temporary password <b>Drv@1234</b> to reach your driver dashboard.
          </p>
          <Link to="/" className="btn btn-primary">
            Back home
          </Link>
        </motion.div>
      </main>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      await api('/drivers/apply', { method: 'POST', body: { ...form, age: Number(form.age) } })
      setDone(true)
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <motion.div
        className="auth-card wide"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="eyebrow">Become a driver</span>
        <h1 className="auth-title">
          Drive with <span className="it accent">DriveSync.</span>
        </h1>
        <p className="auth-sub">
          Apply to drive customers’ own cars. Verified drivers earn on their own schedule.
        </p>
        <form className="auth-form" onSubmit={submit}>
          <div className="field-row">
            <label className="field">
              <span>Full name</span>
              <input value={form.name} onChange={set('name')} required />
            </label>
            <label className="field">
              <span>Age</span>
              <input type="number" min="18" max="70" value={form.age} onChange={set('age')} required />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Phone</span>
              <input value={form.phone} onChange={set('phone')} required />
            </label>
            <label className="field">
              <span>Licence no.</span>
              <input value={form.licence} onChange={set('licence')} required />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Experience</span>
              <select value={form.experience} onChange={set('experience')} required>
                <option value="" disabled>
                  Select
                </option>
                {EXP.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Location</span>
              <input
                value={form.location}
                onChange={set('location')}
                required
                placeholder="e.g. Kukatpally"
              />
            </label>
          </div>
          <label className="field">
            <span>Past experience (optional)</span>
            <input
              value={form.pastExperience}
              onChange={set('pastExperience')}
              placeholder="e.g. Ola driver — 3 years"
            />
          </label>
          {err && <div className="auth-err">{err}</div>}
          <button className="btn btn-primary btn-lg auth-submit" disabled={busy}>
            {busy ? (
              <Loader2 className="spin" size={18} />
            ) : (
              <>
                Submit application <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </main>
  )
}
