import {
  cloneElement,
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type AnchorHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TableHTMLAttributes,
} from "react";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  loadingLabel?: string;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading = false, loadingLabel, disabled, children, type = "button", ...props }, ref,
) {
  return <button ref={ref} type={type} className={cx("gero-button", `gero-button--${variant}`, `gero-button--${size}`, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
    {loading && loadingLabel ? loadingLabel : children}
  </button>;
});

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { label: string; children: ReactNode; variant?: ButtonProps["variant"]; size?: ButtonProps["size"]; loading?: boolean };
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({ label, className, variant = "ghost", size = "md", children, type = "button", loading = false, disabled, ...props }, ref) {
  return <button ref={ref} type={type} className={cx("gero-icon-button", `gero-button--${variant}`, `gero-icon-button--${size}`, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props} aria-label={label}>{children}</button>;
});

type FieldMeta = { label: ReactNode; hint?: ReactNode; error?: ReactNode; hideLabel?: boolean };
export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & FieldMeta;
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, hint, error, hideLabel, id: suppliedId, className, "aria-describedby": describedBy, ...props }, ref) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return <div className="gero-field">
    <label className={cx("gero-field__label", hideLabel && "gero-visually-hidden")} htmlFor={id}>{label}</label>
    <input ref={ref} id={id} className={cx("gero-input", className)} aria-invalid={error ? true : undefined} aria-describedby={[describedBy, hintId, errorId].filter(Boolean).join(" ") || undefined} {...props} />
    {hint && <span className="gero-field__hint" id={hintId}>{hint}</span>}
    {error && <span className="gero-field__error" id={errorId} role="alert">{error}</span>}
  </div>;
});

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & FieldMeta;
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, hint, error, hideLabel, id: suppliedId, className, children, "aria-describedby": describedBy, ...props }, ref) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return <div className="gero-field">
    <label className={cx("gero-field__label", hideLabel && "gero-visually-hidden")} htmlFor={id}>{label}</label>
    <select ref={ref} id={id} className={cx("gero-select", className)} aria-invalid={error ? true : undefined} aria-describedby={[describedBy, hintId, errorId].filter(Boolean).join(" ") || undefined} {...props}>{children}</select>
    {hint && <span className="gero-field__hint" id={hintId}>{hint}</span>}
    {error && <span className="gero-field__error" id={errorId} role="alert">{error}</span>}
  </div>;
});

type ChoiceProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: ReactNode };
function Choice({ label, className, ...props }: ChoiceProps & { type: "checkbox" | "radio" }) {
  return <label className={cx("gero-choice", className)}><input {...props} /><span>{label}</span></label>;
}
export function Checkbox(props: ChoiceProps) { return <Choice type="checkbox" {...props} />; }
export function Radio(props: ChoiceProps) { return <Choice type="radio" {...props} />; }
export function Switch({ label, className, ...props }: ChoiceProps) {
  return <label className={cx("gero-switch", className)}><input className="gero-visually-hidden" type="checkbox" role="switch" {...props} /><span className="gero-switch__control" aria-hidden="true" /><span>{label}</span></label>;
}

export type TabItem = { id: string; label: ReactNode; content: ReactNode; disabled?: boolean };
export type TabsProps = { items: TabItem[]; value?: string; defaultValue?: string; onValueChange?: (id: string) => void; ariaLabel: string; className?: string };
export function Tabs({ items, value, defaultValue, onValueChange, ariaLabel, className }: TabsProps) {
  const instanceId = useId();
  const available = items.find((item) => !item.disabled)?.id;
  const [internal, setInternal] = useState(defaultValue ?? available ?? "");
  const selected = value ?? internal;
  const select = (id: string) => { if (value === undefined) setInternal(id); onValueChange?.(id); };
  const move = (index: number, step: number) => {
    for (let count = 1; count <= items.length; count += 1) {
      const next = items[(index + step * count + items.length) % items.length];
      if (!next.disabled) { select(next.id); document.getElementById(`${instanceId}-tab-${next.id}`)?.focus(); break; }
    }
  };
  return <div className={cx("gero-tabs", className)}>
    <div className="gero-tabs__list" role="tablist" aria-label={ariaLabel}>
      {items.map((item, index) => <button key={item.id} id={`${instanceId}-tab-${item.id}`} className="gero-tabs__tab" role="tab" aria-selected={selected === item.id} aria-controls={`${instanceId}-panel-${item.id}`} tabIndex={selected === item.id ? 0 : -1} disabled={item.disabled} onClick={() => select(item.id)} onKeyDown={(event) => { if (event.key === "ArrowRight") move(index, 1); if (event.key === "ArrowLeft") move(index, -1); }}>{item.label}</button>)}
    </div>
    {items.map((item) => <div key={item.id} id={`${instanceId}-panel-${item.id}`} className="gero-tabs__panel" role="tabpanel" aria-labelledby={`${instanceId}-tab-${item.id}`} hidden={selected !== item.id}>{item.content}</div>)}
  </div>;
}

