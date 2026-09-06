import { motion } from 'framer-motion'

/* Editorial light "driver en route" card. Car drives the route (SMIL). */
export default function LiveMapCard() {
  return (
    <motion.div
      className="map-card"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1], delay: 0.35 }}
    >
      <div className="map-head">
        <span className="pill">
          <span className="dot" /> LIVE
        </span>
        <span className="map-eta mono">ETA 3 MIN</span>
      </div>

      <div className="map-frame">
        <svg className="map-svg" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice">
          {/* city blocks */}
          <g fill="rgba(23,19,13,0.05)">
            <rect x="20" y="24" width="90" height="64" rx="4" />
            <rect x="130" y="14" width="120" height="52" rx="4" />
            <rect x="270" y="30" width="110" height="70" rx="4" />
            <rect x="20" y="150" width="120" height="80" rx="4" />
            <rect x="250" y="150" width="130" height="80" rx="4" />
          </g>
          {/* roads */}
          <g stroke="rgba(23,19,13,0.14)" strokeWidth="10" strokeLinecap="round">
            <path d="M0 120 H400" />
            <path d="M200 0 V250" />
          </g>
          <g stroke="rgba(23,19,13,0.08)" strokeWidth="2">
            <path d="M0 60 H400 M0 190 H400 M110 0 V250 M300 0 V250" />
          </g>

          {/* route */}
          <path
            id="mapRoute"
            d="M60 200 C 120 200, 120 120, 190 120 S 270 60, 338 44"
            fill="none"
            stroke="var(--persimmon)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M60 200 C 120 200, 120 120, 190 120 S 270 60, 338 44"
            fill="none"
            stroke="var(--paper)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="1 16"
          >
            <animate attributeName="stroke-dashoffset" from="0" to="-200" dur="3s" repeatCount="indefinite" />
          </path>

          {/* pickup pin */}
          <circle cx="60" cy="200" r="6" fill="var(--ink)" />
          <circle cx="60" cy="200" r="6" fill="none" stroke="var(--ink)" strokeWidth="2">
            <animate attributeName="r" from="6" to="22" dur="2.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.5" to="0" dur="2.6s" repeatCount="indefinite" />
          </circle>

          {/* drop pin */}
          <circle cx="338" cy="44" r="6" fill="var(--persimmon)" />
          <circle cx="338" cy="44" r="6" fill="none" stroke="var(--persimmon)" strokeWidth="2">
            <animate attributeName="r" from="6" to="22" dur="2.6s" begin="1.3s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.6" to="0" dur="2.6s" begin="1.3s" repeatCount="indefinite" />
          </circle>

          {/* car */}
          <g>
            <g>
              <rect x="-11" y="-6.5" width="22" height="13" rx="4" fill="var(--ink)" />
              <rect x="-7" y="-4.5" width="8" height="9" rx="2" fill="var(--paper)" />
              <circle cx="8" cy="0" r="1.7" fill="var(--amber)" />
            </g>
            <animateMotion dur="6s" repeatCount="indefinite" rotate="auto">
              <mpath href="#mapRoute" />
            </animateMotion>
          </g>
        </svg>
      </div>

      {/* ticket-style driver strip */}
      <div className="map-driver">
        <div className="map-avatar">RK</div>
        <div className="map-driver-info">
          <div className="map-driver-name">Ramesh Kumar</div>
          <div className="map-driver-meta mono">★ 4.9 · TOYOTA INNOVA · YOUR CAR</div>
        </div>
        <div className="map-fare">
          <span className="map-fare-amt">₹480</span>
          <span className="map-fare-label mono">EST.</span>
        </div>
      </div>
    </motion.div>
  )
}
