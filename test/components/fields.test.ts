import { describe, it, expect, vi } from 'vitest';
import { defineComponent, h, nextTick, type Component } from 'vue';
import type { DOMWrapper, VueWrapper } from '@vue/test-utils';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import {
  Checkbox,
  CheckboxGroup,
  ComboBox,
  DatePicker,
  Input,
  RadioGroup,
  Select,
  SpinButton,
  Textarea,
} from '#components';
import { accessibleName, description, expectNoViolations } from '../a11y';
import { addToPage } from '../dom';
import { mountInForm } from '../form';

/**
 * The contract every field component keeps (CLAUDE.md, FormField): named by
 * its label, described by its error only while the error shows, after a
 * failed submit or with `show-invalid`, never while disabled or read-only;
 * `custom-error` until the value changes. A new field joins the table; its
 * own file tests what only that field does.
 */

const options = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
];

type Wrapper = VueWrapper<unknown>;
type Control = Omit<DOMWrapper<Element>, 'exists'>;

interface Field {
  component: Component;
  /** An empty field's props, without a label */
  props: Record<string, unknown>;
  /** The element that is named, described and `aria-invalid` */
  control: (wrapper: Wrapper) => Control;
  /** A group (fieldset): never `aria-invalid`, which ARIA 1.2 deprecates there */
  group?: boolean;
  /** The text of a required field without a value, for the label `Colour` */
  missing: string;
  /** A value that fills the required field */
  filled: unknown;
  /** The user's own change of the value; without it the field's file tests custom-error */
  change?: (wrapper: Wrapper) => Promise<void>;
  /** The prop that hides the label or legend */
  hide: 'hideLabel' | 'hideLegend';
  /** An attribute reaches the control, class and style the wrapper */
  attrs?: boolean;
  /** Keeps a parent's `aria-describedby` next to its own */
  describedby?: boolean;
  /** Takes `readonly`, which the browser does not check either */
  readonly?: boolean;
}

const fields: Record<string, Field> = {
  Input: {
    component: Input,
    props: { modelValue: '' },
    control: (w) => w.get('input'),
    missing: 'Colour is missing',
    filled: 'red',
    change: (w) => w.get('input').setValue('green'),
    readonly: true,
    hide: 'hideLabel',
    attrs: true,
    describedby: true,
  },
  Textarea: {
    component: Textarea,
    props: { modelValue: '' },
    control: (w) => w.get('textarea'),
    missing: 'Colour is missing',
    filled: 'red',
    change: (w) => w.get('textarea').setValue('green'),
    readonly: true,
    hide: 'hideLabel',
    attrs: true,
    describedby: true,
  },
  Select: {
    component: Select,
    props: { options, modelValue: undefined },
    control: (w) => w.get('select'),
    missing: 'Colour is missing',
    filled: 'red',
    change: (w) => w.get('select').setValue('green'),
    hide: 'hideLabel',
    attrs: true,
    describedby: true,
  },
  DatePicker: {
    component: DatePicker,
    props: { modelValue: null },
    control: (w) => w.get('input'),
    missing: 'Colour is missing',
    filled: new Date(2026, 10, 9),
    readonly: true,
    hide: 'hideLabel',
  },
  Checkbox: {
    component: Checkbox,
    props: { modelValue: false },
    control: (w) => w.get('input'),
    missing: 'Tick this box to continue',
    filled: true,
    change: (w) => w.get('input').setValue(false),
    hide: 'hideLabel',
  },
  CheckboxGroup: {
    component: CheckboxGroup,
    props: { options, modelValue: [] },
    control: (w) => w.get('fieldset'),
    group: true,
    missing: 'Tick at least one option',
    filled: ['red'],
    change: (w) => w.findAll('input')[1]!.setValue(true),
    hide: 'hideLegend',
  },
  RadioGroup: {
    component: RadioGroup,
    props: { options, modelValue: undefined },
    control: (w) => w.get('fieldset'),
    group: true,
    missing: 'Colour is missing',
    filled: 'red',
    change: (w) => w.findAll('input')[1]!.setValue(true),
    hide: 'hideLegend',
  },
  SpinButton: {
    component: SpinButton,
    props: { modelValue: undefined },
    control: (w) => w.get('input'),
    missing: 'Colour is missing',
    filled: 2,
    change: (w) => w.get('input').setValue('3'),
    readonly: true,
    hide: 'hideLabel',
    attrs: true,
  },
  ComboBox: {
    component: ComboBox,
    props: { options, modelValue: null },
    control: (w) => w.get('input[role="combobox"]'),
    missing: 'Colour is missing',
    filled: 'red',
    change: async (w) => {
      await w.get('input[role="combobox"]').trigger('click');
      const option = w
        .findAll('[role="option"]')
        .find((option) => option.text() === 'Green');
      await option!.trigger('click');
    },
    hide: 'hideLabel',
    attrs: true,
  },
};

async function mountField(field: Field, props: Record<string, unknown> = {}) {
  const wrapper = await mountSuspended(field.component, {
    props: { label: 'Colour', ...field.props, ...props } as never,
    attachTo: document.body,
  });
  await nextTick();
  return { wrapper, control: field.control(wrapper) };
}

