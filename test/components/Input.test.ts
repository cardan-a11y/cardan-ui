import { describe, it, expect } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Input } from '#components';
import { accessibleName, checkA11y, description, expectFocused } from '../a11y';
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
  it('is named by its label and has no accessibility violations', async () => {
    const wrapper = await mountSuspended(Input, {
      props: { label: 'Name', modelValue: '' },
      attachTo: document.body,
    });

    expect(accessibleName(wrapper.get('input'))).toBe('Name');
    expect(await checkA11y()).toHaveNoViolations();
  });

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

  it('describes the field by its error only while the error shows', async () => {
    const wrapper = await mountSuspended(Input, {
      props: {
        label: 'Name',
        modelValue: '',
        required: true,
        errorMessage: 'Required',
        instruction: 'As on your passport',
      },
      attachTo: document.body,
    });

    // Invalid, but not shown yet: a valid-looking field is not described by it
    const input = wrapper.get('input');
    expect(description(input)).toBe('As on your passport');
    expect(input.attributes('aria-invalid')).toBeUndefined();

    await wrapper.setProps({ showInvalid: true });

    expect(description(input)).toBe('As on your passport Required');
    expect(input.attributes('aria-invalid')).toBe('true');
    expect(await checkA11y()).toHaveNoViolations();

    // Valid: not described, whatever the form shows
    await wrapper.setProps({ modelValue: 'Ada' });
    expect(description(input)).toBe('As on your passport');
    expect(input.attributes('aria-invalid')).toBeUndefined();
  });

  it('shows a custom error, and is described by it, until its value changes', async () => {
    const wrapper = await mountSuspended(Input, {
      props: { label: 'Email', modelValue: 'ada@example.com', type: 'email' },
      attachTo: document.body,
    });
    const input = wrapper.get('input');

    await wrapper.setProps({ customError: 'Already registered' });

    expect(description(input)).toBe('Already registered');
    expect(input.attributes('aria-invalid')).toBe('true');
    // The server judges the next submit: the browser does not hold it back
    expect(input.element.checkValidity()).toBe(true);
    expect(await checkA11y()).toHaveNoViolations();

    await input.setValue('ada@cardan.com');

    expect(description(input)).toBe('');
    expect(input.attributes('aria-invalid')).toBeUndefined();
  });

  it('puts an attribute on the input and a class and style on the wrapper', async () => {
    const wrapper = await mountSuspended(Input, {
      props: { label: 'Code', modelValue: '', inputmode: 'numeric' },
      attrs: { 'data-test': 'code', class: 'wide', style: 'color: red' },
      attachTo: document.body,
    });

    const input = wrapper.get('input');
    expect(input.attributes('inputmode')).toBe('numeric');
    expect(input.attributes('data-test')).toBe('code');
    expect(input.attributes('class')).not.toContain('wide');
    expect(input.attributes('style')).toBeUndefined();
    expect(wrapper.classes()).toContain('wide');
    expect(wrapper.attributes('style')).toContain('color: red');
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

  it('keeps its label and texts to itself next to another Input', async () => {
    await mountSuspended(
      defineComponent({
        setup: () => () => [
          h(Input, { label: 'First name', instruction: 'Given name' }),
          h(Input, { label: 'Last name', instruction: 'Family name' }),
        ],
      }),
      { attachTo: document.body },
    );

    const inputs = Array.from(document.querySelectorAll('input'));
    expect(inputs.map((input) => accessibleName(input))).toEqual([
      'First name',
      'Last name',
    ]);
    expect(inputs.map((input) => description(input))).toEqual([
      'Given name',
      'Family name',
    ]);
    expect(await checkA11y()).toHaveNoViolations();
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
});
