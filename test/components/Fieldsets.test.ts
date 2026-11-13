import { describe, it, expect, afterEach, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { LanguageSelect, ThemeSelect } from '#components';
import { accessibleName, checkA11y, roleOf } from '../a11y';

/**
 * ThemeSelect and LanguageSelect: a group of native radios under a legend.
 * The browser moves between radios of one `name` with the arrow keys, so
 * each instance has a name of its own: a menu and a settings page can show
 * the same select at once.
 */

/** The radios of each group on the page, as their names, ids and checked state */
function groups() {
  return Array.from(document.querySelectorAll('fieldset')).map((fieldset) => {
    const radios = Array.from(
      fieldset.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
    );
    return {
      fieldset,
      radios,
      names: new Set(radios.map((radio) => radio.name)),
    };
  });
}

/** Two instances, side by side */
function mountTwice(component: typeof ThemeSelect | typeof LanguageSelect) {
  return mountSuspended(
    defineComponent({ setup: () => () => [h(component), h(component)] }),
    { attachTo: document.body },
  );
}

/** Each group has one name of its own, and every radio a unique id */
function expectSeparateGroups() {
  const [first, second] = groups();
  expect(first!.names.size).toBe(1);
  expect(second!.names.size).toBe(1);
  expect([...first!.names][0]).toBeTruthy();
  expect([...first!.names][0]).not.toBe([...second!.names][0]);

  const ids = [...first!.radios, ...second!.radios].map((radio) => radio.id);
  expect(new Set(ids).size).toBe(ids.length);
}

describe('ThemeSelect', () => {
  afterEach(() => {
    useColorMode().preference = 'system';
  });

  it('is a group named "Theme" of radios named by their labels, with the preference checked', async () => {
    useColorMode().preference = 'dark';
    await mountSuspended(ThemeSelect, { attachTo: document.body });

    const { fieldset, radios } = groups()[0]!;
    expect(roleOf(fieldset)).toBe('group');
    expect(accessibleName(fieldset)).toBe('Theme');
    expect(radios.map((radio) => accessibleName(radio))).toEqual([
      'Light',
      'Dark',
      'System',
    ]);
    expect(radios.map((radio) => radio.checked)).toEqual([false, true, false]);
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('sets the preference to the radio that is chosen', async () => {
    const wrapper = await mountSuspended(ThemeSelect, {
      attachTo: document.body,
    });

    await wrapper.findAll('input')[0]!.setValue(true);

    expect(useColorMode().preference).toBe('light');
  });

  it('keeps its radios to itself next to another ThemeSelect', async () => {
    await mountTwice(ThemeSelect);

    expectSeparateGroups();
    expect(await checkA11y()).toHaveNoViolations();
  });
});

describe('LanguageSelect', () => {
  afterEach(async () => {
    await useNuxtApp().$i18n.setLocale('en');
  });

  it('is a group named "Language" of radios named by the language in that language, with the current one checked', async () => {
    await mountSuspended(LanguageSelect, { attachTo: document.body });

    const { fieldset, radios } = groups()[0]!;
    expect(roleOf(fieldset)).toBe('group');
    expect(accessibleName(fieldset)).toBe('Language');
    expect(radios.map((radio) => accessibleName(radio))).toEqual([
      'English',
      'Nederlands',
    ]);
    // A screen reader reads each name in its own language
    expect(
      radios.map((radio) => radio.labels?.[0]?.getAttribute('lang')),
    ).toEqual(['en', 'nl']);
    expect(radios.map((radio) => radio.checked)).toEqual([true, false]);
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('switches the language to the radio that is chosen', async () => {
    const wrapper = await mountSuspended(LanguageSelect, {
      attachTo: document.body,
    });

    await wrapper.findAll('input')[1]!.setValue(true);
    await vi.waitFor(() => expect(useNuxtApp().$i18n.locale.value).toBe('nl'));
    await nextTick();

    expect(wrapper.emitted('change')).toEqual([['nl']]);
    expect(accessibleName(wrapper.get('fieldset'))).toBe('Taal');
  });

  it('keeps its radios to itself next to another LanguageSelect', async () => {
    await mountTwice(LanguageSelect);

    expectSeparateGroups();
    expect(await checkA11y()).toHaveNoViolations();
  });
});
