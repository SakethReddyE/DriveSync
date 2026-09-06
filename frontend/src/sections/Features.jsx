import { motion } from 'framer-motion'
import { Radar, ShieldCheck, ReceiptText, Star, BellRing, LayoutDashboard } from 'lucide-react'
import { Reveal, TiltCard, StaggerGroup, staggerItem } from '../lib/ui'

const FEATURES = [
  {
    icon: Radar,
    title: 'Real-time tracking',
    text: 'Watch your driver approach on a live map with second-by-second ETA — powered by websockets, not polling.',
    tint: 'var(--persimmon)',
  },
  {
    icon: ShieldCheck,
    title: 'Verified drivers',
    text: 'Every driver is background-checked, licence-verified, and rated by real riders before they ever pick up.',
    tint: 'var(--cobalt)',
  },
  {
    icon: ReceiptText,
    title: 'Transparent fares',
    text: 'See the full breakdown — base, distance, service fee — before you confirm. No surge pricing, ever.',
    tint: 'var(--sage)',
  },
  {
    icon: Star,
    title: 'Two-way ratings',
    text: 'Riders rate drivers and drivers rate riders, so the quality bar stays high on both sides of every trip.',
    tint: 'var(--amber)',
  },
  {
    icon: BellRing,
    title: 'Instant dispatch',
    text: 'Ride requests reach nearby online drivers the moment you book. Accept, and you’re matched in real time.',
    tint: 'var(--persimmon)',
  },
  {
    icon: LayoutDashboard,
    title: 'Ops dashboard',
    text: 'Admins approve drivers and watch live analytics — rides, revenue and ratings — as they happen.',
    tint: 'var(--cobalt)',
  },
]

export default function Features() {
  return (
    <section className="section rule-top" id="features">
      <div className="container">
        <Reveal className="section-head">
          <span className="eyebrow">Why DriveSync</span>
          <h2 className="section-title">
            Built like a product, <span className="it accent">not a demo.</span>
          </h2>
        </Reveal>

        <StaggerGroup className="bento">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <motion.div key={i} variants={staggerItem}>
                <TiltCard className="bento-card" max={7}>
                  <span className="bento-icon" style={{ '--tint': f.tint }}>
                    <Icon size={20} strokeWidth={2.2} />
                  </span>
                  <h3 className="bento-title">{f.title}</h3>
                  <p className="bento-text">{f.text}</p>
                </TiltCard>
              </motion.div>
            )
          })}
        </StaggerGroup>
      </div>
    </section>
  )
}
