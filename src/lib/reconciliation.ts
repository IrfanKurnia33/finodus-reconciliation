export type Role = 'preparer' | 'controller'
export type Mode = 'assist' | 'watch' | 'autonomous'
export type Lifecycle = 'preparation' | 'review' | 'returned' | 'signed'
export type Scenario = 'standard' | 'missing-evidence' | 'coverage-gap' | 'stale-source' | 'save-failure' | 'uncertain-save' | 'wrong-match'
export type Payment = 'PAY-817' | 'PAY-829'

export const PEOPLE = {
  preparer: { name: 'Maya Chen', initials: 'MC', title: 'Senior GL Accountant' },
  controller: { name: 'Daniel Rivera', initials: 'DR', title: 'Controller' },
} as const

export interface Activity {
  id: string
  at: string
  actor: string
  title: string
  detail: string
  kind: 'agent' | 'human' | 'system'
}

export interface Snapshot {
  version: number
  submittedBy: string
  submittedAt: string
  sourceVersion: number
  policyVersion: number
  mode: Mode
  bankBalance: number
  bookBalance: number
  outstandingAmount: number
  match: Payment
  owner: string
  followupDate: string
  events: Activity[]
  decision?: 'signed' | 'returned' | 'reopened'
  decisionBy?: string
  decisionAt?: string
  reason?: string
}

export interface Reconciliation {
  schema: 1
  scenario: Scenario
  mode: Mode
  limit: number
  policyVersion: number
  paused: boolean
  coverage: boolean
  evidence: 'ready' | 'missing' | 'stale'
  sourceVersion: number
  matched: Payment | null
  outstanding: boolean
  owner: string
  followupDate: string
  assignment: string
  lifecycle: Lifecycle
  returnReason: string
  events: Activity[]
  snapshots: Snapshot[]
  operations: string[]
}

export type Action =
  | { type: 'match'; payment: Payment; sourceVersion: number }
  | { type: 'outstanding'; owner: string; followupDate: string }
  | { type: 'unmatch'; reason: string }
  | { type: 'submit' }
  | { type: 'sign' }
  | { type: 'return'; reason: string }
  | { type: 'reopen'; reason: string }
  | { type: 'evidence' }
  | { type: 'coverage' }
  | { type: 'assign'; note: string }
  | { type: 'pause' }
  | { type: 'policy'; mode: Mode; limit: number }

export const BANK_BALANCE = 124_800
export const BOOK_BALANCE = 120_000
export const PAYMENT_AMOUNT = 4_800
export const money = (amount: number, decimals = false) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: decimals ? 2 : 0,
}).format(amount)

const initialEvents: Activity[] = [
  { id: 'seed-3', at: '2026-10-02T09:14:00-04:00', actor: 'Finodus', title: 'Bank evidence gathered', detail: 'Cleared-check image located for B-104. Extracted fields are ready for human inspection. Source v1.', kind: 'agent' },
  { id: 'seed-2', at: '2026-10-02T09:13:00-04:00', actor: 'Finodus', title: 'Two possible matches identified', detail: 'B-104 shares an amount with PAY-817 and PAY-829. The bank feed is missing a check number. No match recorded.', kind: 'agent' },
  { id: 'seed-1', at: '2026-10-02T09:12:00-04:00', actor: 'Source sync', title: 'September records synchronized', detail: '8 bank transactions and 9 cash-ledger entries imported through September 30. Seven existing matches retained.', kind: 'system' },
]

