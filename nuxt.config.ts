// https://nuxt.com/docs/api/configuration/nuxt-config
import { readFileSync } from 'fs';
import { resolve } from 'path';

const packageJson = JSON.parse(readFileSync(resolve('./package.json'), 'utf-8'));

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  icon: {
    // Bundle the used icons so the static build works without an icon API / CDN
    clientBundle: {
      scan: true,
      sizeLimitKb: 256,
      // Default icons used internally by Nuxt UI components (select, input number, toast, ...)
      icons: ['lucide:chevron-down', 'lucide:check', 'lucide:x', 'lucide:loader-circle', 'lucide:plus', 'lucide:minus'],
    },
  },
  runtimeConfig: {
    public: {
      appVersion: packageJson.version
    }
  },
  appConfig: {
    ui: {
      colors: {
        primary: 'emerald',   // any Tailwind color name
        neutral: 'stone'    // replaces old "gray"
      }
    }
  },
  app: {
    baseURL: (process.env.NUXT_APP_BASE_URL || '/').replace(/\/+$/, '') + '/',
  }
})
