import { useState, type FormEvent } from 'react'
import Dialog from '../components/Dialog'
import { api, ApiError } from '../lib/api'
import type { AdminProduct, ArtStyle, ProductInput, Tint } from '../lib/types'
import ProductArt, { ART_STYLES, tintColor } from '../shop/ProductArt'
import ui from './admin.module.css'
import styles from './ProductForm.module.css'
import { ErrorNotice } from './shared'

const EMPTY: ProductInput = {
  name: '',
  category: '',
  description: '',
  spec: '',
  art: 'box',
  tint: 'soft',
  image_url: '',
  is_live: true,
}

interface ProductFormProps {
  /** The product to edit, or null to add a new one. */
  product: AdminProduct | null
  categories: string[]
  onClose: () => void
  onSaved: (product: AdminProduct) => void
  onDeleted: (id: number) => void
}

/** Add / edit product dialog, used on the Dashboard and the Products page. */
export default function ProductForm({ product, categories, onClose, onSaved, onDeleted }: ProductFormProps) {
  const [values, setValues] = useState<ProductInput>(() => (product ? { ...EMPTY, ...product } : EMPTY))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function set<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onSaved(product ? await api.updateProduct(product.id, values) : await api.createProduct(values))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the product.')
      if (err instanceof ApiError) setErrors(err.fields)
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!product || !window.confirm(`Delete “${product.name}”? Past orders keep their details.`)) return
    setBusy(true)
    try {
      await api.deleteProduct(product.id)
      onDeleted(product.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the product.')
      setBusy(false)
    }
  }

  const fieldError = (key: keyof ProductInput) =>
    errors[key] ? <span className={ui.fieldError}>{errors[key]}</span> : null

  return (
    <Dialog open onClose={onClose} label={product ? 'Edit product' : 'Add product'}>
      <form className={ui.modal} onSubmit={handleSubmit} noValidate>
        <div className={ui.modalHead}>
          <h2 className={ui.cardTitle}>{product ? 'Edit product' : 'Add product'}</h2>
          <button type="button" className={ui.close} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <ErrorNotice>{error}</ErrorNotice>

        {/* Preview of the card picture as shoppers see it. */}
        <div className={styles.preview} style={{ background: values.image_url ? '#fff' : tintColor(values.tint) }}>
          {values.image_url ? (
            <img src={values.image_url} alt="" className={styles.previewPhoto} />
          ) : (
            <ProductArt art={values.art} tint={values.tint} />
          )}
          <span className={styles.previewTag}>{values.category || 'Category'}</span>
        </div>

        <div className={ui.formRow}>
          <label className={`${ui.field} ${ui.fieldWide}`}>
            <span className={ui.label}>Name</span>
            <input
              className={ui.input}
              value={values.name}
              onChange={(e) => set('name', e.target.value)}
              required
              maxLength={120}
              aria-invalid={Boolean(errors.name)}
            />
            {fieldError('name')}
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Pack size</span>
            <input
              className={ui.input}
              value={values.spec}
              onChange={(e) => set('spec', e.target.value)}
              placeholder="e.g. 80 grams, 100 pulls"
              maxLength={120}
              aria-invalid={Boolean(errors.spec)}
            />
            {fieldError('spec')}
          </label>
        </div>

        <div className={ui.formRow}>
          <label className={ui.field}>
            <span className={ui.label}>Category</span>
            <input
              className={ui.input}
              list="product-categories"
              value={values.category}
              onChange={(e) => set('category', e.target.value)}
              placeholder="e.g. Tissue"
              maxLength={60}
              aria-invalid={Boolean(errors.category)}
            />
            <datalist id="product-categories">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
            <span className={ui.help}>Products are grouped by category in the shop filters.</span>
            {fieldError('category')}
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Drawing</span>
            <select className={ui.input} value={values.art} onChange={(e) => set('art', e.target.value as ArtStyle)}>
              {ART_STYLES.map((style) => (
                <option key={style.value} value={style.value}>
                  {style.label}
                </option>
              ))}
            </select>
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Card colour</span>
            <select className={ui.input} value={values.tint} onChange={(e) => set('tint', e.target.value as Tint)}>
              <option value="soft">Light</option>
              <option value="soft2">Warm</option>
            </select>
          </label>
        </div>

        <label className={ui.field}>
          <span className={ui.label}>Description</span>
          <textarea
            className={ui.input}
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
            maxLength={500}
            rows={3}
          />
        </label>

        <label className={ui.field}>
          <span className={ui.label}>Photo (optional)</span>
          <input
            className={ui.input}
            value={values.image_url}
            onChange={(e) => set('image_url', e.target.value)}
            placeholder="https://… or /images/products/photo.jpg"
            aria-invalid={Boolean(errors.image_url)}
          />
          <span className={ui.help}>
            A link to a photo, or a file in frontend/public/images/products. Leave empty to show the drawing.
          </span>
          {fieldError('image_url')}
        </label>

        <label className={ui.check}>
          <input type="checkbox" checked={values.is_live} onChange={(e) => set('is_live', e.target.checked)} />
          Show this product on the website
        </label>

        <div className={styles.footer}>
          {product ? (
            <button type="button" className={`${ui.button} ${ui.danger}`} onClick={handleDelete} disabled={busy}>
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className={ui.actions}>
            <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={`${ui.button} ${ui.primary}`} disabled={busy}>
              {busy ? 'Saving…' : product ? 'Save changes' : 'Add product'}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
