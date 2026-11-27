import { describe, it, expect } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Input } from '#components';
import { accessibleName, description, expectFocused } from '../a11y';
import { mountInForm } from '../form';

/** An Input with a v-model in a Form with a submit button */
async function mountField(props: Record<string, unknown>, value: string) {
  const model = ref(value);
  const wrapper = await mountInForm(() => [
    h(Input, {
      ...props,
      modelValue: model.value,
      'onUpdate:modelValue': (newValue?: string | number) => {
        model.value = String(newValue ?? '');
      },
    }),
    h('button', { type: 'submit' }, 'Send'),
  ]);
  return { wrapper, input: wrapper.get('input') };
}

describe('Input', () => {
  it('names a required field with its "required" chip as a word of its own', async () => {
    const wrapper = await mountSuspended(Input, {
      props: { label: 'Password', modelValue: '', required: true },
      attachTo: document.body,
    });

    expect(accessibleName(wrapper.get('input'))).toBe('Password required');
  });

  it('is described by its instruction', async () => {
    const wrapper = await mountSuspended(Input, {
      props: {
        label: 'Name',
        modelValue: '',
        instruction: 'As on your passport',
      },
      attachTo: document.body,
    });

    expect(description(wrapper.get('input'))).toBe('As on your passport');
  });

  it('puts inputmode on the input', async () => {
    const wrapper = await mountSuspended(Input, {
      props: { label: 'Code', modelValue: '', inputmode: 'numeric' },
      attachTo: document.body,
    });

    expect(wrapper.get('input').attributes('inputmode')).toBe('numeric');
  });

  it('lets a number outside min and max reach the model', async () => {
    let value: unknown;
    const wrapper = await mountSuspended(Input, {
      props: {
        label: 'Participants',
        type: 'number',
        min: 1,
        max: 10,
        modelValue: 1,
        'onUpdate:modelValue': (newValue: unknown) => {
          value = newValue;
        },
      },
      attachTo: document.body,
    });

    await wrapper.get('input').setValue('15');

    expect(value).toBe('15');
  });

  // The Laravel APIs trim a text and refuse an empty one
  it('is missing with only spaces when required, after a failed submit', async () => {
    const { wrapper, input } = await mountField(
      { label: 'Name', required: true },
      '   ',
    );

    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(input.attributes('aria-invalid')).toBe('true');
    expect(description(input)).toBe('Name is missing');
    expectFocused(input);

    await input.setValue('   A');

    expect(input.attributes('aria-invalid')).toBeUndefined();
    expect(description(input)).toBe('');
    expect((input.element as HTMLInputElement).checkValidity()).toBe(true);
  });

  it('accepts only spaces when optional', async () => {
    const { input } = await mountField({ label: 'Name' }, '   ');

    expect((input.element as HTMLInputElement).checkValidity()).toBe(true);
  });

  // `email:filter` (PHP's FILTER_VALIDATE_EMAIL) refuses a domain without a dot
  it('refuses an e-mail address without a dot in its domain, with the e-mail message', async () => {
    const { wrapper, input } = await mountField(
      { label: 'Email', type: 'email' },
      'a@b',
    );

    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(input.attributes('aria-invalid')).toBe('true');
    expect(description(input)).toBe('Email address is invalid');
    expectFocused(input);

    await input.setValue('a@b.nl');

    expect(input.attributes('aria-invalid')).toBeUndefined();
    expect((input.element as HTMLInputElement).checkValidity()).toBe(true);
  });

  it.each([
    'ada+news@example.com',
    'ada@mail.cardan.nl',
    'ada@example.photography',
    'ada.lovelace@my-site.example',
    'ADA@EXAMPLE.COM',
    // As a browser sends bücher.de; happy-dom refuses the letters themselves,
    // the browser check types them
    'ada@xn--bcher-kva.de',
  ])('accepts the e-mail address %s', async (address) => {
    const { input } = await mountField(
      { label: 'Email', type: 'email', required: true },
      address,
    );

    expect((input.element as HTMLInputElement).checkValidity()).toBe(true);
  });

  it('lets a pattern of its own replace the dot check', async () => {
    const { input } = await mountField(
      { label: 'Email', type: 'email', pattern: '.+@.+' },
      'admin@localhost',
    );

    expect((input.element as HTMLInputElement).checkValidity()).toBe(true);
  });

  it('refuses only spaces in a required field whose own pattern allows them', async () => {
    const { input } = await mountField(
      { label: 'Name', required: true, pattern: '[a-z ]*' },
      '   ',
    );
    const element = input.element as HTMLInputElement;

    expect(element.checkValidity()).toBe(false);

    await input.setValue('ada lovelace');

    expect(element.checkValidity()).toBe(true);
  });

  it('shows a custom error over the e-mail message', async () => {
    const wrapper = await mountSuspended(Input, {
      props: {
        label: 'Email',
        type: 'email',
        modelValue: 'a@b',
        showInvalid: true,
        customError: 'Already registered',
      },
      attachTo: document.body,
    });

    expect(description(wrapper.get('input'))).toBe('Already registered');
  });

  it('takes a value filled in without an input event on change, trimmed under v-model.trim', async () => {
    const model = ref('');
    const wrapper = await mountSuspended(
      defineComponent({
        setup: () => () =>
          h(Input, {
            label: 'Name',
            modelValue: model.value,
            modelModifiers: { trim: true },
            'onUpdate:modelValue': (value?: string | number) => {
              model.value = String(value ?? '');
            },
          }),
      }),
      { attachTo: document.body },
    );
    const input = wrapper.get('input');

    input.element.value = ' Ada ';
    await input.trigger('change');

    expect(model.value).toBe('Ada');
  });

  it('checks its constraints on every keystroke, also one that leaves a trimmed model as it was', async () => {
    const text = ref('Al');
    const wrapper = await mountSuspended(
      defineComponent({
        setup: () => () =>
          h(Input, {
            label: 'Name',
            minlength: 3,
            showInvalid: true,
            modelValue: text.value,
            // As `v-model.trim` does
            'onUpdate:modelValue': (value?: string | number) => {
              text.value = String(value ?? '').trim();
            },
          }),
      }),
      { attachTo: document.body },
    );
    const field = wrapper.get('input');
    field.element.value = 'A';
    await field.trigger('input');
    field.element.value = 'Al';
    await field.trigger('input');
    expect(field.attributes('aria-invalid')).toBe('true');

    field.element.value = 'Al ';
    await field.trigger('input');

    expect(field.attributes('aria-invalid')).toBeUndefined();
  });
});

describe('Input: the error names the check that failed', () => {
  it.each([
    {
      check: 'a number below min',
      props: { type: 'number', min: 2, max: 9 },
      value: '1',
      error: 'Enter 2 or more',
    },
    {
      check: 'a number above max',
      props: { type: 'number', min: 2, max: 9 },
      value: '12',
      error: 'Enter 9 or less',
    },
    {
      check: 'a text below minlength',
      props: { minlength: 3 },
      value: 'ab',
      error: 'Enter at least 3 characters',
    },
    {
      check: 'a text above maxlength',
      props: { maxlength: 3 },
      value: 'abcd',
      error: 'Enter at most 3 characters',
    },
    {
      check: 'an empty required field, before its length',
      props: { required: true, minlength: 3 },
      value: '',
      error: 'Code is missing',
    },
    {
      check: 'a value its pattern refuses',
      props: { pattern: '[0-9]+' },
      value: 'abc',
      error: 'Value invalid',
    },
  ])('$check', async ({ props, value, error }) => {
    const { wrapper, input } = await mountField(
      { label: 'Code', ...props },
      value,
    );

    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(input.attributes('aria-invalid')).toBe('true');
    expect(description(input)).toBe(error);
  });
});
