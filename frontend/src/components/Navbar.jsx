import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'

const BASE_LINKS = [
  { label: 'How it works', href: '/#how' },
  { label: 'Why us', href: '/#features' },
  { label: 'Drivers', href: '/#drivers' },
]

/**
 * Derive the "Become a Driver" nav link destination based on auth state.
 * Returns null for roles where it should not be shown at all.
 */
function becomeDriverDest(user, appStatus) {
  if (!user) return '/signin?next=/become-driver'
  if (user.role === 'admin') return null           // admins never see this CTA
  if (user.role === 'driver') return '/driver'     // already a driver → dashboard
  if (user.role === 'driver-pending') return '/become-driver' // show status
  // role === 'user'
  if (appStatus === 'approved') return '/driver'
  return '/become-driver'
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { user, loading, appStatus, logout } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const firstName = user?.name ? user.name.split(' ')[0] : 'Account'
  const dashPath =
    user?.role === 'admin'
      ? '/admin'
      : user?.role === 'driver' || user?.role === 'driver-pending'
        ? '/driver'
        : '/dashboard'

  const isAdmin = user?.role === 'admin'
  const isDriver = user?.role === 'driver' || user?.role === 'driver-pending'

  const driverDest = loading ? null : becomeDriverDest(user, appStatus)

  return (
    <motion.header
      className={`nav ${scrolled ? 'nav-scrolled' : ''}`}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay: 0.05 }}
    >
      <div className="nav-inner container">
        <Logo />

        {/* Desktop centre links — hide for admins (they use the dashboard) */}
        {!isAdmin && (
          <nav className="nav-links">
            {BASE_LINKS.map((l) => (
              <a key={l.href} href={l.href}>
                {l.label}
              </a>
            ))}
          </nav>
        )}

        <div className="nav-actions">
          {/* Session-restore skeleton */}
          {loading ? (
            <span className="nav-skeleton" aria-hidden="true" />
          ) : user ? (
            <>
              {/* Become a Driver — only non-admin, non-driver users */}
              {!isAdmin && !isDriver && driverDest && (
                <Link to={driverDest} className="nav-become">
                  Become a Driver
                </Link>
              )}

              <Link to={dashPath} className="nav-user mono">
                {firstName}
              </Link>
              <button className="nav-signin nav-logout" onClick={logout} title="Log out">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              {/* Logged-out: show Become a Driver + Sign in */}
              {driverDest && (
                <Link to={driverDest} className="nav-become">
                  Become a Driver
                </Link>
              )}
              <Link to="/signin" className="nav-signin">
                Sign in
              </Link>
            </>
          )}

          {/* "Book a Driver" CTA — never shown to admins */}
          {!isAdmin && (
            <Link to="/book" className="btn btn-primary nav-cta">
              Book a Driver
            </Link>
          )}

          {/* Admin gets a direct dashboard CTA instead */}
          {isAdmin && user && (
            <Link to="/admin" className="btn btn-primary nav-cta">
              Dashboard
            </Link>
          )}

          <button className="nav-burger" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="nav-mobile"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            {!isAdmin &&
              BASE_LINKS.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
                  {l.label}
                </a>
              ))}

            {loading ? (
              <span className="nav-skeleton nav-skeleton-inline" aria-hidden="true" />
            ) : user ? (
              <>
                {/* Become a Driver in mobile menu — users without driver status */}
                {!isAdmin && !isDriver && driverDest && (
                  <Link to={driverDest} onClick={() => setOpen(false)} className="nav-become-mobile">
                    Become a Driver
                  </Link>
                )}
                <Link to={dashPath} onClick={() => setOpen(false)}>
                  Dashboard
                </Link>
                <LogoutButton setOpen={setOpen} firstName={firstName} />
              </>
            ) : (
              <>
                {driverDest && (
                  <Link to={driverDest} onClick={() => setOpen(false)} className="nav-become-mobile">
                    Become a Driver
                  </Link>
                )}
                <Link to="/signin" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
              </>
            )}

            {!isAdmin && (
              <Link to="/book" className="btn btn-primary" onClick={() => setOpen(false)}>
                Book a Driver
              </Link>
            )}
            {isAdmin && user && (
              <Link to="/admin" className="btn btn-primary" onClick={() => setOpen(false)}>
                Admin Dashboard
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}

/** Separated so the logout button can cleanly call the hook */
function LogoutButton({ setOpen, firstName }) {
  const { logout } = useAuth()
  return (
    <button
      className="nav-mobile-signout"
      onClick={() => {
        logout()
        setOpen(false)
      }}
    >
      Log out ({firstName})
    </button>
  )
}
