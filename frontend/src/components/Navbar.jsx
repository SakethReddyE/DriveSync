import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'

const LINKS = [
  { label: 'How it works', href: '/#how' },
  { label: 'Why us', href: '/#features' },
  { label: 'Drivers', href: '/#drivers' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()

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

  return (
    <motion.header
      className={`nav ${scrolled ? 'nav-scrolled' : ''}`}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay: 0.05 }}
    >
      <div className="nav-inner container">
        <Logo />

        <nav className="nav-links">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>

        <div className="nav-actions">
          {user ? (
            <>
              <Link to={dashPath} className="nav-user mono">
                {firstName}
              </Link>
              <button className="nav-signin nav-logout" onClick={logout} title="Log out">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <Link to="/signin" className="nav-signin">
              Sign in
            </Link>
          )}
          <Link to="/book" className="btn btn-primary nav-cta">
            Book a Driver
          </Link>
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
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
                {l.label}
              </a>
            ))}
            {user ? (
              <>
                <Link to={dashPath} onClick={() => setOpen(false)}>
                  Dashboard
                </Link>
                <button
                  className="nav-mobile-signout"
                  onClick={() => {
                    logout()
                    setOpen(false)
                  }}
                >
                  Log out ({firstName})
                </button>
              </>
            ) : (
              <Link to="/signin" onClick={() => setOpen(false)}>
                Sign in
              </Link>
            )}
            <Link to="/book" className="btn btn-primary" onClick={() => setOpen(false)}>
              Book a Driver
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
