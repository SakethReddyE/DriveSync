import { ArrowRight } from 'lucide-react'
import { Reveal, Magnetic } from '../lib/ui'

export default function CTA() {
  return (
    <section className="section" id="drivers">
      <div className="container">
        <Reveal className="cta-band grad-border">
          <div className="cta-glow" aria-hidden />
          <span className="eyebrow">Get moving</span>
          <h2 className="cta-title">
            Ready when <span className="grad-text">you are.</span>
          </h2>
          <p className="lead cta-sub">
            Book a verified driver in under a minute — or start earning as one. DriveSync runs on
            your schedule, in your car.
          </p>
          <div className="cta-actions">
            <Magnetic as="a" href="#book" className="btn btn-primary btn-lg interactive">
              Book a Driver <ArrowRight size={18} />
            </Magnetic>
            <Magnetic as="a" href="#" className="btn btn-ghost btn-lg interactive">
              Become a Driver
            </Magnetic>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
