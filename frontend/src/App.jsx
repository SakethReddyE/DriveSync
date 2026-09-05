import Cursor from './components/Cursor'
import Aurora from './components/Aurora'
import Navbar from './components/Navbar'
import Hero from './sections/Hero'
import Marquee from './sections/Marquee'
import Stats from './sections/Stats'
import HowItWorks from './sections/HowItWorks'
import Features from './sections/Features'
import CTA from './sections/CTA'
import Footer from './sections/Footer'

export default function App() {
  return (
    <>
      <Aurora />
      <Cursor />
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
