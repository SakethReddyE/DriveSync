import { useEffect, useRef } from 'react'

/* Glowing dot + trailing ring that reacts to interactive elements. Desktop only. */
export default function Cursor() {
  const dot = useRef(null)
  const ring = useRef(null)

  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    document.body.classList.add('hide-cursor')

    let mx = window.innerWidth / 2
    let my = window.innerHeight / 2
    let rx = mx
    let ry = my
    let raf

    const move = (e) => {
      mx = e.clientX
      my = e.clientY
      if (dot.current) {
        dot.current.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`
      }
    }
    const loop = () => {
      rx += (mx - rx) * 0.18
      ry += (my - ry) * 0.18
      if (ring.current) {
        ring.current.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`
      }
      raf = requestAnimationFrame(loop)
    }
    loop()

    const over = (e) => {
      if (e.target.closest && e.target.closest('a, button, .interactive')) {
        ring.current?.classList.add('hovering')
      }
    }
    const out = (e) => {
      if (e.target.closest && e.target.closest('a, button, .interactive')) {
        ring.current?.classList.remove('hovering')
      }
    }

    window.addEventListener('mousemove', move)
    window.addEventListener('mouseover', over)
    window.addEventListener('mouseout', out)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseover', over)
      window.removeEventListener('mouseout', out)
      document.body.classList.remove('hide-cursor')
    }
  }, [])

  return (
    <>
      <div ref={dot} className="cursor-dot" aria-hidden />
      <div ref={ring} className="cursor-ring" aria-hidden />
    </>
  )
}
