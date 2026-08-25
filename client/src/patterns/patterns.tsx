import {
  useId,
  type FormHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import {
  Alert,
  Button,
  Drawer,
  EmptyState,
  Skeleton,
  type DrawerProps,
} from "../design-system";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type EmptyStateContent = {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
};

type AlertStateContent = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

type AsyncStateVariant =
  | {
      state: "loading";
      label: string;
      skeletonCount?: number;
    }
  | ({ state: "empty" } & EmptyStateContent)
  | ({ state: "error" } & AlertStateContent)
  | ({ state: "permission-denied" } & EmptyStateContent);

export type AsyncStateProps = AsyncStateVariant & {
  className?: string;
};

export function AsyncState(props: AsyncStateProps) {
  if (props.state === "loading") {
    const count = Math.max(1, props.skeletonCount ?? 3);
    return (
      <div
        className={cx("gero-pattern-async-state", "gero-pattern-async-state--loading", props.className)}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="gero-visually-hidden">{props.label}</span>
        {Array.from({ length: count }, (_, index) => (
          <Skeleton key={index} label={props.label} aria-hidden="true" />
        ))}
      </div>
    );
  }

  if (props.state === "error") {
    return (
      <Alert className={cx("gero-pattern-async-state", props.className)} tone="danger">
        <div className="gero-pattern-async-state__content">
          <strong>{props.title}</strong>
          {props.description && <div>{props.description}</div>}
          {props.action && <div className="gero-pattern-async-state__action">{props.action}</div>}
        </div>
      </Alert>
    );
  }

  return (
    <EmptyState
      className={cx(
        "gero-pattern-async-state",
        props.state === "permission-denied" && "gero-pattern-async-state--permission-denied",
        props.className,
      )}
      title={props.title}
      description={props.description}
      icon={props.icon}
      action={props.action}
    />
  );
}

export type FormLayoutProps = FormHTMLAttributes<HTMLFormElement> & {
  columns?: 1 | 2 | "auto";
  actions?: ReactNode;
};

export function FormLayout({ columns = 1, actions, children, className, ...props }: FormLayoutProps) {
  return (
    <form
      className={cx("gero-pattern-form", `gero-pattern-form--columns-${columns}`, className)}
      {...props}
    >
      <div className="gero-pattern-form__fields">{children}</div>
      {actions}
    </form>
  );
}

export type FormActionsProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  saveLabel: ReactNode;
  savingLabel: string;
  cancelLabel?: ReactNode;
  deleteLabel?: ReactNode;
  deletingLabel?: string;
  busy?: false | "saving" | "deleting";
  disableSave?: boolean;
  disableCancel?: boolean;
  disableDelete?: boolean;
  onCancel?: () => void;
  onDelete?: () => void;
};

export function FormActions({
  saveLabel,
  savingLabel,
  cancelLabel,
  deleteLabel,
  deletingLabel,
  busy = false,
  disableSave = false,
  disableCancel = false,
  disableDelete = false,
  onCancel,
  onDelete,
  className,
  ...props
}: FormActionsProps) {
  const isSaving = busy === "saving";
  const isDeleting = busy === "deleting";
  const isBusy = Boolean(busy);

  return (
    <div className={cx("gero-pattern-form-actions", className)} {...props}>
      <div className="gero-pattern-form-actions__secondary">
        {deleteLabel && onDelete && (
          <Button
            variant="danger"
            disabled={disableDelete || isBusy}
            loading={isDeleting}
            loadingLabel={deletingLabel}
            onClick={onDelete}
          >
            {deleteLabel}
          </Button>
        )}
      </div>
      <div className="gero-pattern-form-actions__primary">
        {cancelLabel && onCancel && (
          <Button variant="secondary" disabled={disableCancel || isBusy} onClick={onCancel}>
            {cancelLabel}
          </Button>
        )}
        <Button
          type="submit"
          disabled={disableSave || isBusy}
          loading={isSaving}
          loadingLabel={savingLabel}
        >
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}

export type MutationFeedbackProps =
  | { state: "idle"; className?: string }
  | { state: "saving"; message: ReactNode; className?: string }
  | { state: "success"; message: ReactNode; className?: string }
  | { state: "error"; message: ReactNode; className?: string };

export function MutationFeedback(props: MutationFeedbackProps) {
  if (props.state === "idle") return null;

  const tone = props.state === "success" ? "success" : props.state === "error" ? "danger" : "info";
  return (
    <Alert
      className={cx("gero-pattern-mutation-feedback", props.className)}
      tone={tone}
      aria-live={props.state === "error" ? "assertive" : "polite"}
      aria-atomic="true"
    >
      {props.message}
    </Alert>
  );
}

export type FilterBarProps = HTMLAttributes<HTMLElement> & {
  ariaLabel: string;
  filters: ReactNode;
  actions?: ReactNode;
  summary?: ReactNode;
};

export function FilterBar({ ariaLabel, filters, actions, summary, className, ...props }: FilterBarProps) {
  return (
    <section className={cx("gero-pattern-filter-bar", className)} aria-label={ariaLabel} {...props}>
      <div className="gero-pattern-filter-bar__filters">{filters}</div>
      {actions && <div className="gero-pattern-filter-bar__actions">{actions}</div>}
      {summary && <div className="gero-pattern-filter-bar__summary" aria-live="polite">{summary}</div>}
    </section>
  );
}

export type FilterDrawerProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  closeLabel: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  busy?: boolean;
  closeOnBackdrop?: boolean;
  side?: DrawerProps["side"];
  className?: string;
};

