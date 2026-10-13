import { useEffect, useRef, type ReactNode } from 'react'

interface ModalDialogProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Wider dialog for recipe lines / order forms. */
  wide?: boolean
}

export function ModalDialog({
  open,
  title,
  onClose,
  children,
  wide = false,
}: ModalDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open) {
      if (!el.open) el.showModal()
    } else if (el.open) {
      el.close()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className={wide ? 'app-dialog app-dialog-wide' : 'app-dialog'}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      <div className="app-dialog-head">
        <h3>{title}</h3>
        <button type="button" className="dialog-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <div className="app-dialog-body">{children}</div>
    </dialog>
  )
}
