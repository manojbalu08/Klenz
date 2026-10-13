import type { SiteSettings } from './types'

/** What a QR shows until a UPI ID is saved in Admin → Settings. Not a payment link. */
export const SAMPLE_QR_TEXT = 'Klenz sample QR - UPI payments are not switched on yet.'

export function upiReady(settings: SiteSettings): boolean {
  return settings.upi_id.trim() !== ''
}

/**
 * upi:// link for the payment QR and the "Pay with a UPI app" button. With an amount, the UPI
 * app opens with the total filled in; the note shows up in Klenz's bank statement.
 */
export function upiLink(settings: SiteSettings, amount: number, note: string): string {
  const params = new URLSearchParams({ pa: settings.upi_id.trim(), pn: settings.upi_name.trim() || 'Klenz' })
  if (amount > 0) params.set('am', amount.toFixed(2))
  params.set('cu', 'INR')
  params.set('tn', note.slice(0, 50))
  // URLSearchParams writes spaces as "+", which some UPI apps show literally.
  return `upi://pay?${params.toString().replace(/\+/g, '%20')}`
}
