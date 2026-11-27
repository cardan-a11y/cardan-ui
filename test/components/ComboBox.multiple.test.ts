import { describe, it, expect, vi } from 'vitest';
import { nextTick } from 'vue';
import { flushPromises } from '@vue/test-utils';
import {
  accessibleName,
  description,
  expectFocused,
  expectNoViolations,
  roleOf,
} from '../a11y';
import { expectConsole } from '../console';
import { leave, press } from '../dom';
import {
  leaveField,
  mountComboBoxInForm,
  mountComboBoxWith,
  options,
  pause,
  type,
} from './combobox';

/**
 * ComboBox with `multiple` as its docblock describes it: a combobox with a dialog popup
 * (ARIA 1.2, as APG's "Date Picker Combobox") whose options are checkboxes,
 * with focus moving into the dialog. Focus order and Tab, the top layer and
 * a Dialog around it are in test/browser/combobox-multiple.spec.ts.
 */
async function mountMulti(props: Record<string, unknown> = {}) {
  const mounted = await mountComboBoxWith(
    { label: 'Toppings', multiple: true, modelValue: [] },
    props,
  );
  const { wrapper } = mounted;

  return {
    ...mounted,
    dialog: () => wrapper.find('[role="dialog"]'),
    checkboxes: () => wrapper.findAll<HTMLInputElement>('[type="checkbox"]'),
    checkbox: (name: string) => {
      const found = wrapper
        .findAll<HTMLInputElement>('[type="checkbox"]')
        .find((checkbox) => accessibleName(checkbox) === name);
      if (!found) throw new Error(`No checkbox ${name}`);
      return found;
    },
    labels: () =>
      wrapper
        .findAll('[type="checkbox"]')
        .map((checkbox) => accessibleName(checkbox)),
  };
}

describe('ComboBox multiple: roles, states and properties', () => {
  it('is a text field with the combobox role and a dialog popup, named by its label, with no accessibility violations', async () => {
    const { input } = await mountMulti();

    expect(roleOf(input)).toBe('combobox');
    expect(accessibleName(input)).toBe('Toppings');
    expect(input.attributes('aria-haspopup')).toBe('dialog');
    expect(input.attributes('aria-autocomplete')).toBeUndefined();
    await expectNoViolations();
  });

  it('has aria-expanded false and no aria-controls while closed', async () => {
    const { input } = await mountMulti();

    expect(input.attributes('aria-expanded')).toBe('false');
    expect(input.attributes('aria-controls')).toBeUndefined();
  });

  it('controls a dialog named by the label while open, which holds a checkbox per option, with no violations', async () => {
    const { input, dialog, labels } = await mountMulti();

    await input.trigger('click');

    expect(input.attributes('aria-expanded')).toBe('true');
    expect(input.attributes('aria-controls')).toBe(dialog().attributes('id'));
    expect(roleOf(dialog())).toBe('dialog');
    expect(accessibleName(dialog())).toBe('Toppings');
    expect(labels()).toEqual(['Cheese', 'Ham', 'Jalapeños']);
    expect(input.attributes('aria-activedescendant')).toBeUndefined();
    await expectNoViolations();
  });

  it('is named by its label alone, and shows the selection as its value', async () => {
    const { input } = await mountMulti({ modelValue: ['ham', 'cheese'] });

    expect(accessibleName(input)).toBe('Toppings');
    expect(input.element.value).toBe('2 selected');
  });

  it('shows the label of one ticked option, and nothing without one', async () => {
    const one = await mountMulti({ modelValue: ['ham'] });
    const none = await mountMulti({ placeholder: 'Any topping' });

    expect(one.input.element.value).toBe('Ham');
    expect(none.input.element.value).toBe('');
    expect(none.input.attributes('placeholder')).toBe('Any topping');
  });

  it('ticks the checkboxes of the value, and says the number above the list', async () => {
    const { input, checkbox, dialog } = await mountMulti({
      modelValue: ['ham', 'cheese'],
    });

    await input.trigger('click');

    expect(checkbox('Ham').element.checked).toBe(true);
    expect(checkbox('Cheese').element.checked).toBe(true);
    expect(checkbox('Jalapeños').element.checked).toBe(false);
    expect(dialog().text()).toContain('2 selected');
  });

  it('says the number also before the first tick, so the list stays in place', async () => {
    const { input, checkbox, dialog } = await mountMulti({ modelValue: [] });
    await input.trigger('click');
    expect(dialog().text()).toContain('0 selected');

    await checkbox('Ham').trigger('click');
    expect(dialog().text()).toContain('1 selected');
  });
});