export function createScenario(scenario: Scenario = 'standard'): Reconciliation {
  const state: Reconciliation = {
    schema: 1, scenario, mode: 'watch', limit: 5000, policyVersion: 1, paused: false,
    coverage: scenario !== 'coverage-gap', evidence: scenario === 'missing-evidence' ? 'missing' : scenario === 'stale-source' ? 'stale' : 'ready',
    sourceVersion: 1, matched: scenario === 'wrong-match' ? 'PAY-829' : null,
    outstanding: false, owner: PEOPLE.preparer.name, followupDate: '2026-10-05', assignment: '',
    lifecycle: 'preparation', returnReason: '', snapshots: [], operations: [],
    events: initialEvents.map(event => ({ ...event })),
  }
  if (scenario === 'missing-evidence') state.events[0] = { ...state.events[0], title: 'Bank image retrieval needs attention', detail: 'The bank returned no usable check image. Matching is held until supporting evidence is available.' }
  if (scenario === 'coverage-gap') state.events[2] = { ...state.events[2], title: 'Bank coverage is incomplete', detail: 'The bank import stops on September 29. September 30 activity must be synchronized before decisions can be confirmed.' }
  if (scenario === 'stale-source') state.events[0] = { ...state.events[0], title: 'Updated bank evidence available', detail: 'The bank source changed after the previous investigation. Refresh and inspect the current evidence before confirming.' }
  if (scenario === 'wrong-match') state.events.unshift({ id: 'seed-wrong', at: '2026-10-02T09:15:00-04:00', actor: PEOPLE.preparer.name, title: 'B-104 matched to PAY-829', detail: 'Earlier recorded match requires correction: the cleared-check image identifies check 1042, not check 1043. Original action retained for recovery testing.', kind: 'human' })
  return state
}

export function blockers(state: Reconciliation): string[] {
  const result: string[] = []
  if (!state.coverage) result.push('Complete bank coverage through September 30.')
  if (state.evidence !== 'ready') result.push('Retrieve and inspect current bank evidence.')
  if (state.matched === 'PAY-829') result.push('Correct the match that conflicts with check 1042.')
  else if (!state.matched) result.push('Resolve the $4,800 bank withdrawal.')
  if (!state.outstanding) result.push('Document the remaining check as outstanding.')
  return result
}

export function canPrepare(state: Reconciliation) {
  return state.lifecycle === 'preparation' || state.lifecycle === 'returned'
}

