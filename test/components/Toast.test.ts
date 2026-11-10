import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { nextTick } from 'vue';
import { Toast, ToastManager } from '#components';
import { useToast } from '#imports';
import { checkA11y } from '../a11y';

function playState(wrapper: {
  find: (selector: string) => { element: Element };
}) {
  const timer = wrapper.find('.toast__timer').element as HTMLElement;
  return timer.style.getPropertyValue('--toast-animation-play-state').trim();
}

describe('Toast', () => {
  it('pauses its timer while keyboard focus is in it', async () => {
    const wrapper = await mountSuspended(Toast, {
      props: { label: 'Saved', timeout: 5000 },
      attachTo: document.body,
    });
    expect(playState(wrapper)).toBe('running');

    const close = wrapper.get('button').element as HTMLButtonElement;
    close.focus();
    await wrapper.vm.$nextTick();
    expect(playState(wrapper)).toBe('paused');

    close.blur();
    await wrapper.vm.$nextTick();
    expect(playState(wrapper)).toBe('running');

    wrapper.unmount();
  });

  it('is announced by the live region of the manager, with no role of its own', async () => {
    await mountSuspended(ToastManager, { attachTo: document.body });
    useToast().createToast({ label: 'Saved' });
    await nextTick();

    // Teleported to the #teleports element of the Nuxt app
    const manager = document.querySelector('.toast-manager');
    const toast = manager?.querySelector('.toast');
    expect(manager?.getAttribute('aria-live')).toBe('polite');
    expect(toast?.hasAttribute('role')).toBe(false);
    expect(toast?.textContent).toContain('Saved');
    expect(await checkA11y()).toHaveNoViolations();

    useToast().hideToast();
  });
});
