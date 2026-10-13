import { useEffect, useState, type CSSProperties, type RefObject } from 'react'
import { useInView } from './motion'
import styles from './ThemeBackdrop.module.css'

/** light: on the page background · hero: on the soft blue page tops · dark: on navy bands. */
export type BackdropTone = 'light' | 'hero' | 'dark'

interface ThemeBackdropProps {
  tone?: BackdropTone
  /** Where the glows sit and which way the tissues drift, so neighbouring sections differ. */
  layout?: 1 | 2 | 3
}

// Falling tissue sheets: position across the section, width in px, seconds per fall, start offset in seconds.
const TISSUES: [string, number, number, number][] = [
  ['4%', 46, 20, -4],
  ['13%', 32, 16, -11],
  ['23%', 54, 24, -17],
  ['33%', 36, 18, -2],
  ['44%', 48, 22, -9],
  ['53%', 30, 15, -14],
  ['63%', 56, 26, -6],
  ['73%', 38, 19, -12],
  ['83%', 50, 23, -1],
  ['91%', 34, 17, -15],
  ['97%', 42, 21, -8],
]

/**
 * The animated brand background: soft tissue sheets that float down and flutter over drifting glows.
 * Put it first inside a section with `ui.themed`. Pauses while off screen.
 */
export default function ThemeBackdrop({ tone = 'light', layout = 1 }: ThemeBackdropProps) {
  const [ref, inView] = useInView<HTMLDivElement>({ once: false, threshold: 0 })
  const pace = useFallPace(ref)
  return (
    <div
      ref={ref}
      className={styles.backdrop}
      data-tone={tone}
      data-layout={layout}
      data-paused={inView ? undefined : true}
      style={{ '--pace': String(pace) } as CSSProperties}
      aria-hidden="true"
    >
      <span className={`${styles.glow} ${styles.glowA}`} />
      <span className={`${styles.glow} ${styles.glowB}`} />
      <span className={`${styles.glow} ${styles.glowC}`} />
      <div className={styles.tissues}>
        {TISSUES.map(([left, size, seconds, delay]) => (
          <span
            key={left}
            className={styles.lane}
            style={{
              left,
              animationDuration: `calc(${seconds}s * var(--pace))`,
              animationDelay: `calc(${delay}s * var(--pace))`,
            }}
          >
            <span className={styles.tissue} style={{ width: size, height: Math.round(size * 0.82) }} />
          </span>
        ))}
      </div>
    </div>
  )
}

/** Taller sections get slower falls, so the tissues drift at the same pace in every section. */
function useFallPace(ref: RefObject<HTMLElement | null>): number {
  const [pace, setPace] = useState(1)
  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      setPace(Math.min(3, Math.max(1, Math.round(entry.contentRect.height / 70) / 10)))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return pace
}
