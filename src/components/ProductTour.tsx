import { useLayoutEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, useReducedMotion } from 'motion/react'
import { Button, Icon, Modal } from './ui'

const steps = [
  { target: 'account', eyebrow: 'YOUR WORKSPACE', title: 'Start with the right context', text: 'Your account, currency and statement cutoff stay visible. Check source coverage before making reconciliation decisions.' },
  { target: 'autonomy', eyebrow: 'YOU SET THE BOUNDARIES', title: 'Know what the agent can do', text: 'Watch investigates continuously without making automatic changes. Open the autonomy control to inspect permissions and policy limits.' },
  { target: 'finding', eyebrow: 'YOUR NEXT TASK', title: 'Follow the findings', text: 'Investigations appear here with the evidence available and the decisions still needed. Open one to compare records and inspect original documents.' },
  { target: 'review', eyebrow: 'FROM PREPARATION TO REVIEW', title: 'See what supports the close', text: 'The review package brings together balances, evidence and outstanding items. Preparation and independent sign-off are separate steps.' },
  { target: 'help', eyebrow: 'A LITTLE HELP, ANYTIME', title: 'You can always come back', text: 'Replay this tour whenever you need orientation. Exploring the workspace never records a match; recording a decision takes an explicit confirmation.' },
] as const

export function ProductTour({ stage, setStage, finish }: { stage: 'welcome' | number | null; setStage: (stage: 'welcome' | number | null) => void; finish: () => void }) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [lastStep, setLastStep] = useState(0)
  const reduced = useReducedMotion()
  const active = typeof stage === 'number'
  const step = active ? stage : lastStep
  // Retain the last stop while Radix plays the closing animation.
  useLayoutEffect(() => { if (typeof stage === 'number') setLastStep(stage) }, [stage])
  useLayoutEffect(() => {
    if (!active) return
    const targets = document.querySelectorAll<HTMLElement>(`[data-tour="${steps[stage].target}"]`)
    const element = [...targets].find(item => item.getBoundingClientRect().width > 0)
    if (!element) return
    element.scrollIntoView({ block: 'nearest', behavior: 'instant' })
    const update = () => setRect(element.getBoundingClientRect())
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); observer.disconnect() }
  }, [active, stage])

  const width = Math.min(366, window.innerWidth - 32)
  const left = rect ? Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)) : (window.innerWidth - width) / 2
  const top = rect ? Math.max(16, Math.min(rect.bottom + 18, window.innerHeight - 310)) : 150
  const l = Math.max(8, (rect?.left ?? 0) - 5), t = Math.max(8, (rect?.top ?? 0) - 5)
  const r = Math.min(window.innerWidth - 8, (rect?.right ?? 0) + 5), b = Math.min(window.innerHeight - 8, (rect?.bottom ?? 0) + 5)
  const clipPath = rect ? `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${l}px ${t}px, ${l}px ${b}px, ${r}px ${b}px, ${r}px ${t}px, ${l}px ${t}px)` : undefined

  return <>
    <Modal open={stage === 'welcome'} onClose={finish} title="Welcome to Finodus" description="A little orientation before your first close." className="welcome-modal">
      <div className="welcome-visual"><img src="/brand/logomark.svg" alt="" /><div className="welcome-line" /><span><Icon name="shield" size={25} /></span><div className="welcome-line" /><span><Icon name="checks" size={25} /></span></div>
      <h2>A clearer close.<br /><span>With you in control.</span></h2>
      <p>Your reconciliation workspace brings investigations, source evidence and independent review into one place. Take a short tour to find your way around.</p>
      <div className="welcome-note"><Icon name="info" size={18} /><span>This prototype uses synthetic records. You can explore safely, and reset it at any time.</span></div>
      <Button className="full-width" icon="arrow" onClick={() => setStage(0)}>Take the product tour</Button>
      <Button className="full-width" variant="ghost" onClick={finish}>Explore on my own</Button>
      <small className="welcome-footnote">5 quick stops · Replay anytime from Help</small>
    </Modal>
    <Dialog.Root open={active} onOpenChange={open => { if (!open) finish() }}><Dialog.Portal>
      <Dialog.Overlay className="tour-overlay" style={{ clipPath }} />
      {rect && <div className="tour-highlight" data-state={active ? 'open' : 'closed'} style={{ left: l, top: t, width: r - l, height: b - t }} />}
      <Dialog.Content className="tour-card" style={{ width, left, top }} onInteractOutside={event => event.preventDefault()}>
        <motion.div key={step} initial={reduced ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }}>
          <div className="tour-top"><span>{steps[step].eyebrow}</span><button onClick={finish} className="text-button" aria-label="Skip tour">Skip tour <Icon name="close" size={14} /></button></div>
          <Dialog.Title>{steps[step].title}</Dialog.Title><Dialog.Description>{steps[step].text}</Dialog.Description>
          <div className="tour-bottom"><span className="tour-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>{steps.map((_, index) => <i key={index} className={index === step ? 'active' : ''} />)}<span>{step + 1}/{steps.length}</span></span><div className="flex-row">{step > 0 && <Button variant="ghost" onClick={() => setStage(step - 1)}>Back</Button>}<Button onClick={() => step === steps.length - 1 ? finish() : setStage(step + 1)}>{step === steps.length - 1 ? 'Start exploring' : 'Next'}<Icon name="arrow" size={15} /></Button></div></div>
        </motion.div>
      </Dialog.Content>
    </Dialog.Portal></Dialog.Root>
  </>
}
