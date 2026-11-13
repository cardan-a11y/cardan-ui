import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { ErrorPageContent } from '#components';
import { errorPageFallback } from '../../app/components/ErrorPageContent.vue';
import { accessibleName, checkA11y, roleOf } from '../a11y';

/**
 * What the error page says and where its link leads. The page itself in the
 * app's layout, the back navigation, focus and production without the
 * details are in test/browser/error-page.spec.ts.
 */
async function mount(props: Record<string, unknown> = {}) {
  const wrapper = await mountSuspended(ErrorPageContent, {
    props,
    attachTo: document.body,
  });
  // The link is upgraded a task after mount
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve));
  await nextTick();
  return wrapper;
}

function wayOn(wrapper: Awaited<ReturnType<typeof mount>>) {
  return wrapper.get('a').element as HTMLAnchorElement;
}

function setReferrer(value: string) {
  Object.defineProperty(document, 'referrer', { value, configurable: true });
}

describe('ErrorPageContent', () => {
  beforeEach(() => {
    window.history.replaceState({ ...window.history.state, back: null }, '');
    setReferrer('');
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await useNuxtApp().$i18n.setLocale('en');
  });

  it.each([
    [404, 'Page not found', /mistyped/],
    [410, 'Page not found', /mistyped/],
    [401, 'No access', /not signed in/],
    [403, 'No access', /not signed in/],
    [500, 'Something went wrong', /on our side/],
    [503, 'Something went wrong', /on our side/],
    [429, 'This page cannot be shown', /while opening/],
    [400, 'This page cannot be shown', /while opening/],
  ])(
    'says what %i means, as the heading and the title',
    async (status, heading, text) => {
      const wrapper = await mount({ status });

      const h1 = wrapper.get('h1');
      expect(roleOf(h1.element)).toBe('heading');
      expect(h1.text()).toBe(heading);
      expect(wrapper.findAll('p')[0]!.text()).toMatch(text);
      expect(wrapper.text()).toContain(`Error code ${status}`);
      await vi.waitFor(() => expect(document.title).toContain(heading));
    },
  );

  it('is a server error without a status', async () => {
    const wrapper = await mount();

    expect(wrapper.get('h1').text()).toBe('Something went wrong');
    expect(wrapper.text()).toContain('Error code 500');
  });

  it("says it in the page's language", async () => {
    await useNuxtApp().$i18n.setLocale('nl');
    const wrapper = await mount({ status: 404 });

    expect(wrapper.get('h1').text()).toBe('Pagina niet gevonden');
    expect(wrapper.text()).toContain('Foutcode 404');
    expect(accessibleName(wayOn(wrapper))).toBe('Naar de homepagina');
    expect(wrapper.find('[lang]').exists()).toBe(false);
  });

  it("puts the page's own text in place of the status's, as text", async () => {
    const wrapper = await mount({
      status: 404,
      text: 'Audit <b>12</b> not found.',
    });

    expect(wrapper.findAll('p')[0]!.text()).toBe('Audit <b>12</b> not found.');
    expect(wrapper.find('b').exists()).toBe(false);
    expect(wrapper.text()).not.toMatch(/mistyped/);
  });

  it('leads home without a page to go back to, as a full page load', async () => {
    const back = vi.spyOn(useRouter(), 'back').mockImplementation(() => {});
    const wrapper = await mount({ status: 404 });
    const link = wayOn(wrapper);

    expect(roleOf(link)).toBe('link');
    expect(accessibleName(link)).toBe('Go to the homepage');
    expect(link.getAttribute('href')).toBe('/');

    // The browser's own: nothing of the page that failed can overtake it
    let prevented: boolean | undefined;
    document.addEventListener(
      'click',
      (event) => {
        prevented = event.defaultPrevented;
        event.preventDefault();
      },
      { once: true },
    );
    link.click();
    expect(prevented).toBe(false);
    expect(back).not.toHaveBeenCalled();

    expect(await checkA11y()).toHaveNoViolations();
  });

  it('goes back to the earlier page of the app in the history', async () => {
    window.history.replaceState(
      { ...window.history.state, back: '/buttons' },
      '',
    );
    const back = vi.spyOn(useRouter(), 'back').mockImplementation(() => {});
    const wrapper = await mount({ status: 404 });
    const link = wayOn(wrapper);

    expect(accessibleName(link)).toBe('Back to the previous page');
    expect(link.getAttribute('href')).toBe('/buttons');

    link.click();
    expect(back).toHaveBeenCalledOnce();
  });

  it('shows the page the address stayed on again, after middleware refused the next one', async () => {
    window.history.replaceState(
      { ...window.history.state, back: '/buttons' },
      '',
    );
    const back = vi.spyOn(useRouter(), 'back').mockImplementation(() => {});
    const here = window.location.pathname + window.location.search;
    const wrapper = await mountSuspended(ErrorPageContent, {
      props: { status: 403 },
      attachTo: document.body,
    });
    // The error as the error-origin plugin marks it, before the component
    // reads it a task after mount
    Object.defineProperty(
      showError({ status: 403 }),
      Symbol.for('cardan-ui:stopped-navigation'),
      { value: here, configurable: true },
    );
    await new Promise((resolve) => setTimeout(resolve));
    await nextTick();
    const link = wayOn(wrapper);

    expect(accessibleName(link)).toBe('Back to the previous page');
    expect(link.getAttribute('href')).toBe(here);

    link.click();
    await vi.waitFor(() => expect(useError().value).toBeUndefined());
    expect(back).not.toHaveBeenCalled();
  });

  it('links to a page of this site that loaded it, not to another site', async () => {
    setReferrer(new URL('/tabs?x=1', window.location.href).href);
    window.history.pushState({ ...window.history.state, back: null }, '');
    const back = vi.spyOn(useRouter(), 'back').mockImplementation(() => {});
    const wrapper = await mount({ status: 404 });

    expect(accessibleName(wayOn(wrapper))).toBe('Back to the previous page');
    expect(wayOn(wrapper).getAttribute('href')).toMatch(/\/tabs\?x=1$/);

    // A link the browser follows: the entry before need not be the referrer
    let prevented: boolean | undefined;
    document.addEventListener(
      'click',
      (event) => {
        prevented = event.defaultPrevented;
        event.preventDefault();
      },
      { once: true },
    );
    wayOn(wrapper).click();
    expect(prevented).toBe(false);
    expect(back).not.toHaveBeenCalled();

    setReferrer('https://www.google.com/');
    const fromSearch = await mount({ status: 404 });
    expect(accessibleName(wayOn(fromSearch))).toBe('Go to the homepage');
  });

  it('leaves a click that opens a new tab to the browser', async () => {
    window.history.replaceState(
      { ...window.history.state, back: '/buttons' },
      '',
    );
    const back = vi.spyOn(useRouter(), 'back').mockImplementation(() => {});
    const wrapper = await mount({ status: 404 });

    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    });
    wayOn(wrapper).dispatchEvent(event);

    expect(back).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("never shows the error's own English text outside development, nor as HTML", async () => {
    const wrapper = await mount({
      status: 500,
      error: {
        statusText: 'Internal <i>Server</i> Error',
        message: 'Boom',
        stack: 'Error: Boom\n    at setup (page.vue:1:1)',
      },
    });

    // vitest builds without `import.meta.dev`, as production does; the dev
    // server shows the details in a <pre lang="en">
    expect(wrapper.text()).not.toMatch(/Internal|Boom|at setup/);
    expect(wrapper.find('i').exists()).toBe(false);
  });

  it('has the English of en.json for when i18n did not start', () => {
    const en = JSON.parse(
      readFileSync(resolve(__dirname, '../../i18n/locales/en.json'), 'utf8'),
    );

    expect(errorPageFallback).toEqual(en['error-page']);
  });
});