export function applyAction(state: Reconciliation, action: Action, role: Role, operationId: string, at = new Date().toISOString()): Reconciliation {
  if (state.operations.includes(operationId)) return state
  const controllerActions = ['sign', 'return', 'reopen', 'policy']
  const preparerActions = ['match', 'outstanding', 'unmatch', 'submit', 'assign']
  if (controllerActions.includes(action.type) && role !== 'controller') throw new Error('Only the Controller can perform this action.')
  if (preparerActions.includes(action.type) && role !== 'preparer') throw new Error('This decision belongs to the preparing accountant. Review remains independent.')
  if (['match', 'outstanding', 'unmatch', 'assign', 'submit'].includes(action.type) && !canPrepare(state)) throw new Error('This package is locked for review. Return or reopen it before making corrections.')

  const next: Reconciliation = { ...state, events: [...state.events], snapshots: state.snapshots.map(s => ({ ...s })), operations: [...state.operations, operationId] }
  let title = ''
  let detail = ''
  switch (action.type) {
    case 'match':
      if (!state.coverage) throw new Error('Complete the September bank coverage before confirming this match.')
      if (state.evidence !== 'ready' || action.sourceVersion !== state.sourceVersion) throw new Error('The supporting evidence changed or is unavailable. Refresh and review it before confirming.')
      if (state.matched) throw new Error('This bank withdrawal already has a recorded match. Inspect or unmatch it first.')
      if (action.payment !== 'PAY-817') throw new Error('Check number conflict: the bank image identifies check 1042, while PAY-829 records check 1043.')
      next.matched = action.payment
      title = 'B-104 matched to PAY-817'
      detail = `Maya verified check 1042 against the bank image, source v${state.sourceVersion}. Linked GL-204, INV-392 and PO-118. Human confirmation in ${state.mode} mode; policy v${state.policyVersion}. Cash balances unchanged.`
      break
    case 'outstanding':
      if (state.matched !== 'PAY-817' || !state.coverage || state.evidence !== 'ready') throw new Error('Resolve the bank match and current period coverage before documenting the remaining check.')
      if (state.outstanding) throw new Error('Check 1043 is already documented as outstanding.')
      if (!action.owner.trim() || !/^2026-10-\d{2}$/.test(action.followupDate) || Number(action.followupDate.slice(-2)) < 1 || Number(action.followupDate.slice(-2)) > 31) throw new Error('Provide a follow-up owner and a valid October review date.')
      next.outstanding = true; next.owner = action.owner.trim(); next.followupDate = action.followupDate
      title = 'Check 1043 documented as outstanding'
      detail = `PAY-829 / GL-205 was recorded September 30 and has no clearance through cutoff. $4,800 supported timing difference; no journal entry. Follow-up: ${next.owner}, ${next.followupDate}.`
      break
    case 'unmatch':
      if (!state.matched) throw new Error('There is no saved match to correct.')
      if (action.reason.trim().length < 5) throw new Error('Add a reason explaining this correction.')
      title = `B-104 unmatched from ${state.matched}`
      detail = `${action.reason.trim()} Original match preserved. Outstanding treatment reopened for verification. Cash balances unchanged.`
      next.matched = null; next.outstanding = false
      break
    case 'submit': {
      if (blockers(state).length) throw new Error('Resolve the outstanding preparation tasks before submitting.')
      const snapshot: Snapshot = {
        version: state.snapshots.length + 1, submittedBy: PEOPLE.preparer.name, submittedAt: at,
        sourceVersion: state.sourceVersion, policyVersion: state.policyVersion, mode: state.mode,
        bankBalance: BANK_BALANCE, bookBalance: BOOK_BALANCE, outstandingAmount: PAYMENT_AMOUNT,
        match: 'PAY-817', owner: state.owner, followupDate: state.followupDate, events: [...state.events],
      }
      next.snapshots.push(snapshot); next.lifecycle = 'review'; next.returnReason = ''
      title = `Reconciliation v${snapshot.version} submitted for review`
      detail = 'Evidence and decisions preserved in a review snapshot. Adjusted bank and book balances: $120,000. One supported outstanding check; no unexplained difference.'
      break
    }
    case 'sign':
    case 'return': {
      if (state.lifecycle !== 'review') throw new Error('Only a submitted package can receive a review decision.')
      const snapshot = next.snapshots.at(-1)
      if (!snapshot) throw new Error('The submitted snapshot is unavailable.')
      if (action.type === 'sign') {
        if (blockers(state).length || snapshot.sourceVersion !== state.sourceVersion) throw new Error('Supporting records changed. Return the package for renewed preparation before signing off.')
        next.lifecycle = 'signed'; snapshot.decision = 'signed'
        title = `Reconciliation v${snapshot.version} signed off`
        detail = 'Daniel independently reviewed the match, bank evidence, outstanding check and balance bridge. Check 1043 remains outstanding at September 30.'
      } else {
        if (action.reason.trim().length < 5) throw new Error('Give the accountant an actionable reason for returning this package.')
        next.lifecycle = 'returned'; next.returnReason = action.reason.trim(); snapshot.decision = 'returned'; snapshot.reason = next.returnReason
        title = `Reconciliation v${snapshot.version} returned for correction`; detail = next.returnReason
      }
      snapshot.decisionBy = PEOPLE.controller.name; snapshot.decisionAt = at
      break
    }
    case 'reopen': {
      if (state.lifecycle !== 'signed') throw new Error('Only a signed-off package needs reopening.')
      if (action.reason.trim().length < 5) throw new Error('Explain why a new working version is required.')
      next.lifecycle = 'returned'; next.returnReason = action.reason.trim()
      title = 'New working version opened'
      detail = `${next.returnReason} The previous signed-off snapshot and its evidence remain unchanged. New preparation and independent review required.`
      break
    }
    case 'evidence':
      if (state.paused) throw new Error('Resume investigation before retrieving bank evidence.')
      next.evidence = 'ready'; next.sourceVersion += 1
      title = 'Current bank evidence retrieved'
      detail = `Cleared-check image for B-104 is ready for inspection. Source v${next.sourceVersion}. No match recorded.`
      break
    case 'coverage':
      next.coverage = true; next.sourceVersion += 1
      title = 'September coverage completed'; detail = `Bank and ledger records cover September 1–30. Source v${next.sourceVersion}. Existing decisions require current evidence checks.`
      break
    case 'assign':
      if (action.note.trim().length < 5) throw new Error('Describe the evidence needed for follow-up.')
      next.assignment = action.note.trim(); title = 'Evidence follow-up assigned to Maya'
      detail = `${next.assignment} The finding remains unresolved. No external message sent.`
      break
    case 'pause':
      next.paused = !state.paused; title = next.paused ? 'Background investigation paused' : 'Background investigation resumed'
      detail = 'Existing findings and recorded decisions retained. Human actions continue to follow permissions and evidence requirements.'
      break
    case 'policy':
      if (!Number.isFinite(action.limit) || action.limit < 1 || action.limit > 1000000) throw new Error('Use a transaction limit between $1 and $1,000,000.')
      next.mode = action.mode; next.limit = Math.round(action.limit); next.policyVersion += 1
      title = `Agent policy v${next.policyVersion} saved`
      detail = `${action.mode} mode, ${money(next.limit)} per-transaction limit. Exact amount and unique verified reference required; conflicting candidates remain held. Applies to future agent actions; prior snapshots retained.`
      break
  }
  next.events.unshift({ id: operationId, at, actor: PEOPLE[role].name, title, detail, kind: 'human' })
  return next
}

