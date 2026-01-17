// https://nuxt.com/docs/api/configuration/nuxt-config
import { readFileSync } from 'fs';
import { resolve } from 'path';

const packageJson = JSON.parse(readFileSync(resolve('./package.json'), 'utf-8'));

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
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
  }
})
