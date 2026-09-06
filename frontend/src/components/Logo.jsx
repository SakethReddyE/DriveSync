export default function Logo() {
  return (
    <a href="#top" className="logo" aria-label="DriveSync home">
      <span className="logo-mark">
        <svg viewBox="0 0 32 32" fill="none" width="18" height="18">
          <path
            d="M8 20l2.2-7.2A2 2 0 0 1 12.1 11h7.8a2 2 0 0 1 1.9 1.4L24 20M9 20h14M11 20v2.3M21 20v2.3M7.5 16.4h17"
            stroke="var(--persimmon)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="logo-word">
        Drive<span className="accent">Sync</span>
      </span>
    </a>
  )
}
