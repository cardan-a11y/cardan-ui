import { describe, it, expect } from 'vitest';
import { nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Search } from '#components';
import { accessibleName, checkA11y, expectFocused, roleOf } from '../a11y';

async function mountSearch(props: Record<string, unknown> = {}) {
  const wrapper = await mountSuspended(Search, {
    props: {
      modelValue: '',
      'onUpdate:modelValue': (value?: string | number) => {
        void wrapper.setProps({ modelValue: value });
      },
      ...props,
    },
    attachTo: document.body,
  });

  /** The button with this name, if there is one */
  const button = (name: string) =>
    wrapper.findAll('button').find((button) => accessibleName(button) === name);

  return { wrapper, input: wrapper.get('input'), button };
}

describe('Search', () => {
  it('is a search landmark with a search field and a submit button, named "search" by default', async () => {
    const { wrapper, input, button } = await mountSearch();

    expect(roleOf(wrapper.get('form'))).toBe('search');
    expect(roleOf(input)).toBe('searchbox');
    expect(accessibleName(input)).toBe('search');
    expect(button('search')?.attributes('type')).toBe('submit');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('names the field by its label', async () => {
    const { input } = await mountSearch({ label: 'Search courses' });

    expect(accessibleName(input)).toBe('Search courses');
  });

  it('hands on the search term when the form is submitted', async () => {
    const { wrapper, input } = await mountSearch();

    await input.setValue('accessibility');
    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(wrapper.emitted('submit')).toEqual([['accessibility']]);
  });

  it('has a named reset button only while there is a term, which empties the field and keeps focus in it', async () => {
    const { wrapper, input, button } = await mountSearch();
    expect(button('Reset')).toBeUndefined();

    await input.setValue('accessibility');
    const reset = button('Reset');
    expect(reset?.attributes('type')).toBe('reset');
    expect(await checkA11y()).toHaveNoViolations();

    reset!.element.focus();
    await reset!.trigger('click');

    expect(input.element.value).toBe('');
    expect(wrapper.emitted('reset')).toEqual([['']]);
    // The button is gone: focus goes back to the field, not to the body
    expect(button('Reset')).toBeUndefined();
    expectFocused(input);
  });

  it('has no submit button with hide-submit-button, but the landmark and the field', async () => {
    const { wrapper, input, button } = await mountSearch({
      hideSubmitButton: true,
    });

    expect(button('search')).toBeUndefined();
    expect(roleOf(wrapper.get('form'))).toBe('search');
    expect(accessibleName(input)).toBe('search');
    expect(await checkA11y()).toHaveNoViolations();
  });
});
