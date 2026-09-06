import { useEffect, useMemo, useRef, useState } from 'react'
import { useScroll, useMotionValueEvent } from 'framer-motion'
import CarShape from './CarShape'

/* A serpentine route spanning the page (from below the nav to just above the
   footer). As you scroll, the car drives it, the trail fills persimmon behind
   it, waypoints light up, and each section blooms as the car reaches it. */
function buildRoute(w, top, bottom) {
  if (!w || bottom <= top) return { d: '', waypoints: [] }
  const cx = w / 2
  const amp = Math.min(w * 0.34, 360)
  const seg = 460
  const waypoints = []
  let x = cx - amp * 0.25
  let y = top
  let d = `M ${x.toFixed(1)} ${y.toFixed(1)}`
  let dir = 1
  while (y < bottom - 10) {
    const ny = Math.min(bottom, y + seg)
    const nx = cx + dir * amp
    const cy = y + (ny - y) * 0.5
    d += ` C ${x.toFixed(1)} ${cy.toFixed(1)}, ${nx.toFixed(1)} ${cy.toFixed(1)}, ${nx.toFixed(1)} ${ny.toFixed(1)}`
    waypoints.push({ x: nx, y: ny })
    x = nx
    y = ny
    dir *= -1
  }
  return { d, waypoints }
}

export default function ScrollRoute() {
  const [geo, setGeo] = useState({ w: 0, h: 0, top: 96, bottom: 0 })
  const baseRef = useRef(null)
  const drawRef = useRef(null)
  const carRef = useRef(null)
  const glowRef = useRef(null)
  const wpRefs = useRef([])
  const sectionsRef = useRef([])
  const lenRef = useRef(0)
  const last = useRef({ w: 0, h: 0, bottom: 0 })
  const { scrollYProgress } = useScroll()

  useEffect(() => {
    const measure = () => {
      const w = document.documentElement.clientWidth
      const h = document.documentElement.scrollHeight
      const footer = document.querySelector('.footer')
      const bottom = footer ? footer.offsetTop - 48 : h - 90
      if (
        Math.abs(w - last.current.w) < 2 &&
        Math.abs(h - last.current.h) < 8 &&
        Math.abs(bottom - last.current.bottom) < 8
      )
        return
      last.current = { w, h, bottom }
      // sections to bloom (skip the hero — it's full from the start)
      const secs = Array.from(document.querySelectorAll('main > section'))
      secs.forEach((el, i) => {
        if (i > 0) el.classList.add('bloomable')
      })
      sectionsRef.current = secs
      setGeo({ w, h, top: 96, bottom })
    }
    measure()
    const t1 = setTimeout(measure, 500)
    const t2 = setTimeout(measure, 1600)
    window.addEventListener('resize', measure)
    const ro = new ResizeObserver(measure)
    ro.observe(document.body)
    return () => {
      window.removeEventListener('resize', measure)
      clearTimeout(t1)
      clearTimeout(t2)
      ro.disconnect()
    }
  }, [])

  const { d, waypoints } = useMemo(
    () => buildRoute(geo.w, geo.top, geo.bottom),
    [geo.w, geo.top, geo.bottom],
  )

  const update = (p) => {
    const base = baseRef.current
    const draw = drawRef.current
    const car = carRef.current
    const len = lenRef.current
    if (!base || !draw || !car || !len) return
    const cl = Math.max(0, Math.min(1, p))
    draw.style.strokeDashoffset = `${len * (1 - cl)}`
    const pt = base.getPointAtLength(len * cl)
    const ahead = base.getPointAtLength(Math.min(len, len * cl + 2))
    const ang = (Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180) / Math.PI
    car.setAttribute('transform', `translate(${pt.x} ${pt.y}) rotate(${ang})`)
    if (glowRef.current) glowRef.current.setAttribute('transform', `translate(${pt.x} ${pt.y})`)

    for (let i = 0; i < wpRefs.current.length; i++) {
      const el = wpRefs.current[i]
      const wp = waypoints[i]
      if (!el || !wp) continue
      if (pt.y >= wp.y - 6) el.classList.add('wp-lit')
      else el.classList.remove('wp-lit')
    }

    // bloom sections the car has reached (on screen)
    const carScreenY = pt.y - window.scrollY
    const secs = sectionsRef.current
    for (let i = 1; i < secs.length; i++) {
      const el = secs[i]
      if (!el || el.classList.contains('bloomed')) continue
      const r = el.getBoundingClientRect()
      if (carScreenY >= r.top + 24) el.classList.add('bloomed')
    }
  }

  useEffect(() => {
    const draw = drawRef.current
    if (!draw || !d) return
    const len = draw.getTotalLength()
    lenRef.current = len
    draw.style.strokeDasharray = `${len}`
    update(scrollYProgress.get())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d])

  useMotionValueEvent(scrollYProgress, 'change', update)

  return (
    <div className="route-layer" style={{ height: geo.h || '100%' }} aria-hidden>
      <svg width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`} fill="none">
        <defs>
          <radialGradient id="carGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--persimmon)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--persimmon)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <path
          ref={baseRef}
          d={d}
          stroke="rgba(23,19,13,0.12)"
          strokeWidth="2.5"
          strokeDasharray="1 13"
          strokeLinecap="round"
        />
        <path ref={drawRef} d={d} stroke="var(--persimmon)" strokeWidth="3" strokeLinecap="round" />

        {waypoints.map((wp, i) => (
          <circle
            key={i}
            ref={(el) => (wpRefs.current[i] = el)}
            className="wp"
            cx={wp.x}
            cy={wp.y}
            r="6.5"
          />
        ))}

        <circle ref={glowRef} className="route-glow" r="60" />
        <g ref={carRef} className="route-car">
          <CarShape scale={0.95} />
        </g>
      </svg>
    </div>
  )
}
