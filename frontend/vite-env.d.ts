/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_ENABLE_PERFORMANCE_MONITORING: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_VAPID_PUBLIC_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Service Worker types
declare const self: ServiceWorkerGlobalScope & {
  skipWaiting(): void;
  clients: Clients;
  registration: ServiceWorkerRegistration;
  addEventListener(type: string, listener: (event: any) => void): void;
};