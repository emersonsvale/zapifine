export type ToastKind = 'success' | 'error' | 'info' | 'warning'

export type Toast = {
  id: number
  kind: ToastKind
  title?: string
  message: string
  timeout: number
  onClick?: () => void
}

export type ConfirmVariant = 'default' | 'danger'

export type ConfirmOptions = {
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
}

type ConfirmState = ConfirmOptions & {
  open: boolean
  resolve: ((value: boolean) => void) | null
}

let seq = 0

export function useAlerts() {
  const toasts = useState<Toast[]>('ui-toasts', () => [])
  const confirmState = useState<ConfirmState>('ui-confirm', () => ({
    open: false,
    resolve: null,
  }))

  function push(
    kind: ToastKind,
    message: string,
    opts?: { title?: string; timeout?: number; onClick?: () => void },
  ) {
    const id = ++seq
    const t: Toast = {
      id,
      kind,
      title: opts?.title,
      message,
      timeout: opts?.timeout ?? (kind === 'error' ? 6000 : 4000),
      onClick: opts?.onClick,
    }
    toasts.value = [...toasts.value, t]
    if (t.timeout > 0) {
      setTimeout(() => dismiss(id), t.timeout)
    }
    return id
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  type ToastOpts = { title?: string; timeout?: number; onClick?: () => void }
  const toast = {
    success: (msg: string, opts?: ToastOpts) => push('success', msg, opts),
    error: (msg: string, opts?: ToastOpts) => push('error', msg, opts),
    info: (msg: string, opts?: ToastOpts) => push('info', msg, opts),
    warning: (msg: string, opts?: ToastOpts) => push('warning', msg, opts),
  }

  function confirm(options: ConfirmOptions = {}): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      confirmState.value = {
        ...options,
        open: true,
        resolve,
      }
    })
  }

  function resolveConfirm(answer: boolean) {
    const r = confirmState.value.resolve
    confirmState.value = {
      ...confirmState.value,
      open: false,
      resolve: null,
    }
    r?.(answer)
  }

  return { toasts, dismiss, toast, confirm, confirmState, resolveConfirm }
}
