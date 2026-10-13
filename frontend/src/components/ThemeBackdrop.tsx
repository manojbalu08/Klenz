import { useInView } from './motion'
import styles from './ThemeBackdrop.module.css'

/** light: on the page background · hero: on the soft blue page tops · dark: on navy bands. */
export type BackdropTone = 'light' | 'hero' | 'dark'

// Rising bubbles: position across the section, size in px, seconds per trip, start offset in seconds.
const BUBBLES: [string, number, number, number][] = [
  ['5%', 14, 17, -3],
  ['16%', 8, 12, -8],
  ['29%', 20, 21, -12],
  ['43%', 10, 15, -5],
  ['57%', 16, 19, -15],
  ['70%', 7, 11, -2],
  ['82%', 22, 23, -9],
  ['93%', 9, 14, -11],
]

// One period of the flowing line from the Klenz packs; the SVG is twice as wide as the section and
// slides by one period, so the loop has no seam.
function wave(y: number, rise: number): string {
  return `M0 ${y} C150 ${y - rise} 450 ${y + rise} 600 ${y} S1050 ${y + rise} 1200 ${y}`
}

interface ThemeBackdropProps {
  tone?: BackdropTone
  /** Where the glows, dots and lines sit, so neighbouring sections differ. */
  layout?: 1 | 2 | 3
}

/**
 * The animated brand background: soft glows that drift, bubbles that rise, a fine dot texture and the
 * flowing lines from the packs. Put it first inside a section with `ui.themed`. Pauses off screen.
 */
export default function ThemeBackdrop({ tone = 'light', layout = 1 }: ThemeBackdropProps) {
  const [ref, inView] = useInView<HTMLDivElement>({ once: false, threshold: 0 })
  return (
    <div
      ref={ref}
      className={styles.backdrop}
      data-tone={tone}
      data-layout={layout}
      data-paused={inView ? undefined : true}
      aria-hidden="true"
    >
      <span className={`${styles.glow} ${styles.glowA}`} />
      <span className={`${styles.glow} ${styles.glowB}`} />
      <span className={`${styles.glow} ${styles.glowC}`} />
      <span className={styles.dots} />
      <div className={styles.waves}>
        <svg className={styles.wave} viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d={wave(56, 34)} />
          <path d={wave(74, 28)} />
        </svg>
        <svg className={`${styles.wave} ${styles.waveSlow}`} viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path className={styles.dotted} d={wave(92, 24)} />
        </svg>
      </div>
      <div className={styles.bubbles}>
        {BUBBLES.map(([left, size, seconds, delay]) => (
          <span
            key={left}
            className={styles.lane}
            style={{ left, animationDuration: `${seconds}s`, animationDelay: `${delay}s` }}
          >
            <span className={styles.bubble} style={{ width: size, height: size }} />
          </span>
        ))}
      </div>
    </div>
  )
}
