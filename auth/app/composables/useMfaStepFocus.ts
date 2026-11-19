import type { Ref } from 'vue';

/** Focuses `target` (with `tabindex="-1"`) on each MFA step but the code step, whose form focuses its field. */
export function useMfaStepFocus(target: Readonly<Ref<HTMLElement | null>>) {
  const { mfaStep } = useMfa();

  watch(mfaStep, async (step) => {
    if (step === 3) return;
    await nextTick();
    target.value?.focus();
  });
}
