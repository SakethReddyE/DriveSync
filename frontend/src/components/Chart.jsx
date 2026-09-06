/* Tiny dependency-free SVG chart — bar or line. */
export default function Chart({ labels = [], values = [], type = 'bar', accent = 'var(--persimmon)' }) {
  const max = Math.max(1, ...values)
  const n = values.length || 1

  const pts = values.map((v, i) => ({
    x: n > 1 ? (i / (n - 1)) * 100 : 50,
    y: 100 - (v / max) * 92 - 4,
    v,
  }))
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L100 100 L0 100 Z`

  return (
    <div className="chart-wrap">
      <svg viewBox="0 0 100 100" className="chart-svg" preserveAspectRatio="none" aria-hidden>
        {type === 'bar'
          ? values.map((v, i) => {
              const bw = (100 / n) * 0.5
              const x = ((i + 0.5) / n) * 100
              const h = (v / max) * 92
              return (
                <rect
                  key={i}
                  x={x - bw / 2}
                  y={100 - h}
                  width={bw}
                  height={Math.max(h, 0.6)}
                  fill={accent}
                />
              )
            })
          : (
            <>
              <path d={area} fill={accent} opacity="0.12" />
              <path
                d={line}
                fill="none"
                stroke={accent}
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}
      </svg>
      <div className="chart-labels">
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </div>
  )
}
