/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When set, FE uses createLiveApiClient against this base (e.g. http://127.0.0.1:8000). */
  readonly VITE_API_BASE_URL?: string
  /**
   * Optional Bearer token when backend SECRET_KEY is set.
   * Local MVP only — do not embed production secrets in Vite builds.
   */
  readonly VITE_API_BEARER_TOKEN?: string
  /** Force mock client even if VITE_API_BASE_URL is set (`true`). */
  readonly VITE_USE_MOCK?: string
  /** ADR-14 display currency; USD or BRL. Mirrors backend CURRENCY_CODE. */
  readonly VITE_CURRENCY_CODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
