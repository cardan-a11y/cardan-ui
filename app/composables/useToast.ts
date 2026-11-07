export function useToast() {
  const toasts = useState<(Toast & { id: string })[]>('cardan-ui:toasts', () => []);

  function createToast(toast: Toast) {
    const id = toast.id ?? crypto.randomUUID();
    toasts.value.push({ ...toast, id });
    return id;
  }

  /** Hides the toast with this id, or all toasts without one. */
  function hideToast(id?: string) {
    toasts.value = id ? toasts.value.filter((toast) => toast.id !== id) : [];
  }

  return { toasts, createToast, hideToast };
}
