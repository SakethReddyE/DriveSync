const ITEMS = [
  'Verified drivers',
  'Real-time tracking',
  'Transparent fares',
  'Drive your own car',
  'Trained chauffeurs',
  '24/7 support',
  'Instant booking',
  'Cashless payment',
]

export default function Marquee() {
  return (
    <div className="marquee" aria-hidden>
      <div className="marquee-track">
        {[...ITEMS, ...ITEMS].map((t, i) => (
          <span className="marquee-item" key={i}>
            {t}
            <span className="marquee-dot">◆</span>
          </span>
        ))}
      </div>
    </div>
  )
}
