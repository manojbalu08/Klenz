const dateTimeFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
const shortDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })

export function dateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso))
}

export function packs(count: number): string {
  return `${count} ${count === 1 ? 'pack' : 'packs'}`
}

export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.round((now - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  if (hours < 48) return 'yesterday'
  return shortDate.format(new Date(iso))
}

/** Splits a headline on *stars* so the starred words can be coloured. */
export function headlineParts(text: string): { text: string; highlight: boolean }[] {
  return text
    .split(/(\*[^*]+\*)/)
    .filter(Boolean)
    .map((part) =>
      part.length > 2 && part.startsWith('*') && part.endsWith('*')
        ? { text: part.slice(1, -1), highlight: true }
        : { text: part, highlight: false },
    )
}

/** "Gentle softness\nHygienic production" -> ["Gentle softness", "Hygienic production"] */
export function lines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}
