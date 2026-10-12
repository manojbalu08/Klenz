import { useEffect, useRef, type ReactNode } from 'react'
import styles from './Dialog.module.css'

interface DialogProps {
  open: boolean
  onClose: () => void
  /** Accessible name, read out when the dialog opens. */
  label: string
  /** "drawer" slides in from the right (the cart); "modal" is centred. */
  variant?: 'drawer' | 'modal'
  className?: string
  children: ReactNode
}

/**
 * Wraps the native <dialog> element, which traps focus, closes on Escape and
 * returns focus to the button that opened it.
 */
export default function Dialog({ open, onClose, label, variant = 'modal', className, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      dialog.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      tabIndex={-1}
      aria-label={label}
      className={`${styles.dialog} ${styles[variant]} ${className ?? ''}`}
      // Fires however the dialog closes, including the Escape key.
      onClose={onClose}
      onClick={(event) => {
        // A click on the dialog element itself (not its content) is a click on the backdrop.
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {open && <div className={styles.body}>{children}</div>}
    </dialog>
  )
}
