import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Loader2, Star } from 'lucide-react'
import { api } from '../lib/api'
import { getSocket } from '../lib/socket'
import CarShape from '../components/CarShape'

const initials = (n) =>
  (n || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

const STATUS_TEXT = {
  pending: 'Finding your driver…',
  confirmed: 'Your driver is on the way',
  completed: 'Trip completed',
  cancelled: 'Ride cancelled',
  rejected: 'Request declined',
}

function TrackMap({ moving }) {
  const route = 'M60 320 H210 Q230 320 230 300 V200 Q230 180 250 180 H430 Q450 180 450 160 V80'
  return (
    <svg className="track-svg" viewBox="0 0 520 380" preserveAspectRatio="xMidYMid slice">
      <rect x="0" y="0" width="520" height="380" fill="#e9edf1" />
      <rect x="0" y="0" width="150" height="70" fill="#a9d4f5" />
      <rect x="330" y="220" width="190" height="160" fill="#c7e3c0" />
      <g fill="#dde3e8">
        <rect x="90" y="100" width="130" height="60" rx="3" />
        <rect x="270" y="90" width="120" height="60" rx="3" />
        <rect x="30" y="210" width="120" height="110" rx="3" />
      </g>
      <g stroke="#c9d0d5" strokeWidth="15" strokeLinecap="round">
        <path d="M0 80H520M0 180H520M0 300H520" />
        <path d="M60 0V380M230 0V380M450 0V380" />
      </g>
      <g stroke="#fff" strokeWidth="9" strokeLinecap="round">
        <path d="M0 80H520M0 180H520M0 300H520" />
        <path d="M60 0V380M230 0V380M450 0V380" />
      </g>
      <path d={route} fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      <path id="trackRoute" d={route} fill="none" stroke="#1a73e8" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="60" cy="320" r="9" fill="#1a8a3f" stroke="#fff" strokeWidth="3" />
      <g>
        <path d="M450 60 C440 60 433 68 433 78 C433 90 450 106 450 106 C450 106 467 90 467 78 C467 68 460 60 450 60 Z" fill="var(--persimmon)" stroke="#fff" strokeWidth="2.5" />
        <circle cx="450" cy="78" r="6" fill="#fff" />
      </g>
      {moving && (
        <g>
          <g>
            <CarShape scale={0.9} />
          </g>
          <animateMotion dur="8s" repeatCount="indefinite" rotate="auto">
            <mpath href="#trackRoute" />
          </animateMotion>
        </g>
      )}
    </svg>
  )
}

export default function Track() {
  const { id } = useParams()
  const [ride, setRide] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const load = useCallback(
    () =>
      api('/rides/my')
        .then((d) => {
          const r = (d.rides || []).find((x) => x._id === id)
          if (!r) setErr('Ride not found.')
          else setRide(r)
        })
        .catch((e) => setErr(e.message))
        .finally(() => setLoading(false)),
    [id],
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

  if (loading)
    return (
      <main className="dash">
        <div className="container">
          <div className="driver-loading">
            <Loader2 className="spin" size={20} /> Loading trip…
          </div>
        </div>
      </main>
    )
  if (err || !ride)
    return (
      <main className="dash">
        <div className="container">
          <div className="auth-err">{err || 'Ride not found.'}</div>
          <Link to="/dashboard" className="btn btn-ghost" style={{ marginTop: 16 }}>
            Back to rides
          </Link>
        </div>
      </main>
    )

  const moving = ride.status === 'confirmed'

  return (
    <main className="track-page">
      <div className="container track-grid">
        <div className="track-map">
          <span className={`map-live ${moving ? '' : 'off'}`}>
            <span className="dot" /> {moving ? 'LIVE' : ride.status.toUpperCase()}
          </span>
          <TrackMap moving={moving} />
        </div>

        <div className="track-panel">
          <span className="eyebrow">Live tracking</span>
          <h1 className="dash-title">{STATUS_TEXT[ride.status] || ride.status}</h1>

          <div className="track-route">
            <div className="dir-row">
              <span className="dir-dot dot-a" />
              <span className="dir-addr">{ride.pickup}</span>
            </div>
            <div className="dir-row">
              <span className="dir-dot dot-b" />
              <span className="dir-addr">{ride.drop}</span>
            </div>
          </div>

          <div className="track-driver">
            <span className="ride-av" style={{ background: ride.driver?.color || 'var(--ink)' }}>
              {initials(ride.driver?.name)}
            </span>
            <div className="track-driver-info">
              <b>{ride.driver?.name || 'Your driver'}</b>
              <span className="mono">
                <Star size={11} fill="currentColor" /> {ride.driver?.rating || '—'} ·{' '}
                {ride.driver?.location || 'Hyderabad'}
              </span>
            </div>
            <div className="track-fare">
              <b>₹{ride.fare?.total}</b>
              <span className="mono">{ride.distanceKm} km</span>
            </div>
          </div>

          <Link to="/dashboard" className="btn btn-ghost" style={{ width: '100%' }}>
            Back to my rides
          </Link>
        </div>
      </div>
    </main>
  )
}
