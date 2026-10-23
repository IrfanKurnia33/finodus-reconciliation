import { useLayoutEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRightIcon, ArrowLeftIcon, ArrowUpRightIcon, ArrowDownLeftIcon, ArrowsLeftRightIcon, BankIcon, CalendarBlankIcon, CaretDownIcon, CaretRightIcon, CheckIcon, CheckCircleIcon, ChecksIcon, CircleIcon, ClockIcon, ClockCounterClockwiseIcon, DownloadSimpleIcon, EyeIcon, FileTextIcon, FilesIcon, GearSixIcon, InfoIcon, LinkIcon, ListIcon, MagnifyingGlassIcon, PauseIcon, PlayIcon, PlusIcon, QuestionIcon, ShieldCheckIcon, SlidersHorizontalIcon, SparkleIcon, SpinnerGapIcon, TrayIcon, UserIcon, UsersIcon, WarningCircleIcon, XIcon, ArrowCounterClockwiseIcon, CornersOutIcon, MinusIcon, SignOutIcon, LockSimpleIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

const icons = {
  arrow: ArrowRightIcon, back: ArrowLeftIcon, incoming: ArrowDownLeftIcon, outgoing: ArrowUpRightIcon,
  reconcile: ArrowsLeftRightIcon, bank: BankIcon, calendar: CalendarBlankIcon, down: CaretDownIcon,
  chevron: CaretRightIcon, check: CheckIcon, success: CheckCircleIcon, checks: ChecksIcon,
  circle: CircleIcon, clock: ClockIcon, history: ClockCounterClockwiseIcon, download: DownloadSimpleIcon,
  eye: EyeIcon, file: FileTextIcon, files: FilesIcon, settings: GearSixIcon, info: InfoIcon,
  link: LinkIcon, menu: ListIcon, search: MagnifyingGlassIcon, pause: PauseIcon, play: PlayIcon,
  plus: PlusIcon, help: QuestionIcon, shield: ShieldCheckIcon, sliders: SlidersHorizontalIcon,
  sparkle: SparkleIcon, spinner: SpinnerGapIcon, tray: TrayIcon, user: UserIcon, users: UsersIcon,
  warning: WarningCircleIcon, close: XIcon, undo: ArrowCounterClockwiseIcon, expand: CornersOutIcon,
  minus: MinusIcon, signout: SignOutIcon, lock: LockSimpleIcon,
}
export type IconName = keyof typeof icons
export function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  const Component = icons[name]
  return <Component size={size} weight="regular" aria-hidden="true" className={className} />
}

export function Button({ children, variant = 'primary', icon, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: IconName }) {
  return <button type="button" className={cn('btn', `btn-${variant}`, className)} {...props}>{icon && <Icon name={icon} size={17} />}{children}</button>
}
export function Badge({ children, tone = 'neutral', icon }: { children: ReactNode; tone?: 'neutral' | 'green' | 'amber' | 'red'; icon?: IconName }) {
  return <span className={`badge badge-${tone}`}>{icon && <Icon name={icon} size={13} />}{children}</span>
}
export function IconButton({ name, label, onClick, className = '', disabled = false }: { name: IconName; label: string; onClick: () => void; className?: string; disabled?: boolean }) {
  return <button type="button" className={cn('icon-btn', className)} aria-label={label} title={label} onClick={onClick} disabled={disabled}><Icon name={name} size={19} /></button>
}
export function Modal({ open, onClose, title, description, children, wide = false, drawer = false, className = '' }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; wide?: boolean; drawer?: boolean; className?: string }) {
  const [lastContent, setLastContent] = useState({ title, description, children })
  // Keep the visible content intact if the caller clears its form on close.
  useLayoutEffect(() => { if (open) setLastContent({ title, description, children }) }, [open, title, description, children])
  const content = open ? { title, description, children } : lastContent
  return <Dialog.Root open={open} onOpenChange={value => { if (!value) onClose() }}><Dialog.Portal>
    <Dialog.Overlay className="dialog-overlay" />
    <Dialog.Content className={cn(drawer ? 'drawer' : 'modal', wide && 'modal-wide', className)} {...(!content.description ? { 'aria-describedby': undefined } : {})}>
      <div className="dialog-heading"><div><Dialog.Title className="dialog-title">{content.title}</Dialog.Title>{content.description && <Dialog.Description className="dialog-description">{content.description}</Dialog.Description>}</div><Dialog.Close asChild><IconButton name="close" label={`Close ${content.title}`} onClick={onClose} /></Dialog.Close></div>
      {content.children}
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>
}
export function EmptyState({ icon = 'tray', title, children }: { icon?: IconName; title: string; children?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><Icon name={icon} size={28} /></span><h3>{title}</h3><div>{children}</div></div>
}
