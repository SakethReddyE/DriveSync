import { motion } from 'framer-motion'
import CarShape from './CarShape'

/* Google-Maps-style live card: street grid, a blue route that follows the
   roads, A/B markers, pickup/drop addresses, and the real car driving it. */
export default function LiveMapCard() {
  return (
    <motion.div
      className="map-card"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1], delay: 0.35 }}
    >
      {/* directions box (addresses live here) */}
      <div className="dir-box">
        <div className="dir-points">
          <span className="dir-connector" />
          <div className="dir-row">
            <span className="dir-dot dot-a" />
            <span className="dir-addr">Kukatpally, Hyderabad</span>
          </div>
          <div className="dir-row">
            <span className="dir-dot dot-b" />
            <span className="dir-addr">HITEC City, Hyderabad</span>
          </div>
        </div>
        <div className="dir-meta">
          <b className="mono">12.4 km</b>
          <span className="mono">24 min</span>
        </div>
      </div>

      <div className="map-frame">
        <span className="map-live">
          <span className="dot" /> LIVE
        </span>
        <svg className="map-svg" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
          {/* land */}
          <rect x="0" y="0" width="400" height="240" fill="#e9edf1" />
          {/* water + park for map realism */}
          <rect x="0" y="0" width="118" height="46" fill="#a9d4f5" />
          <rect x="266" y="128" width="134" height="112" fill="#c7e3c0" />
          {/* building blocks */}
          <g fill="#dde3e8">
            <rect x="86" y="72" width="104" height="34" rx="2" />
            <rect x="226" y="72" width="76" height="34" rx="2" />
            <rect x="86" y="132" width="104" height="34" rx="2" />
            <rect x="18" y="132" width="44" height="80" rx="2" />
          </g>

          {/* roads — casing then white */}
          <g stroke="#c9d0d5" strokeWidth="13" strokeLinecap="round">
            <path d="M0 60H400M0 120H400M0 180H400" />
            <path d="M70 0V240M210 0V240M320 0V240" />
          </g>
          <g stroke="#ffffff" strokeWidth="8" strokeLinecap="round">
            <path d="M0 60H400M0 120H400M0 180H400" />
            <path d="M70 0V240M210 0V240M320 0V240" />
          </g>

          {/* route — white casing then Google-blue */}
          <path
            d="M70 180 H198 Q210 180 210 168 V132 Q210 120 222 120 H308 Q320 120 320 108 V60"
            fill="none"
            stroke="#ffffff"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            id="mapRoute"
            d="M70 180 H198 Q210 180 210 168 V132 Q210 120 222 120 H308 Q320 120 320 108 V60"
            fill="none"
            stroke="#1a73e8"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* start marker (A) */}
          <circle cx="70" cy="180" r="7.5" fill="#1a8a3f" stroke="#fff" strokeWidth="2.5" />
          {/* destination pin (B) */}
          <g>
            <path
              d="M320 44 C312 44 306 50 306 58 C306 68 320 80 320 80 C320 80 334 68 334 58 C334 50 328 44 320 44 Z"
              fill="var(--persimmon)"
              stroke="#fff"
              strokeWidth="2"
            />
            <circle cx="320" cy="58" r="4.5" fill="#fff" />
          </g>

          {/* the real car, driving the route */}
          <g>
            <g>
              <CarShape scale={0.6} />
            </g>
            <animateMotion dur="7s" repeatCount="indefinite" rotate="auto">
              <mpath href="#mapRoute" />
            </animateMotion>
          </g>
        </svg>
      </div>

      {/* driver strip */}
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
