import type { Ref } from 'vue';

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/**
 * Keeps a field's model in line with a value that was filled in without an
 * input event. iCloud Passwords and other extensions set `value` only, so the
 * model kept its old value while the field, and the browser's validation,
 * showed the new one: a sign-in sent empty credentials. The field takes such
 * a value on `change` and when its Form is submitted, before Form checks it.
 *
 * `take` is the field's own input handling, so a value taken here goes through
 * the same steps as a typed one (`v-model.trim`, validity, custom error). The
 * field calls `remember()` whenever the model and the control agree: after its
 * input handling, and after a render that put the model into the control.
 */
export function useAutofillSync(
  control: Readonly<Ref<Control | null>>,
  take: (control: Control) => void,
) {
  /** The control's value when the model last agreed with it */
  let known: string | undefined;

  function remember() {
    known = control.value?.value;
  }

  /**
   * Takes the control's value when it changed behind the model's back, and
   * says whether it did
   */
  function sync() {
    const element = control.value;
    if (!element || element.value === known) return false;
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
