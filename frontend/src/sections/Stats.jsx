import { motion } from 'framer-motion'
import { CountUp, StaggerGroup, staggerItem } from '../lib/ui'

const STATS = [
  { to: 2400, suffix: '+', label: 'Verified drivers' },
  { to: 48, suffix: 'K+', label: 'Happy customers' },
  { to: 4.9, decimals: 1, suffix: '★', label: 'Average rating' },
  { to: 99.2, decimals: 1, suffix: '%', label: 'On-time rate' },
]

export default function Stats() {
  return (
    <section className="stats-section rule-top">
      <StaggerGroup className="container stats-grid">
        {STATS.map((s, i) => (
          <motion.div className="stat" key={i} variants={staggerItem}>
            <div className="stat-num">
              <CountUp to={s.to} decimals={s.decimals || 0} suffix={s.suffix} />
            </div>
            <div className="stat-label mono">{s.label}</div>
          </motion.div>
        ))}
      </StaggerGroup>
    </section>
  )
}
