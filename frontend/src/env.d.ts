declare global {
  interface ImportMetaEnv {
    /** Base URL of the Python API when it is not served from the same origin. */
    readonly VITE_API_URL?: string
  }
}

export {}
