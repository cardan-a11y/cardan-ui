export function useToast() {
  const toasts = useState<(Toast & { id: string })[]>(
    'cardan-ui:toasts',
    () => [],
  );
  // In the payload, so the browser counts on from the server's last id
  const count = useState('cardan-ui:toast-count', () => 0);

  function createToast(toast: Toast) {
    // randomUUID exists in secure contexts only: not on a dev server over http
    const id = toast.id ?? `toast-${++count.value}`;
    toasts.value.push({ ...toast, id });
    return id;
  }

  /** Hides the toast with this id, or all toasts without one. */
  function hideToast(id?: string) {
    toasts.value = id ? toasts.value.filter((toast) => toast.id !== id) : [];
  }

  return { toasts, createToast, hideToast };
}
