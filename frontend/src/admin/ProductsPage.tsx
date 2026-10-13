import { useState } from 'react'
import { api } from '../lib/api'
import type { AdminProduct, ProductInput } from '../lib/types'
import ui from './admin.module.css'
import ProductForm from './ProductForm'
import styles from './ProductsPage.module.css'
import { ErrorNotice, LivePill, PageHeader, useFlash, useLoad } from './shared'

export default function ProductsPage() {
  const products = useLoad(api.products)
  const [editing, setEditing] = useState<AdminProduct | 'new' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, flash] = useFlash()
  const list = products.data ?? []

  async function move(index: number, step: -1 | 1) {
    const ids = list.map((product) => product.id)
    ;[ids[index], ids[index + step]] = [ids[index + step], ids[index]]
    try {
      products.setData(await api.reorderProducts(ids))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the order.')
    }
  }

  function afterSave(text: string) {
    setEditing(null)
    flash(text)
    void products.reload()
  }

  return (
    <>
      <PageHeader title="Products" subtitle="Add, edit and arrange the products in your shop." />
      <ErrorNotice>{error ?? products.error}</ErrorNotice>

      <section className={ui.card}>
        <div className={ui.cardHead}>
          <h2 className={ui.cardTitle}>All products {products.data && <span className={ui.muted}>({list.length})</span>}</h2>
          <div className={ui.actions}>
            {message && <span className={ui.saved}>{message}</span>}
            <button type="button" className={`${ui.button} ${ui.primary}`} onClick={() => setEditing('new')}>
              + Add product
            </button>
          </div>
        </div>
        <p className={ui.muted}>
          Products show on the website in this order. Drafts are hidden from shoppers. Change a price right in the
          list: type it and press Enter. An empty price shows “Price on request”.
        </p>

        <div className={ui.tableWrap}>
          <table className={`${ui.table} ${styles.table}`}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Product</th>
                <th>Category</th>
                <th>Pack size</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((product, index) => (
                <tr key={product.id}>
                  <td className={ui.nowrap}>
                    <button
                      type="button"
                      className={ui.iconButton}
                      aria-label={`Move ${product.name} up`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      ↑
                    </button>{' '}
                    <button
                      type="button"
                      className={ui.iconButton}
                      aria-label={`Move ${product.name} down`}
                      disabled={index === list.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      ↓
                    </button>
                  </td>
                  <td>
                    <div className={styles.product}>
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className={styles.thumb} />
                      ) : (
                        <span className={styles.thumb} data-tint={product.tint} aria-hidden="true" />
                      )}
                      <span>
                        <span className={ui.strong}>{product.name}</span>
                        <span className={ui.sub}>{product.description}</span>
                      </span>
                    </div>
                  </td>
                  <td className={ui.muted}>{product.category}</td>
                  <td className={ui.nowrap}>{product.spec || '—'}</td>
                  <td className={ui.nowrap}>
                    {/* Keyed by price so it shows the new value after a save in the edit dialog. */}
                    <PriceCell
                      key={`${product.id}-${product.price}`}
                      product={product}
                      onSaved={(saved) => {
                        products.setData(list.map((p) => (p.id === saved.id ? saved : p)))
                        flash(`Saved the price of “${saved.name}”.`)
                      }}
                      onError={setError}
                    />
                  </td>
                  <td>
                    <LivePill live={product.is_live} />
                  </td>
                  <td>
                    <button type="button" className={ui.textButton} onClick={() => setEditing(product)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {products.data && list.length === 0 && <p className={ui.empty}>No products yet. Add your first one.</p>}
      </section>

      {editing && (
        <ProductForm
          product={editing === 'new' ? null : editing}
          categories={[...new Set(list.map((p) => p.category))]}
          onClose={() => setEditing(null)}
          onSaved={(saved) => afterSave(editing === 'new' ? `Added “${saved.name}”.` : `Saved “${saved.name}”.`)}
          onDeleted={() => afterSave('Product deleted.')}
        />
      )}
    </>
  )
}

interface PriceCellProps {
  product: AdminProduct
  onSaved: (product: AdminProduct) => void
  onError: (message: string) => void
}

/** The price per pack, editable in the list: Enter or clicking away saves it. */
function PriceCell({ product, onSaved, onError }: PriceCellProps) {
  const initial = product.price > 0 ? String(product.price) : ''
  const [text, setText] = useState(initial)
  const [busy, setBusy] = useState(false)

  async function save() {
    const price = text.trim() === '' ? 0 : Number(text.trim())
    if (Number.isNaN(price) || price < 0) {
      onError(`Enter a price like 120 or 120.50 for “${product.name}”, or leave it empty.`)
      setText(initial)
      return
    }
    if (price === product.price) return
    const input: ProductInput = {
      name: product.name,
      category: product.category,
      description: product.description,
      spec: product.spec,
      price,
      art: product.art,
      tint: product.tint,
      image_url: product.image_url,
      is_live: product.is_live,
    }
    setBusy(true)
    try {
      onSaved(await api.updateProduct(product.id, input))
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save the price.')
      setText(initial)
    } finally {
      setBusy(false)
    }
  }

  return (
    <label className={styles.price}>
      <span aria-hidden="true">₹</span>
      <input
        inputMode="decimal"
        value={text}
        placeholder="On request"
        maxLength={10}
        disabled={busy}
        aria-label={`Price per pack of ${product.name}`}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => void save()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') setText(initial)
        }}
      />
    </label>
  )
}
