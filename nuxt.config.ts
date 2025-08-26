// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
   appConfig: {
    ui: {
      colors: {
        primary: 'emerald',   // any Tailwind color name
        neutral: 'stone'    // replaces old "gray"
      }
    }
  }
})