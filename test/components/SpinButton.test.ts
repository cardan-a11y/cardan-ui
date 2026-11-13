import { describe, it, expect, vi, afterEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { SpinButton } from '#components';
import { accessibleName, checkA11y, description } from '../a11y';

/**
 * The rows of the APG spinbutton pattern and its quantity example
 * (https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/): the roles, states
 * and properties, the keyboard support and the accessibility features.
 */
async function mountSpinButton(props: Record<string, unknown> = {}) {
  const wrapper = await mountSuspended(SpinButton, {
    props: { label: 'Adults', min: 1, max: 8, modelValue: 2, ...props },
    attachTo: document.body,
  });

  /** The button with this name */
  const button = (name: string) => {
    const found = wrapper
      .findAll('button')
      .find((button) => accessibleName(button) === name);
    if (!found) throw new Error(`No button named ${name}`);
    return found;
  };

  return {
    wrapper,
    input: wrapper.get('input'),
    decrease: button('Decrease Adults'),
    increase: button('Increase Adults'),
  };
}

/** The model after the last update */
function model(wrapper: {
  emitted: (name: string) => unknown[][] | undefined;
}) {
  return wrapper.emitted('update:modelValue')?.at(-1)?.[0];
}

afterEach(() => {
  vi.useRealTimers();
});

describe('SpinButton: roles, states and properties', () => {
  it('is a labelled text field with the spinbutton role and no accessibility violations', async () => {
    const { wrapper, input } = await mountSpinButton();

    expect(input.attributes('type')).toBe('text');
    expect(input.attributes('role')).toBe('spinbutton');
    expect(wrapper.get('label').attributes('for')).toBe(input.attributes('id'));
    expect(wrapper.get('label').text()).toBe('Adults');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('has the value, the minimum and the maximum in aria-valuenow, -valuemin and -valuemax', async () => {
    const { input } = await mountSpinButton();

    expect(input.attributes('aria-valuenow')).toBe('2');
    expect(input.attributes('aria-valuemin')).toBe('1');
    expect(input.attributes('aria-valuemax')).toBe('8');
    expect(input.element.value).toBe('2');
  });

  it('has a minimum of 0 and no aria-valuemax without the props', async () => {
    const { input } = await mountSpinButton({ min: undefined, max: undefined });

    expect(input.attributes('aria-valuemin')).toBe('0');
    expect(input.attributes('aria-valuemax')).toBeUndefined();
  });

  it('updates aria-valuenow as the value changes, and has none while the field is empty', async () => {
    const { wrapper, input } = await mountSpinButton();

    await input.trigger('keydown', { key: 'ArrowUp' });
    expect(input.attributes('aria-valuenow')).toBe('3');

    await input.setValue('5');
    expect(input.attributes('aria-valuenow')).toBe('5');

    await wrapper.setProps({ modelValue: 7 });
    expect(input.attributes('aria-valuenow')).toBe('7');
    expect(input.element.value).toBe('7');

    await input.setValue('');
    expect(input.attributes('aria-valuenow')).toBeUndefined();
    expect(model(wrapper)).toBeUndefined();
  });

  it('names each button after the field, points it at the field and keeps it out of the Tab sequence', async () => {
    const { input, decrease, increase } = await mountSpinButton();

    expect(decrease.attributes('aria-label')).toBe('Decrease Adults');
    expect(increase.attributes('aria-label')).toBe('Increase Adults');

    for (const button of [decrease, increase]) {
      expect(button.attributes('type')).toBe('button');
      expect(button.attributes('aria-controls')).toBe(input.attributes('id'));
      expect(button.attributes('tabindex')).toBe('-1');
      // The icon is decorative: the name is the label alone
      expect(button.get('.iconify, svg').attributes('aria-hidden')).toBe(
        'true',
      );
    }
  });

  it('sets aria-disabled, not disabled, on a button once its end of the range is reached', async () => {
    const { wrapper, input, decrease, increase } = await mountSpinButton({
      modelValue: 1,
    });

    expect(decrease.attributes('aria-disabled')).toBe('true');
    expect(decrease.attributes('disabled')).toBeUndefined();
    expect(increase.attributes('aria-disabled')).toBeUndefined();

    // Ignored: the value stays at the minimum
    await decrease.trigger('click');
    expect(input.element.value).toBe('1');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();

    await wrapper.setProps({ modelValue: 8 });
    expect(increase.attributes('aria-disabled')).toBe('true');
    expect(increase.attributes('disabled')).toBeUndefined();
    expect(decrease.attributes('aria-disabled')).toBeUndefined();

    await increase.trigger('click');
    expect(input.element.value).toBe('8');
  });

  it('is invalid for a number outside the range, with aria-invalid and the error once errors show', async () => {
    const { wrapper, input } = await mountSpinButton();

    await input.setValue('12');

    // The number reaches the model and the field holds its form back
    expect(model(wrapper)).toBe(12);
    expect(input.element.validity.valid).toBe(false);
    // Not shown yet: a field is described by its error only while it shows
    expect(input.attributes('aria-invalid')).toBeUndefined();
    expect(input.attributes('aria-describedby')).toBeUndefined();

    await wrapper.setProps({ showInvalid: true });

    expect(input.attributes('aria-invalid')).toBe('true');
    expect(
      document.getElementById(input.attributes('aria-describedby') ?? '')
        ?.textContent,
    ).toContain('Enter 8 or less');
    expect(await checkA11y()).toHaveNoViolations();

    await input.setValue('0');
    expect(input.element.validity.valid).toBe(false);
    expect(
      document.getElementById(input.attributes('aria-describedby') ?? '')
        ?.textContent,
    ).toContain('Enter 1 or more');

    await input.setValue('4');
    expect(input.element.validity.valid).toBe(true);
    expect(input.attributes('aria-invalid')).toBeUndefined();
    expect(input.attributes('aria-describedby')).toBeUndefined();
  });

  it('is invalid without a number when required, and described by its instruction', async () => {
    const { wrapper, input } = await mountSpinButton({
      modelValue: undefined,
      required: true,
      showInvalid: true,
      instruction: 'Everyone aged 12 or older',
    });

    expect(input.element.validity.valueMissing).toBe(true);
    expect(input.attributes('aria-invalid')).toBe('true');

    const [instruction, error] = (
      input.attributes('aria-describedby') ?? ''
    ).split(' ');
    expect(document.getElementById(instruction ?? '')?.textContent).toContain(
      'Everyone aged 12 or older',
    );
    expect(document.getElementById(error ?? '')?.textContent).toContain(
      'Adults is missing',
    );
    expect(await checkA11y()).toHaveNoViolations();

    await wrapper.setProps({ modelValue: 2 });
    expect(input.element.validity.valid).toBe(true);
    expect(input.attributes('aria-describedby')).toBe(instruction);
  });
});

describe('SpinButton: keyboard support', () => {
  it('increases the value by 1 with Arrow Up and decreases it by 1 with Arrow Down', async () => {
    const { wrapper, input } = await mountSpinButton();

    await input.trigger('keydown', { key: 'ArrowUp' });
    expect(input.element.value).toBe('3');
    expect(model(wrapper)).toBe(3);

    await input.trigger('keydown', { key: 'ArrowDown' });
    await input.trigger('keydown', { key: 'ArrowDown' });
    expect(input.element.value).toBe('1');
    expect(model(wrapper)).toBe(1);
    expect(wrapper.emitted('change')).toEqual([[3], [2], [1]]);
  });

  it('stops at the minimum and the maximum', async () => {
    const { wrapper, input } = await mountSpinButton({ modelValue: 1 });

    await input.trigger('keydown', { key: 'ArrowDown' });
    expect(input.element.value).toBe('1');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();

    await wrapper.setProps({ modelValue: 8 });
    await input.trigger('keydown', { key: 'ArrowUp' });
    expect(input.element.value).toBe('8');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('keeps the page from scrolling on its arrow keys, and leaves the text editing keys to the browser', async () => {
    const { wrapper, input } = await mountSpinButton({ modelValue: 4 });

    function press(init: KeyboardEventInit) {
      const event = new KeyboardEvent('keydown', {
        cancelable: true,
        ...init,
      });
      input.element.dispatchEvent(event);
      return event.defaultPrevented;
    }

    for (const key of ['ArrowUp', 'ArrowDown']) {
      expect(press({ key })).toBe(true);
    }

    for (const init of [
      { key: 'ArrowLeft' },
      { key: 'ArrowRight' },
      { key: 'Backspace' },
      { key: 'Delete' },
      { key: 'Tab' },
      { key: 'Enter' },
      { key: '5' },
      // Not the pattern's minimum and maximum: Home and End move the caret,
      // so a key pressed to edit the number does not set it to its maximum
      { key: 'Home' },
      { key: 'End' },
      // Selecting to the start or the end of the text, and a platform shortcut
      { key: 'Home', shiftKey: true },
      { key: 'End', shiftKey: true },
      { key: 'ArrowUp', metaKey: true },
      { key: 'ArrowDown', altKey: true },
    ]) {
      expect(press(init)).toBe(false);
    }

    // Only the two arrow keys changed the value
    expect(wrapper.emitted('update:modelValue')).toEqual([[5], [4]]);
  });

  it('counts from the minimum when the field is empty, and back into the range from a number outside it', async () => {
    const { wrapper, input } = await mountSpinButton({ modelValue: undefined });

    await input.trigger('keydown', { key: 'ArrowUp' });
    expect(input.element.value).toBe('1');

    await input.setValue('12');
    await input.trigger('keydown', { key: 'ArrowDown' });
    expect(input.element.value).toBe('8');
    expect(model(wrapper)).toBe(8);
    expect(input.element.validity.valid).toBe(true);
  });

  it('takes a typed number, and ignores a character that is not a digit', async () => {
    const { wrapper, input } = await mountSpinButton();

    // As typing does: an input event alone (setValue also sends a change)
    async function type(text: string) {
      input.element.value = text;
      await input.trigger('input');
    }

    await type('6');
    expect(model(wrapper)).toBe(6);

    await type('6a.-');
    expect(input.element.value).toBe('6');
    expect(model(wrapper)).toBe(6);

    // Final on blur or Enter: leading zeros go, and the parent hears of it
    await type('007');
    expect(input.element.value).toBe('007');
    expect(model(wrapper)).toBe(7);
    expect(wrapper.emitted('change')).toBeUndefined();

    await input.trigger('change');
    expect(input.element.value).toBe('7');
    expect(wrapper.emitted('change')).toEqual([[7]]);
  });
});

describe('SpinButton: buttons', () => {
  it('counts with the buttons and announces the new value in a live region that empties again', async () => {
    vi.useFakeTimers();
    const { wrapper, input, decrease, increase } = await mountSpinButton();
    const output = wrapper.get('output');

    // An output is a polite live region (the implicit role status)
    expect(output.text()).toBe('');

    await increase.trigger('click');
    expect(input.element.value).toBe('3');
    expect(model(wrapper)).toBe(3);
    expect(output.text()).toBe('3');

    await decrease.trigger('click');
    expect(input.element.value).toBe('2');
    expect(output.text()).toBe('2');
    expect(wrapper.emitted('change')).toEqual([[3], [2]]);

    await vi.advanceTimersByTimeAsync(2000);
    expect(output.text()).toBe('');
  });

  it('does not announce a value changed in the field itself, which the spinbutton reads', async () => {
    const { wrapper, input } = await mountSpinButton();

    await input.trigger('keydown', { key: 'ArrowUp' });
    await input.setValue('5');

    expect(wrapper.get('output').text()).toBe('');
  });

  it('disables the field and both buttons when disabled', async () => {
    const { wrapper, input, decrease, increase } = await mountSpinButton({
      disabled: true,
    });

    expect(input.attributes('disabled')).toBeDefined();
    expect(decrease.attributes('disabled')).toBeDefined();
    expect(increase.attributes('disabled')).toBeDefined();
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(await checkA11y()).toHaveNoViolations();
  });
});

describe('SpinButton: as a field', () => {
  it('puts an attribute on the input and a class on the wrapper', async () => {
    const wrapper = await mountSuspended(SpinButton, {
      props: { label: 'Adults', modelValue: 2 },
      attrs: { 'data-test': 'adults', class: 'wide' },
      attachTo: document.body,
    });

    expect(wrapper.get('input').attributes('data-test')).toBe('adults');
    expect(wrapper.get('.form-field-wrapper').classes()).toContain('wide');
    expect(wrapper.get('input').classes()).not.toContain('wide');
  });

  it('shows a custom error, and is described by it, until its value changes', async () => {
    const { wrapper, input, increase } = await mountSpinButton({
      instruction: 'Everyone aged 12 or older',
      customError: 'Only 2 places left',
    });

    expect(description(input)).toBe(
      'Everyone aged 12 or older Only 2 places left',
    );
    expect(input.attributes('aria-invalid')).toBe('true');
    // The server judges the next submit: the browser does not hold it back
    expect(input.element.checkValidity()).toBe(true);
    expect(await checkA11y()).toHaveNoViolations();

    await input.setValue('3');
    expect(description(input)).toBe('Everyone aged 12 or older');
    expect(input.attributes('aria-invalid')).toBeUndefined();

    // Set again by the parent, and cleared by a button too
    await wrapper.setProps({ customError: 'Only 1 place left' });
    expect(description(input)).toBe(
      'Everyone aged 12 or older Only 1 place left',
    );
    await increase.trigger('click');
    expect(description(input)).toBe('Everyone aged 12 or older');
  });
});
