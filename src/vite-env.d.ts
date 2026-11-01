/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTENTIKA_MAINNET_ADDRESS?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
