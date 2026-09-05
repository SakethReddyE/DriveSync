import { motion } from 'framer-motion'
import { MapPin, UserCheck, Car } from 'lucide-react'
import { Reveal, StaggerGroup, staggerItem } from '../lib/ui'

const STEPS = [
  {
    icon: MapPin,
    n: '01',
    title: 'Set your trip',
    text: 'Enter pickup and drop. We instantly estimate distance and a transparent fare — no surge, no surprises.',
  },
  {
    icon: UserCheck,
    n: '02',
    title: 'Match a driver',
    text: 'Choose from verified, background-checked drivers near you. See ratings, experience and rides at a glance.',
  },
  {
    icon: Car,
    n: '03',
    title: 'Ride in your car',
    text: 'Your driver arrives and drives your own vehicle. Track them live and pay cashless when you’re done.',
  },
]

export default function HowItWorks() {
  return (
    <section className="section" id="how">
      <div className="container">
        <Reveal className="section-head">
          <span className="eyebrow">How it works</span>
          <h2 className="section-title">
            Three taps from <span className="grad-text-static">door to driver.</span>
          </h2>
        </Reveal>

        <StaggerGroup className="steps-grid">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <motion.div className="step grad-border interactive" key={i} variants={staggerItem}>
                <div className="step-top">
                  <span className="step-icon">
                    <Icon size={22} />
                  </span>
                  <span className="step-n">{s.n}</span>
                </div>
                <h3 className="step-title">{s.title}</h3>
                <p className="step-text">{s.text}</p>
              </motion.div>
            )
          })}
        </StaggerGroup>
      </div>
    </section>
  )
}