export function readStoredState(raw: string | null): Reconciliation {
  if (!raw) return createScenario()
  try {
    const s = JSON.parse(raw) as Reconciliation
    if (s.schema !== 1 || !['preparation', 'review', 'returned', 'signed'].includes(s.lifecycle) ||
      !['assist', 'watch', 'autonomous'].includes(s.mode) || !Array.isArray(s.events) || !Array.isArray(s.snapshots) ||
      !Array.isArray(s.operations) || !['ready', 'missing', 'stale'].includes(s.evidence) ||
      typeof s.coverage !== 'boolean' || typeof s.outstanding !== 'boolean' ||
      ![null, 'PAY-817', 'PAY-829'].includes(s.matched) || !Number.isFinite(s.sourceVersion) || !Number.isFinite(s.limit) ||
      typeof s.owner !== 'string' || typeof s.followupDate !== 'string' || typeof s.assignment !== 'string' || typeof s.returnReason !== 'string' ||
      s.events.some(e => typeof e.title !== 'string' || typeof e.detail !== 'string' || typeof e.actor !== 'string' || !Number.isFinite(Date.parse(e.at))) ||
      s.snapshots.some(p => !Number.isFinite(p.version) || !Array.isArray(p.events))) return createScenario()
    return s
  } catch { return createScenario() }
}

export const transactions = [
  { id: 'B-101', date: 'Sep 30', name: 'Northwind Co.', reference: 'Customer payment · INV-1008', amount: 18450, icon: 'in' },
  { id: 'B-102', date: 'Sep 30', name: 'September payroll', reference: 'PAYROLL-0926', amount: -32480, icon: 'out' },
  { id: 'B-104', date: 'Sep 30', name: 'Check payment', reference: 'CHECK PAID · Reference missing', amount: -4800, icon: 'check' },
  { id: 'B-105', date: 'Sep 29', name: 'Stripe settlement', reference: 'SET-092926', amount: 12840, icon: 'in' },
  { id: 'B-106', date: 'Sep 28', name: 'AWS', reference: 'AWS-092826', amount: -1260, icon: 'out' },
  { id: 'B-107', date: 'Sep 27', name: 'Harbor Supply', reference: 'ACH-092726', amount: -2400, icon: 'out' },
  { id: 'B-108', date: 'Sep 26', name: 'Metro Properties', reference: 'RENT-0926', amount: -5600, icon: 'out' },
  { id: 'B-109', date: 'Sep 25', name: 'Northwind Co.', reference: 'Customer payment · INV-997', amount: 9800, icon: 'in' },
] as const
