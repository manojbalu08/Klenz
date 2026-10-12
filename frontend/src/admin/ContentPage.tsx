import { useState } from 'react'
import { api } from '../lib/api'
import type { ContentField } from '../lib/types'
import ui from './admin.module.css'
import styles from './ContentPage.module.css'
import { ErrorNotice, PageHeader, useFlash, useLoad } from './shared'
import VideosEditor from './VideosEditor'

const PAGE_LINKS: Record<string, string> = { home: '/', about: '/about', contact: '/contact', site: '/' }

export default function ContentPage() {
  const content = useLoad(api.content)
  const [pageId, setPageId] = useState('home')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, flash] = useFlash(3500)

  const pages = content.data ?? []
  const page = pages.find((p) => p.id === pageId) ?? pages[0]
  const stored = Object.fromEntries(pages.flatMap((p) => p.fields).map((f) => [f.key, f.value]))
  const changed = Object.keys(drafts).filter((key) => drafts[key] !== stored[key])
  const changedOn = (id: string) => changed.filter((key) => key.startsWith(`${id}.`)).length

  async function save() {
    setBusy(true)
    setError(null)
    try {
      content.setData(await api.updateContent(Object.fromEntries(changed.map((key) => [key, drafts[key]]))))
      setDrafts({})
      flash('Saved — your website shows the new text now.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your changes.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Page content" subtitle="Change the words and pictures on your website." />
      <ErrorNotice>{error ?? content.error}</ErrorNotice>

      <section className={ui.card}>
        <div className={ui.tabs} role="group" aria-label="Choose a page">
          {pages.map((p) => (
            <button key={p.id} type="button" className={ui.tab} aria-pressed={p.id === page?.id} onClick={() => setPageId(p.id)}>
              {p.label}
              {changedOn(p.id) > 0 && <span className={styles.changed}>{changedOn(p.id)} unsaved</span>}
            </button>
          ))}
        </div>

        {page?.fields.map((field) => (
          <FieldEditor
            key={field.key}
            field={field}
            value={drafts[field.key] ?? field.value}
            onChange={(value) => setDrafts((current) => ({ ...current, [field.key]: value }))}
          />
        ))}

        <div className={`${ui.actions} ${styles.saveBar}`}>
          <button type="button" className={`${ui.button} ${ui.primary}`} onClick={save} disabled={busy || changed.length === 0}>
            {busy ? 'Saving…' : changed.length > 1 ? `Save ${changed.length} changes` : 'Save changes'}
          </button>
          <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => setDrafts({})} disabled={changed.length === 0}>
            Undo changes
          </button>
          {page && (
            <a className={styles.viewLink} href={PAGE_LINKS[page.id] ?? '/'} target="_blank" rel="noreferrer">
              View page ↗
            </a>
          )}
          {saved && <span className={ui.saved}>{saved}</span>}
        </div>
      </section>

      <VideosEditor />
    </>
  )
}

function FieldEditor({ field, value, onChange }: { field: ContentField; value: string; onChange: (value: string) => void }) {
  const id = `content-${field.key}`
  const isImage = field.kind === 'url' && /\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i.test(value)
  return (
    <div className={ui.field}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={ui.label}>
          {field.label}
        </label>
        {value !== field.default && (
          <button type="button" className={styles.reset} onClick={() => onChange(field.default)}>
            Use original text
          </button>
        )}
      </div>
      {field.kind === 'textarea' ? (
        <textarea id={id} className={ui.input} value={value} placeholder={field.default} rows={3} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} className={ui.input} value={value} placeholder={field.default || 'https://…'} onChange={(e) => onChange(e.target.value)} />
      )}
      {field.help && <span className={ui.help}>{field.help}</span>}
      {isImage && <img src={value} alt="" className={styles.preview} />}
    </div>
  )
}