describe('ComboBox multiple: keyboard support', () => {
  it('Down Arrow opens the dialog and moves focus to the first checkbox, Up Arrow to the last', async () => {
    const { input, checkbox } = await mountMulti();
    input.element.focus();

    await press('ArrowDown');
    await nextTick();
    expectFocused(checkbox('Cheese'));

    input.element.focus();
    await press('ArrowUp');
    await nextTick();
    expectFocused(checkbox('Jalapeños'));
  });

  it('Alt + Down Arrow opens the dialog and leaves focus in the field', async () => {
    const { input } = await mountMulti();
    input.element.focus();

    await press('ArrowDown', { altKey: true });
    await nextTick();

    expect(input.attributes('aria-expanded')).toBe('true');
    expectFocused(input);
  });

  it('the arrow keys, Home and End move between the checkboxes; Up Arrow on the first returns to the field', async () => {
    const { input, checkbox } = await mountMulti();
    input.element.focus();
    await press('ArrowDown');
    await nextTick();

    await press('ArrowDown');
    expectFocused(checkbox('Ham'));
    await press('End');
    expectFocused(checkbox('Jalapeños'));
    await press('ArrowDown');
    expectFocused(checkbox('Jalapeños'));
    await press('Home');
    expectFocused(checkbox('Cheese'));
    await press('ArrowUp');
    expectFocused(input);
    expect(input.attributes('aria-expanded')).toBe('true');
  });

  it('a change of a checkbox ticks its option, and the dialog stays open', async () => {
    const { input, checkbox, emitted } = await mountMulti();
    await input.trigger('click');

    await checkbox('Ham').setValue(true);
    await checkbox('Cheese').setValue(true);
    await checkbox('Ham').setValue(false);

    expect(emitted).toEqual([
      'selected [{"value":"ham","label":"Ham"}]',
      'value ["ham"]',
      'selected [{"value":"ham","label":"Ham"},{"value":"cheese","label":"Cheese"}]',
      'value ["ham","cheese"]',
      'selected [{"value":"cheese","label":"Cheese"}]',
      'value ["cheese"]',
    ]);
    expect(input.attributes('aria-expanded')).toBe('true');
  });

  it('Escape in the dialog closes it, puts the selection back, focuses the field and is stopped there', async () => {
    const { wrapper, input } = await mountMulti({ modelValue: ['ham'] });
    await type(input, 'che');
    await press('ArrowDown');
    await nextTick();
    const outer = vi.fn();
    wrapper.element.parentElement?.addEventListener('keydown', outer);

    const event = await press('Escape');

    expect(event.defaultPrevented).toBe(true);
    expect(outer).not.toHaveBeenCalled();
    expect(input.attributes('aria-expanded')).toBe('false');
    expect(input.element.value).toBe('Ham');
    expectFocused(input);
    wrapper.element.parentElement?.removeEventListener('keydown', outer);
  });

  it('Escape in the field closes an open dialog; with it closed Escape goes on', async () => {
    const { input } = await mountMulti();
    await type(input, 'h');

    const first = await press('Escape');
    const second = await press('Escape');

    expect(first.defaultPrevented).toBe(true);
    expect(input.attributes('aria-expanded')).toBe('false');
    expect(second.defaultPrevented).toBe(false);
  });

  it('Enter never submits while the dialog is open: in the field it closes it, on a checkbox nothing', async () => {
    const { input } = await mountMulti();
    input.element.focus();
    await press('ArrowDown');
    await nextTick();

    const onCheckbox = await press('Enter');
    input.element.focus();
    const inField = await press('Enter');
    const closed = await press('Enter');

    expect(onCheckbox.defaultPrevented).toBe(true);
    expect(inField.defaultPrevented).toBe(true);
    expect(input.attributes('aria-expanded')).toBe('false');
    expect(closed.defaultPrevented).toBe(false);
  });

  it('Enter in the field closes the dialog and puts the selection back in place of the search', async () => {
    const { input } = await mountMulti({ modelValue: ['ham'] });
    await type(input, 'che');

    await press('Enter');

    expect(input.attributes('aria-expanded')).toBe('false');
    expect(input.element.value).toBe('Ham');
    expectFocused(input);
  });

  // How a label matches is the shared options' (ComboBox.test.ts, "matches a
  // label that contains the text")
  it('typing opens the dialog with the options that match', async () => {
    const { input, labels } = await mountMulti();

    await type(input, 'ha');

    expect(input.attributes('aria-expanded')).toBe('true');
    expect(labels()).toEqual(['Ham']);
  });

  it('says the number of results after a pause in typing', async () => {
    const { input, status } = await mountMulti();
    vi.useFakeTimers();

    await type(input, 'a');
    await pause(650);

    expect(status()).toBe('2 options');
  });
});