export function Badge({ tone = "neutral", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  return <span className={cx("gero-badge", `gero-badge--${tone}`, className)} {...props} />;
}

export function Tooltip({ content, children, className }: { content: ReactNode; children: ReactElement; className?: string }) {
  const id = useId();
  const child = cloneElement(children, { "aria-describedby": id } as HTMLAttributes<HTMLElement>);
  return <span className={cx("gero-tooltip", className)}>{child}<span id={id} role="tooltip" className="gero-tooltip__content">{content}</span></span>;
}

export type DropdownProps = { label: string; trigger: ReactNode; children: ReactNode; open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; className?: string };
export function Dropdown({ label, trigger, children, open, defaultOpen = false, onOpenChange, className }: DropdownProps) {
  const [internal, setInternal] = useState(defaultOpen);
  const rootRef = useRef<HTMLDivElement>(null);
  const isOpen = open ?? internal;
  const setOpen = (next: boolean) => { if (open === undefined) setInternal(next); onOpenChange?.(next); };
  useEffect(() => {
    if (!isOpen) return;
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [isOpen]);
  return <div ref={rootRef} className={cx("gero-dropdown", className)} onKeyDown={(event) => {
    if (event.key === "Escape") { setOpen(false); rootRef.current?.querySelector<HTMLButtonElement>("button")?.focus(); return; }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    if (!isOpen) { setOpen(true); requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus()); return; }
    const items = [...(rootRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']:not([disabled])") ?? [])];
    if (!items.length) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    items[(current + step + items.length) % items.length].focus();
  }}>
    <button type="button" className="gero-button gero-button--secondary" aria-label={label} aria-haspopup="menu" aria-expanded={isOpen} onClick={() => setOpen(!isOpen)}>{trigger}</button>
    {isOpen && <div className="gero-dropdown__menu" role="menu" aria-label={label} onClick={() => setOpen(false)}>{children}</div>}
  </div>;
}

export function DropdownItem({ className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { return <button type={type} role="menuitem" className={cx("gero-dropdown__item", className)} {...props} />; }

const focusableSelector = "a[href],button:not([disabled]),input:not([disabled]):not([type='hidden']),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])";
function Overlay({ open, onClose, labelledBy, children, className, busy = false, closeOnBackdrop = true, role = "dialog" }: { open: boolean; onClose: () => void; labelledBy: string; children: ReactNode; className: string; busy?: boolean; closeOnBackdrop?: boolean; role?: "dialog" | "alertdialog" }) {
  const ref = useRef<HTMLElement>(null);
  const restore = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    restore.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => (ref.current?.querySelector<HTMLElement>("[data-initial-focus],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),a[href]") ?? ref.current)?.focus());
    return () => { document.body.style.overflow = previousOverflow; restore.current?.isConnected && restore.current.focus(); };
  }, [open]);
  if (!open) return null;
  return <div className="gero-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && closeOnBackdrop && !busy) onClose(); }}>
    <section ref={ref} className={className} role={role} aria-modal="true" aria-labelledby={labelledBy} aria-busy={busy || undefined} tabIndex={-1} onKeyDown={(event) => {
      if (event.key === "Escape" && !busy) { event.preventDefault(); onClose(); }
      if (event.key !== "Tab") return;
      const focusable = [...(ref.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])].filter((item) => !item.hidden && item.getClientRects().length > 0);
      if (!focusable.length) { event.preventDefault(); ref.current?.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}>{children}</section>
  </div>;
}

export type ModalProps = { open: boolean; onClose: () => void; labelledBy: string; children: ReactNode; busy?: boolean; closeOnBackdrop?: boolean; role?: "dialog" | "alertdialog" };
export function Modal(props: ModalProps) { return <Overlay {...props} className="gero-dialog" />; }
export type DrawerProps = ModalProps & { side?: "start" | "end" };
export function Drawer({ side = "start", ...props }: DrawerProps) { return <Overlay {...props} className={`gero-drawer gero-drawer--${side}`} />; }

export function Toast({ tone = "neutral", children, className, ...props }: HTMLAttributes<HTMLDivElement> & { tone?: "neutral" | "success" | "danger" }) {
  return <div className={cx("gero-toast", `gero-toast--${tone}`, className)} role={tone === "danger" ? "alert" : "status"} {...props}>{children}</div>;
}
export function ToastRegion(props: HTMLAttributes<HTMLDivElement>) { return <div className="gero-toast-region" aria-live="polite" aria-atomic="true" {...props} />; }
export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) { return <article className={cx("gero-card", className)} {...props} />; }

export function Table({ containerLabel, className, ...props }: TableHTMLAttributes<HTMLTableElement> & { containerLabel: string }) {
  return <div className="gero-table-wrap" role="region" aria-label={containerLabel} tabIndex={0}><table className={cx("gero-table", className)} {...props} /></div>;
}

export type PaginationProps = { page: number; pageCount: number; onPageChange: (page: number) => void; previousLabel: string; nextLabel: string; ariaLabel: string; pageLabel: (page: number) => string; className?: string };
export function Pagination({ page, pageCount, onPageChange, previousLabel, nextLabel, ariaLabel, pageLabel, className }: PaginationProps) {
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  return <nav className={cx("gero-pagination", className)} aria-label={ariaLabel}>
    <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>{previousLabel}</Button>
    <div className="gero-pagination__pages">{pages.map((item) => <IconButton key={item} label={pageLabel(item)} variant={item === page ? "primary" : "ghost"} aria-current={item === page ? "page" : undefined} onClick={() => onPageChange(item)}>{item}</IconButton>)}</div>
    <Button variant="secondary" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>{nextLabel}</Button>
  </nav>;
}

export type BreadcrumbItem = { label: ReactNode; href?: string; onClick?: () => void };
export function Breadcrumb({ items, ariaLabel, className }: { items: BreadcrumbItem[]; ariaLabel: string; className?: string }) {
  return <nav className={cx("gero-breadcrumb", className)} aria-label={ariaLabel}><ol>{items.map((item, index) => <li key={index}>{index === items.length - 1 ? <span aria-current="page">{item.label}</span> : item.href ? <a href={item.href} onClick={item.onClick}>{item.label}</a> : <button type="button" className="gero-button gero-button--ghost" onClick={item.onClick}>{item.label}</button>}</li>)}</ol></nav>;
}

export function PageHeader({ title, description, eyebrow, actions, className }: { title: ReactNode; description?: ReactNode; eyebrow?: ReactNode; actions?: ReactNode; className?: string }) {
  return <header className={cx("gero-page-header", className)}><div>{eyebrow}<h1>{title}</h1>{description && <p className="gero-page-header__description">{description}</p>}</div>{actions && <div className="gero-page-header__actions">{actions}</div>}</header>;
}
export function EmptyState({ title, description, icon, action, className }: { title: ReactNode; description?: ReactNode; icon?: ReactNode; action?: ReactNode; className?: string }) { return <section className={cx("gero-empty", className)}>{icon}<h2>{title}</h2>{description && <p>{description}</p>}{action}</section>; }
export function Skeleton({ label, className, ...props }: HTMLAttributes<HTMLDivElement> & { label: string }) { return <div className={cx("gero-skeleton", className)} role="status" aria-label={label} {...props} />; }
export function Alert({ tone = "info", className, ...props }: HTMLAttributes<HTMLDivElement> & { tone?: "info" | "success" | "warning" | "danger" }) { return <div className={cx("gero-alert", `gero-alert--${tone}`, className)} role={tone === "danger" ? "alert" : "status"} {...props} />; }

export function Sidebar({ className, ...props }: HTMLAttributes<HTMLElement>) { return <aside className={cx("gero-sidebar", className)} {...props} />; }
export function Topbar({ start, center, end, className, ...props }: HTMLAttributes<HTMLElement> & { start?: ReactNode; center?: ReactNode; end?: ReactNode }) { return <header className={cx("gero-topbar", className)} {...props}><div className="gero-topbar__section">{start}</div>{center && <div className="gero-topbar__section">{center}</div>}<div className="gero-topbar__section">{end}</div></header>; }
export type MenuProps = Omit<DropdownProps, "trigger"> & { avatar?: ReactNode; icon?: ReactNode };
export function UserMenu({ label, avatar, children, className, ...props }: MenuProps) { return <Dropdown label={label} trigger={<>{avatar}<span>{label}</span></>} className={cx("gero-user-trigger", className)} {...props}>{children}</Dropdown>; }
export function AppSwitcher({ label, icon, children, className, ...props }: MenuProps) { return <Dropdown label={label} trigger={<>{icon}<span>{label}</span></>} className={cx("gero-app-trigger", className)} {...props}>{children}</Dropdown>; }

export function MenuLink({ className, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) { return <a role="menuitem" className={cx("gero-dropdown__item", className)} {...props} />; }
