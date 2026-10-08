import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { defineVitestProject } from '@nuxt/test-utils/config';

const r = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        // Framework-free logic: graph helpers, blockchain and network domain
        resolve: {
          alias: {
            '~~': r('./'),
            '~': r('./app'),
          },
        },
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      // Composables and components inside a Nuxt runtime (happy-dom)
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/nuxt/**/*.test.ts'],
          environment: 'nuxt',
          setupFiles: ['test/support/setup-nuxt.ts'],
          environmentOptions: {
            nuxt: {
              domEnvironment: 'happy-dom',
            },
          },
        },
      }),
    ],
    coverage: {
      provider: 'v8',
      include: ['app/**/*.{ts,vue}', 'src/**/*.ts'],
      exclude: ['app/app.vue', 'app/plugins/**', 'app/components/InfoPopup.vue'],
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        // Frontend (components, composables, helpers)
        'app/**': { statements: 90, branches: 80, functions: 85, lines: 90 },
        // Simulation domain, covered by safety-net tests
        'src/**': { statements: 70, branches: 55, functions: 75, lines: 70 },
      },
    },
  },
});
