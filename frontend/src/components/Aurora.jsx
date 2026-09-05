/* Fixed animated gradient-mesh background + grain + vignette. */
export default function Aurora() {
  return (
    <>
      <div className="aurora" aria-hidden>
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
      </div>
      <div className="grain" aria-hidden />
      <div className="vignette" aria-hidden />
    </>
  )
}
