import type { ArtStyle, Tint } from '../lib/types'
import styles from './ProductArt.module.css'

interface Shape {
  w: number
  h: number
  /** Offset of the top-left corner from the centre of the picture. */
  x: number
  y: number
  fill: string
  radius?: string
  opacity?: number
  rotate?: number
  border?: string
}

const WHITE = '#fff'
const PRIMARY = 'var(--primary)'
const ACCENT = 'var(--accent)'

// The simple drawings from the design, one per kind of product.
const DRAWINGS: Record<ArtStyle, (tint: string) => Shape[]> = {
  box: () => [
    { w: 144, h: 100, x: -72, y: -40, radius: '16px', fill: WHITE },
    { w: 68, h: 30, x: -34, y: -66, radius: '34px 34px 0 0', fill: WHITE, opacity: 0.8 },
    { w: 144, h: 22, x: -72, y: 8, fill: PRIMARY },
  ],
  pocket: () => [
    { w: 68, h: 104, x: -34, y: -52, radius: '14px', fill: WHITE, rotate: -10 },
    { w: 68, h: 22, x: -34, y: -10, fill: PRIMARY, rotate: -10 },
    { w: 68, h: 104, x: 4, y: -48, radius: '14px', fill: WHITE, rotate: 8 },
    { w: 68, h: 22, x: 4, y: -6, fill: ACCENT, rotate: 8 },
  ],
  roll: (tint) => [
    { w: 124, h: 124, x: -62, y: -62, radius: '50%', fill: WHITE },
    { w: 88, h: 88, x: -44, y: -44, radius: '50%', fill: PRIMARY, opacity: 0.25 },
    { w: 44, h: 44, x: -22, y: -22, radius: '50%', fill: tint, border: `3px solid ${PRIMARY}` },
  ],
  towel: () => [
    { w: 92, h: 128, x: -46, y: -64, radius: '16px', fill: WHITE },
    { w: 92, h: 44, x: -46, y: -22, fill: ACCENT },
    { w: 24, h: 128, x: -12, y: -64, fill: PRIMARY, opacity: 0.25 },
  ],
  napkin: () => [
    { w: 108, h: 108, x: -54, y: -54, radius: '12px', fill: WHITE, rotate: -12 },
    { w: 108, h: 108, x: -54, y: -54, radius: '12px', fill: PRIMARY, opacity: 0.35, rotate: 10 },
    { w: 108, h: 108, x: -54, y: -54, radius: '12px', fill: WHITE, rotate: -1 },
    { w: 40, h: 40, x: -20, y: -20, radius: '50%', fill: ACCENT },
  ],
}

export const ART_STYLES: { value: ArtStyle; label: string }[] = [
  { value: 'box', label: 'Tissue box' },
  { value: 'pocket', label: 'Pocket packs' },
  { value: 'roll', label: 'Roll' },
  { value: 'towel', label: 'Kitchen towel' },
  { value: 'napkin', label: 'Napkins' },
]

export function tintColor(tint: Tint | string): string {
  return tint === 'soft2' ? 'var(--soft2)' : 'var(--soft)'
}

export default function ProductArt({ art, tint }: { art: ArtStyle; tint: Tint }) {
  const shapes = (DRAWINGS[art] ?? DRAWINGS.box)(tintColor(tint))
  return (
    <div className={styles.art} aria-hidden="true">
      {shapes.map((shape, index) => (
        <span
          key={index}
          className={styles.shape}
          style={{
            width: shape.w,
            height: shape.h,
            marginLeft: shape.x,
            marginTop: shape.y,
            borderRadius: shape.radius,
            background: shape.fill,
            opacity: shape.opacity,
            border: shape.border,
            transform: shape.rotate ? `rotate(${shape.rotate}deg)` : undefined,
          }}
        />
      ))}
    </div>
  )
}
