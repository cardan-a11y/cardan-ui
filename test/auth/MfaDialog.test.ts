import { describe, it, expect, vi } from 'vitest';
import { nextTick } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { MfaDialog } from '#components';
import { useMfa, useMfaDialog } from '#imports';
import { checkA11y } from '../a11y';

// No Fortify behind the dialog: the steps are switched by hand
const { client } = vi.hoisted(() => ({ client: vi.fn() }));
mockNuxtImport('useSanctumClient', () => () => client);

describe('MfaDialog', () => {
  it('moves focus to the step that replaced the content', async () => {
    client.mockResolvedValue({});

    const wrapper = await mountSuspended(MfaDialog, {
      attachTo: document.body,
    });
    const { openMfaEnableDialog } = useMfaDialog();
    const { mfaStep } = useMfa();

    openMfaEnableDialog();
    await nextTick();
    expect(wrapper.get('dialog').attributes('open')).toBeDefined();

    const step = wrapper.get('.mfa-dialog-step');
    expect(step.attributes('tabindex')).toBe('-1');

    // On to the disable confirmation: new content, read from its start
    mfaStep.value = 5;
    await flushPromises();
    expect(document.activeElement).toBe(step.element);

    // The confirm step focuses its code input instead
    mfaStep.value = 3;
    await flushPromises();
    expect(document.activeElement).toBe(
      wrapper.get('input[name="code"]').element,
    );

    expect(await checkA11y()).toHaveNoViolations();
  });
});
