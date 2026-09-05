import { motion } from 'framer-motion'
import { ArrowRight, ShieldCheck, Clock } from 'lucide-react'
import { Magnetic } from '../lib/ui'
import LiveMapCard from '../components/LiveMapCard'

const lineReveal = {
  hidden: { y: '115%' },
  show: (i) => ({
    y: 0,
    transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1], delay: 0.15 + i * 0.12 },
  }),
}

export default function Hero() {
  return (
    <section className="hero" id="book">
      <div className="container hero-grid">
        <div className="hero-copy">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            <span className="pill">
              <span className="dot" /> Hyderabad’s personal driver service
            </span>
          </motion.div>

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
                className="grad-text"
                variants={lineReveal}
                custom={2}
                initial="hidden"
                animate="show"
              >
                Your schedule.
              </motion.span>
            </span>
          </h1>

          <motion.p
            className="lead hero-lead"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75, duration: 0.7 }}
          >
            Hire a verified professional driver for your <em>own</em> vehicle — by the hour, the
            trip, or whenever you need one. Booked in seconds, tracked in real time.
          </motion.p>

          <motion.div
            className="hero-cta"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
          >
            <Magnetic as="a" href="#book" className="btn btn-primary btn-lg interactive">
              Book a Driver <ArrowRight size={18} />
            </Magnetic>
            <Magnetic as="a" href="#drivers" className="btn btn-ghost btn-lg interactive">
              Become a Driver
            </Magnetic>
          </motion.div>

          <motion.div
            className="hero-trust"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.05, duration: 0.7 }}
          >
            <div className="avatars">
              {['#a855f7', '#22d3ee', '#ec4899', '#4f7cff'].map((c, i) => (
                <span key={i} className="av" style={{ background: c }} />
              ))}
            </div>
            <span>
              <b>2,400+</b> verified drivers · <span className="stars">★ 4.9</span> avg rating
            </span>
          </motion.div>
        </div>

        <div className="hero-visual">
          <LiveMapCard />
          <motion.div
            className="float-chip chip-a glass"
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ShieldCheck size={15} /> Background-checked
          </motion.div>
          <motion.div
            className="float-chip chip-b glass"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Clock size={15} /> 99.2% on-time
          </motion.div>
        </div>
      </div>
    </section>
  )
}
