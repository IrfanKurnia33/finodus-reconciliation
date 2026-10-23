import { createContext, useContext } from 'react'
import type { Action, Reconciliation, Role } from './reconciliation'

export type View = 'workspace' | 'investigate' | 'outstanding' | 'review'
export type Panel = 'activity' | 'policy' | 'tools' | 'evidence'
export type ReasonKind = 'unmatch' | 'return' | 'reopen' | 'assign'
export interface WorkspaceValue {
  state: Reconciliation
  role: Role
  view: View
  go: (view: View) => void
  busy: boolean
  perform: (action: Action, onSuccess?: () => void) => void
  openPanel: (panel: Panel) => void
  openReason: (kind: ReasonKind) => void
  startTour: () => void
}
export const WorkspaceContext = createContext<WorkspaceValue | null>(null)
export function useWorkspace() {
  const value = useContext(WorkspaceContext)
  if (!value) throw new Error('Workspace context is unavailable')
  return value
}
