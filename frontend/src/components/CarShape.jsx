/* Realistic top-down car, centred at (0,0), facing +x (right).
   Drop inside an SVG <g> that you translate/rotate. */
export default function CarShape({ scale = 1, color = 'var(--persimmon)' }) {
  return (
    <g transform={`scale(${scale})`}>
      {/* wheels */}
      <g fill="#232323">
        <rect x="-12" y="-10.6" width="7" height="3" rx="1.5" />
        <rect x="-12" y="7.6" width="7" height="3" rx="1.5" />
        <rect x="5" y="-10.6" width="7" height="3" rx="1.5" />
        <rect x="5" y="7.6" width="7" height="3" rx="1.5" />
      </g>

      {/* side mirrors */}
      <g fill={color}>
        <rect x="6" y="-10.2" width="2.6" height="1.9" rx="0.8" />
        <rect x="6" y="8.3" width="2.6" height="1.9" rx="0.8" />
      </g>

      {/* body */}
      <rect
        x="-16"
        y="-8.5"
        width="32"
        height="17"
        rx="7"
        fill={color}
        stroke="rgba(0,0,0,0.22)"
        strokeWidth="0.6"
      />
      {/* subtle top highlight */}
      <rect x="-14" y="-7" width="28" height="4" rx="3" fill="rgba(255,255,255,0.18)" />

      {/* cabin / roof */}
      <rect x="-7" y="-6.6" width="13.5" height="13.2" rx="4.5" fill="rgba(0,0,0,0.20)" />

      {/* windshield + rear window (glass) */}
      <rect x="4.7" y="-5.4" width="3.4" height="10.8" rx="1.6" fill="#bcd4e6" />
      <rect x="-8" y="-5" width="3" height="10" rx="1.6" fill="#a9c4d8" />

      {/* headlights */}
      <g fill="#fff3c4">
        <rect x="14.6" y="-6.6" width="1.9" height="3.4" rx="0.9" />
        <rect x="14.6" y="3.2" width="1.9" height="3.4" rx="0.9" />
      </g>
      {/* taillights */}
      <g fill="#c62828">
        <rect x="-16.4" y="-6.4" width="1.7" height="3.2" rx="0.8" />
        <rect x="-16.4" y="3.2" width="1.7" height="3.2" rx="0.8" />
      </g>
    </g>
  )
}
