import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, Loader2, Check, UploadCloud, FileText, X,
  Clock, Shield, CheckCircle, AlertCircle, Car
} from 'lucide-react'
import { api, apiUpload } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const EXP = ['Less than 1 year', '1–3 years', '3–5 years', '5–10 years', '10+ years']
const VEHICLE_CATEGORIES = ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury', 'Electric', 'Other']
const MAX_FILE = 5 * 1024 * 1024
const ACCEPT = '.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg'

function emptyForm(user) {
  return {
    name: user?.name || '',
    age: '',
    phone: user?.phone || '',
    licence: '',
    experience: '',
    location: '',
    pastExperience: '',
    vehicleNumber: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleCategory: '',
  }
}

/** Three-step progress tracker for the pending/reviewing states */
function ProgressTracker({ status }) {
  const steps = [
    { id: 'submitted', label: 'Application submitted', icon: <Check size={14} /> },
    { id: 'review', label: 'Under review', icon: <Clock size={14} /> },
    { id: 'decision', label: 'Verification decision', icon: <Shield size={14} /> },
  ]

  const active =
    status === 'pending' ? 'review' :
    status === 'approved' ? 'decision' :
    'submitted'

  const stepIndex = (id) => steps.findIndex((s) => s.id === id)
  const activeIdx = stepIndex(active)

  return (
    <div className="app-tracker">
      {steps.map((step, i) => {
        const done = i < activeIdx
        const current = i === activeIdx
        return (
          <div key={step.id} className={`tracker-step ${done ? 'done' : ''} ${current ? 'current' : ''}`}>
            <div className="tracker-icon">
              {done ? <Check size={14} /> : step.icon}
            </div>
            <span className="tracker-label mono">{step.label}</span>
            {i < steps.length - 1 && (
              <div className={`tracker-line ${done ? 'done' : ''}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function BecomeDriver() {
  const { user, refreshAppStatus } = useAuth()
  const [form, setForm] = useState(() => emptyForm(user))
  const [file, setFile] = useState(null)
  const [fileErr, setFileErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const [app, setApp] = useState(null)
  const [checking, setChecking] = useState(true)
  const [reapply, setReapply] = useState(false)
  const fileInput = useRef(null)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  // Load the rider's existing application (if any)
  useEffect(() => {
    if (!user || user.role !== 'user') {
      setChecking(false)
      return
    }
    let cancelled = false
    api('/drivers/my-application')
      .then((d) => { if (!cancelled) setApp(d.application || null) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setChecking(false) })
    return () => { cancelled = true }
  }, [user])

  // ── Guards ──────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <main className="auth-page">
        <div className="auth-card center">
          <span className="eyebrow" style={{ justifyContent: 'center' }}>Become a driver</span>
          <h1 className="auth-title">
            Sign in <span className="it accent">first.</span>
          </h1>
          <p className="auth-sub">
            Create a rider account (or sign in), then apply to drive — we link the
            application to your account email.
          </p>
          <Link to="/signin?next=/become-driver" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
            Sign in <ArrowRight size={18} />
          </Link>
        </div>
      </main>
    )
  }

  if (user.role !== 'user') {
    // Drivers/admins — redirect them to their own dashboard
    const dashPath = user.role === 'admin' ? '/admin' : '/driver'
    return (
      <main className="auth-page">
        <div className="auth-card center">
          <span className="confirm-check" style={{ background: 'var(--sage)', margin: '0 auto 18px' }}>
            <CheckCircle size={28} />
          </span>
          <h1 className="auth-title">
            Already <span className="it accent">on the team.</span>
          </h1>
          <p className="auth-sub">
            {user.role === 'admin'
              ? 'You are an administrator. Use the admin dashboard to manage driver applications.'
              : 'Your account is already a driver. Head to your dashboard.'}
          </p>
          <Link to={dashPath} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
            Go to dashboard <ArrowRight size={18} />
          </Link>
        </div>
      </main>
    )
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (checking) {
    return (
      <main className="auth-page">
        <div className="auth-card center">
          <Loader2 className="spin" size={22} />
        </div>
      </main>
    )
  }

  // ── Existing application status views ────────────────────────────────────
  if (app && !reapply) {
    if (app.status === 'pending') {
      return (
        <main className="auth-page" style={{ alignItems: 'flex-start' }}>
          <motion.div
            className="auth-card app-status-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="eyebrow">Application status</span>
            <h1 className="auth-title">
              Application <span className="it accent">submitted.</span>
            </h1>
            <p className="auth-sub">
              Your application has been received. Our team will review your details and documents.
              We'll update your status once the review is complete.
            </p>

            <ProgressTracker status="pending" />

            <div className="app-details-grid">
              <div className="app-detail-row">
                <span className="mono app-detail-label">Submitted</span>
                <span>{new Date(app.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="app-detail-row">
                <span className="mono app-detail-label">Status</span>
                <span className="st st-pending">Under review</span>
              </div>
              <div className="app-detail-row">
                <span className="mono app-detail-label">Licence</span>
                <span>{app.licence}</span>
              </div>
              <div className="app-detail-row">
                <span className="mono app-detail-label">Vehicle</span>
                <span>{app.vehicleNumber} · {app.vehicleCategory}</span>
              </div>
              <div className="app-detail-row">
                <span className="mono app-detail-label">RC document</span>
                <span className={`app-doc-status ${app.hasRc ? 'submitted' : 'missing'}`}>
                  {app.hasRc ? <><Check size={12} /> Submitted</> : <><X size={12} /> Not provided</>}
                </span>
              </div>
              {app.vehicleMake && (
                <div className="app-detail-row">
                  <span className="mono app-detail-label">Make / Model</span>
                  <span>{app.vehicleMake} {app.vehicleModel}</span>
                </div>
              )}
            </div>

            <div className="app-next-steps">
              <p className="mono app-next-label">What happens next</p>
              <p className="app-next-text">
                Our team typically reviews applications within 24–48 hours. Once approved, you'll
                be able to log in to your driver dashboard using this email and the temporary
                password <code>Drv@1234</code>.
              </p>
            </div>

            <Link to="/" className="btn btn-primary" style={{ width: '100%' }}>
              Back home
            </Link>
          </motion.div>
        </main>
      )
    }

    if (app.status === 'approved') {
      return (
        <main className="auth-page">
          <motion.div
            className="auth-card app-status-card center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Verified badge */}
            <div className="verified-badge">
              <Shield size={28} />
            </div>

            <h1 className="auth-title">
              Congratulations! You're a{' '}
              <span className="it accent">Verified Driver.</span>
            </h1>
            <p className="auth-sub">
              Your application has been approved. Your driver profile is now verified, and you're
              officially part of the DriveSync driver network.
            </p>

            <ProgressTracker status="approved" />

            <div className="app-details-grid">
              <div className="app-detail-row">
                <span className="mono app-detail-label">Status</span>
                <span className="st st-approved">Approved</span>
              </div>
              {app.vehicleNumber && (
                <div className="app-detail-row">
                  <span className="mono app-detail-label">Vehicle</span>
                  <span>{app.vehicleNumber} · {app.vehicleCategory}</span>
                </div>
              )}
            </div>

            <Link to="/signin" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
              Go to Driver Dashboard <ArrowRight size={18} />
            </Link>
          </motion.div>
        </main>
      )
    }

    if (app.status === 'rejected') {
      return (
        <main className="auth-page">
          <motion.div
            className="auth-card app-status-card center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="rejected-icon">
              <AlertCircle size={28} />
            </div>
            <span className="eyebrow" style={{ justifyContent: 'center' }}>Application not approved</span>
            <h1 className="auth-title">
              Not this <span className="it accent">time.</span>
            </h1>
            <p className="auth-sub">
              Unfortunately, your driver application was not approved on this occasion.
              You can correct your details and re-apply.
            </p>

            {app.rejectionReason && (
              <div className="app-rejection-reason">
                <p className="mono app-detail-label" style={{ marginBottom: '6px' }}>Reason provided</p>
                <p>{app.rejectionReason}</p>
              </div>
            )}

            <div className="app-detail-row" style={{ marginBottom: '16px' }}>
              <span className="mono app-detail-label">Reviewed</span>
              <span>{app.reviewedAt ? new Date(app.reviewedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
            </div>

            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              onClick={() => {
                setForm({ ...emptyForm(user), name: app.name || '', phone: app.phone || '' })
                setReapply(true)
              }}
            >
              Re-apply <ArrowRight size={18} />
            </button>
            <Link to="/" className="btn btn-ghost" style={{ width: '100%', textAlign: 'center', marginTop: '10px' }}>
              Back home
            </Link>
          </motion.div>
        </main>
      )
    }
  }

  // ── Success confirmation (after fresh submission) ─────────────────────────
  if (done) {
    return (
      <main className="auth-page" style={{ alignItems: 'flex-start' }}>
        <motion.div
          className="auth-card app-status-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="confirm-check" style={{ margin: '0 auto 18px' }}>
            <Check size={28} strokeWidth={3} />
          </span>
          <h1 className="auth-title">
            Application <span className="it accent">submitted!</span>
          </h1>
          <p className="auth-sub">
            Your application has been received. Our team will review your details and documents.
            We'll update your application status once the review is complete.
          </p>

          <ProgressTracker status="pending" />

          <div className="app-next-steps">
            <p className="mono app-next-label">What happens next</p>
            <p className="app-next-text">
              Our team typically reviews applications within 24–48 hours. Once approved, log in
              with your email and the temporary password <code>Drv@1234</code> to access your
              driver dashboard.
            </p>
          </div>

          <Link to="/" className="btn btn-primary" style={{ width: '100%' }}>
            Back home
          </Link>
        </motion.div>
      </main>
    )
  }

  // ── File handling ─────────────────────────────────────────────────────────
  const onPickFile = (e) => {
    const f = e.target.files?.[0]
    setFileErr('')
    if (!f) return setFile(null)
    const okType =
      ['application/pdf', 'image/png', 'image/jpeg'].includes(f.type) ||
      /\.(pdf|png|jpe?g)$/i.test(f.name)
    if (!okType) { setFileErr('Only PDF, PNG, or JPEG files are allowed.'); e.target.value = ''; return }
    if (f.size > MAX_FILE) { setFileErr('File is too large. Maximum size is 5 MB.'); e.target.value = ''; return }
    setFile(f)
  }

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setFileErr('')
    if (!file) { setFileErr('Please upload your vehicle Registration Certificate (RC).'); return }
    setBusy(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      fd.append('age', String(form.age))
      fd.append('rcDocument', file, file.name)
      await apiUpload('/drivers/apply', fd)
      // Refresh the global appStatus so the navbar updates immediately
      await refreshAppStatus()
      setDone(true)
      setApp(null)
      setReapply(false)
    } catch (e2) {
      setErr(e2.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  // ── Application form ──────────────────────────────────────────────────────
  return (
    <main className="auth-page">
      <motion.div
        className="auth-card wide"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="eyebrow">{reapply ? 'Re-apply' : 'Become a driver'}</span>
        <h1 className="auth-title">
          Drive with <span className="it accent">DriveSync.</span>
        </h1>
        <p className="auth-sub">
          Apply to drive customers' own cars. Verified drivers earn on their own schedule.
          An RC document is required for verification.
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
                <option value="" disabled>Select</option>
                {EXP.map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Location</span>
              <input value={form.location} onChange={set('location')} required placeholder="e.g. Kukatpally" />
            </label>
          </div>

          <div className="field-divider" />
          <span className="field-section mono">Vehicle &amp; verification</span>

          <div className="field-row">
            <label className="field">
              <span>Vehicle registration no. (RC)</span>
              <input value={form.vehicleNumber} onChange={set('vehicleNumber')} required placeholder="e.g. TS09 AB 1234" />
            </label>
            <label className="field">
              <span>Vehicle category</span>
              <select value={form.vehicleCategory} onChange={set('vehicleCategory')} required>
                <option value="" disabled>Select</option>
                {VEHICLE_CATEGORIES.map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Vehicle make</span>
              <input value={form.vehicleMake} onChange={set('vehicleMake')} required placeholder="e.g. Maruti Suzuki" />
            </label>
            <label className="field">
              <span>Vehicle model</span>
              <input value={form.vehicleModel} onChange={set('vehicleModel')} required placeholder="e.g. Swift Dzire" />
            </label>
          </div>

          <label className="field">
            <span>Past experience (optional)</span>
            <input value={form.pastExperience} onChange={set('pastExperience')} placeholder="e.g. Ola driver — 3 years" />
          </label>

          {/* RC document upload */}
          <div className="field">
            <span>Registration Certificate (RC) document</span>
            <div className={`file-drop ${file ? 'has-file' : ''}`}>
              <input ref={fileInput} type="file" accept={ACCEPT} onChange={onPickFile} id="rc-upload" className="file-input" />
              {file ? (
                <div className="file-chip">
                  <FileText size={16} />
                  <span className="file-chip-name">{file.name}</span>
                  <span className="file-chip-size mono">{(file.size / 1024).toFixed(0)} KB</span>
                  <button type="button" className="file-chip-x" onClick={() => { setFile(null); if (fileInput.current) fileInput.current.value = '' }} aria-label="Remove file">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label htmlFor="rc-upload" className="file-drop-label">
                  <UploadCloud size={20} />
                  <span><b>Upload RC</b> — PDF, PNG, or JPEG · max 5 MB</span>
                </label>
              )}
            </div>
            {fileErr && <div className="auth-err">{fileErr}</div>}
          </div>

          {err && <div className="auth-err">{err}</div>}
          <button className="btn btn-primary btn-lg auth-submit" disabled={busy}>
            {busy ? <Loader2 className="spin" size={18} /> : <>{reapply ? 'Re-submit application' : 'Submit application'} <ArrowRight size={18} /></>}
          </button>
        </form>
      </motion.div>
    </main>
  )
}
