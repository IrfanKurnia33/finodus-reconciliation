import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'motion/react'
import { Badge, Button, Icon, IconButton, Modal } from './components/ui'
import { Workspace } from './components/Workspace'
import { Investigation, Outstanding } from './components/Investigation'
import { Review } from './components/Review'
import { EvidenceViewer } from './components/Evidence'
import { ProductTour } from './components/ProductTour'
import { ShimmeringText } from './components/shimmering-text'
import { applyAction, createScenario, PEOPLE, readStoredState, type Action, type Mode, type Role, type Scenario } from './lib/reconciliation'
import { WorkspaceContext, type Panel, type ReasonKind, type View } from './lib/workspace'

const STORAGE_KEY = 'finodus:workspace:v1'
const TOUR_KEY = 'finodus:tour:v1'
const scenarios: { value: Scenario; label: string; description: string }[] = [
  { value: 'standard', label: 'Standard investigation', description: 'Two possible payments. Bank evidence available.' },
  { value: 'missing-evidence', label: 'Missing bank evidence', description: 'The bank image is unavailable. Retrieve it or assign follow-up.' },
  { value: 'coverage-gap', label: 'Incomplete period coverage', description: 'Bank data ends September 29. Complete the import first.' },
  { value: 'stale-source', label: 'Source changed', description: 'Bank evidence changed after the prior investigation.' },
  { value: 'save-failure', label: 'Next save fails', description: 'The next recorded action fails once, retaining the decision for retry.' },
  { value: 'uncertain-save', label: 'Next save result is uncertain', description: 'Check the saved result before trying the action again.' },
  { value: 'wrong-match', label: 'Existing mistaken match', description: 'A prior match conflicts with evidence. Correct it with a reason.' },
]
function loadState() {
  try { return readStoredState(localStorage.getItem(STORAGE_KEY)) } catch { return createScenario() }
}
function hasSeenTour() {
  try { return localStorage.getItem(TOUR_KEY) === 'seen' } catch { return false }
}
function currentView(): View {
  const view = window.location.hash.replace('#/', '')
  return ['workspace', 'investigate', 'outstanding', 'review'].includes(view) ? view as View : 'workspace'
}

