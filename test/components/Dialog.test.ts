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

  it('leaves the page to the native modal: nothing outside is made inert', async () => {
    const outside = document.createElement('button');
    outside.textContent = 'Outside';
    document.body.append(outside);

    const wrapper = await mountSuspended(Dialog, {
      props: { label: 'Settings' },
      attachTo: document.body,
    });

    (wrapper.vm as unknown as { openDialog: () => void }).openDialog();
    // The loop would lock the page the tick after it opens
    await new Promise((resolve) => setTimeout(resolve));

    expect(wrapper.get('dialog').attributes('open')).toBeDefined();
    expect(outside.hasAttribute('inert')).toBe(false);

    wrapper.unmount();
    outside.remove();
  });

  it('keeps its content when a file picker in it is dismissed', async () => {
    const wrapper = await mountSuspended(Dialog, {
      props: { label: 'Avatar' },
      slots: { default: '<input type="file" aria-label="Avatar" />' },
      attachTo: document.body,
    });

    (wrapper.vm as unknown as { openDialog: () => void }).openDialog();
    await wrapper.vm.$nextTick();

    // A dismissed picker fires a cancel that bubbles from the input
    const cancel = new Event('cancel', { bubbles: true, cancelable: true });
    wrapper.get('input[type="file"]').element.dispatchEvent(cancel);
    await wrapper.vm.$nextTick();

    expect(cancel.defaultPrevented).toBe(false);
    expect(wrapper.find('input[type="file"]').exists()).toBe(true);
    expect(wrapper.find('.close-button').exists()).toBe(true);
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
