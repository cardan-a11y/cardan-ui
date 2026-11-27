import { describe, it, expect } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Radio, RadioGroup } from '#components';
import {
  accessibleName,
  description,
  expectNoViolations,
  roleOf,
} from '../a11y';
import { mountInForm } from '../form';

const answers = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

describe('Radio', () => {
  it('is named by its label and has no accessibility violations', async () => {
    const wrapper = await mountSuspended(Radio, {
      props: { label: 'Yes', value: 'yes', name: 'answer', modelValue: 'no' },
      attachTo: document.body,
    });

    const radio = wrapper.get('input');
    expect(roleOf(radio)).toBe('radio');
    expect(accessibleName(radio)).toBe('Yes');
    await expectNoViolations();
  });
});

describe('RadioGroup', () => {
  it('is a group named by its legend, of radios named by their labels', async () => {
    const wrapper = await mountSuspended(RadioGroup, {
      props: { label: 'Answer', options: answers, modelValue: 'yes' },
      attachTo: document.body,
    });

    const group = wrapper.get('fieldset');
    expect(roleOf(group)).toBe('group');
    expect(accessibleName(group)).toBe('Answer');
    const radios = wrapper.findAll('input');
    expect(radios.map((radio) => accessibleName(radio))).toEqual(['Yes', 'No']);
    expect(radios.map((radio) => radio.element.checked)).toEqual([true, false]);
    await expectNoViolations();
  });

  it('keeps its error for the form to reveal when required', async () => {
    const wrapper = await mountSuspended(RadioGroup, {
      props: {
        label: 'Answer',
        required: true,
        options: answers,
        // As a v-model passes it before a choice
        modelValue: undefined,
      },
      attachTo: document.body,
    });

    // In the document, for the form to reveal; not describing the group yet
    const group = wrapper.get('fieldset');
    expect(wrapper.text()).toContain('Answer is missing');
    expect(description(group)).toBe('');

    await wrapper.setProps({ showInvalid: true });

    expect(description(group)).toBe('Answer is missing');
    // Not aria-invalid: ARIA 1.2 deprecates it on a group (the fieldset), and
    // a radio does not take it
    expect(group.attributes('aria-invalid')).toBeUndefined();
    expect(group.findAll('[aria-invalid]')).toHaveLength(0);
    await expectNoViolations();

    await wrapper.setProps({ modelValue: 'no' });
    expect(description(group)).toBe('');
  });

  it('shows its error after a failed submit of its form', async () => {
    const wrapper = await mountInForm(() => [
      h(RadioGroup, {
        label: 'Answer',
        required: true,
        options: answers,
        modelValue: undefined,
      }),
    ]);
    const group = wrapper.get('fieldset');

    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(description(group)).toBe('Answer is missing');
  });

  it('without a v-model, checks nothing and is missing a choice until one is made', async () => {
    const wrapper = await mountInForm(() => [
      h(RadioGroup, {
        label: 'Coffee',
        required: true,
        options: [
          { value: true, label: 'Yes' },
          { value: false, label: 'No' },
        ],
      }),
    ]);
    const group = wrapper.get('fieldset');
    const radios = wrapper.findAll<HTMLInputElement>('input[type="radio"]');

    expect(radios.map((radio) => radio.element.checked)).toEqual([
      false,
      false,
    ]);

    await wrapper.get('form').trigger('submit');
    await nextTick();
    expect(description(group)).toBe('Coffee is missing');

    await radios[1]!.setValue(true);
    expect(description(group)).toBe('');
  });

  it('shows a custom error, and is described by it, until another option is chosen', async () => {
    const wrapper = await mountSuspended(RadioGroup, {
      props: {
        label: 'Answer',
        options: answers,
        modelValue: 'yes',
        customError: 'Yes is no longer possible',
      },
      attachTo: document.body,
    });
    const group = wrapper.get('fieldset');

    expect(description(group)).toBe('Yes is no longer possible');
    await expectNoViolations();

    await wrapper.findAll('input')[1]!.setValue(true);

    expect(description(group)).toBe('');
  });

  it('gives its radios one name of their own, so the arrow keys stay in the group, also next to a group with the same options', async () => {
    await mountSuspended(
      defineComponent({
        setup: () => () => [
          h(RadioGroup, { label: 'Coffee', options: answers }),
          h(RadioGroup, { label: 'Tea', options: answers }),
        ],
      }),
      { attachTo: document.body },
    );

    const names = Array.from(document.querySelectorAll('fieldset')).map(
      (group) =>
        new Set(
          Array.from(group.querySelectorAll('input')).map(
            (radio) => radio.name,
          ),
        ),
    );
    expect(names.map((set) => set.size)).toEqual([1, 1]);
    expect([...names[0]!][0]).toBeTruthy();
    expect([...names[0]!][0]).not.toBe([...names[1]!][0]);

    const ids = Array.from(document.querySelectorAll('input')).map(
      (radio) => radio.id,
    );
    expect(new Set(ids).size).toBe(4);
    await expectNoViolations();
  });
});

describe('RadioGroup: a choice is an option', () => {
  it.each([
    { name: 'null', modelValue: null },
    { name: 'a value no option has', modelValue: 'maybe' },
  ])(
    'with $name and required, is described by its error after a failed submit',
    async ({ modelValue }) => {
      const wrapper = await mountInForm(() => [
        h(RadioGroup, {
          label: 'Answer',
          required: true,
          options: answers,
          modelValue: modelValue as never,
        }),
      ]);

      await wrapper.get('form').trigger('submit');
      await nextTick();

      expect(description(wrapper.get('fieldset'))).toBe('Answer is missing');
    },
  );

  it('counts a model that Vue checks a radio for as a choice: the text 1 for the option 1', async () => {
    const wrapper = await mountInForm(() => [
      h(RadioGroup, {
        label: 'Rating',
        required: true,
        options: [
          { value: 1, label: 'One' },
          { value: 2, label: 'Two' },
        ],
        modelValue: '1',
      }),
      // Another field fails, so the Form shows errors
      h('input', { required: true, 'aria-label': 'Other' }),
    ]);
    const radios = wrapper.findAll<HTMLInputElement>('input[type="radio"]');
    expect(radios[0]!.element.checked).toBe(true);

    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(description(wrapper.get('fieldset'))).toBe('');
  });

  it('disabled and required, is not described by an error that does not show', async () => {
    const wrapper = await mountInForm(() => [
      h(RadioGroup, {
        label: 'Answer',
        required: true,
        disabled: true,
        options: answers,
        modelValue: undefined,
      }),
      // Another field fails, so the Form shows errors
      h('input', { required: true, 'aria-label': 'Other' }),
    ]);

    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(description(wrapper.get('fieldset'))).toBe('');
  });
});
