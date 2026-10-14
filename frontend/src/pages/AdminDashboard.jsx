import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2, X, FileText, ExternalLink, Users, Car, Clock,
  CheckCircle, AlertCircle, BarChart2, Search, RefreshCw,
  ChevronRight, Shield
} from 'lucide-react'
import { api, apiBlob } from '../lib/api'
import Chart from '../components/Chart'

const initials = (n) =>
  (n || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

function StatCard({ num, label, icon, accent }) {
  return (
    <div className="adm-stat-card">
      <div className={`adm-stat-icon ${accent || ''}`}>{icon}</div>
      <div>
        <div className="adm-stat-num">{num ?? '—'}</div>
        <div className="adm-stat-label mono">{label}</div>
      </div>
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="adm-empty">
      <p className="mono">{message}</p>
    </div>
  )
}

function LoadingSkeleton({ rows = 4 }) {
  return (
    <div className="adm-skeletons">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="adm-skeleton-row" />
      ))}
    </div>
  )
}

/** Inline confirmation dialog before destructive quick-actions */
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <motion.div
      className="adm-confirm"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
    >
      <p className="adm-confirm-msg">{message}</p>
      <div className="adm-confirm-actions">
        <button className="rl-btn" onClick={onCancel}>Cancel</button>
        <button className="rl-btn solid" onClick={onConfirm}>Confirm</button>
      </div>
    </motion.div>
  )
}

/**
 * Application review modal — full detail view with private RC access.
 * Only mounts for admins; the backend enforces auth separately.
 */
