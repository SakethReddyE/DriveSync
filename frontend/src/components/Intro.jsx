import { useEffect } from 'react'
import { motion } from 'framer-motion'
import CarShape from './CarShape'

/* Story intro: a route draws, the car drives it, and the DriveSync wordmark
   sits dead-centre. Plays on every load; skippable. */
export default function Intro({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])

  const skip = () => onDone()

  return (
    <motion.div
      className="intro"
      initial={{ y: 0 }}
      exit={{ y: '-102%' }}
      transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1] }}
    >
      <button className="intro-skip mono" onClick={skip}>
        skip →
      </button>

      <div className="intro-inner">
        <svg className="intro-map" viewBox="0 0 300 120" fill="none">
          <path
            d="M22 92 C 92 92, 92 30, 152 30 S 232 74, 282 36"
            stroke="rgba(23,19,13,0.12)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <motion.path
            id="introRoute"
            d="M22 92 C 92 92, 92 30, 152 30 S 232 74, 282 36"
            stroke="var(--persimmon)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
          />
          <circle cx="22" cy="92" r="5.5" fill="var(--ink)" />
          <circle cx="282" cy="36" r="5.5" fill="var(--persimmon)" />
          <g>
            <g>
              <CarShape scale={0.62} />
            </g>
            <animateMotion
              dur="2s"
              begin="0.5s"
              fill="freeze"
              rotate="auto"
              calcMode="spline"
              keyPoints="0;1"
              keyTimes="0;1"
              keySplines="0.4 0 0.2 1"
            >
              <mpath href="#introRoute" />
            </animateMotion>
          </g>
        </svg>

        <motion.h1
          className="intro-word"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        >
          Drive<span className="accent">Sync</span>
        </motion.h1>

        <motion.div
          className="intro-sub mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.9, duration: 0.5 }}
        >
          arranging your driver
          <span className="intro-dots">
            <i>.</i>
            <i>.</i>
            <i>.</i>
          </span>
        </motion.div>
      </div>
    </motion.div>
  )
}
