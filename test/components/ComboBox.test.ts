import { describe, it, expect, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { ComboBox } from '#components';
import {
  accessibleName,
  description,
  expectFocused,
  expectNoViolations,
  roleOf,
} from '../a11y';
import { expectConsole } from '../console';
import { addToPage, leave, press } from '../dom';
import { mountInForm } from '../form';

/**
 * The rows of the two tables of the APG example "Editable Combobox With List
 * Autocomplete" (https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/):
 * the roles, states and properties and the keyboard support. Then each place
 * where ComboBox leaves the pattern, as its docblock lists them, the field it
 * shares with the other fields, its form and its loading.
 */
const options = [
  { value: 'cheese', label: 'Cheese' },
  { value: 'ham', label: 'Ham' },
  { value: 'jalapenos', label: 'Jalapeños' },
];

async function mountComboBox(props: Record<string, unknown> = {}) {
  const emitted: string[] = [];
  // An option found on mount is given before `wrapper` is there
  const mounted: { setProps?: (props: Record<string, unknown>) => unknown } =
    {};
  const wrapper = await mountSuspended(ComboBox, {
    props: {
      label: 'Topping',
      options,
      modelValue: null,
      'onUpdate:modelValue': (value: unknown) => {
        emitted.push(`value ${JSON.stringify(value)}`);
        mounted.setProps?.({ modelValue: value });
      },
      'onUpdate:selected': (option: unknown) => {
        emitted.push(`selected ${JSON.stringify(option)}`);
        mounted.setProps?.({ selected: option });
      },
      ...props,
    } as never,
    attachTo: document.body,
  });
  mounted.setProps = (props) => wrapper.setProps(props as never);
  await nextTick();

  const input = wrapper.get<HTMLInputElement>('input[role="combobox"]');
  /** What mounting emitted: the option of a value, found in the list */
  const emittedOnMount = emitted.splice(0);

  return {
    wrapper,
    input,
    emitted,
    emittedOnMount,
    /** The labels of the options in the list */
    labels: () =>
      wrapper.findAll('[role="option"]').map((option) => option.text()),
    option: (label: string) => {
      const found = wrapper
        .findAll('[role="option"]')
        .find((option) => option.text() === label);
      if (!found) throw new Error(`No option ${label}`);
      return found;
    },
    /** The label of the option aria-activedescendant names */
    highlighted: () => {
      const id = input.attributes('aria-activedescendant');
      return id
        ? (document.getElementById(id)?.textContent?.trim() ?? null)
        : null;
    },
    button: (name: string) =>
      wrapper
        .findAll('button')
        .find((button) => accessibleName(button) === name),
    status: () => wrapper.get('[role="status"]').text(),
    popupText: () => wrapper.get('.combobox-popup').text(),
  };
}

type Mounted = Awaited<ReturnType<typeof mountComboBox>>;

/** Types into the field, as the user's own edit */
async function type(input: Mounted['input'], text: string) {
  input.element.focus();
  input.element.value = text;
  await input.trigger('input');
}

/** Focus leaves the component for another element of the page */
async function leaveField(input: Mounted['input']) {
  const next = addToPage('<button type="button">Next</button>');
  leave(input.element, next);
  await nextTick();
}

/** A press on the page, outside the component */
async function pressOutside() {
  document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  await nextTick();
}

/** Waits `ms`, on the fake clock once a test turned it on */
async function pause(ms = 10) {
  if (vi.isFakeTimers()) await vi.advanceTimersByTimeAsync(ms);
  else await new Promise((resolve) => setTimeout(resolve, ms));
  await nextTick();
}

describe('ComboBox: roles, states and properties', () => {
  it('is a text field with the combobox role, named by its label, with no accessibility violations', async () => {
    const { wrapper, input } = await mountComboBox();

    expect(input.attributes('type')).toBe('text');
    expect(roleOf(input)).toBe('combobox');
    expect(wrapper.get('label').attributes('for')).toBe(input.attributes('id'));
    expect(accessibleName(input)).toBe('Topping');
    expect(input.attributes('aria-autocomplete')).toBe('list');
    await expectNoViolations();
  });

  it('has aria-expanded false and no aria-controls while the list is closed', async () => {
    const { input } = await mountComboBox();

    expect(input.attributes('aria-expanded')).toBe('false');
    expect(input.attributes('aria-controls')).toBeUndefined();
  });

  it('has aria-expanded true and aria-controls to a listbox of options while it is open', async () => {
    const { wrapper, input, labels } = await mountComboBox();

    await input.trigger('click');

    expect(input.attributes('aria-expanded')).toBe('true');
    const listbox = wrapper.get('[role="listbox"]');
    expect(input.attributes('aria-controls')).toBe(listbox.attributes('id'));
    expect(labels()).toEqual(['Cheese', 'Ham', 'Jalapeños']);
    await expectNoViolations();
  });

  it('names the listbox and the open button by the label, without the required chip', async () => {
    const { wrapper, input, button } = await mountComboBox({ required: true });

    await input.trigger('click');

    expect(accessibleName(wrapper.get('[role="listbox"]'))).toBe('Topping');
    const openButton = button('Topping')!;
    expect(openButton.attributes('type')).toBe('button');
    expect(openButton.attributes('tabindex')).toBe('-1');
    expect(openButton.attributes('aria-expanded')).toBe('true');
    expect(openButton.attributes('aria-controls')).toBe(
      input.attributes('aria-controls'),
    );
  });

  it('names the highlighted option in aria-activedescendant, and removes it without a highlight', async () => {
    const { input, highlighted } = await mountComboBox();
    input.element.focus();

    expect(input.attributes('aria-activedescendant')).toBeUndefined();

    await press('ArrowDown');
    expect(highlighted()).toBe('Cheese');

    await press('ArrowLeft');
    expect(input.attributes('aria-activedescendant')).toBeUndefined();
  });

  it('is named by its label alone, with and without a value, plus "required" when it is', async () => {
    const { wrapper, input } = await mountComboBox({ modelValue: 'ham' });

    expect(input.element.value).toBe('Ham');
    expect(accessibleName(input)).toBe('Topping');

    await wrapper.setProps({ required: true });
    expect(accessibleName(input)).toBe('Topping required');
    expect(input.attributes('aria-required')).toBe('true');
    await expectNoViolations();
  });
});

describe('ComboBox: keyboard support', () => {
  it('Down Arrow opens the list and goes to the first option, Up Arrow to the last', async () => {
    const down = await mountComboBox();
    down.input.element.focus();

    const event = await press('ArrowDown');

    expect(event.defaultPrevented).toBe(true);
    expect(down.input.attributes('aria-expanded')).toBe('true');
    expect(down.highlighted()).toBe('Cheese');
    down.wrapper.unmount();

    const up = await mountComboBox();
    up.input.element.focus();
    await press('ArrowUp');

    expect(up.input.attributes('aria-expanded')).toBe('true');
    expect(up.highlighted()).toBe('Jalapeños');
  });

  it('Alt + Down Arrow opens the list without a highlight, also with a value', async () => {
    const { input } = await mountComboBox({ modelValue: 'ham' });
    input.element.focus();

    await press('ArrowDown', { altKey: true });

    expect(input.attributes('aria-expanded')).toBe('true');
    expect(input.attributes('aria-activedescendant')).toBeUndefined();
  });

  it('Down Arrow on the last option goes to the first, Up Arrow on the first to the last', async () => {
    const { input, highlighted } = await mountComboBox();
    input.element.focus();

    await press('ArrowUp');
    expect(highlighted()).toBe('Jalapeños');

    await press('ArrowDown');
    expect(highlighted()).toBe('Cheese');

    await press('ArrowUp');
    expect(highlighted()).toBe('Jalapeños');
  });

  it('Enter picks the highlighted option, closes the list and does not submit', async () => {
    const { wrapper, input } = await mountComboBox();
    input.element.focus();
    await press('ArrowDown');
    await press('ArrowDown');

    const event = await press('Enter');

    expect(event.defaultPrevented).toBe(true);
    expect(wrapper.props('modelValue')).toBe('ham');
    expect(input.element.value).toBe('Ham');
    expect(input.attributes('aria-expanded')).toBe('false');
    expectFocused(input);
  });

  it('Enter with the list closed is left to the form', async () => {
    const { input } = await mountComboBox();
    input.element.focus();

    const event = await press('Enter');

    expect(event.defaultPrevented).toBe(false);
  });

  it('Escape closes the list and is stopped there; with the list closed it goes on', async () => {
    const { wrapper, input } = await mountComboBox();
    const seen: string[] = [];
    const listener = (event: Event) => seen.push((event as KeyboardEvent).key);
    document.body.addEventListener('keydown', listener);
    input.element.focus();
    await press('ArrowDown');

    const open = await press('Escape');

    expect(open.defaultPrevented).toBe(true);
    expect(seen).not.toContain('Escape');
    expect(input.attributes('aria-expanded')).toBe('false');
    expect(wrapper.props('modelValue')).toBeNull();

    const closed = await press('Escape');

    expect(closed.defaultPrevented).toBe(false);
    expect(seen).toContain('Escape');
    document.body.removeEventListener('keydown', listener);
  });

  it('Tab and Shift + Tab pick the highlighted option; without a highlight they leave the value', async () => {
    const tab = await mountComboBox();
    tab.input.element.focus();
    await press('ArrowDown');
    const event = await press('Tab');

    expect(event.defaultPrevented).toBe(false);
    expect(tab.wrapper.props('modelValue')).toBe('cheese');
    tab.wrapper.unmount();

    const shiftTab = await mountComboBox();
    shiftTab.input.element.focus();
    await press('ArrowUp');
    await press('Tab', { shiftKey: true });

    expect(shiftTab.wrapper.props('modelValue')).toBe('jalapenos');
    shiftTab.wrapper.unmount();

    const none = await mountComboBox({ modelValue: 'ham' });
    none.input.element.focus();
    await press('ArrowDown', { altKey: true });
    await press('Tab');

    expect(none.wrapper.props('modelValue')).toBe('ham');
    expect(none.emitted).toEqual([]);
  });

  it.each(['ArrowLeft', 'ArrowRight', 'Home', 'End'])(
    '%s leaves the caret to the text field and takes the highlight away',
    async (key) => {
      const { input, highlighted } = await mountComboBox();
      input.element.focus();
      await press('ArrowDown');
      expect(highlighted()).toBe('Cheese');

      const event = await press(key);

      expect(event.defaultPrevented).toBe(false);
      expect(input.attributes('aria-activedescendant')).toBeUndefined();
      expect(input.attributes('aria-expanded')).toBe('true');
    },
  );

  it('typing opens the list with the options that match, and highlights none', async () => {
    const { wrapper, input, labels } = await mountComboBox();

    await type(input, 'ha');

    expect(input.attributes('aria-expanded')).toBe('true');
    expect(labels()).toEqual(['Ham']);
    expect(input.attributes('aria-activedescendant')).toBeUndefined();

    // Enter without a highlight only closes: a search is not a choice
    const event = await press('Enter');

    expect(event.defaultPrevented).toBe(true);
    expect(input.attributes('aria-expanded')).toBe('false');
    expect(wrapper.props('modelValue')).toBeNull();
  });

  it('leaves the keys to an input method that composes a character', async () => {
    const { wrapper, input } = await mountComboBox();
    input.element.focus();
    await press('ArrowDown');

    const event = await press('Enter', { isComposing: true });

    expect(event.defaultPrevented).toBe(false);
    expect(wrapper.props('modelValue')).toBeNull();
    expect(input.attributes('aria-expanded')).toBe('true');
  });

  it('Down Arrow and Up Arrow do nothing while there are no options to show', async () => {
    const { input, popupText } = await mountComboBox();
    await type(input, 'xyz');

    await press('ArrowDown');
    await press('ArrowUp');

    expect(input.attributes('aria-activedescendant')).toBeUndefined();
    expect(popupText()).toBe('No options match your search');
  });
});

describe('ComboBox: the pointer', () => {
  it('a click in the text field opens the list, and a click while it is open closes it', async () => {
    const { input } = await mountComboBox();

    await input.trigger('click');
    expect(input.attributes('aria-expanded')).toBe('true');

    await input.trigger('click');
    expect(input.attributes('aria-expanded')).toBe('false');
  });

  it('does not open on focus alone', async () => {
    const { input } = await mountComboBox();

    input.element.focus();
    await nextTick();

    expect(input.attributes('aria-expanded')).toBe('false');
  });

  it('the open button opens and closes the list, with focus in the text field', async () => {
    const { input, button } = await mountComboBox();

    await button('Topping')!.trigger('click');

    expect(input.attributes('aria-expanded')).toBe('true');
    expectFocused(input);

    await button('Topping')!.trigger('click');
    expect(input.attributes('aria-expanded')).toBe('false');
  });

  it('a click on an option picks it: the option first, then the value', async () => {
    const { wrapper, input, option, emitted } = await mountComboBox();
    await input.trigger('click');

    await option('Ham').trigger('click');

    expect(emitted).toEqual([
      'selected {"value":"ham","label":"Ham"}',
      'value "ham"',
    ]);
    expect(wrapper.props('modelValue')).toBe('ham');
    expect(input.element.value).toBe('Ham');
    expect(input.attributes('aria-expanded')).toBe('false');
  });

  it('hover leaves the highlight where the arrow keys put it', async () => {
    const { input, option, highlighted } = await mountComboBox();
    input.element.focus();
    await press('ArrowDown');

    await option('Ham').trigger('mouseenter');
    await option('Ham').trigger('mouseover');
    await option('Ham').trigger('mousemove');

    expect(highlighted()).toBe('Cheese');
  });
});

describe('ComboBox: where it leaves the pattern', () => {
  it('marks the value in aria-selected, not the highlight', async () => {
    const { wrapper, input, highlighted } = await mountComboBox({
      modelValue: 'ham',
    });
    input.element.focus();
    await press('ArrowDown');
    await press('ArrowDown');

    expect(highlighted()).toBe('Jalapeños');
    expect(
      wrapper
        .findAll('[role="option"]')
        .map((option) => option.attributes('aria-selected')),
    ).toEqual(['false', 'true', 'false']);
    await expectNoViolations();
  });

  it('opens the list whole with a value in the field, and shortens it only after typing', async () => {
    const { input, labels } = await mountComboBox({ modelValue: 'ham' });

    await input.trigger('click');
    expect(labels()).toEqual(['Cheese', 'Ham', 'Jalapeños']);

    await type(input, 'e');
    expect(labels()).toEqual(['Cheese', 'Jalapeños']);
  });

  it('matches a label that contains the text, ignoring case and diacritics', async () => {
    const { input, labels } = await mountComboBox();

    await type(input, 'PENO');

    expect(labels()).toEqual(['Jalapeños']);
  });

  it('starts the highlight on the selected option when the arrow keys open the list', async () => {
    const { input, highlighted } = await mountComboBox({ modelValue: 'ham' });
    input.element.focus();

    await press('ArrowDown');
    expect(highlighted()).toBe('Ham');

    await press('ArrowDown');
    expect(highlighted()).toBe('Jalapeños');
  });

  it('shows the label again when focus leaves text that was not picked, and never changes the value while typing', async () => {
    const { wrapper, input, emitted } = await mountComboBox({
      modelValue: 'ham',
    });

    await type(input, 'che');
    expect(emitted).toEqual([]);

    await leaveField(input);

    expect(input.element.value).toBe('Ham');
    expect(input.attributes('aria-expanded')).toBe('false');
    expect(wrapper.props('modelValue')).toBe('ham');
    expect(emitted).toEqual([]);
  });

  it('clears the value with null when focus leaves a field the user emptied, and says so', async () => {
    const { wrapper, input, emitted, status } = await mountComboBox({
      modelValue: 'ham',
    });

    await type(input, '');
    expect(emitted).toEqual([]);

    await leaveField(input);
    await pause();

    expect(emitted).toEqual(['selected null', 'value null']);
    expect(wrapper.props('modelValue')).toBeNull();
    expect(input.element.value).toBe('');
    expect(status()).toBe('Value cleared');
  });

  it('puts the label back in an emptied field without can-clear', async () => {
    const { wrapper, input, emitted } = await mountComboBox({
      modelValue: 'ham',
      canClear: false,
    });

    await type(input, '');
    await leaveField(input);

    expect(input.element.value).toBe('Ham');
    expect(wrapper.props('modelValue')).toBe('ham');
    expect(emitted).toEqual([]);
  });

  it('keeps focus moves between the text field and its buttons from settling the field', async () => {
    const { input, button } = await mountComboBox({ modelValue: 'ham' });
    await type(input, 'che');

    leave(input.element, button('Clear Topping')!.element);
    await nextTick();

    expect(input.element.value).toBe('che');
  });

  it('settles on a press outside, which picks nothing', async () => {
    const { wrapper, input, emitted } = await mountComboBox({
      modelValue: 'ham',
    });
    input.element.focus();
    await press('ArrowDown');
    await press('ArrowDown');

    await pressOutside();

    expect(input.attributes('aria-expanded')).toBe('false');
    expect(wrapper.props('modelValue')).toBe('ham');
    expect(emitted).toEqual([]);
  });

  it('Escape puts the label of the selected option back', async () => {
    const { wrapper, input } = await mountComboBox({ modelValue: 'ham' });
    await type(input, 'che');

    await press('Escape');

    expect(input.element.value).toBe('Ham');
    expect(wrapper.props('modelValue')).toBe('ham');
  });

  it('only closes the list when the selected option is picked again', async () => {
    const { wrapper, input, option, emitted } = await mountComboBox({
      modelValue: 'ham',
    });
    await input.trigger('click');

    await option('Ham').trigger('click');

    expect(input.attributes('aria-expanded')).toBe('false');
    expect(wrapper.props('modelValue')).toBe('ham');
    expect(emitted).toEqual([]);
  });

  it('keeps a value that has no option, and shows "Unknown option" with a clear button', async () => {
    const { wrapper, input, emitted, button } = await mountComboBox({
      modelValue: 'salami',
    });

    expect(input.element.value).toBe('Unknown option');
    expect(wrapper.props('modelValue')).toBe('salami');
    expect(button('Clear Topping')).toBeDefined();

    input.element.focus();
    await leaveField(input);

    expect(wrapper.props('modelValue')).toBe('salami');
    expect(emitted).toEqual([]);
  });

  it('takes false and 0 as values: a label, a clear button and a place in the FormData', async () => {
    const no = await mountComboBox({
      modelValue: false,
      name: 'sample',
      options: [
        { value: false, label: 'None' },
        { value: true, label: 'Every page' },
      ],
    });

    expect(no.input.element.value).toBe('None');
    expect(no.button('Clear Topping')).toBeDefined();
    expect(no.wrapper.get('input[type="hidden"]').attributes('value')).toBe(
      'false',
    );
    expect(no.wrapper.classes()).toContain('has-value');
    no.wrapper.unmount();

    const zero = await mountComboBox({
      modelValue: 0,
      name: 'amount',
      options: [0, 1, 2],
    });

    expect(zero.input.element.value).toBe('0');
    expect(zero.wrapper.get('input[type="hidden"]').attributes('value')).toBe(
      '0',
    );
  });

  it('is empty without a v-model: no label, no clear button, no "Unknown option"', async () => {
    const wrapper = await mountSuspended(ComboBox, {
      props: { label: 'Topping', options, name: 'topping' } as never,
      attachTo: document.body,
    });

    expect(
      wrapper.get<HTMLInputElement>('input[role="combobox"]').element.value,
    ).toBe('');
    expect(wrapper.find('.combobox-clear').exists()).toBe(false);
    expect(wrapper.find('input[type="hidden"]').exists()).toBe(false);
    expect(wrapper.classes()).not.toContain('has-value');
  });

  it('has a clear button named by the label, which clears with null and moves focus to the text field', async () => {
    const { wrapper, input, emitted, button } = await mountComboBox({
      modelValue: 'ham',
    });
    const clear = button('Clear Topping')!;

    expect(clear.attributes('type')).toBe('button');
    expect(clear.attributes('tabindex')).toBeUndefined();

    await clear.trigger('click');

    expect(emitted).toEqual(['selected null', 'value null']);
    expect(wrapper.props('modelValue')).toBeNull();
    expect(input.element.value).toBe('');
    expectFocused(input);
    expect(button('Clear Topping')).toBeUndefined();
  });

  it('shows the clear button for text alone, and not without can-clear', async () => {
    const withText = await mountComboBox();
    expect(withText.button('Clear Topping')).toBeUndefined();

    await type(withText.input, 'ha');
    expect(withText.button('Clear Topping')).toBeDefined();
    withText.wrapper.unmount();

    const without = await mountComboBox({ modelValue: 'ham', canClear: false });
    expect(without.button('Clear Topping')).toBeUndefined();
  });

  it('is a disabled combobox when disabled: no clear button, a disabled open button and hidden input', async () => {
    const { wrapper, input, button } = await mountComboBox({
      modelValue: 'ham',
      name: 'topping',
      disabled: true,
    });

    expect(roleOf(input)).toBe('combobox');
    expect(input.element.disabled).toBe(true);
    expect(button('Clear Topping')).toBeUndefined();
    expect(button('Topping')!.element.disabled).toBe(true);
    expect(
      wrapper.get<HTMLInputElement>('input[type="hidden"]').element.disabled,
    ).toBe(true);
    await expectNoViolations();
  });
});

describe('ComboBox: the field', () => {
  it('is described by its instruction, and by its error only while the error shows', async () => {
    const { wrapper, input } = await mountComboBox({
      required: true,
      instruction: 'One per pizza',
    });

    expect(description(input)).toBe('One per pizza');
    expect(input.attributes('aria-invalid')).toBeUndefined();

    await wrapper.setProps({ showInvalid: true });

    expect(description(input)).toBe('One per pizza Topping is missing');
    expect(input.attributes('aria-invalid')).toBe('true');
    await expectNoViolations();

    await wrapper.setProps({ modelValue: 'ham' });

    expect(description(input)).toBe('One per pizza');
    expect(input.attributes('aria-invalid')).toBeUndefined();
  });

  it('shows a custom error, and is described by it, until its value changes', async () => {
    const { input, option } = await mountComboBox({
      modelValue: 'ham',
      customError: 'Ham is sold out',
    });

    expect(description(input)).toBe('Ham is sold out');
    expect(input.attributes('aria-invalid')).toBe('true');
    await expectNoViolations();

    await input.trigger('click');
    await option('Cheese').trigger('click');

    expect(description(input)).toBe('');
    expect(input.attributes('aria-invalid')).toBeUndefined();
  });

  it('puts an attribute on the text field and a class and style on the wrapper', async () => {
    const wrapper = await mountSuspended(ComboBox, {
      props: { label: 'Topping', options, modelValue: 'ham' } as never,
      attrs: { 'data-test': 'topping', class: 'wide', style: 'color: red' },
      attachTo: document.body,
    });

    const input = wrapper.get('[data-test="topping"]');
    expect(roleOf(input)).toBe('combobox');
    expect(input.classes()).not.toContain('wide');
    expect(wrapper.classes()).toContain('wide');
    expect(wrapper.classes()).toContain('has-value');
    expect(wrapper.attributes('style')).toContain('color: red');
  });

  it('keeps its label, texts and list to itself next to another ComboBox', async () => {
    await mountSuspended(
      defineComponent({
        setup: () => () => [
          h(ComboBox, {
            label: 'Pizza',
            options,
            instruction: 'On the pizza',
          } as never),
          h(ComboBox, {
            label: 'Sandwich',
            options,
            instruction: 'On the sandwich',
          } as never),
        ],
      }),
      { attachTo: document.body },
    );
    await nextTick();

    const comboboxes = Array.from(
      document.querySelectorAll<HTMLElement>('input[role="combobox"]'),
    );
    expect(comboboxes.map((combobox) => accessibleName(combobox))).toEqual([
      'Pizza',
      'Sandwich',
    ]);
    expect(comboboxes.map((combobox) => description(combobox))).toEqual([
      'On the pizza',
      'On the sandwich',
    ]);

    for (const combobox of comboboxes) combobox.click();
    await nextTick();

    const listboxes = comboboxes.map((combobox) =>
      combobox.getAttribute('aria-controls'),
    );
    expect(listboxes.every(Boolean)).toBe(true);
    expect(new Set(listboxes).size).toBe(2);
    await expectNoViolations();
  });

  it('exposes focusElement(), which focuses the text field', async () => {
    const { wrapper, input } = await mountComboBox();

    (wrapper.vm as unknown as { focusElement: () => void }).focusElement();

    expectFocused(input);
  });
});

describe('ComboBox: in a form', () => {
  async function mountForm(props: Record<string, unknown> = {}) {
    const submitted: Record<string, unknown>[] = [];
    const model = { value: (props.modelValue ?? null) as unknown };
    const wrapper = await mountInForm(
      () => [
        h(ComboBox, {
          label: 'Topping',
          name: 'topping',
          options,
          ...props,
          modelValue: model.value,
          'onUpdate:modelValue': (value: unknown) => {
            model.value = value;
            wrapper.vm.$forceUpdate();
          },
        } as never),
      ],
      {
        onSubmit: (data: FormData) =>
          submitted.push(Object.fromEntries(data.entries())),
      },
    );
    await nextTick();

    return {
      wrapper,
      submitted,
      model,
      input: wrapper.get<HTMLInputElement>('input[role="combobox"]'),
      submit: async () => {
        await wrapper.get('form').trigger('submit');
        await flushPromises();
      },
    };
  }

  it('puts the value of the option in the FormData under its name, not the label', async () => {
    const { submitted, submit } = await mountForm({ modelValue: 'ham' });

    await submit();

    expect(submitted).toEqual([{ topping: 'ham' }]);
  });

  it('has no key in the FormData without a value', async () => {
    const { submitted, submit } = await mountForm();

    await submit();

    expect(submitted).toEqual([{}]);
  });

  it('fails the submit of a required field without a value, with its error and focus on the text field', async () => {
    const { input, submitted, submit } = await mountForm({ required: true });

    await submit();

    expect(submitted).toEqual([]);
    expect(input.attributes('aria-invalid')).toBe('true');
    expect(description(input)).toBe('Topping is missing');
    expectFocused(input);
  });

  it('fails the submit of a required field that holds text that was not picked', async () => {
    const { input, submitted, submit } = await mountForm({ required: true });
    await type(input, 'ha');

    await submit();

    expect(submitted).toEqual([]);
    expect(input.element.value).toBe('');
    expect(input.attributes('aria-invalid')).toBe('true');
  });

  it('settles before the submit: an emptied field submits no value', async () => {
    const { input, submitted, model, submit } = await mountForm({
      modelValue: 'ham',
    });
    await type(input, '');

    await submit();

    expect(model.value).toBeNull();
    expect(submitted).toEqual([{}]);
  });

  it('settles before the submit: text that was not picked submits the value the field shows again', async () => {
    const { input, submitted, submit } = await mountForm({ modelValue: 'ham' });
    await type(input, 'che');

    await submit();

    expect(input.element.value).toBe('Ham');
    expect(submitted).toEqual([{ topping: 'ham' }]);
  });
});

describe('ComboBox: options from a function', () => {
  function loader(answers: (() => unknown[])[] = []) {
    const calls: string[] = [];
    const options = vi.fn(async (query: string) => {
      calls.push(query);
      const answer = answers.shift();
      return answer
        ? answer()
        : [
            { value: 'cheese', label: 'Cheese' },
            { value: 'ham', label: 'Ham' },
          ];
    });
    return { options, calls };
  }

  const fail = () => {
    throw new Error('The request failed');
  };

  it('asks nothing on mount with the selected option, and shows its label', async () => {
    const { options, calls } = loader();
    const { input } = await mountComboBox({
      options,
      modelValue: 'ham',
      selected: { value: 'ham', label: 'Ham' },
    });
    await flushPromises();

    expect(calls).toHaveLength(0);
    expect(input.element.value).toBe('Ham');
  });

  it('asks once when the field is first touched, and not again for a list that has options', async () => {
    const { options, calls } = loader();
    const { input, labels } = await mountComboBox({ options });

    input.element.focus();
    await flushPromises();
    expect(calls).toEqual(['']);

    await input.trigger('click');
    expect(labels()).toEqual(['Cheese', 'Ham']);

    await press('Escape');
    await input.trigger('click');
    await flushPromises();

    expect(calls).toHaveLength(1);
  });

  it('asks at once for a value without its option, keeps the value while the label loads and gives the option', async () => {
    let answer: (options: unknown[]) => void = () => {};
    const options = vi.fn(
      () => new Promise<unknown[]>((resolve) => (answer = resolve)),
    );
    const { wrapper, input, emitted } = await mountComboBox({
      options,
      modelValue: 'ham',
    });

    expect(options).toHaveBeenCalledTimes(1);
    expect(input.element.value).toBe('');

    // Tab through a field whose label has not loaded yet
    input.element.focus();
    await leaveField(input);
    expect(wrapper.props('modelValue')).toBe('ham');
    expect(emitted).toEqual([]);

    answer([{ value: 'ham', label: 'Ham' }]);
    await flushPromises();

    expect(options).toHaveBeenCalledTimes(1);
    expect(input.element.value).toBe('Ham');
    expect(emitted).toEqual(['selected {"value":"ham","label":"Ham"}']);
  });

  it('ignores a selected option that is not the value', async () => {
    const { input } = await mountComboBox({
      modelValue: 'ham',
      selected: { value: 'cheese', label: 'Cheese' },
    });

    expect(input.element.value).toBe('Ham');
  });

  it('asks again on the next open after a failure, and after an empty answer', async () => {
    expectConsole('error', /The options function failed/);
    const { options, calls } = loader([fail, () => []]);
    const { input, labels, popupText } = await mountComboBox({ options });

    await input.trigger('click');
    await flushPromises();
    expect(calls).toHaveLength(1);
    expect(popupText()).toBe(
      'The options could not be loaded. Open the list again to retry.',
    );

    // A keystroke filters in the browser: a failing endpoint is not asked per letter
    input.element.value = 'h';
    await input.trigger('input');
    await flushPromises();
    expect(calls).toHaveLength(1);

    await input.trigger('click');
    await input.trigger('click');
    await flushPromises();
    expect(calls).toHaveLength(2);
    expect(popupText()).toBe('There are no options');

    await input.trigger('click');
    await input.trigger('click');
    await flushPromises();
    expect(calls).toHaveLength(3);
    expect(labels()).toEqual(['Cheese', 'Ham']);
  });

  it('asks again for a new options-key and through refreshOptions(), not for a new function', async () => {
    const { options, calls } = loader();
    const { wrapper, input } = await mountComboBox({ options });
    input.element.focus();
    await flushPromises();
    expect(calls).toHaveLength(1);

    await wrapper.setProps({ options: (query: string) => options(query) });
    await input.trigger('click');
    await flushPromises();
    expect(calls).toHaveLength(1);

    await wrapper.setProps({ optionsKey: 2 });
    await flushPromises();
    expect(calls).toHaveLength(2);

    await (
      wrapper.vm as unknown as { refreshOptions: () => Promise<void> }
    ).refreshOptions();
    expect(calls).toHaveLength(3);
  });

  it('asks again when the options change from an array to a function', async () => {
    const { options, calls } = loader();
    const { wrapper, input, labels } = await mountComboBox();
    await input.trigger('click');
    expect(labels()).toHaveLength(3);

    await wrapper.setProps({ options });
    await flushPromises();

    expect(calls).toHaveLength(1);
    expect(labels()).toEqual(['Cheese', 'Ham']);
  });
});

describe('ComboBox: the states of the list', () => {
  it('has its status element before the list opens', async () => {
    const { wrapper, status } = await mountComboBox();

    expect(wrapper.find('[role="status"]').exists()).toBe(true);
    expect(status()).toBe('');
  });

  it.each([
    {
      state: 'loading',
      props: { options: () => new Promise<never>(() => {}) },
      text: 'Loading options…',
    },
    {
      state: 'failed',
      props: { options: () => Promise.reject(new Error('failed')) },
      text: 'The options could not be loaded. Open the list again to retry.',
      logs: /The options function failed/,
    },
    { state: 'empty', props: { options: [] }, text: 'There are no options' },
    {
      state: 'empty, with no-options-text',
      props: { options: [], noOptionsText: 'No toppings yet' },
      text: 'No toppings yet',
    },
  ])(
    '$state: a text in the popup and in the status, no listbox and aria-expanded false',
    async ({ props, text, logs }) => {
      if (logs) expectConsole('error', logs);
      const { wrapper, input, popupText, status } = await mountComboBox(props);

      await input.trigger('click');
      await flushPromises();
      await pause();

      expect(popupText()).toBe(text);
      expect(status()).toBe(text);
      expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
      expect(input.attributes('aria-expanded')).toBe('false');
      expect(input.attributes('aria-controls')).toBeUndefined();
      await expectNoViolations();
    },
  );

  it('no results: the text after a pause in typing, no listbox and aria-expanded false', async () => {
    const { wrapper, input, popupText, status } = await mountComboBox();
    vi.useFakeTimers();

    await type(input, 'xyz');

    expect(popupText()).toBe('No options match your search');
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(input.attributes('aria-expanded')).toBe('false');
    expect(status()).toBe('');

    vi.advanceTimersByTime(600);
    await nextTick();

    expect(status()).toBe('No options match your search');
    vi.useRealTimers();
    await expectNoViolations();
  });

  it('says the number of results after a pause in typing', async () => {
    const { input, status } = await mountComboBox();
    vi.useFakeTimers();

    await type(input, 'e');
    vi.advanceTimersByTime(600);
    await nextTick();
    expect(status()).toBe('2 options');

    await type(input, 'ham');
    vi.advanceTimersByTime(600);
    await nextTick();
    expect(status()).toBe('1 option');
  });

  it('Escape and Enter on a popup without options close it and are not passed on', async () => {
    const { wrapper, input } = await mountComboBox();
    await type(input, 'xyz');

    const enter = await press('Enter');
    expect(enter.defaultPrevented).toBe(true);
    expect(wrapper.find('.combobox-message').exists()).toBe(false);

    await type(input, 'xyz');
    const escape = await press('Escape');
    expect(escape.defaultPrevented).toBe(true);
    expect(wrapper.find('.combobox-message').exists()).toBe(false);
  });
});

describe('ComboBox: what the review found', () => {
  it('says the result of a load that arrives after the pause in typing', async () => {
    let answer: (options: unknown[]) => void = () => {};
    const { input, status } = await mountComboBox({
      options: () => new Promise<unknown[]>((resolve) => (answer = resolve)),
    });
    vi.useFakeTimers();

    await type(input, 'h');
    await pause(650);
    expect(status()).toBe('Loading options…');

    answer(options);
    await flushPromises();
    await pause();

    expect(status()).toBe('2 options');
  });

  it('says the failure of a load that arrives after the pause in typing', async () => {
    expectConsole('error', /The options function failed/);
    let fail: (error: Error) => void = () => {};
    const { input, status } = await mountComboBox({
      options: () => new Promise<unknown[]>((_, reject) => (fail = reject)),
    });
    vi.useFakeTimers();

    await type(input, 'h');
    await pause(650);
    expect(status()).toBe('Loading options…');

    fail(new Error('failed'));
    await flushPromises();
    await pause();

    expect(status()).toBe(
      'The options could not be loaded. Open the list again to retry.',
    );
  });

  it('empties v-model:selected when the parent empties the value', async () => {
    const { wrapper, emitted } = await mountComboBox({
      modelValue: 'ham',
      selected: { value: 'ham', label: 'Ham' },
    });

    await wrapper.setProps({ modelValue: null } as never);

    expect(emitted).toEqual(['selected null']);
  });

  it('empties v-model:selected when the parent sets a value the list has no option for', async () => {
    const { wrapper, input, emitted } = await mountComboBox({
      modelValue: 'ham',
      selected: { value: 'ham', label: 'Ham' },
    });

    await wrapper.setProps({ modelValue: 'salami' } as never);
    await nextTick();

    expect(input.element.value).toBe('Unknown option');
    expect(emitted).toEqual(['selected null']);
  });

  it('empties v-model:selected for such a value only once the list has loaded', async () => {
    let answer!: (list: typeof options) => void;
    const { wrapper, emitted } = await mountComboBox({
      options: () => new Promise((resolve) => (answer = resolve)),
      modelValue: 'ham',
      selected: { value: 'ham', label: 'Ham' },
    });

    await wrapper.setProps({ modelValue: 'salami' } as never);
    await flushPromises();
    expect(emitted).toEqual([]);

    answer(options);
    await flushPromises();
    expect(emitted).toEqual(['selected null']);
  });

  it('shows no "Unknown option" for an array that still loads', async () => {
    const { wrapper, input } = await mountComboBox({
      options: [],
      modelValue: 'ham',
      loading: true,
    });

    expect(input.element.value).toBe('');

    await wrapper.setProps({ options, loading: false } as never);

    expect(input.element.value).toBe('Ham');
  });

  it('Tab without a highlight closes the list and keeps the text until focus leaves the component', async () => {
    const { input } = await mountComboBox({ modelValue: 'ham' });
    await type(input, 'che');

    await press('Tab');

    expect(input.attributes('aria-expanded')).toBe('false');
    expect(input.element.value).toBe('che');

    await leaveField(input);

    expect(input.element.value).toBe('Ham');
  });

  it('says "loading", not "no options", for an array that still loads, and the result once it is there', async () => {
    const { wrapper, input, popupText, status } = await mountComboBox({
      options: [],
      loading: true,
    });
    vi.useFakeTimers();

    await type(input, 'h');
    await pause(650);

    expect(popupText()).toBe('Loading options…');
    expect(status()).toBe('Loading options…');

    await wrapper.setProps({ options, loading: false } as never);
    await pause();

    expect(status()).toBe('2 options');
  });

  it('Alt + Up Arrow closes the list and picks nothing', async () => {
    const { wrapper, input } = await mountComboBox();
    input.element.focus();
    await press('ArrowDown');

    const event = await press('ArrowUp', { altKey: true });

    expect(event.defaultPrevented).toBe(true);
    expect(input.attributes('aria-expanded')).toBe('false');
    expect(wrapper.props('modelValue')).toBeNull();
  });

  it('gives focus back to the field once per press in the list', async () => {
    const { wrapper, input } = await mountComboBox();
    await input.trigger('click');
    const focus = vi.spyOn(input.element, 'focus');

    wrapper
      .get('.combobox-popup')
      .element.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await leaveField(input);
    expect(focus).toHaveBeenCalledOnce();
    expect(input.attributes('aria-expanded')).toBe('true');

    // No pointerup arrived, as when the press ended outside the window
    await leaveField(input);
    expect(focus).toHaveBeenCalledOnce();
    expect(input.attributes('aria-expanded')).toBe('false');
  });

  it('forgets a press in the list when another window takes focus', async () => {
    const { wrapper, input } = await mountComboBox();
    await input.trigger('click');
    const focus = vi.spyOn(input.element, 'focus');

    wrapper
      .get('.combobox-popup')
      .element.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    vi.spyOn(document, 'hasFocus').mockReturnValueOnce(false);
    leave(input.element, null);
    expect(input.attributes('aria-expanded')).toBe('true');

    await leaveField(input);
    expect(focus).not.toHaveBeenCalled();
    expect(input.attributes('aria-expanded')).toBe('false');
  });

  it('keeps the search on a press on its own label', async () => {
    const { wrapper, input } = await mountComboBox();
    await type(input, 'ha');

    wrapper
      .get('label')
      .element.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await nextTick();

    expect(input.element.value).toBe('ha');
    expect(input.attributes('aria-expanded')).toBe('true');
  });
});

describe('ComboBox: search on the server', () => {
  const all = ['Acme', 'Ham & Co', 'Hamlet', 'Zilveren Kruis'].map(
    (label, index) => ({ value: index + 1, label }),
  );

  /** A server that answers what matches, and remembers what it was asked */
  function server({ fail = [] as string[] } = {}) {
    const calls: { query: string; page: number; signal: AbortSignal }[] = [];
    const options = vi.fn(
      async (
        query: string,
        { signal, page }: { signal: AbortSignal; page: number },
      ) => {
        calls.push({ query, page, signal });
        if (fail.includes(query)) throw new Error('The request failed');
        return all.filter((option) =>
          option.label.toLowerCase().includes(query.toLowerCase()),
        );
      },
    );
    return { options, calls };
  }

  /** The pause in typing, and the answer that follows it */
  async function afterPause() {
    await vi.advanceTimersByTimeAsync(300);
    await nextTick();
  }

  it('asks the function for the list on open, with an empty query', async () => {
    const { options, calls } = server();
    const { input, labels } = await mountComboBox({
      options,
      serverSearch: true,
    });

    await input.trigger('click');
    await flushPromises();

    expect(calls.map(({ query, page }) => [query, page])).toEqual([['', 1]]);
    expect(labels()).toEqual(['Acme', 'Ham & Co', 'Hamlet', 'Zilveren Kruis']);
  });

  it('asks once after the pause in typing, and aborts the request that typing overtook', async () => {
    const { options, calls } = server();
    const { input, labels } = await mountComboBox({
      options,
      serverSearch: true,
    });
    input.element.focus();
    await flushPromises();
    vi.useFakeTimers();

    await type(input, 'h');
    await type(input, 'ha');
    await vi.advanceTimersByTimeAsync(299);
    expect(calls).toHaveLength(1);

    await afterPause();
    expect(calls.map(({ query }) => query)).toEqual(['', 'ha']);
    expect(labels()).toEqual(['Ham & Co', 'Hamlet']);

    // A request under way when the next key comes is aborted
    options.mockImplementationOnce(
      (query, { signal, page }) =>
        new Promise(() => calls.push({ query, page, signal })),
    );
    await type(input, 'ham');
    await afterPause();
    expect(calls.at(-1)!.query).toBe('ham');
    expect(calls.at(-1)!.signal.aborted).toBe(false);

    await type(input, 'haml');
    expect(calls.at(-1)!.signal.aborted).toBe(true);
  });

  it('leaves the search to the function: what it answers shows, unfiltered', async () => {
    const { input, labels } = await mountComboBox({
      options: async (query: string) =>
        query ? [{ value: 9, label: 'Something else' }] : all,
      serverSearch: true,
    });
    vi.useFakeTimers();

    await type(input, 'ha');
    await afterPause();

    expect(labels()).toEqual(['Something else']);
  });

  it('keeps the results before in a busy list while it searches, and says the new ones when they arrive', async () => {
    const { options } = server();
    const { wrapper, input, labels, status } = await mountComboBox({
      options,
      serverSearch: true,
    });
    input.element.focus();
    await flushPromises();
    vi.useFakeTimers();

    await type(input, 'ham');

    expect(labels()).toHaveLength(4);
    expect(wrapper.get('[role="listbox"]').attributes('aria-busy')).toBe(
      'true',
    );

    await afterPause();

    expect(labels()).toEqual(['Ham & Co', 'Hamlet']);
    expect(wrapper.get('[role="listbox"]').attributes('aria-busy')).toBe(
      undefined,
    );
    await vi.advanceTimersByTimeAsync(1);
    expect(status()).toBe('2 options');
  });

  it('takes the highlight away when the results are replaced, so Enter picks no option of the search before', async () => {
    const { options } = server();
    const { wrapper, input, highlighted } = await mountComboBox({
      options,
      serverSearch: true,
    });
    input.element.focus();
    await flushPromises();
    vi.useFakeTimers();

    await type(input, 'ha');
    await press('ArrowDown');
    expect(highlighted()).toBe('Acme');

    await afterPause();
    expect(input.attributes('aria-activedescendant')).toBeUndefined();

    await press('Enter');
    expect(wrapper.props('modelValue')).toBeNull();
  });

  it('says that nothing matches, and that a search failed, which the next keystroke asks again', async () => {
    expectConsole('error', /The options function failed/);
    const { options, calls } = server({ fail: ['ac'] });
    const { input, popupText, labels } = await mountComboBox({
      options,
      serverSearch: true,
    });
    input.element.focus();
    await flushPromises();
    vi.useFakeTimers();

    await type(input, 'xyz');
    await afterPause();
    expect(popupText()).toBe('No options match your search');
    expect(input.attributes('aria-expanded')).toBe('false');

    await type(input, 'ac');
    await afterPause();
    expect(popupText()).toBe(
      'The search failed. Change the text to search again.',
    );

    await type(input, 'acm');
    await afterPause();
    expect(calls.at(-1)!.query).toBe('acm');
    expect(labels()).toEqual(['Acme']);
  });

  it('shows the list on open again after a pick, without asking again', async () => {
    const { options, calls } = server();
    const { wrapper, input, labels, option } = await mountComboBox({
      options,
      serverSearch: true,
    });
    input.element.focus();
    await flushPromises();
    vi.useFakeTimers();

    await type(input, 'ham');
    await afterPause();
    await option('Hamlet').trigger('click');
    expect(wrapper.props('modelValue')).toBe(3);

    await input.trigger('click');

    expect(labels()).toHaveLength(4);
    expect(calls).toHaveLength(2);
  });

  it('keeps v-model:selected for a value the loaded list does not hold', async () => {
    const { options } = server();
    const { input, emitted } = await mountComboBox({
      options,
      serverSearch: true,
      modelValue: 99,
      selected: { value: 99, label: 'Page nine' },
    });

    await input.trigger('click');
    await flushPromises();

    expect(input.element.value).toBe('Page nine');
    expect(emitted).toEqual([]);
  });

  it('shows the label of v-model:selected without asking, and no label for a value without it', async () => {
    const withOption = server();
    const first = await mountComboBox({
      options: withOption.options,
      serverSearch: true,
      modelValue: 3,
      selected: { value: 3, label: 'Hamlet' },
    });
    await flushPromises();

    expect(first.input.element.value).toBe('Hamlet');
    expect(withOption.calls).toHaveLength(0);
    first.wrapper.unmount();

    const without = server();
    expectConsole(
      'warn',
      /has a value and server-search, but no v-model:selected with its option: it cannot show the label/,
      1,
    );
    const second = await mountComboBox({
      options: without.options,
      serverSearch: true,
      modelValue: 3,
    });
    await flushPromises();

    expect(second.input.element.value).toBe('');
    expect(without.calls).toHaveLength(0);
  });
});

describe('ComboBox: pages', () => {
  const page = (number: number) =>
    [1, 2].map((item) => ({
      value: (number - 1) * 2 + item,
      label: `Option ${(number - 1) * 2 + item}`,
    }));

  /** Three pages of two options */
  function paged() {
    const calls: number[] = [];
    const options = vi.fn(async (_query: string, context: { page: number }) => {
      calls.push(context.page);
      return { options: page(context.page), more: context.page < 3 };
    });
    return { options, calls };
  }

  it('Down Arrow on the last loaded option asks for the next page, does not wrap, and the status says so', async () => {
    const { options, calls } = paged();
    const { input, labels, highlighted, status } = await mountComboBox({
      options,
      serverSearch: true,
    });
    input.element.focus();
    await flushPromises();

    await press('ArrowDown');
    await press('ArrowDown');
    expect(highlighted()).toBe('Option 2');

    await press('ArrowDown');
    await flushPromises();
    await pause();

    expect(calls).toEqual([1, 2]);
    expect(highlighted()).toBe('Option 2');
    expect(labels()).toEqual(['Option 1', 'Option 2', 'Option 3', 'Option 4']);
    expect(status()).toBe('More options loaded');

    await press('ArrowDown');
    expect(highlighted()).toBe('Option 3');
  });

  it('asks one page at a time', async () => {
    const { options, calls } = paged();
    const { input } = await mountComboBox({ options, serverSearch: true });
    input.element.focus();
    await flushPromises();
    await press('ArrowUp');

    await press('ArrowDown');
    await press('ArrowDown');
    await flushPromises();

    expect(calls).toEqual([1, 2]);
  });

  it('Up Arrow on the first option goes to the last loaded one, without loading', async () => {
    const { options, calls } = paged();
    const { input, highlighted } = await mountComboBox({
      options,
      serverSearch: true,
    });
    input.element.focus();
    await flushPromises();

    await press('ArrowDown');
    await press('ArrowUp');
    await flushPromises();

    expect(highlighted()).toBe('Option 2');
    expect(calls).toEqual([1]);
  });

  it('has aria-setsize -1 on its options while there is more, and wraps once the last page is in', async () => {
    const { options } = paged();
    const { wrapper, input, highlighted } = await mountComboBox({
      options,
      serverSearch: true,
    });
    input.element.focus();
    await flushPromises();
    await press('ArrowUp');

    const first = () => wrapper.findAll('[role="option"]')[0]!;
    expect(first().attributes('aria-setsize')).toBe('-1');
    expect(first().attributes('aria-posinset')).toBe('1');
    await expectNoViolations();

    // Down Arrow on the last loaded option, twice: pages 2 and 3
    await press('ArrowDown');
    await flushPromises();
    await press('ArrowDown');
    await press('ArrowDown');
    await press('ArrowDown');
    await flushPromises();

    expect(wrapper.findAll('[role="option"]')).toHaveLength(6);
    expect(first().attributes('aria-setsize')).toBeUndefined();

    await press('ArrowDown');
    await press('ArrowDown');
    expect(highlighted()).toBe('Option 6');

    await press('ArrowDown');
    expect(highlighted()).toBe('Option 1');
  });

  it('says when the next page could not be loaded, and emits error with its cause', async () => {
    expectConsole('error', /The options function failed/, 1);
    const cause = new Error('Page 2 failed');
    const options = vi.fn(async (_query: string, context: { page: number }) => {
      if (context.page === 2) throw cause;
      return { options: page(context.page), more: true };
    });
    const { wrapper, input, highlighted, status } = await mountComboBox({
      options,
      serverSearch: true,
    });
    input.element.focus();
    await flushPromises();

    await press('ArrowDown');
    await press('ArrowDown');
    await press('ArrowDown');
    await flushPromises();
    await pause();

    expect(highlighted()).toBe('Option 2');
    expect(status()).toBe('More options could not be loaded');
    expect(wrapper.emitted('error')).toEqual([[cause]]);
  });

  it('takes a list that is filtered in the browser as whole: "more" is ignored without server-search', async () => {
    const { options, calls } = paged();
    const { wrapper, input, highlighted } = await mountComboBox({ options });
    input.element.focus();
    await flushPromises();

    await press('ArrowUp');
    await press('ArrowDown');
    await flushPromises();

    expect(highlighted()).toBe('Option 1');
    expect(calls).toEqual([1]);
    expect(
      wrapper.findAll('[role="option"]')[0]!.attributes('aria-setsize'),
    ).toBeUndefined();
  });
});

describe('ComboBox: a search and a page at the same time', () => {
  /** A server whose answers the test gives, per query and page */
  function controlled() {
    const asked: string[] = [];
    const answers = new Map<string, (answer: unknown) => void>();
    const options = vi.fn(
      (query: string, { page }: { page: number }) =>
        new Promise((resolve) => {
          asked.push(`${query}:${page}`);
          answers.set(`${query}:${page}`, resolve);
        }),
    );
    const two = (prefix: string) => ({
      options: [1, 2].map((item) => ({
        value: `${prefix}${item}`,
        label: `${prefix} ${item}`,
      })),
      more: true,
    });

    return { options, asked, answers, two };
  }

  it('asks no page of the search before while a search is under way, and keeps the list on open', async () => {
    const { options, asked, answers, two } = controlled();
    const { input, labels } = await mountComboBox({
      options,
      serverSearch: true,
    });
    input.element.focus();
    answers.get(':1')!(two('Open'));
    await flushPromises();
    vi.useFakeTimers();

    await type(input, 'am');
    await vi.advanceTimersByTimeAsync(300);
    answers.get('am:1')!(two('Am'));
    await vi.advanceTimersByTimeAsync(1);
    expect(labels()).toEqual(['Am 1', 'Am 2']);

    // The next search is under way: the end of the old results asks nothing
    await type(input, 'ams');
    await press('ArrowUp');
    await press('ArrowDown');
    await vi.advanceTimersByTimeAsync(300);
    expect(asked).toEqual([':1', 'am:1', 'ams:1']);

    answers.get('ams:1')!(two('Ams'));
    await vi.advanceTimersByTimeAsync(1);
    expect(labels()).toEqual(['Ams 1', 'Ams 2']);

    await press('Escape');
    await input.trigger('click');

    expect(labels()).toEqual(['Open 1', 'Open 2']);
  });

  it('drops a page that answers after the search it belonged to was replaced', async () => {
    const { options, asked, answers, two } = controlled();
    const { input, labels } = await mountComboBox({
      options,
      serverSearch: true,
    });
    input.element.focus();
    answers.get(':1')!(two('Open'));
    await flushPromises();
    vi.useFakeTimers();

    await type(input, 'am');
    await vi.advanceTimersByTimeAsync(300);
    answers.get('am:1')!(two('Am'));
    await vi.advanceTimersByTimeAsync(1);

    await press('ArrowUp');
    await press('ArrowDown');
    expect(asked.at(-1)).toBe('am:2');

    await type(input, 'ams');
    await vi.advanceTimersByTimeAsync(300);
    answers.get('ams:1')!(two('Ams'));
    answers.get('am:2')!(two('Late'));
    await vi.advanceTimersByTimeAsync(1);

    expect(labels()).toEqual(['Ams 1', 'Ams 2']);

    // The page request of the search before no longer holds the next one back
    await press('ArrowUp');
    await press('ArrowDown');
    expect(asked.at(-1)).toBe('ams:2');

    await press('Escape');
    await input.trigger('click');
    expect(labels()).toEqual(['Open 1', 'Open 2']);
  });

  it('asks a typed search again after refreshOptions()', async () => {
    const { options, asked, answers, two } = controlled();
    const { wrapper, input, labels } = await mountComboBox({
      options,
      serverSearch: true,
    });
    input.element.focus();
    answers.get(':1')!(two('Open'));
    await flushPromises();
    vi.useFakeTimers();

    await type(input, 'am');
    await vi.advanceTimersByTimeAsync(300);
    answers.get('am:1')!(two('Am'));
    await vi.advanceTimersByTimeAsync(1);

    void (
      wrapper.vm as unknown as { refreshOptions: () => Promise<void> }
    ).refreshOptions();
    await vi.advanceTimersByTimeAsync(300);

    expect(asked.slice(-2).sort()).toEqual([':1', 'am:1']);
    answers.get('am:1')!(two('Again'));
    await vi.advanceTimersByTimeAsync(1);
    expect(labels()).toEqual(['Again 1', 'Again 2']);
  });
});

describe('ComboBox: create option', () => {
  it('is the last option while no label is the typed text, ignoring case and spaces but not diacritics', async () => {
    const { input, labels } = await mountComboBox({ createOption: true });

    await type(input, 'ja');
    expect(labels()).toEqual(['Jalapeños', 'Create “ja”']);

    await type(input, ' HAM ');
    expect(labels()).toEqual(['Ham']);

    await type(input, 'Jalapenos');
    expect(labels()).toEqual(['Jalapeños', 'Create “Jalapenos”']);
  });

  it('is a listbox of the create option alone when nothing matches, with aria-expanded true, and the status says both', async () => {
    const { input, labels, popupText, status } = await mountComboBox({
      createOption: true,
    });
    vi.useFakeTimers();

    await type(input, 'Bacon');
    await pause(650);

    expect(input.attributes('aria-expanded')).toBe('true');
    expect(labels()).toEqual(['Create “Bacon”']);
    expect(popupText()).toContain('No options match your search');
    expect(status()).toBe(
      'No options match your search. Available: Create “Bacon”',
    );
  });

  it('is never selected, takes its text from create-text, and is not there without create-option or for spaces alone', async () => {
    const { wrapper, input, option } = await mountComboBox({
      createOption: true,
      createText: (text: string) => `New topping “${text}”`,
      modelValue: 'ham',
    });
    await type(input, 'Bacon');
    expect(option('New topping “Bacon”').attributes('aria-selected')).toBe(
      'false',
    );

    await type(input, '   ');
    expect(input.attributes('aria-expanded')).toBe('true');
    expect(
      wrapper
        .findAll('[role="option"]')
        .some((item) => item.text().startsWith('New topping')),
    ).toBe(false);

    const without = await mountComboBox();
    await type(without.input, 'Bacon');
    expect(without.labels()).toEqual([]);
  });

  it('is highlighted by an arrow key, not by itself; Enter on it emits create with the trimmed text, closes the list and keeps text and value', async () => {
    const { wrapper, input, highlighted, emitted } = await mountComboBox({
      createOption: true,
      modelValue: 'ham',
    });
    await type(input, ' Bacon ');
    expect(highlighted()).toBeNull();

    await press('Enter');
    expect(wrapper.emitted('create')).toBeUndefined();

    await type(input, ' Bacon ');
    await press('ArrowDown');
    expect(highlighted()).toBe('Create “Bacon”');
    await press('Enter');

    expect(wrapper.emitted('create')).toEqual([['Bacon']]);
    expect(input.attributes('aria-expanded')).toBe('false');
    expect(input.element.value).toBe(' Bacon ');
    expect(emitted).toEqual([]);
  });

  it('Tab on it creates nothing and closes the list', async () => {
    const { wrapper, input } = await mountComboBox({ createOption: true });
    await type(input, 'Bacon');
    await press('ArrowUp');

    await press('Tab');

    expect(wrapper.emitted('create')).toBeUndefined();
    expect(input.attributes('aria-expanded')).toBe('false');
  });

  it('a click on it emits create', async () => {
    const { wrapper, input, option } = await mountComboBox({
      createOption: true,
    });
    await type(input, 'Bacon');

    await option('Create “Bacon”').trigger('click');

    expect(wrapper.emitted('create')).toEqual([['Bacon']]);
  });

  it('shows the label of the value the parent sets after a create, and a failure through custom-error', async () => {
    const { wrapper, input } = await mountComboBox({ createOption: true });
    await type(input, 'Bacon');
    await press('ArrowDown');
    await press('Enter');

    await wrapper.setProps({ customError: 'Bacon exists already' } as never);
    expect(description(input)).toBe('Bacon exists already');

    await wrapper.setProps({
      options: [...options, { value: 'bacon', label: 'Bacon' }],
      modelValue: 'bacon',
      customError: undefined,
    } as never);
    expect(input.element.value).toBe('Bacon');
  });

  it('is not offered while the list loads, nor with server-search', async () => {
    const loading = await mountComboBox({ createOption: true, loading: true });
    await type(loading.input, 'Bacon');
    expect(loading.labels()).toEqual([]);

    expectConsole(
      'warn',
      /has create-option and server-search: the create option needs the whole list, so it never shows/,
      1,
    );
    const server = await mountComboBox({
      createOption: true,
      serverSearch: true,
      options: async () => [],
    });
    vi.useFakeTimers();
    await type(server.input, 'Bacon');
    await pause(400);
    await flushPromises();

    expect(server.labels()).toEqual([]);
  });
});

describe('ComboBox: disabled options', () => {
  const withDisabled = [
    { value: 'cheese', label: 'Cheese' },
    { value: 'ham', label: 'Ham', disabled: true },
    { value: 'jalapenos', label: 'Jalapeños' },
  ];

  it('has aria-disabled, stays in the list and in a search, and the arrow keys reach it', async () => {
    const { input, option, highlighted, labels } = await mountComboBox({
      options: withDisabled,
    });
    input.element.focus();

    await press('ArrowDown');
    await press('ArrowDown');

    expect(option('Ham').attributes('aria-disabled')).toBe('true');
    expect(highlighted()).toBe('Ham');

    await type(input, 'ha');
    expect(labels()).toEqual(['Ham']);
  });

  it('Enter and a click on it leave the value and keep the list open', async () => {
    const { input, option, emitted } = await mountComboBox({
      options: withDisabled,
      modelValue: 'cheese',
    });
    input.element.focus();
    await press('ArrowDown');
    await press('ArrowDown');

    const enter = await press('Enter');
    await option('Ham').trigger('click');

    expect(enter.defaultPrevented).toBe(true);
    expect(emitted).toEqual([]);
    expect(input.attributes('aria-expanded')).toBe('true');
  });

  it('Tab with it highlighted picks nothing and closes the list', async () => {
    const { input, emitted } = await mountComboBox({
      options: withDisabled,
    });
    input.element.focus();
    await press('ArrowDown');
    await press('ArrowDown');

    await press('Tab');

    expect(emitted).toEqual([]);
    expect(input.attributes('aria-expanded')).toBe('false');
  });

  it('keeps the label and checkmark of a value whose option is disabled, which passes required', async () => {
    const { input, wrapper } = await mountComboBox({
      options: withDisabled,
      modelValue: 'ham',
      required: true,
    });

    expect(input.element.value).toBe('Ham');
    expect(input.element.validity.valid).toBe(true);

    await input.trigger('click');
    expect(
      wrapper.get('[aria-selected="true"]').attributes('aria-disabled'),
    ).toBe('true');
  });

  it('takes the field that disables from disabled-key', async () => {
    const { input, option } = await mountComboBox({
      options: [{ value: 'ham', label: 'Ham', archived: true }],
      disabledKey: 'archived',
    });

    await input.trigger('click');

    expect(option('Ham').attributes('aria-disabled')).toBe('true');
  });
});

describe('ComboBox: the cause of a failed load', () => {
  it('emits error with what the options function threw, and logs it in development', async () => {
    expectConsole(
      'error',
      /The options function failed: Error: No connection/,
      1,
    );
    const cause = new Error('No connection');
    const { wrapper, input } = await mountComboBox({
      options: () => Promise.reject(cause),
    });

    await input.trigger('click');
    await flushPromises();

    expect(wrapper.emitted('error')).toEqual([[cause]]);
  });

  it('emits error for a failed search', async () => {
    expectConsole('error', /The options function failed/, 1);
    const cause = new Error('Search failed');
    const options = vi.fn(async (query: string) => {
      if (query) throw cause;
      return [{ value: 1, label: 'Acme' }];
    });
    const { wrapper, input } = await mountComboBox({
      options,
      serverSearch: true,
    });
    input.element.focus();
    await flushPromises();
    vi.useFakeTimers();

    await type(input, 'ac');
    await pause(650);
    await flushPromises();

    expect(wrapper.emitted('error')).toEqual([[cause]]);
  });

  it('leaves out an abort, also one wrapped as the cause of a fetch error', async () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError');
    const wrapped = Object.assign(new Error('[GET] /api: <no response>'), {
      cause: abort,
    });

    for (const thrown of [abort, wrapped]) {
      const { wrapper, input } = await mountComboBox({
        options: () => Promise.reject(thrown),
      });
      await input.trigger('click');
      await flushPromises();

      expect(wrapper.emitted('error')).toBeUndefined();
      wrapper.unmount();
    }
  });
});

describe('ComboBox: value-key and label-key', () => {
  it('reads the value and label from the named fields', async () => {
    const { wrapper, input, labels, option } = await mountComboBox({
      options: [
        { id: 7, name: 'Ham' },
        { id: 8, name: 'Cheese' },
      ],
      valueKey: 'id',
      labelKey: 'name',
    });

    await input.trigger('click');
    expect(labels()).toEqual(['Ham', 'Cheese']);

    await option('Cheese').trigger('click');
    expect(wrapper.props('modelValue')).toBe(8);
    expect(input.element.value).toBe('Cheese');
  });
});

describe('ComboBox: disabled', () => {
  it('and required, is not invalid after a failed submit', async () => {
    const wrapper = await mountInForm(() => [
      h(ComboBox, {
        label: 'Topping',
        options,
        modelValue: null,
        required: true,
        disabled: true,
      }),
      // Another field fails, so the Form shows errors
      h('input', { required: true, 'aria-label': 'Other' }),
    ]);
    const input = wrapper.get('input[role="combobox"]');

    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(input.attributes('aria-invalid')).toBeUndefined();
    expect(description(input)).toBe('');
  });
});
