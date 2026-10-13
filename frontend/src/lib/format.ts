const dateTimeFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
const shortDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })

export function dateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso))
}

const wholeRupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const rupeesAndPaise = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })

/** ₹1,25,000 or ₹240.50 (paise only when there are some). Same as rupees() in backend/app/notify.py. */
export function rupees(amount: number): string {
  return (Number.isInteger(Math.round(amount * 100) / 100) ? wholeRupees : rupeesAndPaise).format(amount)
}

/** An order or cart total: "₹1,490", "₹1,490 + items on request", or "On request" when nothing has a price. */
export function orderTotal(total: number, pricePending: boolean): string {
  if (total <= 0 && pricePending) return 'On request'
  return pricePending ? `${rupees(total)} + items on request` : rupees(total)
}

/** "+91 90873 12905, +91 73973 83403" -> one entry per number. */
export function phoneNumbers(text: string): string[] {
  return text
    .split(/[,/;]/)
    .map((part) => part.trim())
    .filter(Boolean)
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
