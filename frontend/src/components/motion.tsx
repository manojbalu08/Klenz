import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import styles from './motion.module.css'

const REDUCE = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia(REDUCE)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/** True when the visitor's device asks for less motion (no autoplay, no reveal effects). */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(REDUCE).matches, () => false)
}

interface InViewOptions {
  /** Stay true after the first time (for reveal effects); false tracks entering and leaving. */
  once?: boolean
  threshold?: number
}

/** Watches whether an element is on screen. */
export function useInView<T extends Element>({ once = true, threshold = 0.15 }: InViewOptions = {}) {
  const ref = useRef<T>(null)
  // Browsers without IntersectionObserver (very old TVs) just show everything.
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { threshold, rootMargin: once ? '0px 0px -8% 0px' : '0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [once, threshold])

  return [ref, inView] as const
}

/** Class names for an element that should fade up when it scrolls into view. */
export function revealClass(shown: boolean): string {
  return `${styles.reveal} ${shown ? styles.shown : ''}`
}

export function revealDelay(ms: number): CSSProperties {
  return { '--reveal-delay': `${ms}ms` } as CSSProperties
}

/** Fades and lifts its content in the first time it scrolls into view. */
export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const [ref, shown] = useInView<HTMLDivElement>()
  return (
    <div ref={ref} className={`${revealClass(shown)} ${className}`} style={revealDelay(delay)}>
      {children}
    </div>
  )
}
