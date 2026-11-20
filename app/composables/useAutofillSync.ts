import type { Ref } from 'vue';

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/**
 * Keeps a field's model in line with a value an extension (iCloud Passwords)
 * filled in without an input event: on `change` and before its Form checks a
 * submit. `take` is the field's own input handling; call `remember()` whenever
 * the model and the control agree (after input, and after a render).
 */
export function useAutofillSync(
  control: Readonly<Ref<Control | null>>,
  take: (control: Control) => void,
) {
  let lastSyncedValue: string | undefined;

  function remember() {
    lastSyncedValue = control.value?.value;
  }

  function sync() {
    const element = control.value;
    if (!element || element.value === lastSyncedValue) return false;
    take(element);
    remember();
    return true;
  }

  const register = inject(formSyncKey, null);
  let unregister: (() => void) | undefined;

  onMounted(() => {
    remember();
    unregister = register?.(sync);
  });
  onBeforeUnmount(() => unregister?.());

  return { remember, sync };
}
