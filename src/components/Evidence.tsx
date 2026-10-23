import { useState } from 'react'
import { Badge, Button, EmptyState, Icon, IconButton, Modal } from './ui'
import { useWorkspace } from '@/lib/workspace'

export type DocumentKind = 'bank' | 'invoice' | 'po'
export function EvidenceViewer({ initialDocument = 'bank', candidate = '817', expanded = false, archivedSourceVersion }: { initialDocument?: DocumentKind; candidate?: '817' | '829'; expanded?: boolean; archivedSourceVersion?: number }) {
  const { state, perform, busy, openReason } = useWorkspace()
  const [document, setDocument] = useState<DocumentKind>(initialDocument)
  const [zoom, setZoom] = useState(100)
  const [large, setLarge] = useState(false)
  const invoice = candidate === '817' ? 'INV-392' : 'INV-418'
  const po = candidate === '817' ? 'PO-118' : 'PO-135'
  const available = archivedSourceVersion !== undefined || document !== 'bank' || state.evidence === 'ready'
  const paper = document === 'bank' ? <img className="check-document" src="/evidence/check-1042.svg" alt="Synthetic bank-cleared check 1042, payable to Harbor Supply for 4,800 US dollars, dated September 25, 2026. Sample, not negotiable." /> : <div className="paper-document">
    <div className="paper-watermark">SYNTHETIC DOCUMENT</div>
    <div className="paper-top"><strong>{document === 'invoice' ? 'HARBOR SUPPLY' : 'NORTHSTAR'}</strong><span>{document === 'invoice' ? 'INVOICE' : 'PURCHASE ORDER'}</span></div>
    <h3>{document === 'invoice' ? invoice : po}</h3>
    <div className="paper-columns"><div><small>{document === 'invoice' ? 'BILL TO' : 'SUPPLIER'}</small><b>{document === 'invoice' ? 'Northstar Distribution' : 'Harbor Supply'}</b><span>Fictional company · Demonstration record</span></div><div><small>ISSUED</small><b>September {candidate === '817' ? '18' : '29'}, 2026</b><span>Currency: USD</span></div></div>
    <div className="paper-line"><span>Description</span><span>Amount</span></div><div className="paper-line"><span>{candidate === '817' ? 'Industrial fixtures · 24 × $200' : 'Inventory cases · 12 × $400'}</span><b>$4,800.00</b></div>
    <div className="paper-total"><span>Total</span><strong>$4,800.00</strong></div>
    <div className="paper-footer">{document === 'invoice' ? `Purchase order: ${po}` : `Related invoice: ${invoice}`}<br />Payment: PAY-{candidate} · Check {candidate === '817' ? '1042' : '1043'}<br /><br />This synthetic record supports the purchase. Bank evidence establishes clearance.</div>
  </div>

  return <section className={`evidence-viewer ${expanded ? 'expanded' : ''}`} aria-label="Source evidence">
    <div className="evidence-heading"><div className="flex-row"><span className="tiny-icon"><Icon name="files" size={17} /></span><h3>Source evidence</h3></div><Badge icon="shield">Read only</Badge></div>
    <div className="document-tabs" role="tablist" aria-label="Evidence document">
      {(['bank', 'invoice', 'po'] as const).map(kind => <button key={kind} role="tab" aria-selected={document === kind} onClick={() => { setDocument(kind); setZoom(100) }} className={document === kind ? 'active' : ''}>{kind === 'bank' ? 'Bank image' : kind === 'invoice' ? invoice : po}</button>)}
    </div>
    <div className="document-toolbar"><div><Icon name="file" size={16} /><span>{document === 'bank' ? 'cleared-check-1042.svg' : `${document === 'invoice' ? invoice : po}.record`}</span></div><div className="flex-row"><IconButton name="minus" label="Zoom out" onClick={() => setZoom(value => Math.max(75, value - 25))} disabled={!available || zoom <= 75} /><span className="zoom-level">{zoom}%</span><IconButton name="plus" label="Zoom in" onClick={() => setZoom(value => Math.min(175, value + 25))} disabled={!available || zoom >= 175} />{!expanded && <IconButton name="expand" label="Expand source document" onClick={() => setLarge(true)} disabled={!available} />}</div></div>
    <div className="document-canvas">
      {!available ? <EmptyState icon={state.evidence === 'stale' ? 'history' : 'file'} title={state.evidence === 'stale' ? 'Updated bank evidence available' : 'Bank image unavailable'}><p>{state.evidence === 'stale' ? 'The source changed after this investigation. Refresh and inspect the current image before confirming.' : 'The feed has no check reference. A usable bank image is needed to identify the cleared payment.'}</p><div className="empty-actions"><Button icon="undo" disabled={busy || state.paused} onClick={() => perform({ type: 'evidence' })}>{busy ? 'Retrieving…' : 'Retrieve bank evidence'}</Button>{['preparation', 'returned'].includes(state.lifecycle) && <Button variant="secondary" onClick={() => openReason('assign')}>Assign follow-up</Button>}</div>{state.paused && <p>Resume investigation to retrieve evidence.</p>}</EmptyState> : <div className="document-scale" style={{ width: `${zoom}%` }}>{paper}</div>}
    </div>
    {available && <div className="extracted-fields"><div className="extracted-label"><Icon name="sparkle" size={15} /><span>{document === 'bank' ? 'Extracted fields · verify against original' : 'Linked purchase context'}</span></div><div className="field-chips">{document === 'bank' ? <><span>Check <strong>1042</strong></span><span>Payee <strong>Harbor Supply</strong></span><span>Amount <strong>$4,800.00</strong></span></> : <><span>Invoice <strong>{invoice}</strong></span><span>Purchase order <strong>{po}</strong></span><span>Total <strong>$4,800.00</strong></span></>}</div></div>}
    <div className="evidence-provenance"><Icon name="link" size={13} /><span>{document === 'bank' ? 'Bank-cleared detail · B-104' : `ERP document · PAY-${candidate}`} · Source v{archivedSourceVersion ?? state.sourceVersion} · {archivedSourceVersion !== undefined ? 'Preserved snapshot · ' : ''}Synthetic</span></div>
    {!expanded && <Modal open={large} onClose={() => setLarge(false)} title="Original source document" description="Synthetic evidence for the September reconciliation. Inspect the original alongside extracted fields." wide><EvidenceViewer initialDocument={document} candidate={candidate} expanded archivedSourceVersion={archivedSourceVersion} /></Modal>}
  </section>
}
