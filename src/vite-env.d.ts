/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTENTIKA_MAINNET_ADDRESS?: string
  readonly VITE_AUTENTIKA_DIRECTORY_ADDRESS?: string
  readonly VITE_AUTENTIKA_SUBSCRIPTIONS_ADDRESS?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
