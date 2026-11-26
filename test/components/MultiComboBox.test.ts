import { describe, it, expect, vi } from 'vitest';
import { h, nextTick } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { MultiComboBox } from '#components';
import {
  accessibleName,
  description,
  expectFocused,
  expectNoViolations,
  roleOf,
} from '../a11y';
import { addToPage, leave, press } from '../dom';
import { mountInForm } from '../form';

/**
 * MultiComboBox as its docblock describes it: a combobox with a dialog popup
 * (ARIA 1.2, as APG's "Date Picker Combobox") whose options are checkboxes,
 * with focus moving into the dialog. Focus order and Tab, the top layer and
 * a Dialog around it are in test/browser/multicombobox.spec.ts.
 */
const options = [
  { value: 'cheese', label: 'Cheese' },
  { value: 'ham', label: 'Ham' },
  { value: 'jalapenos', label: 'Jalapeños' },
];

async function mountMulti(props: Record<string, unknown> = {}) {
  const emitted: string[] = [];
  const mounted: { setProps?: (props: Record<string, unknown>) => unknown } =
    {};
  const wrapper = await mountSuspended(MultiComboBox, {
    props: {
      label: 'Toppings',
      options,
      modelValue: [],
      'onUpdate:modelValue': (value: unknown) => {
        emitted.push(`value ${JSON.stringify(value)}`);
        mounted.setProps?.({ modelValue: value });
      },
      'onUpdate:selected': (selected: unknown) => {
        emitted.push(`selected ${JSON.stringify(selected)}`);
        mounted.setProps?.({ selected });
      },
      ...props,
    } as never,
    attachTo: document.body,
  });
  mounted.setProps = (props) => wrapper.setProps(props as never);
  await nextTick();

  const input = wrapper.get<HTMLInputElement>('input[role="combobox"]');
  const emittedOnMount = emitted.splice(0);

  return {
    wrapper,
    input,
    emitted,
    emittedOnMount,
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
    button: (name: string) =>
      wrapper
        .findAll('button')
        .find((button) => accessibleName(button) === name),
    status: () => wrapper.get('[role="status"]').text(),
  };
}

type Mounted = Awaited<ReturnType<typeof mountMulti>>;

async function type(input: Mounted['input'], text: string) {
  input.element.focus();
  input.element.value = text;
  await input.trigger('input');
}

async function leaveField(input: Mounted['input']) {
  const next = addToPage('<button type="button">Next</button>');
  leave(input.element, next);
  await nextTick();
}

const pause = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

describe('MultiComboBox: roles, states and properties', () => {
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
});

describe('MultiComboBox: keyboard support', () => {
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

  it('typing opens the dialog with the options that match, ignoring case and diacritics', async () => {
    const { input, labels } = await mountMulti();

    await type(input, 'JALAPENO');

    expect(input.attributes('aria-expanded')).toBe('true');
    expect(labels()).toEqual(['Jalapeños']);
  });

  it('says the number of results after a pause in typing', async () => {
    const { input, status } = await mountMulti();

    await type(input, 'a');
    await pause(650);

    expect(status()).toBe('2 options');
  });
});

describe('MultiComboBox: the pointer', () => {
  it('a click in the field opens the dialog, and a click while open closes it', async () => {
    const { input } = await mountMulti();

    await input.trigger('click');
    expect(input.attributes('aria-expanded')).toBe('true');

    await input.trigger('click');
    expect(input.attributes('aria-expanded')).toBe('false');
  });

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

describe('MultiComboBox: the selection', () => {
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

describe('MultiComboBox: the field', () => {
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

describe('MultiComboBox: in a form', () => {
  async function mountForm(props: Record<string, unknown> = {}) {
    const submitted: [string, FormDataEntryValue][][] = [];
    const model = { value: (props.modelValue ?? []) as unknown };
    const wrapper = await mountInForm(
      () => [
        h(MultiComboBox, {
          label: 'Toppings',
          name: 'toppings',
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
        onSubmit: (data: FormData) => submitted.push([...data.entries()]),
      },
    );
    await nextTick();

    return {
      wrapper,
      submitted,
      input: wrapper.get<HTMLInputElement>('input[role="combobox"]'),
      submit: async () => {
        await wrapper.get('form').trigger('submit');
        await flushPromises();
      },
    };
  }

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

describe('MultiComboBox: options from a function', () => {
  function loader() {
    const calls: string[] = [];
    const load = vi.fn(async (query: string) => {
      calls.push(query);
      return options;
    });
    return { load, calls };
  }

  it('asks once when the field is first touched', async () => {
    const { load, calls } = loader();
    const { input, labels } = await mountMulti({ options: load });
    expect(calls).toEqual([]);

    input.element.focus();
    await input.trigger('focus');
    await flushPromises();
    await input.trigger('click');

    expect(calls).toEqual(['']);
    expect(labels()).toEqual(['Cheese', 'Ham', 'Jalapeños']);
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

describe('MultiComboBox: create option', () => {
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
    expect(spaces.wrapper.find('.multicombobox-create').exists()).toBe(false);

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

    await type(input, 'Bacon');
    await pause(650);

    expect(status()).toBe(
      'No options match your search. Available: Create “Bacon”',
    );
  });
});
