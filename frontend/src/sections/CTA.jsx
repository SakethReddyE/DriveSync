import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Reveal } from '../lib/ui'

export default function CTA() {
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
          <div className="cta-actions">
            <Link to="/book" className="btn btn-cta-primary btn-lg">
              Book a Driver <ArrowRight size={18} />
            </Link>
            <Link to="/become-driver" className="btn btn-cta-ghost btn-lg">
              Become a Driver
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
