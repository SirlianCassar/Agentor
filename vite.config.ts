import { defineConfig } from 'vite'
import path from 'node:path'
import fs from 'node:fs'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'),
) as { version?: string }
const appVersion = process.env.VITE_APP_VERSION ?? packageJson.version ?? '2.0.0'
const autoUpdateGhToken = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? ''
export default defineConfig({
  base: './',
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    __AUTO_UPDATE_GH_TOKEN__: JSON.stringify(autoUpdateGhToken),
  },
  plugins: [
    react({
      babel: {
        compact: false,
      },
    }),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          define: {
            __AUTO_UPDATE_GH_TOKEN__: JSON.stringify(autoUpdateGhToken),
          },
          build: {
            lib: {
              entry: 'electron/main.ts',
              formats: ['es'],
              fileName: () => 'main.mjs',
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
      },
    }),
  ],
})
