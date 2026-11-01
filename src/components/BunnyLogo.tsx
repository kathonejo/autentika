/**
 * Halftone-dot bunny mark for the Autentika logo.
 * The bunny is constructed entirely from filled circles of varying sizes
 * to simulate a screen-print / halftone engraving effect.
 */
export function BunnyLogo({ size = 36 }: { size?: number }) {
  const s = size / 36 // scale factor
  const d = (x: number, y: number, r: number) => ({ cx: x * s, cy: y * s, r: r * s })

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 36 36`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Left ear — column of halftone dots, decreasing size top to bottom */}
      <circle {...d(10, 2,  2.8)} fill="#345DB4" />
      <circle {...d(10, 7,  2.4)} fill="#345DB4" />
      <circle {...d(10, 12, 2.0)} fill="#345DB4" />
      <circle {...d(9,  16, 1.4)} fill="#345DB4" />

      {/* Right ear */}
      <circle {...d(26, 2,  2.8)} fill="#345DB4" />
      <circle {...d(26, 7,  2.4)} fill="#345DB4" />
      <circle {...d(26, 12, 2.0)} fill="#345DB4" />
      <circle {...d(27, 16, 1.4)} fill="#345DB4" />

      {/* Head — 5×4 halftone grid, clipped to an oval shape */}
      {/* Row 1 */}
      <circle {...d(13, 18, 2.2)} fill="#345DB4" />
      <circle {...d(18, 18, 2.4)} fill="#345DB4" />
      <circle {...d(23, 18, 2.2)} fill="#345DB4" />
      {/* Row 2 */}
      <circle {...d(11, 22, 2.0)} fill="#345DB4" />
      <circle {...d(16, 22, 2.2)} fill="#345DB4" />
      <circle {...d(20, 22, 2.2)} fill="#345DB4" />
      <circle {...d(25, 22, 2.0)} fill="#345DB4" />
      {/* Row 3 */}
      <circle {...d(12, 26, 1.8)} fill="#345DB4" />
      <circle {...d(16.5,26,1.9)} fill="#345DB4" />
      <circle {...d(21, 26, 1.9)} fill="#345DB4" />
      <circle {...d(25, 26, 1.6)} fill="#345DB4" />
      {/* Row 4 — chin */}
      <circle {...d(14.5,30,1.4)} fill="#345DB4" />
      <circle {...d(18, 30.5,1.6)} fill="#345DB4" />
      <circle {...d(21.5,30,1.4)} fill="#345DB4" />

      {/* Eyes — pink dots */}
      <circle {...d(14.5,21,1.2)} fill="#F06AA8" />
      <circle {...d(21.5,21,1.2)} fill="#F06AA8" />

      {/* Nose — yellow dot */}
      <circle {...d(18, 25, 1.0)} fill="#FFE45C" />
    </svg>
  )
}

export function BunnySmall() {
  return <BunnyLogo size={22} />
}
