import { useEffect, useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import Chart from '../components/Chart'

const initials = (n) =>
  (n || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

function StatCard({ num, label }) {
  return (
    <div className="stat-card">
      <span className="stat-card-num">{num}</span>
      <span className="stat-card-label mono">{label}</span>
    </div>
  )
}

const TABS = ['requests', 'drivers', 'users', 'rides']

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [chart, setChart] = useState(null)
  const [tab, setTab] = useState('requests')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const loadStats = useCallback(
    () =>
      Promise.all([api('/admin/stats'), api('/rides/chart-data')])
        .then(([s, c]) => {
          setStats(s.stats)
          setChart(c)
        })
        .catch((e) => setErr(e.message)),
    [],
  )

  const loadTab = useCallback((t) => {
    setLoading(true)
    const ep =
      t === 'requests'
        ? '/admin/drivers/pending'
        : t === 'drivers'
          ? '/admin/drivers/active'
          : t === 'users'
            ? '/admin/users'
            : '/admin/rides'
    const key = t === 'users' ? 'users' : t === 'rides' ? 'rides' : 'drivers'
    return api(ep)
      .then((d) => setList(d[key] || []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])
  useEffect(() => {
    loadTab(tab)
  }, [tab, loadTab])

  const act = async (id, action) => {
    setErr('')
    try {
      if (action === 'approve') await api(`/admin/drivers/${id}/approve`, { method: 'PATCH' })
      else if (action === 'reject') await api(`/admin/drivers/${id}/reject`, { method: 'PATCH' })
      else if (action === 'remove') await api(`/admin/drivers/${id}`, { method: 'DELETE' })
      loadTab(tab)
      loadStats()
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <main className="dash">
      <div className="container">
        <span className="eyebrow">Admin</span>
        <h1 className="dash-title">
          Operations <span className="it accent">console.</span>
        </h1>

        <div className="stat-cards">
          <StatCard num={stats?.totalUsers ?? '—'} label="Users" />
          <StatCard num={stats?.activeDrivers ?? '—'} label="Active drivers" />
          <StatCard num={stats?.pendingDrivers ?? '—'} label="Pending" />
          <StatCard num={stats?.totalRides ?? '—'} label="Total rides" />
        </div>

        {chart && (
          <div className="chart-grid">
            <div className="chart-card">
              <h4 className="mono">Rides · last 7 days</h4>
              <Chart type="bar" labels={chart.labels} values={chart.ridesPerDay} accent="var(--ink)" />
            </div>
            <div className="chart-card">
              <h4 className="mono">Revenue · last 7 days</h4>
              <Chart
                type="line"
                labels={chart.labels}
                values={chart.revenuePerDay}
                accent="var(--persimmon)"
              />
            </div>
          </div>
        )}

        <div className="tabs">
          {TABS.map((t) => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>

        {err && <div className="auth-err">{err}</div>}

        {loading ? (
          <div className="driver-loading">
            <Loader2 className="spin" size={20} /> Loading…
          </div>
        ) : (
          <div className="admin-list">
            {tab === 'requests' &&
              list.map((dr) => (
                <div className="admin-row" key={dr._id}>
                  <span className="ride-av" style={{ background: dr.color || 'var(--ink)' }}>
                    {initials(dr.name)}
                  </span>
                  <div className="admin-row-main">
                    <b>{dr.name}</b>
                    <span className="mono">
                      {dr.email} · {dr.location} · {dr.experience}
                    </span>
                  </div>
                  <div className="req-actions">
                    <button className="rl-btn" onClick={() => act(dr._id, 'reject')}>
                      Reject
                    </button>
                    <button className="rl-btn solid" onClick={() => act(dr._id, 'approve')}>
                      Approve
                    </button>
                  </div>
                </div>
              ))}

            {tab === 'drivers' &&
              list.map((dr) => (
                <div className="admin-row" key={dr._id}>
                  <span className="ride-av" style={{ background: dr.color || 'var(--ink)' }}>
                    {initials(dr.name)}
                  </span>
                  <div className="admin-row-main">
                    <b>{dr.name}</b>
                    <span className="mono">
                      ★{dr.rating} · {dr.location} · {dr.totalRides} rides ·{' '}
                      {dr.online ? 'online' : 'offline'}
                    </span>
                  </div>
                  <div className="req-actions">
                    <button className="rl-btn" onClick={() => act(dr._id, 'remove')}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}

            {tab === 'users' &&
              list.map((u) => (
                <div className="admin-row" key={u._id}>
                  <span className="ride-av">{initials(u.name)}</span>
                  <div className="admin-row-main">
                    <b>{u.name}</b>
                    <span className="mono">
                      {u.email} · {u.phone}
                    </span>
                  </div>
                </div>
              ))}

            {tab === 'rides' &&
              list.map((r) => (
                <div className="admin-row" key={r._id}>
                  <div className="admin-row-main">
                    <b>
                      {r.pickup} → {r.drop}
                    </b>
                    <span className="mono">
                      {r.user?.name || '—'} · {r.driver?.name || '—'} · ₹{r.fare?.total}
                    </span>
                  </div>
                  <span className={`st st-${r.status}`}>{r.status}</span>
                </div>
              ))}

            {list.length === 0 && <div className="dash-note mono">Nothing here yet.</div>}
          </div>
        )}
      </div>
    </main>
  )
}
