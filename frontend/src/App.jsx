import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Intro from './components/Intro'
import PaperBg from './components/PaperBg'
import Navbar from './components/Navbar'
import Hero from './sections/Hero'
import Marquee from './sections/Marquee'
import Stats from './sections/Stats'
import HowItWorks from './sections/HowItWorks'
import Features from './sections/Features'
import CTA from './sections/CTA'
import Footer from './sections/Footer'

export default function App() {
  const [intro, setIntro] = useState(() => {
    try {
      return !sessionStorage.getItem('ds_intro_done')
    } catch (e) {
      return true
    }
  })

  return (
    <>
      <PaperBg />
      <AnimatePresence>
        {intro && <Intro key="intro" onDone={() => setIntro(false)} />}
      </AnimatePresence>
      <Navbar />
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
