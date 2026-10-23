import { describe, expect, it } from 'vitest'
import { applyAction, blockers, createScenario, readStoredState, transactions, type Action, type Reconciliation, type Role } from './reconciliation'

let sequence = 0
function act(state: Reconciliation, action: Action, role: Role = 'preparer') {
  return applyAction(state, action, role, `test-${++sequence}`, '2026-10-02T13:16:00Z')
}
function prepared() {
  let state = act(createScenario(), { type: 'match', payment: 'PAY-817', sourceVersion: 1 })
  state = act(state, { type: 'outstanding', owner: 'Maya Chen', followupDate: '2026-10-05' })
  return state
}

describe('reconciliation trust boundaries', () => {
  it('starts in Watch with two open candidates and consistent statement totals', () => {
    const state = createScenario()
    expect(state.mode).toBe('watch')
    expect(state.matched).toBeNull()
    expect(state.outstanding).toBe(false)
    expect(130250 + transactions.reduce((sum, t) => sum + t.amount, 0)).toBe(124800)
    expect(124800 - 4800).toBe(120000)
  })
  it('retrieval in Watch produces evidence, never a match', () => {
    const state = act(createScenario('missing-evidence'), { type: 'evidence' })
    expect(state.evidence).toBe('ready')
    expect(state.matched).toBeNull()
    expect(blockers(state)).toHaveLength(2)
  })
  it.each(['missing-evidence', 'coverage-gap', 'stale-source'] as const)('blocks unsupported confirmation in %s', scenario => {
    expect(() => act(createScenario(scenario), { type: 'match', payment: 'PAY-817', sourceVersion: 1 })).toThrow()
  })
  it('blocks contradictory matches and recommendations from an older source', () => {
    const state = createScenario()
    expect(() => act(state, { type: 'match', payment: 'PAY-829', sourceVersion: 1 })).toThrow('Check number conflict')
    expect(() => act(state, { type: 'match', payment: 'PAY-817', sourceVersion: 0 })).toThrow('supporting evidence')
  })
  it('keeps human permission separate from the agent transaction limit', () => {
    const state = act(createScenario(), { type: 'policy', mode: 'watch', limit: 1000 }, 'controller')
    expect(act(state, { type: 'match', payment: 'PAY-817', sourceVersion: 1 }).matched).toBe('PAY-817')
  })
  it('requires a separate timing decision after a successful match', () => {
    const state = act(createScenario(), { type: 'match', payment: 'PAY-817', sourceVersion: 1 })
    expect(blockers(state)).toEqual(['Document the remaining check as outstanding.'])
    expect(() => act(state, { type: 'submit' })).toThrow()
    expect(() => act(createScenario(), { type: 'outstanding', owner: 'Maya', followupDate: '2026-10-05' })).toThrow()
  })
  it('enforces role boundaries independently of the visible buttons', () => {
    expect(() => act(createScenario(), { type: 'policy', mode: 'autonomous', limit: 5000 })).toThrow('Only the Controller')
    expect(() => act(createScenario(), { type: 'match', payment: 'PAY-817', sourceVersion: 1 }, 'controller')).toThrow('preparing accountant')
    const submitted = act(prepared(), { type: 'submit' })
    expect(() => act(submitted, { type: 'sign' })).toThrow('Only the Controller')
    expect(() => act(submitted, { type: 'unmatch', reason: 'Recheck this source.' })).toThrow('locked for review')
  })
  it('records a retry of the same operation only once', () => {
    const first = applyAction(createScenario(), { type: 'match', payment: 'PAY-817', sourceVersion: 1 }, 'preparer', 'one-request')
    const retry = applyAction(first, { type: 'match', payment: 'PAY-817', sourceVersion: 1 }, 'preparer', 'one-request')
    expect(retry).toBe(first)
    expect(first.events.filter(e => e.id === 'one-request')).toHaveLength(1)
  })
  it('preserves a signed-off snapshot when reopening and resubmitting', () => {
    const first = act(prepared(), { type: 'submit' })
    const signed = act(first, { type: 'sign' }, 'controller')
    const originalSnapshot = structuredClone(signed.snapshots[0])
    let reopened = act(signed, { type: 'reopen', reason: 'Recheck follow-up ownership.' }, 'controller')
    reopened = act(reopened, { type: 'unmatch', reason: 'Inspect the source again.' })
    reopened = act(reopened, { type: 'match', payment: 'PAY-817', sourceVersion: 1 })
    reopened = act(reopened, { type: 'outstanding', owner: 'Maya Chen', followupDate: '2026-10-06' })
    reopened = act(reopened, { type: 'submit' })
    expect(reopened.snapshots[0]).toEqual(originalSnapshot)
    expect(reopened.snapshots[1].version).toBe(2)
    expect(reopened.snapshots[1].followupDate).toBe('2026-10-06')
    expect(reopened.outstanding).toBe(true)
  })
  it('requires renewed preparation when evidence changes during review', () => {
    const submitted = act(prepared(), { type: 'submit' })
    const changed = act(submitted, { type: 'evidence' })
    expect(() => act(changed, { type: 'sign' }, 'controller')).toThrow('Supporting records changed')
    const returned = act(changed, { type: 'return', reason: 'Review the new bank evidence.' }, 'controller')
    expect(returned.lifecycle).toBe('returned')
    expect(returned.snapshots[0].sourceVersion).toBe(1)
  })
  it('unmatches without deleting the earlier decision or retaining dependent treatment', () => {
    const state = prepared()
    const corrected = act(state, { type: 'unmatch', reason: 'Recheck the matching evidence.' })
    expect(corrected.matched).toBeNull()
    expect(corrected.outstanding).toBe(false)
    expect(corrected.events.some(e => e.title === 'B-104 matched to PAY-817')).toBe(true)
  })
  it('recovers a seeded mistaken match through an explicit correction', () => {
    let state = createScenario('wrong-match')
    expect(blockers(state)).toContain('Correct the match that conflicts with check 1042.')
    expect(() => act(state, { type: 'unmatch', reason: '' })).toThrow('reason')
    state = act(state, { type: 'unmatch', reason: 'The image identifies check 1042.' })
    expect(act(state, { type: 'match', payment: 'PAY-817', sourceVersion: 1 }).matched).toBe('PAY-817')
  })
  it('handles invalid saved data without crashing the workspace', () => {
    expect(readStoredState('{broken')).toEqual(createScenario())
    expect(readStoredState(JSON.stringify({ schema: 1, events: [] }))).toEqual(createScenario())
    expect(readStoredState(JSON.stringify(prepared())).outstanding).toBe(true)
  })
})