export default function App() {
  const reducedMotion = useReducedMotion()
  const [state, setState] = useState(loadState)
  const stateRef = useRef(state)
  const [role, setRole] = useState<Role>('preparer')
  const [view, setView] = useState<View>(currentView)
  const [panel, setPanel] = useState<Panel | null>(null)
  const [reasonKind, setReasonKind] = useState<ReasonKind | null>(null)
  const [reason, setReason] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [compactNav, setCompactNav] = useState(() => window.matchMedia('(max-width: 1080px)').matches)
  const [tour, setTour] = useState<'welcome' | number | null>(() => hasSeenTour() ? null : 'welcome')
  const [policyMode, setPolicyMode] = useState<Mode>(state.mode)
  const [policyLimit, setPolicyLimit] = useState(String(state.limit))
  const [resetScenario, setResetScenario] = useState<Scenario | null>(null)
  const [storageError, setStorageError] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null)
  const [operation, setOperation] = useState<{ status: 'saving' | 'unknown'; action: Action; id: string; role: Role; onSuccess?: () => void } | null>(null)
  const pendingRef = useRef(false)
  const faultConsumed = useRef(false)
  const operationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const busy = operation !== null

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); setStorageError(false) } catch { setStorageError(true) }
    stateRef.current = state
  }, [state])
  useEffect(() => {
    const handler = () => { setView(currentView()); setMobileNav(false); window.scrollTo({ top: 0, behavior: 'instant' }) }
    window.addEventListener('hashchange', handler)
    return () => { window.removeEventListener('hashchange', handler); if (operationTimer.current) clearTimeout(operationTimer.current); if (feedbackTimer.current) clearTimeout(feedbackTimer.current) }
  }, [])
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1080px)')
    const update = () => { setCompactNav(media.matches); if (!media.matches) setMobileNav(false) }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  function go(next: View) {
    window.location.hash = `/${next}`; setView(next); setMobileNav(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  function notify(message: string, error = false) {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    setFeedback({ message, error })
    if (!error) feedbackTimer.current = setTimeout(() => setFeedback(null), 5500)
  }
  function commit(request: NonNullable<typeof operation>) {
    try {
      const at = new Date(Date.parse('2026-10-02T13:16:00Z') + stateRef.current.operations.length * 60_000).toISOString()
      const next = applyAction(stateRef.current, request.action, request.role, request.id, at)
      stateRef.current = next; setState(next)
      notify(next.events[0].title)
      request.onSuccess?.()
    } catch (error) { notify(error instanceof Error ? error.message : 'This action could not be recorded.', true) }
    finally { pendingRef.current = false; setOperation(null) }
  }
  function perform(action: Action, onSuccess?: () => void) {
    if (pendingRef.current) return
    pendingRef.current = true
    setFeedback(null)
    const request = { action, role, id: crypto.randomUUID(), status: 'saving' as const, onSuccess }
    setOperation(request)
    operationTimer.current = setTimeout(() => {
      const fixture = stateRef.current.scenario
      if (!faultConsumed.current && (fixture === 'save-failure' || fixture === 'uncertain-save')) {
        faultConsumed.current = true
        if (fixture === 'save-failure') { pendingRef.current = false; setOperation(null); notify('The action was not saved. Your selection is retained; retry when ready.', true); return }
        setOperation({ ...request, status: 'unknown' }); return
      }
      commit(request)
    }, 650)
  }
  function openPanel(next: Panel) {
    if (next === 'policy') { setPolicyMode(stateRef.current.mode); setPolicyLimit(String(stateRef.current.limit)) }
    setMobileNav(false)
    setPanel(next)
  }
  function openReason(kind: ReasonKind) { setReason(''); setReasonKind(kind) }
  function startTour() { setPanel(null); setReasonKind(null); go('workspace'); setTour(0) }
  function finishTour() { setTour(null); try { localStorage.setItem(TOUR_KEY, 'seen') } catch { /* Session stays usable without persistent storage. */ } }
  function setTourStage(stage: 'welcome' | number | null) { if (stage === 0) go('workspace'); setTour(stage) }
  function reset() {
    if (!resetScenario || busy) return
    const fresh = createScenario(resetScenario); stateRef.current = fresh; setState(fresh)
    setRole('preparer'); faultConsumed.current = false; setFeedback(null); setPanel(null); setResetScenario(null); go('workspace')
  }
  const reasonConfig = {
    unmatch: { title: 'Correct the recorded match', description: 'Unmatch B-104 and reopen the affected treatment. The original decision remains in history; no journal entry is created.', label: 'Reason for correction', action: 'Confirm unmatch' },
    return: { title: 'Return for correction', description: 'Give Maya an actionable reason. The submitted snapshot remains available while preparation resumes.', label: 'What needs another look?', action: 'Return package' },
    reopen: { title: 'Reopen the reconciliation', description: 'Create a new working version. The previous signed-off package and its evidence remain preserved.', label: 'Reason for reopening', action: 'Reopen for preparation' },
    assign: { title: 'Assign evidence follow-up', description: 'Assign an internal follow-up to Maya Chen. The finding stays unresolved until the required evidence is available.', label: 'Evidence needed', action: 'Assign follow-up' },
  }
  const lifecycleNames = { preparation: 'In preparation', review: 'In review', returned: 'Returned', signed: 'Signed off' }
  const modeDescriptions = {
    assist: { title: 'Assist', subtitle: 'Investigate on request', text: 'Investigate the items you select and prepare recommendations. Every recorded match needs your confirmation.', icon: 'user' as const },
    watch: { title: 'Watch', subtitle: 'Continuously investigate', text: 'Gather evidence and surface findings continuously. No automatic changes to matches or accounting records.', icon: 'eye' as const },
    autonomous: { title: 'Autonomous', subtitle: 'Execute within policy', text: 'Record eligible matches within approved limits. Evidence conflicts and accounting adjustments require human review.', icon: 'shield' as const },
  }

  return <MotionConfig reducedMotion="user"><WorkspaceContext.Provider value={{ state, role, view, go, busy, perform, openPanel, openReason, startTour }}>
    <a className="skip-link" href="#main-content">Skip to workspace content</a>
    <header className={`app-header ${mobileNav ? 'menu-open' : ''}`} inert={tour !== null} onKeyDown={event => {
      if (event.key === 'Escape' && mobileNav) {
        setMobileNav(false)
        event.currentTarget.querySelector<HTMLButtonElement>('.mobile-menu')?.focus()
      }
    }}>
      <div className="primary-nav">
        <a className="brand" href="#/workspace" aria-label="Finodus home" onClick={() => go('workspace')}><img className="brand-symbol" src="/brand/logomark.svg" alt="" /><img className="brand-wordmark" src="/brand/logotype.svg" alt="Finodus" /></a>
        <div className="nav-account">
          <div className="organization"><span className="organization-avatar">N</span><div><strong>Northstar</strong><span>Distribution · USD</span></div></div>
          <div className="nav-user" title={`${PEOPLE[role].name} · ${PEOPLE[role].title}`}><span className={`avatar ${role === 'controller' ? 'reviewer-avatar' : ''}`}>{PEOPLE[role].initials}</span><div><strong>{PEOPLE[role].name}</strong><span>{PEOPLE[role].title}</span></div></div>
          <button className="mobile-menu icon-btn" onClick={() => setMobileNav(value => !value)} aria-label={mobileNav ? 'Close navigation' : 'Open navigation'} aria-controls="primary-navigation" aria-expanded={mobileNav}>
            <svg className="menu-toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" focusable="false">
              <path d="M4 6H20" /><path d="M4 12H20" /><path d="M4 18H20" />
            </svg>
          </button>
        </div>
        <nav id="primary-navigation" className="nav-links" aria-label="Workspace navigation" inert={compactNav && !mobileNav}>
          <div className="nav-links-content"><div className="nav-links-list">
          <button className={view !== 'review' ? 'active' : ''} aria-current={view !== 'review' ? 'page' : undefined} onClick={() => go('workspace')}><Icon name="reconcile" /><span>Reconciliation</span></button>
          <button className={view === 'review' ? 'active' : ''} aria-current={view === 'review' ? 'page' : undefined} onClick={() => go('review')}><Icon name="checks" /><span>Review package</span>{state.lifecycle === 'review' && <span className="nav-alert" />}</button>
          <button onClick={() => openPanel('evidence')}><Icon name="files" /><span>Source evidence</span></button>
          <button onClick={() => openPanel('activity')}><Icon name="history" /><span>Activity history</span></button>
          </div></div>
        </nav>
      </div>
      <div className="topbar">
        <div className="breadcrumb"><Icon name="bank" size={17} /><span>Workspace</span><Icon name="chevron" size={13} /><strong>{view === 'review' ? 'Review package' : view === 'workspace' ? 'Reconciliation' : 'Investigation'}</strong></div>
        <div className="topbar-actions">
          <div className="close-context"><span>September 2026</span><span className="close-context-status"><span className={`status-dot ${state.lifecycle === 'signed' ? '' : 'amber'}`} />{lifecycleNames[state.lifecycle]}</span></div>
          <span className="topbar-divider" />
          <button className="autonomy-button" onClick={() => openPanel('policy')} data-tour="autonomy"><span className="status-dot" /><span>Autonomy</span><strong>{modeDescriptions[state.mode].title}</strong><Icon name="down" size={13} /></button>
          <button className="topbar-help" onClick={startTour} data-tour="help" aria-label="Help & product tour"><Icon name="help" size={20} /><span>Help & product tour</span></button>
        </div>
      </div>
    </header>
    <div className="app-content" inert={tour !== null}>
      <main id="main-content" className="main-content" tabIndex={-1}>
        {storageError && <div className="notice notice-amber" role="status"><Icon name="warning" /><p>Browser storage is unavailable. You can continue, but this session’s progress will not survive a reload.</p></div>}
        {operation?.status === 'unknown' && <div className="notice notice-amber" role="status"><Icon name="clock" /><div><strong>Checking whether the action was saved</strong><p>The result is uncertain. Check its status before submitting another action.</p></div><Button variant="secondary" onClick={() => commit(operation)}>Check save status</Button></div>}
        <AnimatePresence mode="wait" initial={false}><motion.div key={view} data-page-view={view} initial={reducedMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: reducedMotion ? 1 : 0 }} transition={{ duration: reducedMotion ? 0 : .14 }}>
          {view === 'workspace' ? <Workspace /> : view === 'investigate' ? <Investigation /> : view === 'outstanding' ? <Outstanding /> : <Review />}
        </motion.div></AnimatePresence>
        <footer className="workspace-footer"><span><img src="/brand/logomark.svg" alt="" />Finodus <i /> Your judgment. Clearly supported.</span><span>Synthetic workspace · No live bank connection</span></footer>
      </main>
    </div>
    <footer className="prototype-bar" aria-label="Prototype controls" inert={tour !== null}><div><span className="prototype-label"><Icon name="sliders" size={14} />PROTOTYPE</span><span className="prototype-detail">Synthetic records <i /> Scenario date: Oct 2, 2026</span></div><div><span className="prototype-scenario">{scenarios.find(item => item.value === state.scenario)?.label}</span><button onClick={() => openPanel('tools')} disabled={busy}><Icon name="users" size={15} />{role === 'preparer' ? 'Preparer' : 'Controller'}<Icon name="down" size={12} /></button><button onClick={() => openPanel('tools')} disabled={busy} aria-label="Test controls — open prototype controls"><Icon name="settings" size={16} /><span>Test controls</span></button></div></footer>
    <AnimatePresence>{feedback && <motion.div className={`feedback-toast ${feedback.error ? 'error' : ''}`} role={feedback.error ? 'alert' : 'status'} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}><Icon name={feedback.error ? 'warning' : 'success'} size={21} /><span>{feedback.message}</span><IconButton name="close" label="Dismiss notification" onClick={() => setFeedback(null)} /></motion.div>}</AnimatePresence>
    <Modal open={panel === 'activity'} onClose={() => setPanel(null)} title="Activity history" description="Source findings, human decisions and corrections. Times shown in WIB (Asia/Jakarta)." drawer>
      <div className="activity-summary"><Badge tone="green" icon="shield">History retained</Badge><span>{state.events.length} events · Current policy v{state.policyVersion}</span></div><ol className="activity-list">{state.events.map(event => <li key={event.id}><span className={`activity-icon ${event.kind}`}><Icon name={event.kind === 'agent' ? 'sparkle' : event.kind === 'system' ? 'reconcile' : 'user'} size={17} /></span><div><div className="activity-event-heading"><strong>{event.title}</strong><time dateTime={event.at}>{new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date(event.at))}</time></div><p>{event.detail}</p><small>{event.actor} · {event.kind === 'agent' ? 'Investigation finding' : event.kind === 'system' ? 'Source operation' : 'Explicit human action'}</small></div></li>)}</ol>
    </Modal>
    <Modal open={panel === 'evidence'} onClose={() => setPanel(null)} title="Source evidence" description="Bank evidence and purchase context for the current investigation. All documents are synthetic." wide><EvidenceViewer expanded /></Modal>
    <Modal open={panel === 'policy'} onClose={() => { if (!busy) setPanel(null) }} title="Autonomy & permissions" description="Set the agent’s authority. Your own permissions remain separate." wide className="policy-modal">
      <div className="policy-owner"><span className="avatar small-avatar reviewer-avatar">DR</span><span>Policy owner <strong>Daniel Rivera · Controller</strong></span><Badge>Policy v{state.policyVersion}</Badge></div>
      <div className="mode-selector" role="radiogroup" aria-label="Agent autonomy mode">{(['assist', 'watch', 'autonomous'] as const).map(mode => <label className={`mode-option ${policyMode === mode ? 'selected' : ''}`} key={mode}><input type="radio" name="autonomy-mode" value={mode} checked={policyMode === mode} onChange={() => setPolicyMode(mode)} /><Icon name={modeDescriptions[mode].icon} size={24} /><strong>{modeDescriptions[mode].title}</strong><span>{modeDescriptions[mode].subtitle}</span>{state.mode === mode && <small>Active mode</small>}</label>)}</div>
      <div className="mode-description"><Icon name="shield" size={21} /><p>{modeDescriptions[policyMode].text}</p></div>
      <div className="policy-fields"><label className="field-label">Autonomous per-transaction limit <div className="currency-input"><span>USD</span><input type="number" min="1" max="1000000" value={policyLimit} onChange={event => setPolicyLimit(event.target.value)} disabled={role !== 'controller'} /></div><small>This limits transaction value, not an acceptable accounting variance.</small></label><div><span className="field-label">Required evidence gates</span><ul className="policy-gates"><li><Icon name="check" size={15} />Exact amount and correct account / currency</li><li><Icon name="check" size={15} />A unique, verified payment reference</li><li><Icon name="check" size={15} />Complete sources and no conflicting candidate</li><li><Icon name="lock" size={15} />Adjustments always require human approval</li></ul></div></div>
      <div className="policy-preview"><span className="eyebrow">PREVIEW FOR THIS DATASET</span><strong>{!state.matched || state.matched === 'PAY-829' ? 'The open finding still requires human review.' : 'No eligible unmatched bank items are waiting.'}</strong><p>{!state.matched || state.matched === 'PAY-829' ? `The $4,800 item ${Number(policyLimit) >= 4800 ? 'fits' : 'exceeds'} this transaction limit. A missing structured check reference and conflicting candidates require evidence review; increasing the limit does not resolve that uncertainty.` : 'All eight bank items have recorded matches. Outstanding-check treatment and independent review remain human decisions.'}</p></div>
      <div className="modal-actions"><span className="muted small">{role === 'controller' ? 'Applies to future agent actions. Prior packages retain their policy.' : 'You can inspect modes. The Controller approves policy changes.'}</span><Button disabled={role !== 'controller' || busy || !Number.isFinite(Number(policyLimit)) || Number(policyLimit) < 1 || Number(policyLimit) > 1000000 || (policyMode === state.mode && Number(policyLimit) === state.limit)} onClick={() => perform({ type: 'policy', mode: policyMode, limit: Number(policyLimit) }, () => setPanel(null))}>Save agent policy</Button></div>
    </Modal>
    <Modal open={panel === 'tools'} onClose={() => setPanel(null)} title="Prototype test controls" description="Simulation controls for research sessions. These are separate from production permissions.">
      <div className="test-controls"><span className="field-label">View the prototype as</span><div className="role-options">{(['preparer', 'controller'] as const).map(value => <button key={value} className={role === value ? 'selected' : ''} disabled={busy} onClick={() => setRole(value)}><span className={`avatar ${value === 'controller' ? 'reviewer-avatar' : ''}`}>{PEOPLE[value].initials}</span><strong>{PEOPLE[value].name}</strong><span>{PEOPLE[value].title}</span><Badge>{value === 'preparer' ? 'Prepares decisions' : 'Reviews independently'}</Badge></button>)}</div>
      <label className="field-label">Load a scenario<select value={state.scenario} disabled={busy} onChange={event => setResetScenario(event.target.value as Scenario)}>{scenarios.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select><small>{scenarios.find(item => item.value === state.scenario)?.description}</small></label><div className="test-tools-actions"><Button variant="secondary" icon="undo" disabled={busy} onClick={() => setResetScenario(state.scenario)}>Reset current scenario</Button><Button variant="secondary" icon="help" onClick={startTour}>Replay product tour</Button></div><div className="notice notice-neutral"><Icon name="info" size={19} /><p>Source retrieval, accounting writes and identities are simulated. Decisions persist in this browser. Reset starts a fresh synthetic session; tour completion is kept separately.</p></div><Button className="full-width" onClick={() => setPanel(null)}>Return to workspace</Button></div>
    </Modal>
    <Modal open={reasonKind !== null} onClose={() => { if (!busy) setReasonKind(null) }} title={reasonKind ? reasonConfig[reasonKind].title : 'Decision reason'} description={reasonKind ? reasonConfig[reasonKind].description : 'Record a reason for this decision.'}>
      {reasonKind && <form onSubmit={event => { event.preventDefault(); if (reason.trim().length < 5 || busy) return; perform(reasonKind === 'assign' ? { type: 'assign', note: reason } : { type: reasonKind, reason }, () => { setReasonKind(null); setReason('') }) }}><label className="field-label">{reasonConfig[reasonKind].label}<textarea autoFocus rows={4} value={reason} onChange={event => setReason(event.target.value)} placeholder={reasonKind === 'unmatch' ? 'Explain what the evidence shows and why the relationship needs correction…' : 'Add an actionable note…'} required minLength={5} /></label><div className="modal-actions"><Button variant="secondary" disabled={busy} onClick={() => setReasonKind(null)}>Cancel</Button><Button type="submit" variant={reasonKind === 'unmatch' ? 'danger' : 'primary'} disabled={reason.trim().length < 5 || busy}>{busy ? 'Recording…' : reasonConfig[reasonKind].action}</Button></div></form>}
    </Modal>
    <Modal open={resetScenario !== null} onClose={() => setResetScenario(null)} title="Start a fresh test session?" description="This replaces the current browser session’s synthetic progress and activity history. Existing documents in the project are unaffected."><div className="reset-scenario"><Icon name="undo" size={24} /><div><strong>{scenarios.find(item => item.value === resetScenario)?.label}</strong><p>{scenarios.find(item => item.value === resetScenario)?.description}</p></div></div><div className="modal-actions"><Button variant="secondary" onClick={() => setResetScenario(null)}>Keep current progress</Button><Button disabled={busy} onClick={reset}>Start fresh session</Button></div></Modal>
    <ProductTour stage={tour} setStage={setTourStage} finish={finishTour} />
    {operation?.status === 'saving' && <div className="saving-indicator" role="status"><Icon name="spinner" size={15} className="spin" /><ShimmeringText text="Recording your decision…" /></div>}
  </WorkspaceContext.Provider></MotionConfig>
}
