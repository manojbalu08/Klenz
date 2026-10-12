export type VideoSource =
  | { kind: 'none' }
  | { kind: 'youtube'; embedUrl: string; thumbnail: string }
  | { kind: 'vimeo'; embedUrl: string }
  | { kind: 'file'; src: string; poster?: string }

/** Videos in frontend/public/videos have a poster picture with the same name (.jpg). */
export function posterFor(link: string): string | undefined {
  return /^\/videos\/[\w-]+\.(mp4|webm)$/i.test(link) ? link.replace(/\.\w+$/, '.jpg') : undefined
}

/** Works out how to play a link the admin pasted: YouTube, Vimeo, or a video file (full link or /videos/… path). */
export function videoSource(link: string): VideoSource {
  let url: URL
  try {
    url = new URL(link.trim(), window.location.origin)
  } catch {
    return { kind: 'none' }
  }
  if (!link.trim() || (url.protocol !== 'https:' && url.protocol !== 'http:')) return { kind: 'none' }

  const host = url.hostname.replace(/^(www|m)\./, '')
  let youtubeId: string | null = null
  if (host === 'youtu.be') {
    youtubeId = url.pathname.split('/')[1] ?? null
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    youtubeId =
      url.pathname === '/watch'
        ? url.searchParams.get('v')
        : (url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)?.[1] ?? null)
  }
  if (youtubeId && /^[\w-]{6,20}$/.test(youtubeId)) {
    return {
      kind: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`,
      thumbnail: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    }
  }

  const vimeoId = host === 'vimeo.com' || host === 'player.vimeo.com' ? url.pathname.match(/(\d{6,})/)?.[1] : undefined
  if (vimeoId) return { kind: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=1` }

  return { kind: 'file', src: url.href, poster: posterFor(link.trim()) }
}
