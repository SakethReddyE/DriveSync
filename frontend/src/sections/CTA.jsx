import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Reveal } from '../lib/ui'
import { useAuth } from '../context/AuthContext'

export default function CTA() {
  const { user, loading } = useAuth()

  const isAdmin = user?.role === 'admin'
  const isDriver = user?.role === 'driver' || user?.role === 'driver-pending'

  return (
    <section className="section" id="drivers">
      <div className="container">
        <Reveal className="cta-band">
          <span className="eyebrow cta-eyebrow">Get moving</span>
          <h2 className="cta-title">
            Ready when <span className="it">you are.</span>
          </h2>
          <p className="cta-sub">
            Book a verified driver in under a minute — or start earning as one. DriveSync runs on
            your schedule, in your car.
          </p>

          {!loading && (
            <div className="cta-actions">
              {!isAdmin && !isDriver && (
                <Link to="/book" className="btn btn-cta-primary btn-lg">
                  Book a Driver <ArrowRight size={18} />
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" className="btn btn-cta-primary btn-lg">
                  Admin Dashboard <ArrowRight size={18} />
                </Link>
              )}
              {isDriver && (
                <Link to="/driver" className="btn btn-cta-primary btn-lg">
                  Driver Dashboard <ArrowRight size={18} />
                </Link>
              )}
              {!isAdmin && !isDriver && (
                <Link to={user ? '/become-driver' : '/signin?next=/become-driver'} className="btn btn-cta-ghost btn-lg">
                  Become a Driver
                </Link>
              )}
            </div>
          )}
        </Reveal>
      </div>
    </section>
  )
}
