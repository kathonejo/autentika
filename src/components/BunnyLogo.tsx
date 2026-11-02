/**
 * Autentika mascot — hand-drawn green bunny (mascota.png).
 */
export function BunnyLogo({ size = 36 }: { size?: number }) {
  return (
    <img
      src="/mascota.png"
      alt=""
      width={size}
      height={size}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'block',
        flexShrink: 0,
      }}
    />
  )
}

export function BunnySmall() {
  return <BunnyLogo size={22} />
}
