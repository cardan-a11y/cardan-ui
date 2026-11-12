import { afterEach, describe, it, expect } from 'vitest';
import { h } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { AppHeader, AppShell } from '#components';
import { checkA11y } from '../a11y';

/** After the timeout `useRouteFocus()` waits for the new page */
function afterNavigation() {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

const page = () => [
  h('a', { href: '/somewhere' }, 'A link of the page'),
  h('main', { id: 'main', tabindex: '-1' }, [h('h1', 'Page')]),
];

describe('AppShell', () => {
  afterEach(async () => {
    await useRouter().push('/');
  });

  it('starts with the skip link, in a wrapper that can take focus', async () => {
    const wrapper = await mountSuspended(AppShell, {
      slots: { default: page },
      attachTo: document.body,
    });

    const shell = wrapper.get('.app-shell');
    expect(shell.attributes('tabindex')).toBe('-1');

    // The first link in the wrapper skips to the page's main content
    const links = wrapper.findAll('a');
    expect(links[0]!.classes()).toContain('skip-link');
    expect(links[0]!.attributes('href')).toBe('#main');
    expect(links[0]!.text()).toBe('Skip to main content');

    expect(await checkA11y()).toHaveNoViolations();
  });

  it('takes its own skip links', async () => {
    const wrapper = await mountSuspended(AppShell, {
      props: {
        skipLinks: [
          { href: '#main' },
          { href: '#filters', label: 'Skip to filters' },
        ],
      },
      slots: { default: page },
    });

    expect(
      wrapper.findAll('.skip-link').map((link) => link.attributes('href')),
    ).toEqual(['#main', '#filters']);
  });

  it('takes focus after a navigation to another page', async () => {
    const wrapper = await mountSuspended(AppShell, {
      slots: { default: page },
      attachTo: document.body,
    });

    const shell = wrapper.get('.app-shell').element;
    const link = wrapper.findAll('a')[1]!.element as HTMLAnchorElement;
    link.focus();
    expect(document.activeElement).toBe(link);

    await useRouter().push('/buttons');
    await afterNavigation();

    expect(document.activeElement).toBe(shell);
  });

  it('keeps focus where it is when only the query or hash changes', async () => {
    const wrapper = await mountSuspended(AppShell, {
      slots: { default: page },
      attachTo: document.body,
    });

    // Mounted after an earlier page of this visit, the wrapper takes focus
    // once, as after a navigation
    await afterNavigation();

    const link = wrapper.findAll('a')[1]!.element as HTMLAnchorElement;
    link.focus();

    await useRouter().push({ path: '/', query: { page: '2' }, hash: '#top' });
    await afterNavigation();

    expect(document.activeElement).toBe(link);
  });

  it('leaves focus on a field the new page focuses itself', async () => {
    const wrapper = await mountSuspended(AppShell, {
      slots: {
        default: () => [h('input', { autofocus: true, 'aria-label': 'Code' })],
      },
      attachTo: document.body,
    });

    const input = wrapper.get('input').element;
    input.focus();

    await useRouter().push('/buttons');
    await afterNavigation();

    expect(document.activeElement).toBe(input);
  });
});

describe('AppHeader', () => {
  it('is the banner, with its slots in order', async () => {
    const wrapper = await mountSuspended(AppHeader, {
      slots: {
        start: () => h('a', { href: '/' }, 'Cardan'),
        default: () =>
          h('nav', { 'aria-label': 'Main navigation' }, [
            h('a', { href: '/audits' }, 'Audits'),
          ]),
        end: () => h('button', { type: 'button' }, 'Account'),
      },
      attachTo: document.body,
    });

    const header = wrapper.get('header.app-header');
    const content = header.get('.app-header-content');

    expect(content.findAll('a, button').map((item) => item.text())).toEqual([
      'Cardan',
      'Audits',
      'Account',
    ]);
    expect(content.get('.app-header-end').text()).toBe('Account');

    expect(await checkA11y()).toHaveNoViolations();
  });

  it('has no end wrapper without something to put in it', async () => {
    const wrapper = await mountSuspended(AppHeader, {
      slots: { start: () => h('a', { href: '/' }, 'Cardan') },
    });

    expect(wrapper.find('.app-header-end').exists()).toBe(false);
  });
});
