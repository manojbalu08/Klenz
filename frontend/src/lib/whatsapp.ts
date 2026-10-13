import { orderTotal, rupees } from './format'
import type { OrderCreated } from './types'

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

/** The placed order as the customer's WhatsApp message to Klenz. */
export function orderMessage(order: OrderCreated, customer: CustomerDetails): string {
  const paidNow = order.payment_method === 'now'
  return [
    '*New order — Klenz*',
    `Order: ${order.reference}`,
    '',
    ...order.items.map((item) => {
      const spec = item.product_spec ? ` — ${item.product_spec}` : ''
      const price = item.unit_price > 0 ? rupees(item.line_total) : 'price on request'
      return `• ${item.quantity} × ${item.product_name}${spec}: ${price}`
    }),
    '',
    `*Total: ${orderTotal(order.total, order.price_pending)}*`,
    `Payment: ${paidNow ? `Paid by UPI QR${order.payment_ref ? ` (ref ${order.payment_ref})` : ''}` : 'Pay later'}`,
    '',
    `Name: ${customer.name || '-'}`,
    `Phone: ${customer.phone || '-'}`,
    `Address: ${customer.address || '-'}`,
    ...(customer.note ? [`Note: ${customer.note}`] : []),
    '',
    paidNow ? 'I have paid by UPI. Please confirm my order.' : 'Please confirm my order and the delivery.',
  ].join('\n')
}
