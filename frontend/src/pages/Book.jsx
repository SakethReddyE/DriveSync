import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2, Check } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const AREAS = [
  'Kukatpally', 'Madhapur', 'HITEC City', 'Gachibowli', 'Kondapur', 'Banjara Hills',
  'Jubilee Hills', 'Ameerpet', 'Begumpet', 'Secunderabad', 'Miyapur', 'LB Nagar',
]

const initials = (n) =>
  (n || '')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

export default function Book() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')
  const [pickup, setPickup] = useState('')
  const [drop, setDrop] = useState('')
  const [selected, setSelected] = useState(null)
  const [fare, setFare] = useState(null)
  const [fareBusy, setFareBusy] = useState(false)
  const [booking, setBooking] = useState(false)
  const [booked, setBooked] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    api('/drivers/available', { auth: false })
      .then((d) => setDrivers(d.drivers || []))
      .catch((e) => setLoadErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  const canFare = pickup.trim() && drop.trim() && selected
  useEffect(() => {
    if (!canFare) {
      setFare(null)
      return
    }
    let alive = true
    setFareBusy(true)
    api('/rides/fare', { method: 'POST', auth: false, body: { pickup, drop, distanceKm: 8 } })
      .then((d) => alive && setFare({ ...d.fare, distanceKm: d.distanceKm }))
      .catch(() => {})
      .finally(() => alive && setFareBusy(false))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, drop, selected])

  const book = async () => {
    setErr('')
    if (!user) return navigate('/signin')
    if (user.role !== 'user') return setErr('Only rider accounts can book — sign up as a rider.')
    if (!fare) return
    setBooking(true)
    try {
      const d = await api('/rides/book', {
        method: 'POST',
        body: {
          driverId: selected._id,
          pickup,
          drop,
          distanceKm: fare.distanceKm,
          fare: {
            base: fare.base,
            distance: fare.distance,
            serviceFee: fare.serviceFee,
            total: fare.total,
          },
        },
      })
      setBooked({ ride: d.ride || d, driver: selected, fare, pickup, drop })
    } catch (e) {
      setErr(e.message)
    } finally {
      setBooking(false)
    }
  }

  const reset = () => {
    setBooked(null)
    setSelected(null)
    setPickup('')
    setDrop('')
    setFare(null)
    setErr('')
  }

  if (booked) {
    return (
      <main className="book-page">
        <motion.div
          className="book-confirm"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <span className="confirm-check">
            <Check size={30} strokeWidth={3} />
          </span>
          <span className="eyebrow">Ride requested</span>
          <h1 className="book-title">
            You’re <span className="it accent">set.</span>
          </h1>
          <p className="auth-sub">
            <b>{booked.driver.name}</b> has been requested for your trip from <b>{booked.pickup}</b>{' '}
            to <b>{booked.drop}</b>.
          </p>
          <div className="fare-box">
            <div className="fare-row">
              <span>Driver</span>
              <b>{booked.driver.name}</b>
            </div>
            <div className="fare-row">
              <span>Distance</span>
              <b>{booked.fare.distanceKm} km</b>
            </div>
            <div className="fare-row total">
              <span>Total fare</span>
              <b>₹{booked.fare.total}</b>
            </div>
          </div>
          <div className="confirm-actions">
            <button className="btn btn-primary" onClick={reset}>
              Book another
            </button>
            <Link to="/" className="btn btn-ghost">
              Back home
            </Link>
          </div>
          <p className="book-hint mono">Live tracking + your rides dashboard — coming next.</p>
        </motion.div>
      </main>
    )
  }

  return (
    <main className="book-page">
      <div className="container book-grid">
        <div className="book-form">
          <span className="eyebrow">Book a driver</span>
          <h1 className="book-title">
            Where to, <span className="it accent">today?</span>
          </h1>

          <div className="book-locs">
            <div className="loc-field">
              <span className="loc-dot dot-a" />
              <input
                list="areas"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                placeholder="Pickup location"
              />
            </div>
            <div className="loc-field">
              <span className="loc-dot dot-b" />
              <input
                list="areas"
                value={drop}
                onChange={(e) => setDrop(e.target.value)}
                placeholder="Drop location"
              />
            </div>
            <datalist id="areas">
              {AREAS.map((a) => (
                <option key={a} value={`${a}, Hyderabad`} />
              ))}
            </datalist>
          </div>

          {selected &&
            (fareBusy ? (
              <div className="fare-box fare-loading">
                <Loader2 className="spin" size={16} /> Estimating fare…
              </div>
            ) : (
              fare && (
                <div className="fare-box">
                  <div className="fare-row">
                    <span>Base fare</span>
                    <b>₹{fare.base}</b>
                  </div>
                  <div className="fare-row">
                    <span>Distance ({fare.distanceKm} km)</span>
                    <b>₹{fare.distance}</b>
                  </div>
                  <div className="fare-row">
                    <span>Service fee</span>
                    <b>₹{fare.serviceFee}</b>
                  </div>
                  <div className="fare-row total">
                    <span>Total</span>
                    <b>₹{fare.total}</b>
                  </div>
                </div>
              )
            ))}

          {err && <div className="auth-err">{err}</div>}

          <button
            className="btn btn-primary btn-lg book-cta"
            disabled={!selected || !fare || booking}
            onClick={book}
          >
            {booking ? (
              <Loader2 className="spin" size={18} />
            ) : (
              <>
                {user ? 'Confirm booking' : 'Sign in to book'} <ArrowRight size={18} />
              </>
            )}
          </button>
          {!selected && <p className="book-hint mono">Pick a driver from the list →</p>}
        </div>

        <div className="book-drivers">
          <div className="book-drivers-head">
            <span className="mono">Available drivers</span>
            <span className="mono">{drivers.length} online</span>
          </div>

          {loading && (
            <div className="driver-loading">
              <Loader2 className="spin" size={20} /> Waking the backend & loading drivers…
            </div>
          )}
          {loadErr && <div className="auth-err">{loadErr}</div>}

          <div className="driver-list">
            {drivers.map((d) => (
              <button
                key={d._id}
                className={`driver-card ${selected?._id === d._id ? 'sel' : ''}`}
                onClick={() => setSelected(d)}
              >
                <span className="driver-av" style={{ background: d.color || 'var(--ink)' }}>
                  {initials(d.name)}
                </span>
                <span className="driver-info">
                  <span className="driver-name">{d.name}</span>
                  <span className="driver-meta mono">
                    ★ {d.rating} · {d.experience} · {d.location}
                  </span>
                </span>
                <span className="driver-rides mono">
                  {d.totalRides}
                  <small>rides</small>
                </span>
                {selected?._id === d._id && (
                  <span className="driver-check">
                    <Check size={13} strokeWidth={3} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
