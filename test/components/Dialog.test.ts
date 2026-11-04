import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Dialog } from '#components';
import { checkA11y } from '../a11y';

describe('Dialog', () => {
  it('opens as a modal named by its label', async () => {
    const wrapper = await mountSuspended(Dialog, {
      props: { label: 'Settings' },
      slots: { default: '<p>The settings.</p>' },
      attachTo: document.body,
    });

    (wrapper.vm as unknown as { openDialog: () => void }).openDialog();
    await wrapper.vm.$nextTick();

    const dialog = wrapper.get('dialog');
    expect(dialog.attributes('open')).toBeDefined();
    const title = document.getElementById(
      dialog.attributes('aria-labelledby') ?? '',
    );
    expect(title?.textContent).toContain('Settings');
    expect(wrapper.find('button[aria-label], button').exists()).toBe(true);
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('stops Escape from closing it only with disable-escape', async () => {
    for (const disableEscape of [false, true]) {
      const wrapper = await mountSuspended(Dialog, {
        props: { label: 'Settings', disableEscape },
        attachTo: document.body,
      });

      const cancel = new Event('cancel', { cancelable: true });
      wrapper.get('dialog').element.dispatchEvent(cancel);
      expect(cancel.defaultPrevented).toBe(disableEscape);

      wrapper.unmount();
    }
  });
});