describe('ComboBox multiple: the pointer', () => {
  it('a click in the field opens the dialog, and a click while open closes it', async () => {
    const { input } = await mountMulti();

    await input.trigger('click');
    expect(input.attributes('aria-expanded')).toBe('true');

    await input.trigger('click');
    expect(input.attributes('aria-expanded')).toBe('false');
  });

  // Only the prevented mousedown: test/browser/combobox-multiple.spec.ts ("a
  // click on an option ticks it") proves that focus stays in the field
  it('keeps focus where it was on a press in the dialog', async () => {
    const { input, dialog } = await mountMulti();
    await input.trigger('click');

    const press = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    dialog().get('label').element.dispatchEvent(press);

    expect(press.defaultPrevented).toBe(true);
  });

  it('a click on the label of an option ticks it', async () => {
    const { input, wrapper, emitted } = await mountMulti();
    await input.trigger('click');

    await wrapper.findAll('label').at(-1)!.trigger('click');

    expect(emitted.at(-1)).toBe('value ["jalapenos"]');
  });

  it('closes on a press outside, and puts the selection back', async () => {
    const { input } = await mountMulti({ modelValue: ['ham', 'cheese'] });
    await type(input, 'ja');

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await nextTick();

    expect(input.attributes('aria-expanded')).toBe('false');
    expect(input.element.value).toBe('2 selected');
  });
});

describe('ComboBox multiple: the selection', () => {
  it('puts the selection back when focus leaves the field and the dialog, and keeps it open while focus moves inside', async () => {
    const { input, checkbox } = await mountMulti({ modelValue: ['ham'] });
    await type(input, 'che');

    leave(input.element, checkbox('Cheese').element);
    await nextTick();
    expect(input.attributes('aria-expanded')).toBe('true');
    expect(input.element.value).toBe('che');

    await leaveField(input);
    expect(input.attributes('aria-expanded')).toBe('false');
    expect(input.element.value).toBe('Ham');
  });

  it('keeps the search while ticking, so the ticked option stays in the filtered list', async () => {
    const { input, checkbox, labels } = await mountMulti();
    await type(input, 'ha');

    await checkbox('Ham').setValue(true);

    expect(input.element.value).toBe('ha');
    expect(labels()).toEqual(['Ham']);
  });

  it('has a clear button named by the label, which unticks all and focuses the field', async () => {
    const { input, button, emitted } = await mountMulti({
      modelValue: ['ham', 'cheese'],
    });

    await button('Clear Toppings')!.trigger('click');

    expect(emitted).toEqual(['selected []', 'value []']);
    expect(input.element.value).toBe('');
    expectFocused(input);
  });

  it('has no clear button without can-clear', async () => {
    const { button } = await mountMulti({
      modelValue: ['ham'],
      canClear: false,
    });

    expect(button('Clear Toppings')).toBeUndefined();
  });

  it('keeps a value without an option, shown as "Unknown option", when another is ticked', async () => {
    const { input, checkbox, emitted } = await mountMulti({
      modelValue: ['gone'],
    });
    expect(input.element.value).toBe('Unknown option');

    await input.trigger('click');
    await checkbox('Ham').setValue(true);

    expect(emitted.at(-1)).toBe('value ["gone","ham"]');
  });

  it('takes an absent v-model as empty', async () => {
    const { input, button } = await mountMulti({ modelValue: undefined });

    expect(input.element.value).toBe('');
    expect(button('Clear Toppings')).toBeUndefined();
  });

  it('is a disabled combobox when disabled: no clear button, a disabled open button and hidden inputs', async () => {
    const { input, wrapper, button } = await mountMulti({
      modelValue: ['ham'],
      name: 'toppings',
      disabled: true,
    });

    await input.trigger('click');

    expect(input.attributes('disabled')).toBeDefined();
    expect(input.attributes('aria-expanded')).toBe('false');
    expect(button('Clear Toppings')).toBeUndefined();
    expect(button('Toppings')!.attributes('disabled')).toBeDefined();
    expect(
      wrapper.get('input[type="hidden"]').attributes('disabled'),
    ).toBeDefined();
  });
});

