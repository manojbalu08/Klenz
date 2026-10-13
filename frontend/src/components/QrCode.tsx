import { useMemo } from 'react'
import { encode } from 'uqr'

interface QrCodeProps {
  value: string
  /** Read out by screen readers. */
  label: string
  size?: number
  className?: string
}

/** A QR code drawn as one SVG path: sharp at any size and on any screen. */
export default function QrCode({ value, label, size = 220, className }: QrCodeProps) {
  const { modules, path } = useMemo(() => {
    const qr = encode(value, { ecc: 'M', border: 2 })
    let d = ''
    qr.data.forEach((row, y) =>
      row.forEach((dark, x) => {
        if (dark) d += `M${x} ${y}h1v1h-1z`
      }),
    )
    return { modules: qr.size, path: d }
  }, [value])

  return (
    <svg
      className={className}
      viewBox={`0 0 ${modules} ${modules}`}
      width={size}
      height={size}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect width={modules} height={modules} fill="#fff" />
      <path d={path} fill="#0a1f44" />
    </svg>
  )
}
