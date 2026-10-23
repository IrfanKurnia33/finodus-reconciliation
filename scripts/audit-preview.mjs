import { chromium } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readdirSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const root = join(homedir(), 'AppData', 'Local', 'ms-playwright')
const folder = existsSync(root) ? readdirSync(root).filter(n => /^chromium-\d+$/.test(n)).sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))[0] : undefined
const executablePath = process.env.BROWSER_EXECUTABLE_PATH ?? (folder ? join(root, folder, 'chrome-win64', 'chrome.exe') : undefined)
const browser = await chromium.launch({ executablePath })
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.addInitScript(() => localStorage.setItem('finodus:tour:v1', 'seen'))
  await page.goto('http://127.0.0.1:5173')
  await page.getByRole('heading', { name: 'September reconciliation', exact: true }).waitFor()
  console.log('Mobile document width:', await page.evaluate(() => document.documentElement.scrollWidth))
  await page.setViewportSize({ width: 1440, height: 1000 })
  for (const route of ['workspace', 'investigate']) {
    await page.goto(`http://127.0.0.1:5173/#/${route}`)
    await page.getByRole('heading', { name: route === 'workspace' ? 'September reconciliation' : 'Investigate bank withdrawal', exact: true }).waitFor()
    const result = await new AxeBuilder({ page }).analyze()
    console.log(route, JSON.stringify(result.violations.map(v => ({ rule: v.id, count: v.nodes.length, nodes: v.nodes.slice(0, 15).map(n => ({ target: n.target, issue: n.failureSummary })) }))))
  }
} finally { await browser.close() }
