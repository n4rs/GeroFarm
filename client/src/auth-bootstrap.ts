export type BootstrapFailureKind = "cancelled" | "network" | "timeout";

export class BootstrapRequestError extends Error {
  constructor(public readonly kind: BootstrapFailureKind, cause?: unknown) {
    super(kind === "timeout" ? "The request timed out" : kind === "cancelled" ? "The request was cancelled" : "The request failed", { cause });
    this.name = "BootstrapRequestError";
  }
}

type BootstrapFetchOptions = {
  attempts?: number;
  timeoutMs?: number;
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
  waitImpl?: (delayMs: number) => Promise<void>;
};

const TRANSIENT_STATUSES = new Set([502, 503, 504]);

function wait(delayMs: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, delayMs));
}

export async function bootstrapFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: BootstrapFetchOptions = {},
) {
  const attempts = Math.max(1, options.attempts ?? 2);
  const timeoutMs = Math.max(1, options.timeoutMs ?? 12_000);
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? 350);
  const fetchImpl = options.fetchImpl ?? fetch;
  const waitImpl = options.waitImpl ?? wait;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (init.signal?.aborted) throw new BootstrapRequestError("cancelled");

    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    init.signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetchImpl(input, { ...init, signal: controller.signal });
      if (!TRANSIENT_STATUSES.has(response.status) || attempt === attempts) return response;
      await response.body?.cancel().catch(() => undefined);
    } catch (cause) {
      if (init.signal?.aborted) throw new BootstrapRequestError("cancelled", cause);
      const failure = new BootstrapRequestError(timedOut ? "timeout" : "network", cause);
      if (attempt === attempts) throw failure;
    } finally {
      clearTimeout(timer);
      init.signal?.removeEventListener("abort", abort);
    }

    await waitImpl(retryDelayMs);
  }

  throw new BootstrapRequestError("network");
}
