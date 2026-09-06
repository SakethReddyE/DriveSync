import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import LiveMapCard from '../components/LiveMapCard'

const lineReveal = {
  hidden: { y: '110%' },
  show: (i) => ({
    y: 0,
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.25 + i * 0.13 },
  }),
}
const fade = (delay) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.7, ease: [0.2, 0.8, 0.2, 1] },
})

export default function Hero() {
  return (
    <section className="hero" id="book">
      <div className="container hero-grid">
        <div className="hero-copy">
          <motion.span className="eyebrow" {...fade(0.15)}>
            Hyderabad · personal driver service
          </motion.span>

          <h1 className="display hero-title">
            <span className="line">
              <motion.span variants={lineReveal} custom={0} initial="hidden" animate="show">
                Your driver.
              </motion.span>
            </span>
            <span className="line">
              <motion.span variants={lineReveal} custom={1} initial="hidden" animate="show">
                Your car.
              </motion.span>
            </span>
            <span className="line">
              <motion.span
                className="it accent"
                variants={lineReveal}
                custom={2}
                initial="hidden"
                animate="show"
              >
                Your schedule.
              </motion.span>
            </span>
          </h1>

          <motion.p className="lead hero-lead" {...fade(0.85)}>
            Hire a verified professional driver for your <em>own</em> vehicle — by the hour, the
            trip, or whenever you need one. Booked in seconds, tracked in real time.
          </motion.p>

          <motion.div className="hero-cta" {...fade(1)}>
            <Link to="/book" className="btn btn-primary btn-lg">
              Book a Driver <ArrowRight size={18} />
            </Link>
            <Link to="/become-driver" className="btn btn-ghost btn-lg">
              Become a Driver
            </Link>
          </motion.div>

          <motion.div className="hero-trust" {...fade(1.15)}>
            <div className="avatars">
              {['RK', 'SB', 'PV', 'MI'].map((n, i) => (
                <span key={i} className="av mono">
                  {n}
                </span>
              ))}
            </div>
            <span className="hero-trust-text">
              <b>2,400+</b> verified drivers · <span className="stars">★ 4.9</span> avg rating
            </span>
          </motion.div>
        </div>

        <div className="hero-visual">
          <LiveMapCard />
          <motion.div
            className="stamp"
            initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: -9 }}
            transition={{ delay: 1.1, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <span className="mono">
              VERIFIED
              <br />· DRIVER ·
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
