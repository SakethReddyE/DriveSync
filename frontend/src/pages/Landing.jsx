import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import Intro from '../components/Intro'
import ScrollRoute from '../components/ScrollRoute'
import Hero from '../sections/Hero'
import Marquee from '../sections/Marquee'
import Stats from '../sections/Stats'
import HowItWorks from '../sections/HowItWorks'
import Features from '../sections/Features'
import CTA from '../sections/CTA'
import Footer from '../sections/Footer'

const STORAGE_KEY = 'ds_intro_seen'

/**
 * Check once at module evaluation time so the initial state is
 * synchronous — avoids a flash of the intro on refresh within the same session.
 */
function shouldShowIntro() {
  try {
    return !sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return true // storage unavailable → always show
  }
}

export default function Landing() {
  // initialise synchronously so there is no frame where `intro=false` flips to `true`
  const [intro, setIntro] = useState(shouldShowIntro)

  // Respect prefers-reduced-motion: skip the intro entirely.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches && intro) {
      markSeen()
      setIntro(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function markSeen() {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  const handleIntroDone = () => {
    // Only mark as seen when the animation actually finishes (or is skipped),
    // not before — so a hard refresh still shows it on the very first load.
    markSeen()
    setIntro(false)
  }

  return (
    <>
      <ScrollRoute />
      <AnimatePresence>
        {intro && <Intro key="intro" onDone={handleIntroDone} />}
      </AnimatePresence>
      <main>
        <Hero />
        <Marquee />
        <Stats />
        <HowItWorks />
        <Features />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
