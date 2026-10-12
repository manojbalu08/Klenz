import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import Dialog from '../components/Dialog'
import { WhatsAppIcon } from '../components/icons'
import { api } from '../lib/api'
import { dateTime, packs, timeAgo } from '../lib/format'
import type { Order, OrderList, OrderStatus } from '../lib/types'
import { whatsappLink, whatsappNumber } from '../lib/whatsapp'
import ui from './admin.module.css'
import styles from './EnquiriesPage.module.css'
import { ErrorNotice, PageHeader, STATUS_LABELS, StatusPill, useLoad } from './shared'

const FILTERS: { id: OrderStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: STATUS_LABELS.new },
  { id: 'quoted', label: STATUS_LABELS.quoted },
  { id: 'closed', label: STATUS_LABELS.closed },
]

export default function EnquiriesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [list, setList] = useState<OrderList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const settings = useLoad(api.settings)

  // Wait for a pause in typing before searching.
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const load = useCallback(async () => {
    try {
      setList(await api.orders({ status: filter === 'all' ? undefined : filter, q: query }))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load enquiries.')
    }
  }, [filter, query])

  useEffect(() => {
    void load()
  }, [load])

  const openId = Number(searchParams.get('open')) || null
  const opened = list?.items.find((order) => order.id === openId) ?? null

  function open(order: Order | null) {
    setSearchParams(order ? { open: String(order.id) } : {}, { replace: true })
  }

  return (
    <>
      <PageHeader title="Enquiries" subtitle="Orders and quote requests sent from the website." />
      <ErrorNotice>{error}</ErrorNotice>

      <section className={ui.card}>
        <div className={ui.cardHead}>
          <div className={ui.tabs} role="group" aria-label="Filter by status">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={ui.tab}
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
                {list && <span className={styles.count}>{list.counts[item.id] ?? 0}</span>}
              </button>
            ))}
          </div>
          <input
            className={`${ui.input} ${styles.search}`}
            type="search"
            placeholder="Search name, phone or KZ number"
            aria-label="Search enquiries"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {list && list.items.length === 0 ? (
          <p className={ui.empty}>{query ? 'No enquiries match your search.' : 'No enquiries here yet.'}</p>
        ) : (
          <div className={ui.tableWrap}>
            <table className={`${ui.table} ${styles.table}`}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Packs</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list?.items.map((order) => (
                  <tr key={order.id} className={styles.row} onClick={() => open(order)}>
                    <td className={ui.nowrap}>
                      <span className={ui.strong}>{order.reference}</span>
                      <span className={ui.sub}>{timeAgo(order.created_at)}</span>
                    </td>
                    <td>
                      <span className={ui.strong}>{order.customer_name}</span>
                      <span className={ui.sub}>{order.phone}</span>
                    </td>
                    <td className={styles.items}>{order.summary}</td>
                    <td className={`${ui.strong} ${ui.nowrap}`}>{packs(order.item_count)}</td>
                    <td>
                      <StatusPill status={order.status} />
                    </td>
                    <td>
                      <button type="button" className={ui.textButton} onClick={() => open(order)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list && list.total > list.items.length && (
          <p className={ui.muted}>
            Showing the newest {list.items.length} of {list.total}. Search to find older enquiries.
          </p>
        )}
      </section>

      {opened && (
        <EnquiryDialog
          key={opened.id}
          order={opened}
          countryCode={settings.data?.country_code ?? '91'}
          onClose={() => open(null)}
          onChanged={() => void load()}
          onDeleted={() => {
            open(null)
            void load()
          }}
        />
      )}
    </>
  )
}

interface EnquiryDialogProps {
  order: Order
  countryCode: string
  onClose: () => void
  onChanged: () => void
  onDeleted: () => void
}

function EnquiryDialog({ order, countryCode, onClose, onChanged, onDeleted }: EnquiryDialogProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function setStatus(status: OrderStatus) {
    setBusy(true)
    setError(null)
    try {
      await api.updateOrderStatus(order.id, status)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the status.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm(`Delete order ${order.reference} from ${order.customer_name}? This cannot be undone.`)) return
    setBusy(true)
    try {
      await api.deleteOrder(order.id)
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the order.')
      setBusy(false)
    }
  }

  const replyLink = whatsappLink(
    whatsappNumber(order.phone, countryCode),
    `Hi ${order.customer_name}, thank you for your Klenz order ${order.reference}. Here is your quote: `,
  )

  return (
    <Dialog open onClose={onClose} label={`Order ${order.reference}`}>
      <div className={ui.modal}>
        <div className={ui.modalHead}>
          <div>
            <h2 className={ui.cardTitle}>Order {order.reference}</h2>
            <span className={ui.muted}>Received {dateTime(order.created_at)}</span>
          </div>
          <button type="button" className={ui.close} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <ErrorNotice>{error}</ErrorNotice>

        <div className={ui.tabs} role="group" aria-label="Status">
          {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              className={ui.tab}
              aria-pressed={order.status === status}
              disabled={busy}
              onClick={() => setStatus(status)}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>

        <dl className={styles.details}>
          <dt>Customer</dt>
          <dd>{order.customer_name}</dd>
          <dt>Phone</dt>
          <dd>
            <a href={`tel:${order.phone.replace(/[^\d+]/g, '')}`}>{order.phone}</a>
          </dd>
          <dt>Address</dt>
          <dd>{order.address || '—'}</dd>
          {order.note && (
            <>
              <dt>Note</dt>
              <dd>{order.note}</dd>
            </>
          )}
        </dl>

        <div className={ui.tableWrap}>
          <table className={`${ui.table} ${styles.itemsTable}`}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Pack size</th>
                <th>Qty</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={index}>
                  <td className={ui.strong}>{item.product_name}</td>
                  <td className={ui.muted}>{item.product_spec || '—'}</td>
                  <td>{item.quantity}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Total</td>
                <td className={ui.nowrap}>{packs(order.item_count)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className={styles.dialogActions}>
          <a className={`${ui.button} ${styles.whatsapp}`} href={replyLink} target="_blank" rel="noreferrer">
            <WhatsAppIcon size={20} />
            Reply on WhatsApp
          </a>
          <button type="button" className={`${ui.button} ${ui.danger}`} onClick={remove} disabled={busy}>
            Delete
          </button>
        </div>
      </div>
    </Dialog>
  )
}
