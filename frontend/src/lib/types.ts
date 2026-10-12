// Shapes returned by the Python API (see backend/app/schemas.py).

export type ArtStyle = 'box' | 'pocket' | 'roll' | 'towel' | 'napkin'
export type Tint = 'soft' | 'soft2'
export type OrderStatus = 'new' | 'quoted' | 'closed'

export interface Product {
  id: number
  name: string
  category: string
  description: string
  /** Pack size shown instead of a price, e.g. "80 grams". */
  spec: string
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
  whatsapp_number: string
  phone: string
  email: string
  address: string
  hours: string
  country_code: string
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
}

export interface OrderCreated {
  reference: string
  created_at: string
  items: OrderItem[]
  /** Number of packs. */
  item_count: number
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
