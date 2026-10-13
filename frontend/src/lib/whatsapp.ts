export interface CustomerDetails {
  name: string
  phone: string
  address: string
  note: string
}

/** Digits for a wa.me link. Local numbers (10 digits or fewer) get the country code. */
export function whatsappNumber(raw: string, countryCode: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^0+/, '')
  if (!digits) return ''
  if (raw.trim().startsWith('+') || digits.length > 10) return digits
  return countryCode + digits
}

/** Without a number, WhatsApp asks the user which chat to send the message to. */
export function whatsappLink(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
