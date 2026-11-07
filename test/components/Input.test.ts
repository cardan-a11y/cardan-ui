import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Input } from '#components';
import { checkA11y } from '../a11y';

describe('Input', () => {
  it('labels the field and has no accessibility violations', async () => {
    const wrapper = await mountSuspended(Input, {
      props: { label: 'Name', modelValue: '' },
      attachTo: document.body,
    });

    expect(wrapper.get('label').attributes('for')).toBe(
      wrapper.get('input').attributes('id'),
    );
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('describes the field by its error message', async () => {
    const wrapper = await mountSuspended(Input, {
      props: {
        label: 'Name',
        modelValue: '',
        errorMessage: 'Required',
        showInvalid: true,
      },
      attachTo: document.body,
    });

    const input = wrapper.get('input');
    const describedBy = input.attributes('aria-describedby') ?? '';
    expect(describedBy).not.toBe('');
    for (const id of describedBy.split(' ')) {
      expect(document.getElementById(id)).not.toBeNull();
    }
    expect(await checkA11y()).toHaveNoViolations();
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
});