describe.each(Object.entries(fields))('%s, as a field', (_, field) => {
  it('is named by its label, also a hidden one, with no accessibility violations', async () => {
    const { wrapper, control } = await mountField(field);
    expect(accessibleName(control)).toBe('Colour');
    await expectNoViolations();

    await wrapper.setProps({ [field.hide]: true } as never);
    expect(accessibleName(control)).toBe('Colour');
  });

  it('is described by its error only while the error shows', async () => {
    const { wrapper, control } = await mountField(field, { required: true });
    expect(description(control)).not.toContain(field.missing);
    expect(control.attributes('aria-invalid')).toBeUndefined();
    // In the document already, for CSS to reveal on :invalid
    expect(wrapper.text()).toContain(field.missing);

    await wrapper.setProps({ showInvalid: true } as never);
    await nextTick();
    expect(description(control)).toContain(field.missing);
    expect(control.attributes('aria-invalid')).toBe(
      field.group ? undefined : 'true',
    );
    // Nor on a box or radio inside a group
    if (field.group) expect(control.findAll('[aria-invalid]')).toHaveLength(0);
    await expectNoViolations();

    await wrapper.setProps({ modelValue: field.filled } as never);
    await vi.waitFor(() =>
      expect(control.attributes('aria-invalid')).toBeUndefined(),
    );
    expect(description(control)).not.toContain(field.missing);
  });

  it('shows its error after a failed submit of its form', async () => {
    const wrapper = await mountInForm(() => [
      h(field.component, {
        label: 'Colour',
        ...field.props,
        required: true,
      } as never),
    ]);
    await nextTick();
    const control = field.control(wrapper);

    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(description(control)).toContain(field.missing);
    expect(control.attributes('aria-invalid')).toBe(
      field.group ? undefined : 'true',
    );
  });

  it.each(field.readonly ? ['disabled', 'readonly'] : ['disabled'])(
    '%s and required, is neither invalid nor described by the error after a failed submit',
    async (state) => {
      const wrapper = await mountInForm(() => [
        h(field.component, {
          label: 'Colour',
          ...field.props,
          required: true,
          [state]: true,
        } as never),
        // Another field fails, so the Form shows errors
        h('input', { required: true, 'aria-label': 'Other' }),
      ]);
      await nextTick();
      const control = field.control(wrapper.findComponent(field.component));

      await wrapper.get('form').trigger('submit');
      await nextTick();

      expect(description(control)).not.toContain(field.missing);
      expect(control.attributes('aria-invalid')).toBeUndefined();
    },
  );

  it.each(field.readonly ? ['disabled', 'readonly'] : ['disabled'])(
    'drops a shown error once it is %s',
    async (state) => {
      const { wrapper, control } = await mountField(field, {
        required: true,
        showInvalid: true,
      });
      expect(description(control)).toContain(field.missing);

      await wrapper.setProps({ [state]: true } as never);
      await nextTick();
      expect(description(control)).not.toContain(field.missing);
      expect(control.attributes('aria-invalid')).toBeUndefined();
    },
  );

  it.runIf(field.change)(
    'shows a custom error, and is described by it, until the user changes the value or the parent drops it',
    async () => {
      const { wrapper, control } = await mountField(field, {
        modelValue: field.filled,
        customError: 'Sold out',
      });
      expect(description(control)).toContain('Sold out');
      // The server judges the next submit: the browser does not hold it back
      expect(
        wrapper
          .findAll('input, select, textarea')
          .every((element) =>
            (element.element as HTMLInputElement).checkValidity(),
          ),
      ).toBe(true);
      expect(control.attributes('aria-invalid')).toBe(
        field.group ? undefined : 'true',
      );
      await expectNoViolations();

      await field.change!(wrapper);
      await nextTick();
      expect(description(control)).not.toContain('Sold out');
      expect(control.attributes('aria-invalid')).toBeUndefined();

      await wrapper.setProps({ customError: 'Sold out again' } as never);
      await nextTick();
      expect(description(control)).toContain('Sold out again');
      await wrapper.setProps({ customError: undefined } as never);
      await nextTick();
      expect(description(control)).not.toContain('Sold out again');
    },
  );

  it('keeps its name and its error to itself next to another of its kind', async () => {
    const wrapper = await mountSuspended(
      defineComponent({
        setup: () => () => [
          h(field.component, {
            label: 'Colour',
            ...field.props,
            customError: 'Error of Colour',
          } as never),
          h(field.component, {
            label: 'Shade',
            ...field.props,
            customError: 'Error of Shade',
          } as never),
        ],
      }),
      { attachTo: document.body },
    );
    await nextTick();

    const named = wrapper.findAllComponents(field.component).map((child) => {
      const control = field.control(child as Wrapper);
      return [accessibleName(control), description(control)];
    });
    expect(named).toEqual([
      ['Colour', 'Error of Colour'],
      ['Shade', 'Error of Shade'],
    ]);
    await expectNoViolations();
  });

  it.runIf(field.attrs)(
    'puts an attribute on the control and a class and style on the wrapper',
    async () => {
      const wrapper = await mountSuspended(field.component, {
        props: { label: 'Colour', ...field.props } as never,
        attrs: { 'data-test': 'colour', class: 'wide', style: 'color: red' },
        attachTo: document.body,
      });
      await nextTick();

      const control = field.control(wrapper);
      expect(control.attributes('data-test')).toBe('colour');
      expect(control.classes()).not.toContain('wide');
      expect(control.attributes('style') ?? '').not.toContain('color: red');
      expect(wrapper.classes()).toContain('wide');
      expect(wrapper.attributes('style')).toContain('color: red');
    },
  );

  it.runIf(field.describedby)(
    "keeps a parent's aria-describedby before its own description",
    async () => {
      addToPage('<p id="hint">Weekdays only</p>');
      const { wrapper, control } = await mountField(field, {
        instruction: 'As on the label',
        'aria-describedby': 'hint',
      });
      expect(description(control)).toBe('Weekdays only As on the label');

      await wrapper.setProps({ showInvalid: true, required: true } as never);
      await vi.waitFor(() =>
        expect(description(control)).toContain(field.missing),
      );
      expect(description(control)).toContain('Weekdays only');
    },
  );
});
