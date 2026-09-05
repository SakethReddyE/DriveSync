import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useMotionValue, useSpring, animate } from 'framer-motion'

const EASE = [0.2, 0.8, 0.2, 1]

/* Scroll-triggered reveal wrapper */
export function Reveal({ children, delay = 0, y = 28, className = '', as = 'div', ...rest }) {
  const Comp = motion[as] || motion.div
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </Comp>
  )
}

/* Staggered container + item */
export function StaggerGroup({ children, className = '', stagger = 0.09 }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      variants={{ show: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </motion.div>
  )
}
export const staggerItem = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}

/* Button/link that leans toward the cursor */
export function Magnetic({ children, strength = 0.35, as = 'button', className = '', ...props }) {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 })
  const sy = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 })

  const handleMove = (e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * strength)
    y.set((e.clientY - (r.top + r.height / 2)) * strength)
  }
  const reset = () => {
    x.set(0)
    y.set(0)
  }
  const Comp = motion[as] || motion.button
  return (
    <Comp
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ x: sx, y: sy }}
      className={className}
      {...props}
    >
      {children}
    </Comp>
  )
}

/* 3D tilt on pointer position */
export function TiltCard({ children, max = 9, className = '', style = {} }) {
  const ref = useRef(null)
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const srx = useSpring(rx, { stiffness: 150, damping: 14 })
  const sry = useSpring(ry, { stiffness: 150, damping: 14 })

  const handleMove = (e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    rx.set(-py * max * 2)
    ry.set(px * max * 2)
  }
  const reset = () => {
    rx.set(0)
    ry.set(0)
  }
  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900, ...style }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* Number that counts up when scrolled into view */
export function CountUp({ to, decimals = 0, prefix = '', suffix = '', duration = 1.9, format }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, to, {
      duration,
      ease: EASE,
      onUpdate: (v) => setVal(v),
    })
    return () => controls.stop()
  }, [inView, to, duration])

  const shown = format
    ? format(val)
    : decimals > 0
      ? val.toFixed(decimals)
      : Math.round(val).toLocaleString()

  return (
    <span ref={ref} className="mono-num">
      {prefix}
      {shown}
      {suffix}
    </span>
  )
}
