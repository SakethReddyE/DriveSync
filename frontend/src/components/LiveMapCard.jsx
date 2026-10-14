import { motion } from 'framer-motion'

const MAP_EMBED_URL =
  'https://www.google.com/maps/embed?pb=!1m28!1m12!1m3!1d30441.23!2d78.3759!3d17.4558!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m13!3e0!4m5!1s0x3bcb93dc8c5d69df%3A0x19688381994ccefa!2sKukatpally%2C+Hyderabad%2C+Telangana!3m2!1d17.494663!2d78.3995345!4m5!1s0x3bcb91629a1bc4dd%3A0x6f4bedf06a3e22d0!2sHITEC+City%2C+Hyderabad%2C+Telangana!3m2!1d17.4474835!2d78.3761674!5e0!3m2!1sen!2sin!4v1700000000000'

export default function LiveMapCard() {
  return (
    <motion.div
      className="map-card"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1], delay: 0.35 }}
    >
      {/* ── Directions strip ── */}
      <div className="dir-box">
        <div className="dir-points">
          <span className="dir-connector" />
          <div className="dir-row">
            <span className="dir-dot dot-a" />
            <div className="dir-addr-block">
              <span className="dir-label mono">From</span>
              <span className="dir-addr">Kukatpally</span>
            </div>
          </div>
          <div className="dir-row">
            <span className="dir-dot dot-b" />
            <div className="dir-addr-block">
              <span className="dir-label mono">To</span>
              <span className="dir-addr">HITEC City</span>
            </div>
          </div>
        </div>
        <div className="dir-meta">
          <b className="mono">7.2 km</b>
          <span className="mono">~18 min</span>
        </div>
      </div>

      {/* ── Real Google Maps iframe ── */}
      <div className="map-frame map-frame-embed">
        <span className="map-live">
          <span className="dot" /> LIVE
        </span>
        <iframe
          className="map-iframe"
          src={MAP_EMBED_URL}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="DriveSync live route — Kukatpally to HITEC City, Hyderabad"
        />
      </div>

      {/* ── Driver strip ── */}
      <div className="map-driver">
        <div className="map-avatar">RK</div>
        <div className="map-driver-info">
          <div className="map-driver-name">Ramesh Kumar</div>
          <div className="map-driver-meta mono">★ 4.9 &nbsp;·&nbsp; 5–10 yrs &nbsp;·&nbsp; Kukatpally</div>
        </div>
        <div className="map-fare">
          <span className="map-fare-amt">₹166</span>
          <span className="map-fare-label mono">EST. FARE</span>
        </div>
      </div>
    </motion.div>
  )
}
