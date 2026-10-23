import { defineConfig } from '@playwright/test'
import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const browserRoot = join(homedir(), 'AppData', 'Local', 'ms-playwright')
const chromiumFolder = existsSync(browserRoot) ? readdirSync(browserRoot).filter(name => /^chromium-\d+$/.test(name)).sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))[0] : undefined
const installedBrowser = chromiumFolder ? join(browserRoot, chromiumFolder, 'chrome-win64', 'chrome.exe') : undefined

export default defineConfig({
  testDir: './tests', fullyParallel: false, workers: 1, timeout: 45000,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce', trace: 'retain-on-failure',
    launchOptions: { executablePath: process.env.BROWSER_EXECUTABLE_PATH ?? (installedBrowser && existsSync(installedBrowser) ? installedBrowser : undefined) },
  },
  webServer: { command: 'npm run dev -- --port 5173 --strictPort', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI, timeout: 60000 },
})
