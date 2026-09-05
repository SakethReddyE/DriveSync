import { motion } from 'framer-motion'

/* A glassy "driver en route" card with an SVG map, an animated route,
   pulsing pins, and a car that drives along the path (SMIL animateMotion). */
export default function LiveMapCard() {
  return (
    <motion.div
      className="map-card grad-border"
      initial={{ opacity: 0, y: 40, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1], delay: 0.25 }}
    >
      <div className="map-head">
        <span className="pill">
          <span className="dot" /> Live tracking
        </span>
        <span className="map-head-eta">ETA 3 min</span>
      </div>

      <svg className="map-svg" viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="route-grad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#a855f7" />
            <stop offset="0.5" stopColor="#6366f1" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
          <radialGradient id="map-glow" cx="50%" cy="40%" r="70%">
            <stop offset="0" stopColor="#1a1730" />
            <stop offset="1" stopColor="#0a0912" />
          </radialGradient>
        </defs>

        {/* base */}
        <rect x="0" y="0" width="400" height="280" fill="url(#map-glow)" />

        {/* faint road grid */}
        <g stroke="rgba(255,255,255,0.05)" strokeWidth="1.5">
          <path d="M0 70 H400 M0 150 H400 M0 220 H400" />
          <path d="M90 0 V280 M200 0 V280 M310 0 V280" />
        </g>
        <g stroke="rgba(255,255,255,0.08)" strokeWidth="8" strokeLinecap="round">
          <path d="M0 150 H400" />
          <path d="M200 0 V280" />
        </g>

        {/* route (the id is followed by the car) */}
        <path
          id="route"
          d="M62 232 C 130 232, 120 150, 190 150 S 268 78, 336 58"
          fill="none"
          stroke="url(#route-grad)"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        {/* moving energy dash on top of the route */}
        <path
          d="M62 232 C 130 232, 120 150, 190 150 S 268 78, 336 58"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="2 20"
          opacity="0.9"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-220" dur="3s" repeatCount="indefinite" />
        </path>

        {/* pickup pin */}
        <g>
          <circle cx="62" cy="232" r="6" fill="#22d3ee" />
          <circle cx="62" cy="232" r="6" fill="none" stroke="#22d3ee" strokeWidth="2">
            <animate attributeName="r" from="6" to="24" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.8" to="0" dur="2.4s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* drop pin */}
        <g>
          <circle cx="336" cy="58" r="6" fill="#ec4899" />
          <circle cx="336" cy="58" r="6" fill="none" stroke="#ec4899" strokeWidth="2">
            <animate attributeName="r" from="6" to="24" dur="2.4s" begin="1.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.8" to="0" dur="2.4s" begin="1.2s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* the car — follows #route */}
        <g>
          <g className="car-glyph">
            <rect x="-11" y="-6.5" width="22" height="13" rx="5" fill="#fff" />
            <rect x="-7" y="-4.5" width="8" height="9" rx="2.5" fill="#6366f1" />
            <circle cx="8" cy="0" r="1.8" fill="#a3e635" />
          </g>
          <animateMotion dur="6s" repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
            <mpath href="#route" />
          </animateMotion>
        </g>
      </svg>

      {/* driver overlay */}
      <div className="map-driver glass">
        <div className="map-avatar">RK</div>
        <div className="map-driver-info">
          <div className="map-driver-name">Ramesh Kumar</div>
          <div className="map-driver-meta">
            <span className="stars">★ 4.9</span>
            <span className="sep">·</span>
            <span>Toyota Innova • Your car</span>
          </div>
        </div>
        <div className="map-fare">
          <span className="map-fare-amt">₹480</span>
          <span className="map-fare-label">est.</span>
        </div>
      </div>
    </motion.div>
  )
}
