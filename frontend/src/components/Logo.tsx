/** The round Klenz logo (frontend/public/images/brand/klenz-logo.png). */
export default function Logo({ size = 48, alt = '', className }: { size?: number; alt?: string; className?: string }) {
  return <img src="/images/brand/klenz-logo.png" alt={alt} width={size} height={size} className={className} />
}
