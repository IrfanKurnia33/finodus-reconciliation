import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createScenario, type Scenario } from '../src/lib/reconciliation'

async function openWorkspace(page: Page, scenario: Scenario = 'standard') {
  await page.addInitScript(({ state }) => {
    localStorage.setItem('finodus:tour:v1', 'seen')
    if (!localStorage.getItem('finodus:workspace:v1')) localStorage.setItem('finodus:workspace:v1', JSON.stringify(state))
  }, { state: createScenario(scenario) })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'September reconciliation', exact: true })).toBeVisible()
}
async function selectSupportedMatch(page: Page) {
  await page.getByRole('button', { name: 'Review finding', exact: true }).click()
  await page.getByRole('radio', { name: 'Select PAY-817, check 1042' }).check()
}
async function switchToController(page: Page) {
  await page.getByRole('button', { name: /Test controls.*open prototype controls/i }).click()
  await page.getByRole('button', { name: /Daniel Rivera Controller/ }).click()
  await page.getByRole('button', { name: 'Return to workspace', exact: true }).click()
}

test('complete the reconciliation, independently sign off, and preserve progress', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await openWorkspace(page)
  await page.screenshot({ path: testInfo.outputPath('workspace-desktop.png'), fullPage: true })
  await page.getByRole('button', { name: 'Review finding', exact: true }).click()
  await page.getByRole('radio', { name: 'Select PAY-829, check 1043' }).check()
  await expect(page.getByRole('button', { name: 'Confirm match', exact: true })).toBeDisabled()
  await expect(page.getByText('Reference conflict:', { exact: false })).toBeVisible()
  await page.getByRole('radio', { name: 'Select PAY-817, check 1042' }).check()
  await page.screenshot({ path: testInfo.outputPath('investigation-desktop.png'), fullPage: true })
  await page.getByRole('button', { name: 'Confirm match', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Match recorded by Maya' })).toBeVisible()
  await page.getByRole('button', { name: 'Review remaining check', exact: true }).click()
  await page.getByRole('button', { name: 'Record outstanding check', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Timing difference recorded' })).toBeVisible()
  await page.locator('main').getByRole('button', { name: 'Review package', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Submit for review', exact: true })).toBeEnabled()
  await page.screenshot({ path: testInfo.outputPath('review-desktop.png'), fullPage: true })
  await page.getByRole('button', { name: 'Submit for review', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Independent review', exact: true })).toBeVisible()
  await switchToController(page)
  await page.getByRole('button', { name: 'Sign off reconciliation', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Review complete', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Inspect support', exact: true }).click()
  const support = page.getByRole('dialog', { name: 'Outstanding-check support', exact: true })
  await expect(support).toContainText('PAY-829 / GL-205 · Check 1043')
  await expect(support.getByRole('tab', { name: 'INV-418', exact: true })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('button', { name: 'Close Outstanding-check support', exact: true }).click()
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('finodus:workspace:v1')!))
  expect(stored.mode).toBe('watch')
  expect(stored.matched).toBe('PAY-817')
  expect(stored.outstanding).toBe(true)
  expect(stored.snapshots[0].decision).toBe('signed')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Review complete', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('first-visit tour is skippable, persistent, keyboard accessible and replayable', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.getByRole('dialog', { name: 'Welcome to Finodus' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('first-visit.png'), fullPage: true })
  await page.getByRole('button', { name: 'Take the product tour', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Start with the right context' })).toBeVisible()
  const tourAccessibility = await new AxeBuilder({ page }).analyze()
  expect(tourAccessibility.violations.map(v => ({ rule: v.id, nodes: v.nodes.map(n => ({ target: n.target, issue: n.failureSummary })) }))).toEqual([])
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Know what the agent can do' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Help & product tour' }).click()
  for (let step = 0; step < 4; step++) await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByRole('button', { name: 'Start exploring', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('finodus:workspace:v1')!).matched)).toBeNull()
})

test('missing evidence blocks confirmation and supports retrieval and follow-up', async ({ page }) => {
  await openWorkspace(page, 'missing-evidence')
  await selectSupportedMatch(page)
  await expect(page.getByRole('button', { name: 'Confirm match', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Assign follow-up', exact: true }).click()
  await page.getByLabel('Evidence needed', { exact: true }).fill('Retrieve the bank-cleared image for the September 30 check payment.')
  await page.getByRole('button', { name: 'Assign follow-up', exact: true }).last().click()
  await expect(page.locator('main').getByText('Evidence follow-up assigned to Maya', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Retrieve bank evidence', exact: true }).click()
  await expect(page.getByRole('img', { name: /Synthetic bank-cleared check 1042/ })).toBeVisible()
  await page.getByRole('button', { name: 'Confirm match', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Match recorded by Maya' })).toBeVisible()
})

test('coverage gaps cannot be bypassed', async ({ page }) => {
  await openWorkspace(page, 'coverage-gap')
  await selectSupportedMatch(page)
  await expect(page.getByRole('button', { name: 'Confirm match', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'September reconciliation', exact: true }).click()
  await page.getByRole('button', { name: 'Refresh period data', exact: true }).click()
  await expect(page.getByText('Period coverage complete', { exact: true })).toBeVisible()
  await selectSupportedMatch(page)
  await expect(page.getByRole('button', { name: 'Confirm match', exact: true })).toBeEnabled()
})

test('stale evidence requires a fresh inspection before confirmation', async ({ page }) => {
  await openWorkspace(page, 'stale-source')
  await selectSupportedMatch(page)
  await expect(page.getByRole('button', { name: 'Confirm match', exact: true })).toBeDisabled()
  await expect(page.getByRole('heading', { name: 'Updated bank evidence available', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Retrieve bank evidence', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Confirm match', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Confirm match', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Match recorded by Maya', exact: true })).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('finodus:workspace:v1')!).sourceVersion)).toBe(2)
})

test('an earlier incorrect match can be corrected without erasing its history', async ({ page }) => {
  await openWorkspace(page, 'wrong-match')
  await page.getByRole('button', { name: 'Review finding', exact: true }).click()
  await page.getByRole('button', { name: 'Correct recorded match', exact: true }).click()
  await page.getByLabel('Reason for correction', { exact: true }).fill('The bank image identifies check 1042, not the recorded check 1043.')
  await page.getByRole('button', { name: 'Confirm unmatch', exact: true }).click()
  await expect(page.getByRole('radio', { name: 'Select PAY-817, check 1042' })).toBeEnabled()
  await page.getByRole('radio', { name: 'Select PAY-817, check 1042' }).check()
  await page.getByRole('button', { name: 'Confirm match', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Match recorded by Maya' })).toBeVisible()
  const events = await page.evaluate(() => JSON.parse(localStorage.getItem('finodus:workspace:v1')!).events)
  expect(events.some((e: { title: string }) => e.title === 'B-104 matched to PAY-829')).toBe(true)
  expect(events.some((e: { title: string }) => e.title === 'B-104 unmatched from PAY-829')).toBe(true)
})

for (const scenario of ['save-failure', 'uncertain-save'] as const) {
  test(`recover from ${scenario} without recording two matches`, async ({ page }) => {
    await openWorkspace(page, scenario)
    await selectSupportedMatch(page)
    await page.getByRole('button', { name: 'Confirm match', exact: true }).click()
    if (scenario === 'save-failure') {
      await expect(page.getByRole('alert')).toContainText('The action was not saved')
      await page.getByRole('button', { name: 'Confirm match', exact: true }).click()
    } else {
      await expect(page.getByText('Checking whether the action was saved', { exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Saving decision…', exact: true })).toBeDisabled()
      await page.getByRole('button', { name: 'Check save status', exact: true }).click()
    }
    await expect(page.getByRole('heading', { name: 'Match recorded by Maya' })).toBeVisible()
    const count = await page.evaluate(() => JSON.parse(localStorage.getItem('finodus:workspace:v1')!).events.filter((event: { title: string }) => event.title === 'B-104 matched to PAY-817').length)
    expect(count).toBe(1)
  })
}

test('workspace and investigation have no automated accessibility violations', async ({ page }) => {
  await openWorkspace(page)
  expect((await new AxeBuilder({ page }).analyze()).violations.map(v => ({ rule: v.id, nodes: v.nodes.map(n => ({ target: n.target, issue: n.failureSummary })) }))).toEqual([])
  await selectSupportedMatch(page)
  expect((await new AxeBuilder({ page }).analyze()).violations.map(v => ({ rule: v.id, nodes: v.nodes.map(n => ({ target: n.target, issue: n.failureSummary })) }))).toEqual([])
  await page.getByRole('button', { name: /Autonomy Watch/ }).click()
  expect((await new AxeBuilder({ page }).analyze()).violations.map(v => ({ rule: v.id, nodes: v.nodes.map(n => ({ target: n.target, issue: n.failureSummary })) }))).toEqual([])
})

test('mobile workspace and investigation fit the viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openWorkspace(page)
  await page.screenshot({ path: testInfo.outputPath('workspace-mobile.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await selectSupportedMatch(page)
  await page.screenshot({ path: testInfo.outputPath('investigation-mobile.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
