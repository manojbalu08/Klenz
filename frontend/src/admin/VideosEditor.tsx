import { useState } from 'react'
import { api } from '../lib/api'
import type { Video } from '../lib/types'
import { videoSource } from '../lib/video'
import ui from './admin.module.css'
import { ErrorNotice, useLoad } from './shared'
import styles from './VideosEditor.module.css'

/** The videos in the Home page "Watch" section. */
export default function VideosEditor() {
  const videos = useLoad(api.videos)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const list = videos.data ?? []

  async function move(index: number, step: -1 | 1) {
    const ids = list.map((video) => video.id)
    ;[ids[index], ids[index + step]] = [ids[index + step], ids[index]]
    try {
      videos.setData(await api.reorderVideos(ids))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the order.')
    }
  }

  return (
    <section className={ui.card}>
      <div className={ui.cardHead}>
        <div>
          <h2 className={ui.cardTitle}>Home page videos</h2>
          <span className={ui.muted}>Paste a YouTube or Vimeo link, or a link to an .mp4 file. The first video is shown large.</span>
        </div>
        <button type="button" className={`${ui.button} ${ui.primary}`} onClick={() => setAdding(true)} disabled={adding}>
          + Add video
        </button>
      </div>
      <ErrorNotice>{error ?? videos.error}</ErrorNotice>

      <ul className={styles.list}>
        {list.map((video, index) => (
          <VideoRow
            key={`${video.id}-${video.title}-${video.url}`}
            video={video}
            position={index}
            count={list.length}
            onMove={(step) => move(index, step)}
            onChanged={() => void videos.reload()}
          />
        ))}
        {adding && (
          <VideoRow
            video={null}
            position={list.length}
            count={list.length + 1}
            onMove={() => undefined}
            onChanged={() => {
              setAdding(false)
              void videos.reload()
            }}
            onCancel={() => setAdding(false)}
          />
        )}
      </ul>
      {videos.data && list.length === 0 && !adding && (
        <p className={ui.empty}>No videos. The “Watch” section is hidden until you add one.</p>
      )}
    </section>
  )
}

interface VideoRowProps {
  video: Video | null
  position: number
  count: number
  onMove: (step: -1 | 1) => void
  onChanged: () => void
  onCancel?: () => void
}

const SOURCE_LABELS = { youtube: 'YouTube video ✓', vimeo: 'Vimeo video ✓', file: 'Video file', none: 'Not a valid link' }

function VideoRow({ video, position, count, onMove, onChanged, onCancel }: VideoRowProps) {
  const [title, setTitle] = useState(video?.title ?? '')
  const [url, setUrl] = useState(video?.url ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dirty = !video || title !== video.title || url !== video.url

  async function save() {
    setBusy(true)
    setError(null)
    try {
      if (video) await api.updateVideo(video.id, { title, url })
      else await api.createVideo({ title, url })
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the video.')
      setBusy(false)
    }
  }

  async function remove() {
    if (!video) return onCancel?.()
    if (!window.confirm(`Remove the video “${video.title}”?`)) return
    setBusy(true)
    try {
      await api.deleteVideo(video.id)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the video.')
      setBusy(false)
    }
  }

  return (
    <li className={styles.row}>
      <div className={styles.order}>
        <button type="button" className={ui.iconButton} aria-label="Move up" disabled={!video || position === 0} onClick={() => onMove(-1)}>
          ↑
        </button>
        <button type="button" className={ui.iconButton} aria-label="Move down" disabled={!video || position >= count - 1} onClick={() => onMove(1)}>
          ↓
        </button>
      </div>
      <label className={styles.title}>
        <span className={ui.label}>Title</span>
        <input className={ui.input} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Factory tour" />
      </label>
      <label className={styles.link}>
        <span className={ui.label}>Link</span>
        <input className={ui.input} value={url} maxLength={500} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtu.be/…" />
        <span className={ui.help}>{url.trim() ? SOURCE_LABELS[videoSource(url).kind] : 'Empty: shows a “coming soon” placeholder.'}</span>
      </label>
      <div className={styles.buttons}>
        <button type="button" className={`${ui.button} ${ui.primary}`} onClick={save} disabled={busy || !dirty || !title.trim()}>
          {video ? 'Save' : 'Add'}
        </button>
        <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={remove} disabled={busy}>
          {video ? 'Remove' : 'Cancel'}
        </button>
      </div>
      {error && <span className={`${ui.fieldError} ${styles.error}`}>{error}</span>}
    </li>
  )
}
