import { describe, it, expect } from 'vitest';
import { h } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Select } from '#components';
import { description, expectNoViolations } from '../a11y';

const options = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
];

describe('Select', () => {
  it('shows the error under the select, above the instruction, and is described by both', async () => {
    const wrapper = await mountSuspended(Select, {
      props: {
        label: 'Colour',
        options,
        modelValue: '',
        required: true,
        errorMessage: 'Choose a colour',
        instruction: 'The colour of the badge',
        showInvalid: true,
      },
      attachTo: document.body,
    });

    const select = wrapper.get('select');
    expect(description(select)).toBe('The colour of the badge Choose a colour');

    // In reading order: the select, its error, its instruction
    const [instruction, error] = (select.attributes('aria-describedby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)!);
    expect(
      select.element.compareDocumentPosition(error!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      error!.compareDocumentPosition(instruction!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    await expectNoViolations();
  });

  it('reads the value, label and disabled state from the named keys', async () => {
    const wrapper = await mountSuspended(Select, {
      props: {
        label: 'Language',
        options: [
          { code: 'nl', name: 'Dutch', off: false },
          { code: 'en', name: 'English', off: true },
        ],
        valueKey: 'code',
        labelKey: 'name',
        disabledKey: 'off',
        modelValue: 'nl',
      },
      attachTo: document.body,
    });

    const rendered = wrapper.findAll('option').map((option) => ({
      value: option.attributes('value'),
      label: option.text(),
      disabled: (option.element as HTMLOptionElement).disabled,
    }));
    expect(rendered).toEqual([
      { value: 'nl', label: 'Dutch', disabled: false },
      { value: 'en', label: 'English', disabled: true },
    ]);
  });
});

describe('Select: no value yet', () => {
  it.each([undefined, null])(
    'shows the placeholder with %s as its value',
    async (modelValue) => {
      const wrapper = await mountSuspended(Select, {
        props: {
          label: 'Colour',
          options,
          placeholder: 'Choose a colour',
          modelValue: modelValue as never,
        },
        attachTo: document.body,
      });

      const select = wrapper.get<HTMLSelectElement>('select').element;
      expect(select.selectedOptions[0]?.text).toBe('Choose a colour');
    },
  );

  it('with options in its slot and none in options, offers only those', async () => {
    const wrapper = await mountSuspended(Select, {
      props: { label: 'Colour', modelValue: 'blue' },
      slots: {
        default: () => [
          h('option', { value: 'blue' }, 'Blue'),
          h('option', { value: 'grey' }, 'Grey'),
        ],
      },
      attachTo: document.body,
    });

    expect(wrapper.findAll('option').map((option) => option.text())).toEqual([
      'Blue',
      'Grey',
    ]);
  });

  it('without options says so in one disabled option, in its own words when given', async () => {
    const wrapper = await mountSuspended(Select, {
      props: { label: 'Colour', options: [], modelValue: undefined },
      attachTo: document.body,
    });

    const only = () => wrapper.findAll<HTMLOptionElement>('option');
    expect(only().map((option) => option.text())).toEqual(['No options']);
    expect(only()[0]!.element.disabled).toBe(true);
    expect(wrapper.get<HTMLSelectElement>('select').element.value).toBe('');

    await wrapper.setProps({ noOptionsLabel: 'No colours yet' });
    expect(only().map((option) => option.text())).toEqual(['No colours yet']);
  });

  it('keeps the placeholder out of the choices', async () => {
    const wrapper = await mountSuspended(Select, {
      props: { label: 'Colour', options, placeholder: 'Choose a colour' },
      attachTo: document.body,
    });

    const placeholder = wrapper
      .findAll<HTMLOptionElement>('option')
      .find((option) => option.text() === 'Choose a colour')!;
    expect(placeholder.element.hidden).toBe(true);
  });
});
