// Browser storage can be missing or blocked (private mode, strict settings), so
// every access is guarded and falls back to the default.

type Area = 'local' | 'session'

function area(which: Area): Storage | null {
  try {
    return which === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export function readStored<T>(which: Area, key: string, fallback: T): T {
  try {
    const raw = area(which)?.getItem(key)
    return raw == null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeStored(which: Area, key: string, value: unknown): void {
  try {
    if (value === undefined || value === null) area(which)?.removeItem(key)
    else area(which)?.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: the value just is not remembered.
  }
}
