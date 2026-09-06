import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Clock } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { getSocket } from '../lib/socket'

function StatCard({ num, label }) {
  return (
    <div className="stat-card">
      <span className="stat-card-num">{num}</span>
      <span className="stat-card-label mono">{label}</span>
    </div>
  )
}

export default function DriverDashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [toggling, setToggling] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(
    () =>
      api('/drivers/me')
        .then((d) => setProfile(d))
        .catch((e) => setErr(e.message))
        .finally(() => setLoading(false)),
    [],
  )
  const loadReqs = useCallback(
    () =>
      api('/rides/pending-for-driver')
        .then((d) => setRequests(d.rides || []))
        .catch(() => {}),
    [],
  )

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    loadReqs()
    const t = setInterval(loadReqs, 8000)
    return () => clearInterval(t)
  }, [loadReqs])

  useEffect(() => {
    const s = getSocket()
    if (!s) return
    const onReq = (data) =>
      setRequests((prev) =>
        prev.find((r) => r._id === data.rideId)
          ? prev
          : [
              {
                _id: data.rideId,
                pickup: data.pickup,
                drop: data.drop,
                distanceKm: data.distanceKm,
                fare: data.fare,
                user: data.user,
                _new: true,
              },
              ...prev,
            ],
      )
    const onCancel = ({ rideId }) => setRequests((prev) => prev.filter((r) => r._id !== rideId))
    s.on('new_ride_request', onReq)
    s.on('ride_cancelled', onCancel)
    return () => {
      s.off('new_ride_request', onReq)
      s.off('ride_cancelled', onCancel)
    }
  }, [])

  const toggle = async () => {
    setToggling(true)
    setMsg('')
    try {
      const d = await api('/drivers/toggle-online', { method: 'PATCH' })
      setProfile((p) => ({ ...p, driver: { ...p.driver, online: d.online } }))
      setMsg(d.message)
    } catch (e) {
      setErr(e.message)
    } finally {
      setToggling(false)
    }
  }

  const respond = async (id, action) => {
    try {
      await api(`/rides/${id}/${action}`, { method: 'PATCH' })
      setRequests((prev) => prev.filter((r) => r._id !== id))
      load()
    } catch (e) {
      setErr(e.message)
    }
  }

  if (loading)
    return (
      <main className="dash">
        <div className="container">
          <div className="driver-loading">
            <Loader2 className="spin" size={20} /> Loading dashboard…
          </div>
        </div>
      </main>
    )

  const d = profile?.driver || {}
  const pending = d.status === 'pending' || user?.role === 'driver-pending'

  if (pending) {
    return (
      <main className="dash">
        <div className="container">
          <div className="pending-card">
            <span className="pending-icon">
              <Clock size={28} />
            </span>
            <span className="eyebrow">Application received</span>
            <h1 className="dash-title">
              Under <span className="it accent">review.</span>
            </h1>
            <p className="auth-sub">
              Thanks {d.name?.split(' ')[0] || 'there'} — an admin is reviewing your application.
              Once approved, you can go online and start accepting rides.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="dash">
      <div className="container">
        <div className="dash-head">
          <div>
            <span className="eyebrow">Driver dashboard</span>
            <h1 className="dash-title">
              Welcome, <span className="it accent">{d.name?.split(' ')[0] || 'driver'}.</span>
            </h1>
          </div>
          <button
            className={`toggle ${d.online ? 'on' : ''}`}
            onClick={toggle}
            disabled={toggling}
          >
            <span className="toggle-track">
              <span className="toggle-knob" />
            </span>
            <span className="toggle-label mono">{toggling ? '…' : d.online ? 'ONLINE' : 'OFFLINE'}</span>
          </button>
        </div>
        {msg && <div className="dash-msg mono">{msg}</div>}
        {err && <div className="auth-err">{err}</div>}

        <div className="stat-cards">
          <StatCard num={d.totalRides ?? 0} label="Total rides" />
          <StatCard num={`₹${profile.totalIncome || 0}`} label="Earnings" />
          <StatCard num={`${d.rating || 0}★`} label="Rating" />
          <StatCard num={requests.length} label="Live requests" />
        </div>

        <h2 className="dash-section-title">Incoming requests</h2>
        {!d.online && (
          <div className="dash-note mono">You’re offline — go online to receive ride requests.</div>
        )}
        {d.online && requests.length === 0 && (
          <div className="dash-note mono">
            <Loader2 className="spin" size={14} /> Waiting for ride requests…
          </div>
        )}
        <div className="req-list">
          <AnimatePresence>
            {requests.map((r) => (
              <motion.div
                className={`req-card ${r._new ? 'new' : ''}`}
                key={r._id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="req-main">
                  <div className="ride-route">
                    <b>{r.pickup}</b> <span className="arrow">→</span> <b>{r.drop}</b>
                  </div>
                  <div className="ride-sub mono">
                    {r.user?.name || 'Rider'} · {r.distanceKm} km · ₹{r.fare?.total}
                  </div>
                </div>
                <div className="req-actions">
                  <button className="rl-btn" onClick={() => respond(r._id, 'reject')}>
                    Decline
                  </button>
                  <button className="rl-btn solid" onClick={() => respond(r._id, 'accept')}>
                    Accept
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <h2 className="dash-section-title">Ride history</h2>
        <div className="ride-list">
          {(profile.rides || []).map((r) => (
            <div className="ride-card" key={r._id}>
              <div className="ride-main">
                <div className="ride-route">
                  <b>{r.pickup}</b> <span className="arrow">→</span> <b>{r.drop}</b>
                </div>
                <div className="ride-sub mono">
                  {r.user?.name || 'Rider'} ·{' '}
                  {new Date(r.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </div>
              </div>
              <div className="ride-right">
                <span className={`st st-${r.status}`}>{r.status}</span>
                <b className="ride-fare">₹{r.fare?.total}</b>
              </div>
            </div>
          ))}
          {(!profile.rides || profile.rides.length === 0) && (
            <div className="dash-note mono">No rides yet.</div>
          )}
        </div>
      </div>
    </main>
  )
}
