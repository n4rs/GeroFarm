import { useEffect, useRef, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

type AccessibleDialogProps = {
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
  role?: "dialog" | "alertdialog";
  backdropClassName?: string;
  className?: string;
  closeOnBackdrop?: boolean;
};

export function AccessibleDialog({
  labelledBy,
  onClose,
  children,
  busy = false,
  role = "dialog",
  backdropClassName = "modal-backdrop",
  className = "holding-dialog",
  closeOnBackdrop = true,
}: AccessibleDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const initial = dialog.querySelector<HTMLElement>(
      "[data-dialog-initial-focus], input:not([disabled]):not([type='hidden']), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([data-dialog-close]), a[href]",
    );
    (initial || dialog).focus();
    return () => {
      const restore = restoreFocusRef.current;
      if (restore?.isConnected) restore.focus();
    };
  }, []);

  function keyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!busy) onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = [...dialog.querySelectorAll<HTMLElement>(focusableSelector)].filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true" && element.getClientRects().length > 0);
    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }

  function backdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && closeOnBackdrop && !busy) onClose();
  }

  return <div className={backdropClassName} role="presentation" onMouseDown={backdropMouseDown}>
    <section ref={dialogRef} className={className} role={role} aria-modal="true" aria-labelledby={labelledBy} aria-busy={busy || undefined} tabIndex={-1} onKeyDown={keyDown}>
      {children}
    </section>
  </div>;
}

export function DialogError({ children }: { children: ReactNode }) {
  return <p className="form-error" role="alert" aria-live="assertive">{children}</p>;
}
