import { useEffect, useMemo, useRef, useState } from 'react'
import { PauseIcon, PlayIcon } from '../components/icons'
import { useInView, useReducedMotion } from '../components/motion'
import { videoSource } from '../lib/video'
import type { Video } from '../lib/types'
import styles from './VideoShowcase.module.css'

const THUMB_TONES = ['accent', 'primary', 'soft2'] as const

export default function VideoShowcase({ videos }: { videos: Video[] }) {
  const [selectedId, setSelectedId] = useState(videos[0]?.id)
  const [ref, onScreen] = useInView<HTMLDivElement>({ once: false, threshold: 0.35 })
  const reducedMotion = useReducedMotion()
  const index = Math.max(0, videos.findIndex((video) => video.id === selectedId))
  const selected = videos[index]
  if (!selected) return null

  return (
    <div ref={ref} className={styles.row}>
      {/* Keyed so the player starts fresh for each video. */}
      <MainPlayer
        key={selected.id}
        video={selected}
        autoPlay={onScreen && !reducedMotion}
        onEnded={videos.length > 1 ? () => setSelectedId(videos[(index + 1) % videos.length].id) : undefined}
      />
      <ul className={styles.list}>
        {videos.map((video, i) => {
          const source = videoSource(video.url)
          const isSelected = video.id === selected.id
          const picture = source.kind === 'youtube' ? source.thumbnail : source.kind === 'file' ? source.poster : undefined
          return (
            <li key={video.id}>
              <button type="button" className={styles.item} aria-pressed={isSelected} onClick={() => setSelectedId(video.id)}>
                <span
                  className={styles.thumb}
                  data-tone={THUMB_TONES[i % THUMB_TONES.length]}
                  data-picture={picture ? true : undefined}
                  style={picture ? { backgroundImage: `url(${picture})` } : undefined}
                >
                  <span className={styles.thumbPlay}>
                    <PlayIcon size={22} />
                  </span>
                </span>
                <span className={styles.itemText}>
                  <span className={styles.itemTitle}>{video.title}</span>
                  <span className={styles.itemNote}>
                    {source.kind === 'none' ? (
                      '[ video ]'
                    ) : isSelected ? (
                      <>
                        <span className={styles.equalizer} aria-hidden="true">
                          <i />
                          <i />
                          <i />
                        </span>
                        Now showing
                      </>
                    ) : (
                      'Tap to watch'
                    )}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

type PlayerState = 'idle' | 'playing' | 'paused' | 'coming-soon' | 'error'

interface MainPlayerProps {
  video: Video
  /** Play silently while the section is on screen. */
  autoPlay: boolean
  onEnded?: () => void
}

function MainPlayer({ video, autoPlay, onEnded }: MainPlayerProps) {
  const source = useMemo(() => videoSource(video.url), [video.url])
  const [state, setState] = useState<PlayerState>('idle')
  const [pausedByVisitor, setPausedByVisitor] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const player = fileRef.current
    if (!player) return
    if (autoPlay && !pausedByVisitor) {
      player.muted = true
      player.play().catch(() => undefined) // the browser may still refuse; the play button works
    } else if (!autoPlay) {
      player.pause()
    }
  }, [autoPlay, pausedByVisitor])

  const isEmbed = source.kind === 'youtube' || source.kind === 'vimeo'
  const hasPicture = source.kind === 'youtube' || source.kind === 'file'
  const playing = state === 'playing'

  function togglePlay() {
    if (source.kind === 'none') {
      setState('coming-soon')
    } else if (source.kind === 'file') {
      const player = fileRef.current
      if (!player) return
      if (player.paused) {
        setPausedByVisitor(false)
        player.play().catch(() => setState('error'))
      } else {
        setPausedByVisitor(true)
        player.pause()
      }
    } else {
      setState('playing')
    }
  }

  if (isEmbed && playing) {
    return (
      <div className={styles.main}>
        <iframe
          className={styles.fill}
          src={source.embedUrl}
          title={video.title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    )
  }

  const caption = {
    idle: `${video.title} — press play`,
    playing: `Now playing: ${video.title}`,
    paused: `${video.title} — paused`,
    'coming-soon': `${video.title} — video coming soon`,
    error: `${video.title} — this video could not be played`,
  }[state]

  return (
    <div className={`${styles.main} ${hasPicture ? styles.withPicture : ''}`}>
      {source.kind === 'youtube' && <img className={styles.fill} src={source.thumbnail} alt="" />}
      {source.kind === 'file' && (
        <video
          ref={fileRef}
          className={styles.fill}
          src={source.poster ? source.src : `${source.src}#t=0.1`}
          poster={source.poster}
          muted
          playsInline
          preload="metadata"
          aria-label={video.title}
          onPlay={() => setState('playing')}
          onPause={() => setState('paused')}
          onEnded={() => {
            setState('idle')
            setProgress(100)
            onEnded?.()
          }}
          onError={() => setState('error')}
          onTimeUpdate={(event) => {
            const { currentTime, duration } = event.currentTarget
            if (duration) setProgress((currentTime / duration) * 100)
          }}
        />
      )}
      {!hasPicture && <div className={styles.glow} aria-hidden="true" />}
      {source.kind === 'none' && <div className={styles.placeholder}>[ Your main Klenz video ]</div>}

      <button
        type="button"
        className={styles.play}
        data-playing={playing}
        aria-label={playing ? 'Pause video' : `Play video: ${video.title}`}
        onClick={togglePlay}
      >
        {playing ? <PauseIcon /> : <PlayIcon size={34} />}
      </button>

      <div className={styles.caption}>
        <span className={styles.captionTitle} aria-live="polite">
          {caption}
        </span>
        <div className={styles.track}>
          <div className={styles.progress} style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}