describe('ComboBox multiple: the field', () => {
  it('is described by its instruction, and by its custom error until a tick', async () => {
    const { input, checkbox } = await mountMulti({
      instruction: 'Two at most.',
      customError: 'Ham is sold out.',
    });
    expect(description(input)).toBe('Two at most. Ham is sold out.');

    await input.trigger('click');
    await checkbox('Cheese').setValue(true);

    expect(description(input)).toBe('Two at most.');
  });

  it('puts an attribute on the text field and a class on the wrapper', async () => {
    const { wrapper, input } = await mountMulti({
      'data-test': 'toppings',
      class: 'filter',
    });

    expect(input.attributes('data-test')).toBe('toppings');
    expect(wrapper.find('.form-field-wrapper.filter').exists()).toBe(true);
  });
});

describe('ComboBox multiple: in a form', () => {
  const mountForm = (props: Record<string, unknown> = {}) =>
    mountComboBoxInForm(
      { label: 'Toppings', multiple: true, name: 'toppings', modelValue: [] },
      props,
    );

  it('puts every value in the FormData under its name', async () => {
    const { submitted, submit } = await mountForm({
      modelValue: ['ham', 'cheese'],
    });

    await submit();

    expect(submitted).toEqual([
      [
        ['toppings', 'ham'],
        ['toppings', 'cheese'],
      ],
    ]);
  });

  it('fails the submit of a required field without a ticked option, with its error and focus on the field', async () => {
    const { input, submitted, submit } = await mountForm({ required: true });

    await submit();

    expect(submitted).toEqual([]);
    expect(input.attributes('aria-invalid')).toBe('true');
    expect(description(input)).toBe('Tick at least one option');
    expectFocused(input);
  });

  it('settles before the submit: a search is replaced by the selection', async () => {
    const { input, submitted, submit } = await mountForm({
      modelValue: ['ham'],
    });
    await type(input, 'che');

    await submit();

    expect(input.element.value).toBe('Ham');
    expect(submitted).toEqual([[['toppings', 'ham']]]);
  });
});

describe('ComboBox multiple: options from a function', () => {
  function loader() {
    const calls: string[] = [];
    const load = vi.fn(async (query: string) => {
      calls.push(query);
      return options;
    });
    return { load, calls };
  }

  // When a list is asked for is the shared options' (ComboBox.test.ts, "asks
  // once when the field is first touched"); an empty value needs none on mount
  it('asks nothing on mount for an empty value', async () => {
    const { load, calls } = loader();
    await mountMulti({ options: load });
    await flushPromises();

    expect(calls).toEqual([]);
  });

  it('asks at once for a value without its option, and gives the options found', async () => {
    const { load, calls } = loader();
    const { input, emitted, emittedOnMount } = await mountMulti({
      options: load,
      modelValue: ['ham', 'cheese'],
    });
    await flushPromises();

    expect(calls).toEqual(['']);
    expect(input.element.value).toBe('2 selected');
    expect([...emittedOnMount, ...emitted]).toContain(
      'selected [{"value":"ham","label":"Ham"},{"value":"cheese","label":"Cheese"}]',
    );
  });

  it('asks nothing with v-model:selected, and shows its label', async () => {
    const { load, calls } = loader();
    const { input } = await mountMulti({
      options: load,
      modelValue: ['ham'],
      selected: [{ value: 'ham', label: 'Ham' }],
    });
    await flushPromises();

    expect(calls).toEqual([]);
    expect(input.element.value).toBe('Ham');
  });
});

