import { vi } from 'vitest';
import { h, nextTick } from 'vue';
import { flushPromises, type DOMWrapper } from '@vue/test-utils';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { ComboBox } from '#components';
import { accessibleName } from '../a11y';
import { addToPage, leave } from '../dom';
import { mountInForm } from '../form';

/** What ComboBox.test.ts and ComboBox.multiple.test.ts share */

export const options = [
  { value: 'cheese', label: 'Cheese' },
  { value: 'ham', label: 'Ham' },
  { value: 'jalapenos', label: 'Jalapeños' },
];

type Input = Omit<DOMWrapper<HTMLInputElement>, 'exists'>;

/**
 * A ComboBox with `options` and `defaults` (its label and empty value), whose
 * v-model and v-model:selected are bound as a parent would, so a pick shows.
 * `emitted` lists the updates as `value …` and `selected …`.
 */
export async function mountComboBoxWith(
  defaults: Record<string, unknown>,
  props: Record<string, unknown> = {},
) {
  const emitted: string[] = [];
  // An option found on mount is given before `wrapper` is there
  const mounted: { setProps?: (props: Record<string, unknown>) => unknown } =
    {};
  const wrapper = await mountSuspended(ComboBox, {
    props: {
      options,
      ...defaults,
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

  const input: Input = wrapper.get<HTMLInputElement>('input[role="combobox"]');
  /** What mounting emitted: the option of a value, found in the list */
  const emittedOnMount = emitted.splice(0);

  return {
    wrapper,
    input,
    emitted,
    emittedOnMount,
    button: (name: string) =>
      wrapper
        .findAll('button')
        .find((button) => accessibleName(button) === name),
    status: () => wrapper.get('[role="status"]').text(),
  };
}

/**
 * A ComboBox with `defaults` and `name` in a Form; `submitted` holds the
 * entries of each FormData that was submitted.
 */
export async function mountComboBoxInForm(
  defaults: Record<string, unknown>,
  props: Record<string, unknown> = {},
) {
  const submitted: [string, FormDataEntryValue][][] = [];
  const model = { value: (props.modelValue ?? defaults.modelValue) as unknown };
  const wrapper = await mountInForm(
    () => [
      h(ComboBox, {
        options,
        ...defaults,
        ...props,
        modelValue: model.value,
        'onUpdate:modelValue': (value: unknown) => {
          model.value = value;
          wrapper.vm.$forceUpdate();
        },
      } as never),
    ],
    { onSubmit: (data: FormData) => submitted.push([...data.entries()]) },
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

/** Types into the field, as the user's own edit */
export async function type(input: Input, text: string) {
  input.element.focus();
  input.element.value = text;
  await input.trigger('input');
}

/** Focus leaves the component for another element of the page */
export async function leaveField(input: Input) {
  const next = addToPage('<button type="button">Next</button>');
  leave(input.element, next);
  await nextTick();
}

/** Waits `ms`, on the fake clock once a test turned it on */
export async function pause(ms = 10) {
  if (vi.isFakeTimers()) await vi.advanceTimersByTimeAsync(ms);
  else await new Promise((resolve) => setTimeout(resolve, ms));
  await nextTick();
}