export function FilterDrawer({
  open,
  onClose,
  title,
  closeLabel,
  children,
  footer,
  busy,
  closeOnBackdrop,
  side = "end",
  className,
}: FilterDrawerProps) {
  const titleId = useId();

  return (
    <Drawer
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      busy={busy}
      closeOnBackdrop={closeOnBackdrop}
      side={side}
    >
      <div className={cx("gero-pattern-filter-drawer", className)}>
        <div className="gero-pattern-filter-drawer__header">
          <h2 id={titleId} className="gero-pattern-filter-drawer__title">{title}</h2>
          <Button variant="ghost" disabled={busy} onClick={onClose}>{closeLabel}</Button>
        </div>
        <div className="gero-pattern-filter-drawer__content">{children}</div>
        {footer && <div className="gero-pattern-filter-drawer__footer">{footer}</div>}
      </div>
    </Drawer>
  );
}

type DataViewPresentation<T> =
  | {
      renderTable: (items: readonly T[]) => ReactNode;
      renderCard?: never;
      getKey?: never;
      mobileAriaLabel?: never;
    }
  | {
      renderTable: (items: readonly T[]) => ReactNode;
      getKey: (item: T, index: number) => string | number;
      renderCard: (item: T, index: number) => ReactNode;
      mobileAriaLabel: string;
    };

type DataViewReadyProps<T> = DataViewPresentation<T> & {
  status?: "ready";
  items: readonly T[];
  empty: EmptyStateContent;
};

type DataViewLoadingProps = {
  status: "loading";
  loadingLabel: string;
  skeletonCount?: number;
};

type DataViewErrorProps = {
  status: "error";
  error: AlertStateContent;
};

export type DataViewProps<T> = (DataViewReadyProps<T> | DataViewLoadingProps | DataViewErrorProps) & {
  className?: string;
};

export function DataView<T>(props: DataViewProps<T>) {
  if (props.status === "loading") {
    return (
      <AsyncState
        className={props.className}
        state="loading"
        label={props.loadingLabel}
        skeletonCount={props.skeletonCount}
      />
    );
  }

  if (props.status === "error") {
    return <AsyncState className={props.className} state="error" {...props.error} />;
  }

  if (props.items.length === 0) {
    return <AsyncState className={props.className} state="empty" {...props.empty} />;
  }

  return (
    <div className={cx("gero-pattern-data-view", props.renderCard && "gero-pattern-data-view--adaptive", props.className)}>
      <div className="gero-pattern-data-view__table">{props.renderTable(props.items)}</div>
      {props.renderCard && (
        <div className="gero-pattern-data-view__cards" role="list" aria-label={props.mobileAriaLabel}>
          {props.items.map((item, index) => (
            <div key={props.getKey(item, index)} className="gero-pattern-data-view__card" role="listitem">
              {props.renderCard(item, index)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