describe('ComboBox multiple: create option', () => {
  it('offers to create the typed text only while no label is that text, ignoring case and spaces but not diacritics', async () => {
    const { input, button } = await mountMulti({ createOption: true });

    await type(input, 'bacon ');
    expect(button('Create “bacon”')).toBeDefined();

    await type(input, ' HAM');
    expect(button('Create “HAM”')).toBeUndefined();

    await type(input, 'Jalapenos');
    expect(button('Create “Jalapenos”')).toBeDefined();
  });

  it('offers nothing without create-option, for spaces alone, or while the list loads', async () => {
    const without = await mountMulti();
    await type(without.input, 'bacon');
    expect(without.button('Create “bacon”')).toBeUndefined();

    const spaces = await mountMulti({ createOption: true });
    await type(spaces.input, '   ');
    expect(spaces.wrapper.find('.combobox-create').exists()).toBe(false);

    const loading = await mountMulti({ createOption: true, loading: true });
    await type(loading.input, 'bacon');
    expect(loading.button('Create “bacon”')).toBeUndefined();
  });

  it('takes its text from create-text', async () => {
    const { input, button } = await mountMulti({
      createOption: true,
      createText: (text: string) => `New topping “${text}”`,
    });

    await type(input, 'Bacon');

    expect(button('New topping “Bacon”')).toBeDefined();
  });

  it('emits create with the trimmed text, changes no value and focuses the field, whose text stays', async () => {
    const { wrapper, input, button, emitted } = await mountMulti({
      createOption: true,
    });
    await type(input, '  Bacon ');

    await button('Create “Bacon”')!.trigger('click');

    expect(wrapper.emitted('create')).toEqual([['Bacon']]);
    expect(emitted).toEqual([]);
    expectFocused(input);
    expect(input.element.value).toBe('  Bacon ');
  });

  it('is the last stop of the arrow keys', async () => {
    const { input, button } = await mountMulti({ createOption: true });
    await type(input, 'a');

    await press('ArrowUp');
    await nextTick();

    expectFocused(button('Create “a”')!);
  });

  it('says both that nothing matches and that the create option is there', async () => {
    const { input, status } = await mountMulti({ createOption: true });
    vi.useFakeTimers();

    await type(input, 'Bacon');
    await pause(650);

    expect(status()).toBe(
      'No options match your search. Available: Create “Bacon”',
    );
  });
});

describe('ComboBox multiple: disabled options', () => {
  const withDisabled = [
    { value: 'cheese', label: 'Cheese' },
    { value: 'ham', label: 'Ham', disabled: true },
  ];

  it('is an aria-disabled checkbox that the arrow keys reach and a click does not tick', async () => {
    const { input, checkbox, emitted } = await mountMulti({
      options: withDisabled,
      modelValue: ['ham'],
    });
    input.element.focus();
    await press('ArrowDown');
    await nextTick();
    await press('ArrowDown');

    const ham = checkbox('Ham');
    expectFocused(ham);
    expect(ham.attributes('aria-disabled')).toBe('true');
    expect(ham.element.disabled).toBe(false);

    ham.element.click();
    await nextTick();

    expect(ham.element.checked).toBe(true);
    expect(emitted).toEqual([]);
    expect(input.element.value).toBe('Ham');
  });

  it('a clear keeps a ticked disabled option, and there is no clear button for that alone', async () => {
    const { button, emitted } = await mountMulti({
      options: withDisabled,
      modelValue: ['ham', 'cheese'],
    });

    await button('Clear Toppings')!.trigger('click');

    expect(emitted).toEqual([
      'selected [{"value":"ham","label":"Ham","disabled":true}]',
      'value ["ham"]',
    ]);
    expect(button('Clear Toppings')).toBeUndefined();
  });
});

describe('ComboBox multiple: warnings in development', () => {
  it('warns when multiple changes after the field was created, and keeps the mode', async () => {
    expectConsole('warn', /multiple changed after the field was created/, 1);
    const { wrapper, dialog } = await mountMulti();

    await wrapper.setProps({ multiple: false } as never);

    expect(wrapper.find('input').attributes('aria-haspopup')).toBe('dialog');
    expect(dialog().exists()).toBe(true);
  });

  it('warns for a value that is not an array with multiple, and for an array without it', async () => {
    expectConsole('warn', /its value is not an array/, 1);
    expectConsole('warn', /has an array as its value: add multiple/, 1);
    await mountMulti({ modelValue: 'ham' });
    await mountMulti({ multiple: false, modelValue: ['ham'] });
  });

  it('warns for server-search, which multiple ignores, and not for null or [] while loading', async () => {
    expectConsole('warn', /multiple and server-search/, 1);
    await mountMulti({ modelValue: null });
    await mountMulti({ modelValue: undefined });
    await mountMulti({ options: () => options, serverSearch: true });
  });
});
