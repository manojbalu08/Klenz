// Shapes returned by the Python API (see backend/app/schemas.py).

export type ArtStyle = 'box' | 'pocket' | 'roll' | 'towel' | 'napkin'
export type Tint = 'soft' | 'soft2'
export type OrderStatus = 'new' | 'quoted' | 'closed'
/** "now": paid with the UPI QR at checkout; "later": pays on delivery or later. */
export type PaymentMethod = 'now' | 'later'
/** reported = the customer says they paid; paid = the admin checked the bank. */
export type PaymentStatus = 'pending' | 'reported' | 'paid'

export interface Product {
  id: number
  name: string
  category: string
  description: string
  /** Pack size, e.g. "80 grams". */
  spec: string
  /** Rupees per pack; 0 means "Price on request". */
  price: number
  art: ArtStyle
  tint: Tint
  image_url: string
}

export interface AdminProduct extends Product {
  is_live: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type ProductInput = Omit<Product, 'id'> & { is_live: boolean }

export interface Video {
  id: number
  title: string
  url: string
}

export type VideoInput = Omit<Video, 'id'>

export interface SiteSettings {
  /** Shown on the website (footer, Contact page). */
  whatsapp_number: string
  /** Receives placed orders: the customer's WhatsApp message and the automatic alert. */
  order_whatsapp: string
  phone: string
  email: string
  address: string
  hours: string
  country_code: string
  /** Empty shows a sample payment QR. */
  upi_id: string
  upi_name: string
}

/** WhatsApp alerts to the admin for new orders (CallMeBot); the key itself is never sent back. */
export interface OrderAlerts {
  phone: string
  apikey_set: boolean
}

export type Content = Record<string, string>

export interface SiteData {
  settings: SiteSettings
  content: Content
  products: Product[]
  videos: Video[]
}

export interface OrderItem {
  product_id: number | null
  product_name: string
  product_spec: string
  quantity: number
  /** Price per pack when ordered; 0 = price on request. */
  unit_price: number
  line_total: number
}

export interface OrderCreated {
  reference: string
  created_at: string
  items: OrderItem[]
  /** Number of packs. */
  item_count: number
  /** Sum of the priced items. */
  total: number
  /** Some items had no price, so Klenz confirms the final total. */
  price_pending: boolean
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  /** UPI transaction reference the customer typed in. */
  payment_ref: string
}

export interface Order extends OrderCreated {
  id: number
  customer_name: string
  phone: string
  address: string
  note: string
  status: OrderStatus
  summary: string
  updated_at: string
}

export interface OrderInput {
  customer_name: string
  phone: string
  address: string
  note: string
  items: { product_id: number; quantity: number }[]
  payment_method: PaymentMethod
  payment_ref: string
}

export interface OrderList {
  items: Order[]
  total: number
  counts: Record<OrderStatus | 'all', number>
}

export interface Dashboard {
  stats: {
    products_listed: number
    new_enquiries: number
    quotes_sent: number
    pages_published: number
  }
  latest_orders: Order[]
}

export interface ContentField {
  key: string
  label: string
  kind: 'text' | 'textarea' | 'url'
  help: string
  default: string
  value: string
}

export interface ContentPage {
  id: string
  label: string
  fields: ContentField[]
}

export interface AdminUser {
  id: number
  email: string
  name: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_at: string
  user: AdminUser
}
