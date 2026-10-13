import type {
  AdminProduct,
  AdminUser,
  ContentPage,
  Dashboard,
  Order,
  OrderAlerts,
  OrderCreated,
  OrderInput,
  OrderList,
  OrderStatus,
  PaymentStatus,
  ProductInput,
  SiteData,
  SiteSettings,
  TokenResponse,
  Video,
  VideoInput,
} from './types'

// Same origin by default: Vite proxies /api in development and FastAPI serves
// the built site in production. Set VITE_API_URL to host the API elsewhere.
const API_BASE = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  readonly status: number
  /** Field name -> message, for 422 validation errors. */
  readonly fields: Record<string, string>
  readonly detail: unknown

  constructor(status: number, message: string, detail: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    this.fields = validationFields(detail)
  }
}

interface ValidationIssue {
  loc: (string | number)[]
  msg: string
}

function isValidationList(detail: unknown): detail is ValidationIssue[] {
  return Array.isArray(detail) && detail.every((d) => d && typeof d === 'object' && 'loc' in d && 'msg' in d)
}

function cleanMessage(msg: string): string {
  const text = msg.replace(/^Value error, /, '')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function validationFields(detail: unknown): Record<string, string> {
  const fields: Record<string, string> = {}
  if (isValidationList(detail)) {
    for (const issue of detail) {
      const name = String(issue.loc[issue.loc.length - 1] ?? '')
      fields[name] ??= cleanMessage(issue.msg)
    }
  }
  return fields
}

function messageFor(status: number, detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object' && 'message' in detail) return String(detail.message)
  if (isValidationList(detail) && detail.length > 0) return 'Please check the highlighted fields.'
  if (status >= 500) return 'Something went wrong on our side. Please try again.'
  return `Request failed (${status}).`
}

let authToken: string | null = null
let onUnauthorized: (() => void) | null = null

export function setAuthToken(token: string | null): void {
  authToken = token
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  let response: Response
  try {
    response = await fetch(API_BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.', null)
  }

  if (response.status === 204) return undefined as T
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = data && typeof data === 'object' && 'detail' in data ? data.detail : null
    if (response.status === 401 && authToken) onUnauthorized?.()
    throw new ApiError(response.status, messageFor(response.status, detail), detail)
  }
  return data as T
}

const get = <T>(path: string) => request<T>('GET', path)
const send = <T>(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown) =>
  request<T>(method, path, body)

export const api = {
  // Public website
  site: () => get<SiteData>('/api/site'),
  createOrder: (order: OrderInput) => send<OrderCreated>('POST', '/api/orders', order),

  // Sign-in
  login: (email: string, password: string, remember: boolean) =>
    send<TokenResponse>('POST', '/api/auth/login', { email, password, remember }),
  me: () => get<AdminUser>('/api/auth/me'),

  // Admin
  dashboard: () => get<Dashboard>('/api/admin/dashboard'),

  products: () => get<AdminProduct[]>('/api/admin/products'),
  createProduct: (product: ProductInput) => send<AdminProduct>('POST', '/api/admin/products', product),
  updateProduct: (id: number, product: ProductInput) =>
    send<AdminProduct>('PUT', `/api/admin/products/${id}`, product),
  deleteProduct: (id: number) => send<void>('DELETE', `/api/admin/products/${id}`),
  reorderProducts: (ids: number[]) => send<AdminProduct[]>('POST', '/api/admin/products/reorder', { ids }),

  orders: (filters: { status?: OrderStatus; q?: string }) => {
    const params = new URLSearchParams({ limit: '200' })
    if (filters.status) params.set('status', filters.status)
    if (filters.q) params.set('q', filters.q)
    return get<OrderList>(`/api/admin/orders?${params}`)
  },
  updateOrder: (id: number, changes: { status?: OrderStatus; payment_status?: PaymentStatus }) =>
    send<Order>('PATCH', `/api/admin/orders/${id}`, changes),
  deleteOrder: (id: number) => send<void>('DELETE', `/api/admin/orders/${id}`),

  content: () => get<ContentPage[]>('/api/admin/content'),
  updateContent: (values: Record<string, string>) => send<ContentPage[]>('PUT', '/api/admin/content', { values }),

  videos: () => get<Video[]>('/api/admin/videos'),
  createVideo: (video: VideoInput) => send<Video>('POST', '/api/admin/videos', video),
  updateVideo: (id: number, video: VideoInput) => send<Video>('PUT', `/api/admin/videos/${id}`, video),
  deleteVideo: (id: number) => send<void>('DELETE', `/api/admin/videos/${id}`),
  reorderVideos: (ids: number[]) => send<Video[]>('POST', '/api/admin/videos/reorder', { ids }),

  settings: () => get<SiteSettings>('/api/admin/settings'),
  updateSettings: (settings: SiteSettings) => send<SiteSettings>('PUT', '/api/admin/settings', settings),
  orderAlerts: () => get<OrderAlerts>('/api/admin/settings/alerts'),
  /** Leave `apikey` out to keep the saved key; "" removes it. */
  updateOrderAlerts: (alerts: { phone: string; apikey?: string }) =>
    send<OrderAlerts>('PUT', '/api/admin/settings/alerts', alerts),
  testOrderAlert: () => send<{ ok: boolean; detail: string }>('POST', '/api/admin/settings/alerts/test'),
  changePassword: (currentPassword: string, newPassword: string) =>
    send<TokenResponse>('POST', '/api/admin/account/password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),
}
