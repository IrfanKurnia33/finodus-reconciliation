import { chromium } from '@playwright/test'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const output = fileURLToPath(new URL('../docs/case-study/assets/', import.meta.url))
const browserRoot = join(homedir(), 'AppData', 'Local', 'ms-playwright')
const folder = existsSync(browserRoot) ? readdirSync(browserRoot).filter(name => /^chromium-\d+$/.test(name)).sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))[0] : undefined
const executablePath = process.env.BROWSER_EXECUTABLE_PATH ?? (folder ? join(browserRoot, folder, 'chrome-win64', 'chrome.exe') : undefined)
const baseURL = process.env.PROTOTYPE_URL ?? 'http://127.0.0.1:5173'
const captureStyle = '.prototype-bar, .feedback-toast { visibility: hidden !important; } .app-header, .evidence-column, .review-aside { position: static !important; }'
mkdirSync(output, { recursive: true })

const browser = await chromium.launch({ executablePath })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1060 }, reducedMotion: 'reduce', deviceScaleFactor: 1 })
  const page = await context.newPage()
  await page.addInitScript(() => localStorage.setItem('finodus:tour:v1', 'seen'))
  await page.goto(baseURL)
  await page.getByRole('heading', { name: 'September reconciliation', exact: true }).waitFor()
  await page.evaluate(() => document.fonts.ready)

  async function capture(name, locator, options = {}) {
    await page.evaluate(() => window.scrollTo(0, 0))
    await locator.screenshot({ path: join(output, name), style: captureStyle, animations: 'disabled', ...options })
    console.log(`Captured ${name}`)
  }

  await capture('01-workspace.png', page)
  await page.getByRole('button', { name: /Autonomy Watch/ }).click()
  await capture('02-autonomy-policy.png', page.getByRole('dialog', { name: 'Autonomy & permissions', exact: true }))
  await page.getByRole('button', { name: 'Close Autonomy & permissions', exact: true }).click()

  await page.getByRole('button', { name: 'Review finding', exact: true }).click()
  await page.getByRole('radio', { name: 'Select PAY-817, check 1042' }).check()
  await capture('03-investigation.png', page.locator('main'))
  await capture('03a-evidence-comparison.png', page.locator('.investigation-grid'))
  // A viewport capture keeps the two candidates and original source together in the short version.
  await page.evaluate(() => window.scrollTo(0, 0))
  await capture('03b-investigation-overview.png', page)

  await page.getByRole('button', { name: 'Confirm match', exact: true }).click()
  await page.getByRole('heading', { name: 'Match recorded by Maya', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Review remaining check', exact: true }).click()
  await capture('04-outstanding-treatment.png', page.locator('main'))
  await page.getByRole('button', { name: 'Record outstanding check', exact: true }).click()
  await page.getByRole('heading', { name: 'Timing difference recorded', exact: true }).waitFor()
  await page.locator('main').getByRole('button', { name: 'Review package', exact: true }).click()
  await page.getByRole('heading', { name: 'The balance bridge', exact: true }).waitFor()
  await capture('05-review-package.png', page.locator('main'))
  await capture('05a-balance-bridge.png', page.locator('.balance-card'))

  await page.getByRole('button', { name: 'Submit for review', exact: true }).click()
  await page.getByRole('heading', { name: 'Independent review', exact: true }).waitFor()
  await page.getByRole('button', { name: /Test controls.*open prototype controls/i }).click()
  await page.getByRole('button', { name: /Daniel Rivera Controller/ }).click()
  await page.getByRole('button', { name: 'Return to workspace', exact: true }).click()
  await capture('06-independent-review.png', page.locator('main'))

  await page.getByRole('button', { name: 'Sign off reconciliation', exact: true }).click()
  await page.getByRole('heading', { name: 'Review complete', exact: true }).waitFor()
  await capture('07-signed-off.png', page.locator('main'))
} finally {
  await browser.close()
}
