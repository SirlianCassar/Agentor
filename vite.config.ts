import { defineConfig } from 'vite'
import path from 'node:path'
import fs from 'node:fs'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'),
) as { version?: string }
const appVersion = process.env.VITE_APP_VERSION ?? packageJson.version ?? '2.0.0'
export default defineConfig({
  base: './',
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      renderer: process.env.NODE_ENV === 'test' ? undefined : {},
    }),
  ],
})
