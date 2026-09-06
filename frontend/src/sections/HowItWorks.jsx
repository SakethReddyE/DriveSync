import { motion } from 'framer-motion'
import { Reveal, StaggerGroup, staggerItem } from '../lib/ui'

const STEPS = [
  {
    n: '01',
    title: 'Set your trip',
    text: 'Enter pickup and drop. We instantly estimate distance and a transparent fare — no surge, no surprises.',
  },
  {
    n: '02',
    title: 'Match a driver',
    text: 'Choose from verified, background-checked drivers near you. Ratings, experience and rides, at a glance.',
  },
  {
    n: '03',
    title: 'Ride in your car',
    text: 'Your driver arrives and drives your own vehicle. Track them live and pay cashless when you’re done.',
  },
]

export default function HowItWorks() {
  return (
    <section className="section rule-top" id="how">
      <div className="container">
        <Reveal className="section-head">
          <span className="eyebrow">How it works</span>
          <h2 className="section-title">
            Three stops from <span className="it accent">door to driver.</span>
          </h2>
        </Reveal>

        <StaggerGroup className="steps-grid">
          {STEPS.map((s, i) => (
            <motion.div className="step" key={i} variants={staggerItem}>
              <span className="step-n">{s.n}</span>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-text">{s.text}</p>
            </motion.div>
          ))}
        </StaggerGroup>
      </div>
    </section>
  )
}
