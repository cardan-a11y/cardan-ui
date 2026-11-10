import type { Ref } from 'vue';

/**
 * Each step of the MFA flow replaces the content focus was in, so focus moves
 * to the new step: its heading in `MfaSetup`, the step's content in
 * `MfaDialog`, whose title belongs to the dialog. The confirm step is the
 * exception: its form focuses the code input. The target takes focus with
 * `tabindex="-1"`.
 */
export function useMfaStepFocus(target: Readonly<Ref<HTMLElement | null>>) {
  const { mfaStep } = useMfa();

  watch(mfaStep, async (step) => {
    if (step === 3) return;
    await nextTick();
    target.value?.focus();
  });
}
