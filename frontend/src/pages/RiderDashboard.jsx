import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, X } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { getSocket } from '../lib/socket'

const STATUS = {
  pending: { label: 'Awaiting driver', cls: 'st-pending' },
  confirmed: { label: 'Confirmed', cls: 'st-confirmed' },
  completed: { label: 'Completed', cls: 'st-completed' },
  cancelled: { label: 'Cancelled', cls: 'st-cancelled' },
  rejected: { label: 'Declined', cls: 'st-rejected' },
}
const initials = (n) =>
  (n || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

function Stars({ label, value, onChange }) {
  return (
    <div className="stars-row">
      <span className="mono">{label}</span>
      <div className="stars-pick">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`star ${n <= value ? 'lit' : ''}`}
            onClick={() => onChange(n)}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  )
}

function RateModal({ ride, onClose, onDone }) {
  const [dr, setDr] = useState(0)
  const [sr, setSr] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    if (!dr || !sr) return setErr('Please rate both driver and service.')
    setBusy(true)
    try {
      await api(`/rides/${ride._id}/rate`, {
        method: 'POST',
        body: { driverRating: dr, serviceRating: sr, comment },
      })
      onDone()
    } catch (e) {
      setErr(e.message)
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        <button className="modal-x" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <span className="eyebrow">Rate your ride</span>
        <h3 className="modal-title">How was {ride.driver?.name?.split(' ')[0] || 'your driver'}?</h3>
        <Stars label="Driver" value={dr} onChange={setDr} />
        <Stars label="Service" value={sr} onChange={setSr} />
        <textarea
          className="modal-textarea"
          placeholder="Anything to add? (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        {err && <div className="auth-err">{err}</div>}
        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
          disabled={busy}
          onClick={submit}
        >
          {busy ? <Loader2 className="spin" size={18} /> : 'Submit rating'}
        </button>
      </motion.div>
    </div>
  )
}

export default function RiderDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState({ rides: [], totalSpent: 0, avgRating: null })
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [rateFor, setRateFor] = useState(null)

  const load = useCallback(
    () =>
      api('/rides/my')
        .then((d) => setData(d))
        .catch((e) => setErr(e.message))
        .finally(() => setLoading(false)),
    [],
  )

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const s = getSocket()
    if (!s) return
    const refresh = () => load()
    s.on('ride_accepted', refresh)
    s.on('ride_rejected', refresh)
    return () => {
      s.off('ride_accepted', refresh)
      s.off('ride_rejected', refresh)
    }
  }, [load])

  const cancel = async (id) => {
    try {
      await api(`/rides/${id}/cancel`, { method: 'PATCH' })
      load()
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <main className="dash">
      <div className="container">
        <div className="dash-head">
          <div>
            <span className="eyebrow">Your rides</span>
            <h1 className="dash-title">
              Hey, <span className="it accent">{user?.name?.split(' ')[0] || 'rider'}.</span>
            </h1>
          </div>
          <Link to="/book" className="btn btn-primary">
            Book a ride
          </Link>
        </div>

        <div className="stat-cards">
          <div className="stat-card">
            <span className="stat-card-num">{data.rides.length}</span>
            <span className="stat-card-label mono">Total rides</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-num">₹{data.totalSpent || 0}</span>
            <span className="stat-card-label mono">Total spent</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-num">{data.avgRating ? `${data.avgRating}★` : '—'}</span>
            <span className="stat-card-label mono">Avg rating given</span>
          </div>
        </div>

        {loading ? (
          <div className="driver-loading">
            <Loader2 className="spin" size={20} /> Loading your rides…
          </div>
        ) : err ? (
          <div className="auth-err">{err}</div>
        ) : data.rides.length === 0 ? (
          <div className="dash-empty">
            <p>No rides yet.</p>
            <Link to="/book" className="btn btn-primary">
              Book your first ride
            </Link>
          </div>
        ) : (
          <div className="ride-list">
            {data.rides.map((r) => (
              <div className="ride-card" key={r._id}>
                <span
                  className="ride-av"
                  style={{ background: r.driver?.color || 'var(--ink)' }}
                >
                  {initials(r.driver?.name)}
                </span>
                <div className="ride-main">
                  <div className="ride-route">
                    <b>{r.pickup}</b> <span className="arrow">→</span> <b>{r.drop}</b>
                  </div>
                  <div className="ride-sub mono">
                    {r.driver?.name || 'Driver'} ·{' '}
                    {new Date(r.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    · {r.distanceKm} km
                  </div>
                </div>
                <div className="ride-right">
                  <span className={`st ${STATUS[r.status]?.cls || ''}`}>
                    {STATUS[r.status]?.label || r.status}
                  </span>
                  <b className="ride-fare">₹{r.fare?.total}</b>
                </div>
                <div className="ride-actions">
                  {r.status === 'pending' && (
                    <button className="rl-btn" onClick={() => cancel(r._id)}>
                      Cancel
                    </button>
                  )}
                  {r.status === 'confirmed' && (
                    <Link className="rl-btn" to={`/track/${r._id}`}>
                      Track
                    </Link>
                  )}
                  {(r.status === 'confirmed' || r.status === 'completed') && !r.rated && (
                    <button className="rl-btn accent" onClick={() => setRateFor(r)}>
                      Rate
                    </button>
                  )}
                  {r.rated && <span className="rl-rated mono">★ {r.driverRating}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {rateFor && (
        <RateModal
          ride={rateFor}
          onClose={() => setRateFor(null)}
          onDone={() => {
            setRateFor(null)
            load()
          }}
        />
      )}
    </main>
  )
}
