import { describe, it, expect } from 'vitest';
import { h } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Switch } from '#components';
import { accessibleName, checkA11y, description, roleOf } from '../a11y';
import { mountInForm } from '../form';

/**
 * The APG switch pattern (https://www.w3.org/WAI/ARIA/apg/patterns/switch/)
 * on a button: Space and Enter are the button's own, so the browser toggles
 * it with a click.
 */
describe('Switch', () => {
  it('is a switch named by its label, described by its instruction, with no accessibility violations', async () => {
    const wrapper = await mountSuspended(Switch, {
      props: {
        label: 'Dark mode',
        modelValue: false,
        instruction: 'Easier on the eyes at night',
      },
      attachTo: document.body,
    });

    const control = wrapper.get('button');
    expect(roleOf(control)).toBe('switch');
    expect(accessibleName(control)).toBe('Dark mode');
    expect(control.attributes('aria-checked')).toBe('false');
    expect(description(control)).toBe('Easier on the eyes at night');
    expect(await checkA11y()).toHaveNoViolations();

    await wrapper.setProps({ modelValue: true });
    expect(control.attributes('aria-checked')).toBe('true');
  });

  it('has a checked state also without a model, and toggles it', async () => {
    const wrapper = await mountSuspended(Switch, {
      props: { label: 'Dark mode' },
      attachTo: document.body,
    });

    const control = wrapper.get('[role="switch"]');
    expect(control.attributes('aria-checked')).toBe('false');

    await control.trigger('click');
    expect(control.attributes('aria-checked')).toBe('true');
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]]);

    await control.trigger('click');
    expect(control.attributes('aria-checked')).toBe('false');
  });

  it('is disabled with its button', async () => {
    const wrapper = await mountSuspended(Switch, {
      props: { label: 'Dark mode', modelValue: false, disabled: true },
      attachTo: document.body,
    });

    const control = wrapper.get('[role="switch"]');
    expect((control.element as HTMLButtonElement).disabled).toBe(true);
    expect(control.attributes('aria-checked')).toBe('false');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('posts its state with its form, as the true and false values when given', async () => {
    const wrapper = await mountInForm(() => [
      h(Switch, {
        label: 'Newsletter',
        name: 'newsletter',
        trueValue: 'yes',
        falseValue: 'no',
      }),
    ]);
    const form = wrapper.get('form').element as HTMLFormElement;

    expect(new FormData(form).get('newsletter')).toBe('no');

    await wrapper.get('[role="switch"]').trigger('click');
    expect(new FormData(form).get('newsletter')).toBe('yes');
  });

  it('posts true or false without the values', async () => {
    const wrapper = await mountInForm(() => [
      h(Switch, { label: 'Newsletter', name: 'newsletter', modelValue: false }),
    ]);
    const form = wrapper.get('form').element as HTMLFormElement;

    expect(new FormData(form).get('newsletter')).toBe('false');
  });
});
