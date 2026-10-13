import { useState } from 'react'
import { Link } from 'react-router'
import { api } from '../lib/api'
import { packs, timeAgo } from '../lib/format'
import type { AdminProduct } from '../lib/types'
import ui from './admin.module.css'
import styles from './DashboardPage.module.css'
import ProductForm from './ProductForm'
import { ErrorNotice, LivePill, PageHeader, useFlash, useLoad } from './shared'

const HEADLINE_PAGES = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About Us' },
  { id: 'contact', label: 'Contact Us' },
]

export default function DashboardPage() {
  const dashboard = useLoad(api.dashboard)
  const products = useLoad(api.products)
  const alerts = useLoad(api.orderAlerts)
  const [editing, setEditing] = useState<AdminProduct | 'new' | null>(null)

  const stats = dashboard.data?.stats
  const productList = products.data ?? []

  function refresh() {
    setEditing(null)
    void products.reload()
    void dashboard.reload()
  }

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Manage your products, enquiries and website content." />
      <ErrorNotice>{dashboard.error ?? products.error}</ErrorNotice>

      {alerts.data && !alerts.data.apikey_set && (
        <div className={styles.alertsOff} role="status">
          <span>
            <strong>WhatsApp order alerts are off.</strong> New orders are saved under Enquiries, but nothing is sent
            to WhatsApp until you switch alerts on (about 2 minutes, once).
          </span>
          <Link to="/admin/settings" className={`${ui.button} ${ui.primary}`}>
            Switch on alerts
          </Link>
        </div>
      )}

      <div className={styles.stats}>
        <Stat label="Products listed" value={stats?.products_listed} />
        <Stat label="New enquiries" value={stats?.new_enquiries} />
        <Stat label="Confirmed" value={stats?.quotes_sent} />
        <Stat label="Pages published" value={stats?.pages_published} highlight />
      </div>

      <div className={ui.columns}>
        <section className={`${ui.card} ${styles.products}`}>
          <div className={ui.cardHead}>
            <h2 className={ui.cardTitle}>Products</h2>
            <button type="button" className={`${ui.button} ${ui.primary}`} onClick={() => setEditing('new')}>
              + Add product
            </button>
          </div>
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {productList.slice(0, 6).map((product) => (
                  <tr key={product.id}>
                    <td className={ui.strong}>{product.name}</td>
                    <td className={ui.muted}>{product.category}</td>
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
          {productList.length > 6 && (
            <Link to="/admin/products" className={styles.more}>
              See all {productList.length} products →
            </Link>
          )}
        </section>

        <section className={`${ui.card} ${styles.enquiries}`}>
          <div className={ui.cardHead}>
            <h2 className={ui.cardTitle}>Latest enquiries</h2>
            <Link to="/admin/enquiries" className={styles.viewAll}>
              View all
            </Link>
          </div>
          {dashboard.data && dashboard.data.latest_orders.length === 0 && (
            <p className={ui.empty}>No enquiries yet. Orders from the Contact page show up here.</p>
          )}
          <ul className={styles.enquiryList}>
            {dashboard.data?.latest_orders.map((order) => (
              <li key={order.id}>
                <Link to={`/admin/enquiries?open=${order.id}`} className={styles.enquiry}>
                  <span className={styles.enquiryName}>
                    {order.customer_name}
                    {order.status === 'new' && <span className={styles.newDot} aria-label="New" />}
                  </span>
                  <span className={ui.muted}>
                    {order.note || order.summary} · {packs(order.item_count)}
                  </span>
                  <span className={styles.enquiryTime}>
                    {order.reference} · {timeAgo(order.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <HeadlineEditor />

      {editing && (
        <ProductForm
          product={editing === 'new' ? null : editing}
          categories={[...new Set(productList.map((p) => p.category))]}
          onClose={() => setEditing(null)}
          onSaved={refresh}
          onDeleted={refresh}
        />
      )}
    </>
  )
}

function Stat({ label, value, highlight = false }: { label: string; value?: number; highlight?: boolean }) {
  return (
    <div className={`${styles.stat} ${highlight ? styles.statHighlight : ''}`}>
      <span className={ui.muted}>{label}</span>
      <span className={styles.statValue}>{value ?? '–'}</span>
    </div>
  )
}

/** "Edit page content" card from the design: change a page's headline quickly. */
function HeadlineEditor() {
  const content = useLoad(api.content)
  const [pageId, setPageId] = useState('home')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, flash] = useFlash()

  const key = `${pageId}.headline`
  const stored = content.data?.flatMap((page) => page.fields).find((field) => field.key === key)?.value ?? ''
  const value = drafts[key] ?? stored

  async function save() {
    setBusy(true)
    setError(null)
    try {
      content.setData(await api.updateContent({ [key]: value }))
      setDrafts((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
      flash('Saved — the website shows the new headline now.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={ui.card}>
      <div className={ui.cardHead}>
        <h2 className={ui.cardTitle}>Edit page content</h2>
        <Link to="/admin/content" className={styles.viewAll}>
          All page text →
        </Link>
      </div>
      <ErrorNotice>{error ?? content.error}</ErrorNotice>
      <div className={ui.formRow}>
        <label className={ui.field}>
          <span className={ui.label}>Page</span>
          <select className={ui.input} value={pageId} onChange={(e) => setPageId(e.target.value)}>
            {HEADLINE_PAGES.map((page) => (
              <option key={page.id} value={page.id}>
                {page.label}
              </option>
            ))}
          </select>
        </label>
        <label className={`${ui.field} ${ui.fieldWide}`}>
          <span className={ui.label}>Headline</span>
          <input
            className={ui.input}
            value={value}
            onChange={(e) => setDrafts((current) => ({ ...current, [key]: e.target.value }))}
            disabled={!content.data}
          />
          <span className={ui.help}>Wrap a word in *stars* to show it in the theme colour.</span>
        </label>
      </div>
      <div className={ui.actions}>
        <button
          type="button"
          className={`${ui.button} ${ui.dark}`}
          onClick={save}
          disabled={busy || !content.data || value === stored}
        >
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        {saved && <span className={ui.saved}>{saved}</span>}
      </div>
    </section>
  )
}