function ReviewModal({ driver, onClose, onAct }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [docBusy, setDocBusy] = useState(false)

  const openRc = async () => {
    setErr('')
    setDocBusy(true)
    try {
      const blob = await apiBlob(`/admin/drivers/${driver._id}/rc-document`)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e) {
      setErr(e.message || 'Could not load the RC document.')
    } finally {
      setDocBusy(false)
    }
  }

  const act = async (action) => {
    if (action === 'reject' && !reason.trim()) {
      setErr('Please enter a rejection reason.')
      return
    }
    setErr('')
    setBusy(action)
    try {
      await onAct(driver._id, action, action === 'reject' ? reason.trim() : undefined)
    } catch (e) {
      setErr(e.message)
      setBusy('')
    }
  }

  const Row = ({ label, value }) => (
    <div className="rv-row">
      <span className="mono rv-label">{label}</span>
      <span className="rv-value">{value || '—'}</span>
    </div>
  )

  const isPending = driver.status === 'pending'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal rv-modal adm-review-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22 }}
      >
        <button className="modal-x" onClick={onClose} aria-label="Close"><X size={18} /></button>

        <div className="rv-header">
          <span className={`rv-av`} style={{ background: driver.color || 'var(--ink)' }}>
            {initials(driver.name)}
          </span>
          <div>
            <span className="eyebrow" style={{ marginBottom: '4px' }}>Application review</span>
            <h3 className="rv-name">{driver.name}</h3>
          </div>
          <span className={`st st-${driver.status} rv-status-badge`}>{driver.status}</span>
        </div>

        <div className="rv-grid">
          <div className="rv-section">
            <p className="rv-section-heading mono">Personal details</p>
            <Row label="Email" value={driver.email} />
            <Row label="Phone" value={driver.phone} />
            <Row label="Age" value={driver.age} />
            <Row label="Location" value={driver.location} />
            <Row label="Experience" value={driver.experience} />
            <Row label="Licence" value={driver.licence} />
            <Row label="Past experience" value={driver.pastExperience} />
          </div>
          <div className="rv-section">
            <p className="rv-section-heading mono">Vehicle &amp; documents</p>
            <Row label="Reg. number" value={driver.vehicleNumber} />
            <Row label="Make" value={driver.vehicleMake} />
            <Row label="Model" value={driver.vehicleModel} />
            <Row label="Category" value={driver.vehicleCategory} />
            <div className="rv-row rv-doc">
              <span className="mono rv-label">RC document</span>
              {driver.rcDocument ? (
                <button className="rl-btn solid rv-doc-btn" onClick={openRc} disabled={docBusy}>
                  {docBusy ? <Loader2 className="spin" size={13} /> : <FileText size={13} />}
                  View RC <ExternalLink size={11} />
                </button>
              ) : (
                <span className="mono rv-missing">Not provided</span>
              )}
            </div>
            <Row label="Submitted" value={new Date(driver.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
            {driver.reviewedAt && (
              <Row label="Reviewed" value={new Date(driver.reviewedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
            )}
            {driver.reviewedBy && <Row label="Reviewed by" value={driver.reviewedBy} />}
            {driver.rejectionReason && <Row label="Rejection reason" value={driver.rejectionReason} />}
          </div>
        </div>

        {err && <div className="auth-err" style={{ margin: '12px 0 0' }}>{err}</div>}

        {isPending && (
          <>
            <textarea
              className="modal-textarea adm-reject-reason"
              placeholder="Rejection reason — required when rejecting"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="rv-actions">
              <button
                className="rl-btn adm-btn-reject"
                onClick={() => act('reject')}
                disabled={!!busy}
              >
                {busy === 'reject' ? <Loader2 className="spin" size={13} /> : <AlertCircle size={13} />}
                Reject
              </button>
              <button
                className="rl-btn solid adm-btn-approve"
                onClick={() => act('approve')}
                disabled={!!busy}
              >
                {busy === 'approve' ? <Loader2 className="spin" size={13} /> : <CheckCircle size={13} />}
                Approve
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}

// ─── Tab config ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'requests', label: 'Pending', icon: <Clock size={14} /> },
  { id: 'rejected', label: 'Rejected', icon: <AlertCircle size={14} /> },
  { id: 'drivers', label: 'Active drivers', icon: <Car size={14} /> },
  { id: 'users', label: 'Users', icon: <Users size={14} /> },
  { id: 'rides', label: 'Rides', icon: <BarChart2 size={14} /> },
]

const TAB_ENDPOINT = {
  requests: '/admin/drivers/pending',
  rejected: '/admin/drivers/rejected',
  drivers: '/admin/drivers/active',
  users: '/admin/users',
  rides: '/admin/rides',
}
const TAB_KEY = {
  requests: 'drivers', rejected: 'drivers', drivers: 'drivers',
  users: 'users', rides: 'rides',
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [chart, setChart] = useState(null)
  const [tab, setTab] = useState('requests')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [err, setErr] = useState('')
  const [review, setReview] = useState(null)
  const [search, setSearch] = useState('')
  const [confirmAction, setConfirmAction] = useState(null) // { id, action, label }

  const loadStats = useCallback(() => {
    setStatsLoading(true)
    return Promise.all([api('/admin/stats'), api('/rides/chart-data')])
      .then(([s, c]) => { setStats(s.stats); setChart(c) })
      .catch((e) => setErr(e.message))
      .finally(() => setStatsLoading(false))
  }, [])

  const loadTab = useCallback((t) => {
    setLoading(true)
    setSearch('')
    return api(TAB_ENDPOINT[t])
      .then((d) => setList(d[TAB_KEY[t]] || []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { loadTab(tab) }, [tab, loadTab])

  const act = useCallback(async (id, action, reason) => {
    setErr('')
    try {
      if (action === 'approve')
        await api(`/admin/drivers/${id}/approve`, { method: 'PATCH' })
      else if (action === 'reject')
        await api(`/admin/drivers/${id}/reject`, { method: 'PATCH', body: { rejectionReason: reason || '' } })
      else if (action === 'remove')
        await api(`/admin/drivers/${id}`, { method: 'DELETE' })
      await Promise.all([loadTab(tab), loadStats()])
    } catch (e) {
      setErr(e.message)
      throw e
    }
  }, [tab, loadTab, loadStats])

  const onReviewAct = async (id, action, reason) => {
    await act(id, action, reason)
    setReview(null)
  }

  // Quick-action with confirmation dialog
  const quickAct = (id, action, label) => {
    setConfirmAction({ id, action, label })
  }
  const confirmDo = async () => {
    if (!confirmAction) return
    const { id, action } = confirmAction
    setConfirmAction(null)
    await act(id, action)
  }

  // Client-side search filter
  const filtered = list.filter((item) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const name = (item.name || item.pickup || '').toLowerCase()
    const email = (item.email || '').toLowerCase()
    return name.includes(q) || email.includes(q)
  })

  return (
    <main className="dash adm-dash">
      <div className="container">
        {/* Header */}
        <div className="adm-header">
          <div>
            <span className="eyebrow">Admin</span>
            <h1 className="dash-title">
              Operations <span className="it accent">console.</span>
            </h1>
          </div>
          <button
            className="adm-refresh-btn"
            onClick={() => { loadTab(tab); loadStats() }}
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Stats row */}
        <div className="adm-stats">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="adm-stat-card adm-stat-skel" />
            ))
          ) : (
            <>
              <StatCard num={stats?.totalUsers} label="Total users" icon={<Users size={18} />} />
              <StatCard num={stats?.activeDrivers} label="Active drivers" icon={<Car size={18} />} accent="adm-accent-green" />
              <StatCard num={stats?.pendingDrivers} label="Pending review" icon={<Clock size={18} />} accent="adm-accent-amber" />
              <StatCard num={stats?.totalRides} label="Total rides" icon={<BarChart2 size={18} />} accent="adm-accent-blue" />
            </>
          )}
        </div>

        {/* Charts */}
        {chart && (
          <div className="chart-grid adm-chart-grid">
            <div className="chart-card adm-chart-card">
              <h4 className="mono adm-chart-title">Rides · last 7 days</h4>
              <Chart type="bar" labels={chart.labels} values={chart.ridesPerDay} accent="var(--ink)" />
            </div>
            <div className="chart-card adm-chart-card">
              <h4 className="mono adm-chart-title">Revenue · last 7 days</h4>
              <Chart type="line" labels={chart.labels} values={chart.revenuePerDay} accent="var(--persimmon)" />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="adm-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`adm-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.icon}
              {t.label}
              {t.id === 'requests' && stats?.pendingDrivers > 0 && (
                <span className="adm-tab-badge">{stats.pendingDrivers}</span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        {(tab === 'requests' || tab === 'rejected' || tab === 'drivers' || tab === 'users') && (
          <div className="adm-search-wrap">
            <Search size={14} className="adm-search-icon" />
            <input
              className="adm-search"
              placeholder={`Search ${tab}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {err && <div className="auth-err adm-err">{err}</div>}

        {/* Confirm dialog */}
        <AnimatePresence>
          {confirmAction && (
            <ConfirmDialog
              message={`Are you sure you want to ${confirmAction.label}?`}
              onConfirm={confirmDo}
              onCancel={() => setConfirmAction(null)}
            />
          )}
        </AnimatePresence>

        {/* List */}
        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : filtered.length === 0 ? (
          <EmptyState message={search ? 'No results match your search.' : 'Nothing here yet.'} />
        ) : (
          <div className="adm-list">
            {/* ── Pending / Rejected applications ───────────────────────── */}
            {(tab === 'requests' || tab === 'rejected') &&
              filtered.map((dr) => (
                <div className="adm-row" key={dr._id}>
                  <span className="ride-av adm-av" style={{ background: dr.color || 'var(--ink)' }}>
                    {initials(dr.name)}
                  </span>
                  <div className="adm-row-main">
                    <div className="adm-row-name">{dr.name}</div>
                    <div className="adm-row-meta mono">
                      {dr.email}
                      {dr.location && <> · {dr.location}</>}
                      {dr.vehicleNumber && <> · <Car size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {dr.vehicleNumber}</>}
                    </div>
                    {dr.rejectionReason && (
                      <div className="adm-rejection-snippet mono">
                        Reason: {dr.rejectionReason.slice(0, 80)}{dr.rejectionReason.length > 80 ? '…' : ''}
                      </div>
                    )}
                  </div>
                  <span className={`st st-${dr.status}`}>{dr.status}</span>
                  <div className="adm-row-actions">
                    <button className="adm-row-btn" onClick={() => setReview(dr)}>
                      Review <ChevronRight size={13} />
                    </button>
                    {tab === 'requests' && (
                      <>
                        <button className="adm-row-btn adm-btn-danger" onClick={() => quickAct(dr._id, 'reject', `reject ${dr.name}'s application`)}>
                          Reject
                        </button>
                        <button className="adm-row-btn adm-btn-success" onClick={() => act(dr._id, 'approve')}>
                          <CheckCircle size={13} /> Approve
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}

            {/* ── Active drivers ─────────────────────────────────────────── */}
            {tab === 'drivers' &&
              filtered.map((dr) => (
                <div className="adm-row" key={dr._id}>
                  <span className="ride-av adm-av" style={{ background: dr.color || 'var(--ink)' }}>
                    {initials(dr.name)}
                  </span>
                  <div className="adm-row-main">
                    <div className="adm-row-name">{dr.name}</div>
                    <div className="adm-row-meta mono">
                      {dr.email} · ★{dr.rating} · {dr.totalRides} rides · {dr.location}
                    </div>
                  </div>
                  <span className={`st ${dr.online ? 'st-confirmed' : 'st-cancelled'}`}>
                    {dr.online ? 'online' : 'offline'}
                  </span>
                  <div className="adm-row-actions">
                    <button className="adm-row-btn" onClick={() => setReview(dr)}>Details</button>
                    <button className="adm-row-btn adm-btn-danger" onClick={() => quickAct(dr._id, 'remove', `remove ${dr.name}`)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}

            {/* ── Users ──────────────────────────────────────────────────── */}
            {tab === 'users' &&
              filtered.map((u) => (
                <div className="adm-row" key={u._id}>
                  <span className="ride-av adm-av">{initials(u.name)}</span>
                  <div className="adm-row-main">
                    <div className="adm-row-name">{u.name}</div>
                    <div className="adm-row-meta mono">{u.email} · {u.phone}</div>
                  </div>
                  <span className="st st-confirmed">rider</span>
                </div>
              ))}

            {/* ── Rides ──────────────────────────────────────────────────── */}
            {tab === 'rides' &&
              filtered.map((r) => (
                <div className="adm-row" key={r._id}>
                  <div className="adm-row-main">
                    <div className="adm-row-name">{r.pickup} → {r.drop}</div>
                    <div className="adm-row-meta mono">
                      {r.user?.name || '—'} · {r.driver?.name || '—'} · ₹{r.fare?.total}
                    </div>
                  </div>
                  <span className={`st st-${r.status}`}>{r.status}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {review && (
          <ReviewModal key={review._id} driver={review} onClose={() => setReview(null)} onAct={onReviewAct} />
        )}
      </AnimatePresence>
    </main>
  )
}
