// Icons from the design, as React components.
import type { ReactElement } from 'react'

interface IconProps {
  size?: number
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export function CartIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} aria-hidden="true">
      <path d="M3 4h3l2.2 11h10l2-8H7" />
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
    </svg>
  )
}

export function PlayIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 4.5l12 7.5-12 7.5z" />
    </svg>
  )
}

export function PauseIcon({ size = 34 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}

export function WhatsAppIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} aria-hidden="true">
      <path d="M3 21l1.6-4.6A8.5 8.5 0 1 1 8 19.6z" />
      <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-2-1-1 .8a4 4 0 0 1-1.9-1.9l.8-1-1-2z" />
    </svg>
  )
}

export function CheckIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2.4} {...stroke} aria-hidden="true">
      <path d="M5 12.5l4.2 4.2L19 7" />
    </svg>
  )
}

// "Ideal for" icons, matched to the text by keyword (see idealIcon below).
function HotelIcon({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.8} {...stroke} aria-hidden="true">
      <path d="M5 3v5a2 2 0 0 0 4 0V3M7 3v18" />
      <path d="M17 21V3c-2 1.4-3 3.8-3 6.6V13h3" />
    </svg>
  )
}

function CafeIcon({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.8} {...stroke} aria-hidden="true">
      <path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
      <path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M8 3c-.6.8-.6 1.7 0 2.5M12 3c-.6.8-.6 1.7 0 2.5" />
    </svg>
  )
}

function OfficeIcon({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.8} {...stroke} aria-hidden="true">
      <rect x="4" y="3" width="11" height="18" rx="1" />
      <path d="M15 9h4a1 1 0 0 1 1 1v11h-5M8 7h3M8 11h3M8 15h3" />
    </svg>
  )
}

function HospitalIcon({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.8} {...stroke} aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M12 10.5v6M9 13.5h6" />
    </svg>
  )
}

function TheatreIcon({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.8} {...stroke} aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
    </svg>
  )
}

function CateringIcon({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.8} {...stroke} aria-hidden="true">
      <path d="M4 17a8 8 0 0 1 16 0z" />
      <path d="M2 20h20M12 6v3M10 6h4" />
    </svg>
  )
}

function SparkIcon({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.8} {...stroke} aria-hidden="true">
      <path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z" />
    </svg>
  )
}

const IDEAL_ICONS: [RegExp, (props: IconProps) => ReactElement][] = [
  [/hotel|restaurant/i, HotelIcon],
  [/caf|baker/i, CafeIcon],
  [/office|commercial/i, OfficeIcon],
  [/hospital|clinic/i, HospitalIcon],
  [/theat|entertain|cinema/i, TheatreIcon],
  [/cater/i, CateringIcon],
]

export function IdealIcon({ label, size }: { label: string; size?: number }) {
  const Icon = IDEAL_ICONS.find(([pattern]) => pattern.test(label))?.[1] ?? SparkIcon
  return <Icon size={size} />
}

export function DashboardIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.8} {...stroke} aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  )
}

export function ProductsIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.8} {...stroke} aria-hidden="true">
      <path d="M3 8l9-5 9 5v8l-9 5-9-5z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </svg>
  )
}

export function EnquiriesIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.8} {...stroke} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  )
}

export function ContentIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.8} {...stroke} aria-hidden="true">
      <path d="M5 4h14v16H5z" />
      <path d="M9 9h6M9 13h6M9 17h3" />
    </svg>
  )
}

export function SettingsIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.8} {...stroke} aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </svg>
  )
}
