import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { readStored, writeStored } from '../lib/storage'
import type { Product } from '../lib/types'
import type { CustomerDetails } from '../lib/whatsapp'
import { useSite } from './SiteDataContext'

export interface CartItem {
  product: Product
  quantity: number
}

interface CartValue {
  items: CartItem[]
  /** Number of packs in the cart. */
  count: number
  /** Rupees for the priced items. */
  total: number
  /** Some items have no price yet ("Price on request"). */
  pricePending: boolean
  quantityOf: (productId: number) => number
  setQuantity: (productId: number, quantity: number) => void
  clear: () => void
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  customer: CustomerDetails
  updateCustomer: (changes: Partial<CustomerDetails>) => void
}

const CART_KEY = 'klenz.cart'
const CUSTOMER_KEY = 'klenz.customer'
const MAX_QUANTITY = 99
const NO_CUSTOMER: CustomerDetails = { name: '', phone: '', address: '', note: '' }

const CartContext = createContext<CartValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { data } = useSite()
  // Product id -> quantity. Kept across visits; details only for this browser tab.
  const [lines, setLines] = useState<Record<string, number>>(() => readStored('local', CART_KEY, {}))
  const [customer, setCustomer] = useState<CustomerDetails>(() => ({
    ...NO_CUSTOMER,
    ...readStored<Partial<CustomerDetails>>('session', CUSTOMER_KEY, {}),
  }))
  const [isOpen, setOpen] = useState(false)

  useEffect(() => writeStored('local', CART_KEY, lines), [lines])
  useEffect(() => writeStored('session', CUSTOMER_KEY, customer), [customer])

  const setQuantity = useCallback((productId: number, quantity: number) => {
    setLines((current) => {
      const next = { ...current }
      if (quantity <= 0) delete next[productId]
      else next[productId] = Math.min(Math.floor(quantity), MAX_QUANTITY)
      return next
    })
  }, [])

  const value = useMemo<CartValue>(() => {
    // Products that were removed or hidden since the visit started simply drop out.
    const items = data.products
      .filter((product) => (lines[product.id] ?? 0) > 0)
      .map((product) => ({ product, quantity: lines[product.id] }))
    return {
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      // In paise, so ₹0.10 + ₹0.20 adds up exactly.
      total: items.reduce((sum, item) => sum + Math.round(item.product.price * 100) * item.quantity, 0) / 100,
      pricePending: items.some((item) => item.product.price <= 0),
      quantityOf: (productId) => lines[productId] ?? 0,
      setQuantity,
      clear: () => setLines({}),
      isOpen,
      openCart: () => setOpen(true),
      closeCart: () => setOpen(false),
      customer,
      updateCustomer: (changes) => setCustomer((current) => ({ ...current, ...changes })),
    }
  }, [data.products, lines, isOpen, customer, setQuantity])

  return <CartContext value={value}>{children}</CartContext>
}

export function useCart(): CartValue {
  const value = use(CartContext)
  if (!value) throw new Error('useCart() must be used inside <CartProvider>')
  return value
}
