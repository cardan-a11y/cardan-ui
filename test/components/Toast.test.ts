import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Toast } from '#components';
import { checkA11y } from '../a11y';

function playState(wrapper: { find: (selector: string) => { element: Element } }) {
  const timer = wrapper.find('.toast__timer').element as HTMLElement;
  return timer.style.getPropertyValue('--animation-play-state').trim();
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

  it('takes the role of a status or alert message', async () => {
    const wrapper = await mountSuspended(Toast, {
      props: { label: 'Saved', role: 'alert' },
      attachTo: document.body,
    });

    expect(wrapper.get('.toast').attributes('role')).toBe('alert');
    expect(await checkA11y()).toHaveNoViolations();
  });
});
