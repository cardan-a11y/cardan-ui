import { afterEach, describe, it, expect, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import type { VueWrapper } from '@vue/test-utils';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { AppHeader, AppShell, Dialog, MobileMenu } from '#components';
import { accessibleName, checkA11y, expectFocused, roleOf } from '../a11y';
import { afterRouteFocus } from '../dom';

/**
 * AppShell puts the skip link first and takes focus after a navigation
 * (`useRouteFocus()`), so the next Tab is the skip link. That Tab, the skip
 * link's jump and the route announcement need a browser.
 */
const page = () => [
  h('a', { href: '/somewhere' }, 'A link of the page'),
  h('main', { id: 'main', tabindex: '-1' }, [h('h1', 'Page')]),
];

/** The shell's own element, which takes focus */
const shellOf = (wrapper: VueWrapper) => wrapper.element as HTMLElement;

/** The link with this name */
function link(wrapper: VueWrapper, name: string) {
  const found = wrapper.findAll('a').find((a) => accessibleName(a) === name);
  if (!found) throw new Error(`No link named ${name}`);
  return found.element as HTMLAnchorElement;
}

const tabbable =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

describe('AppShell', () => {
  afterEach(async () => {
    await useRouter().push('/');
  });

  it('starts with the skip link, to the main content', async () => {
    const wrapper = await mountSuspended(AppShell, {
      slots: { default: page },
      attachTo: document.body,
    });

    // The first stop of the Tab order in the shell
    const first = shellOf(wrapper).querySelector(tabbable)!;
    expect(roleOf(first)).toBe('link');
    expect(accessibleName(first)).toBe('Skip to main content');

    // Its target is on the page and can take focus
    const target = document.getElementById(
      first.getAttribute('href')!.slice(1),
    )!;
    expect(target.tagName).toBe('MAIN');
    expect(target.getAttribute('tabindex')).toBe('-1');

    expect(await checkA11y()).toHaveNoViolations();
  });

  it('takes its own skip links, in order', async () => {
    const wrapper = await mountSuspended(AppShell, {
      slots: { default: page },
      props: {
        skipLinks: [
          { href: '#main' },
          { href: '#filters', label: 'Skip to filters' },
        ],
      },
      attachTo: document.body,
    });

    const links = Array.from(shellOf(wrapper).querySelectorAll(tabbable));
    expect(
      links.slice(0, 2).map((a) => [accessibleName(a), a.getAttribute('href')]),
    ).toEqual([
      ['Skip to main content', '#main'],
      ['Skip to filters', '#filters'],
    ]);
  });

  it('takes focus after a navigation to another page', async () => {
    const wrapper = await mountSuspended(AppShell, {
      slots: { default: page },
      attachTo: document.body,
    });
    await afterRouteFocus();

    // A link in the header, which the next page keeps
    link(wrapper, 'A link of the page').focus();

    await useRouter().push('/buttons');
    await afterRouteFocus();

    expectFocused(shellOf(wrapper));
  });

  it('moves focus to the skip link target itself, without a navigation', async () => {
    const wrapper = await mountSuspended(AppShell, {
      slots: { default: page },
      attachTo: document.body,
    });
    await afterRouteFocus();
    const before = useRoute().fullPath;
    const navigation = vi.fn();
    const removeGuard = useRouter().beforeEach(navigation);

    link(wrapper, 'Skip to main content').click();
    await afterRouteFocus();
    removeGuard();

    expectFocused(document.getElementById('main')!);
    expect(window.location.hash).toBe('');
    expect(useRoute().fullPath).toBe(before);
    expect(navigation).not.toHaveBeenCalled();
  });

  it('takes focus when it mounts after the app has started, as around the error page, but not on the first page of a visit', async () => {
    const nuxtApp = useNuxtApp();
    // The first page of a visit: no earlier page in the history
    window.history.replaceState({ ...window.history.state, back: null }, '');

    // The first render, with AppShell straight in app.vue: Nuxt ends the
    // hydration (here: a later sibling's setup) before the shell's mounted
    // hook runs
    const EndHydration = defineComponent({
      setup() {
        nuxtApp.isHydrating = false;
        return () => null;
      },
    });
    nuxtApp.isHydrating = true;
    try {
      await mountSuspended(
        defineComponent({
          render: () =>
            h('div', [h(AppShell, null, { default: page }), h(EndHydration)]),
        }),
        { attachTo: document.body },
      );
      await afterRouteFocus();
      expect(document.activeElement).toBe(document.body);
    } finally {
      nuxtApp.isHydrating = false;
    }

    // The error page replaces the app on the page the user was on
    const errorShell = await mountSuspended(AppShell, {
      slots: { default: page },
      attachTo: document.body,
    });
    await afterRouteFocus();
    expectFocused(shellOf(errorShell));
  });

  it('keeps focus where it is when only the query or hash changes', async () => {
    const wrapper = await mountSuspended(AppShell, {
      slots: { default: page },
      attachTo: document.body,
    });
    // Mounted after an earlier page of this visit, the wrapper takes focus
    // once, as after a navigation
    await afterRouteFocus();

    const pageLink = link(wrapper, 'A link of the page');
    pageLink.focus();

    await useRouter().push({ path: '/', query: { page: '2' }, hash: '#top' });
    await afterRouteFocus();

    expectFocused(pageLink);
  });

  it('leaves focus where the new page puts it itself', async () => {
    const wrapper = await mountSuspended(AppShell, {
      slots: {
        default: () => [
          h('a', { href: '/somewhere' }, 'A link of the page'),
          h('main', [
            // The code field of a second factor, or AuthPage's frame
            h('input', { 'aria-label': 'Code' }),
            h('div', { tabindex: '-1', 'aria-label': 'Frame' }, 'Frame'),
          ]),
        ],
      },
      attachTo: document.body,
    });
    await afterRouteFocus();

    for (const [selector, path] of [
      ['input', '/buttons'],
      ['main div', '/tabs'],
    ] as const) {
      link(wrapper, 'A link of the page').focus();

      await useRouter().push(path);
      // The new page moves focus as it mounts, before the shell would
      const moved = wrapper.get(selector).element as HTMLElement;
      moved.focus();
      await afterRouteFocus();

      expectFocused(moved);
    }
  });

  it('focuses the element the address names, when the new page has it', async () => {
    const wrapper = await mountSuspended(AppShell, {
      slots: {
        default: () => [
          h('a', { href: '/somewhere' }, 'A link of the page'),
          h('section', { id: 'non-text-content' }, 'Non-text content'),
        ],
      },
      attachTo: document.body,
    });
    await afterRouteFocus();

    const section = wrapper.get('#non-text-content').element as HTMLElement;
    section.scrollIntoView = vi.fn();
    link(wrapper, 'A link of the page').focus();

    await useRouter().push('/buttons#non-text-content');
    await afterRouteFocus();

    // Made focusable for it, then focused and brought into view
    expectFocused(section);
    expect(section.scrollIntoView).toHaveBeenCalled();

    // A hash that names nothing on the page: the shell, as without one
    link(wrapper, 'A link of the page').focus();
    await useRouter().push('/tabs#nothing-here');
    await afterRouteFocus();
    expectFocused(shellOf(wrapper));
  });

  it('takes focus after a link in the mobile menu, once the menu has closed', async () => {
    const wrapper = await mountSuspended(AppShell, {
      slots: {
        default: () => [
          h('header', [
            h(MobileMenu, {
              list: [{ id: 1, label: 'Buttons', to: '/buttons' }],
            }),
          ]),
          h('main', { id: 'main', tabindex: '-1' }, [h('h1', 'Page')]),
        ],
      },
      attachTo: document.body,
    });
    await afterRouteFocus();

    const shell = shellOf(wrapper);
    const trigger = wrapper
      .findAll('button')
      .find((button) => button.attributes('aria-expanded') !== undefined)!;
    await trigger.trigger('click');
    await nextTick();
    await nextTick();

    const dialog = document.querySelector<HTMLDialogElement>('dialog[open]')!;
    // The menu opened over the page, which it made inert
    expect(shell.closest('[inert]')).not.toBeNull();

    // Its exit animation runs until the test ends it
    let endAnimation = () => {};
    const finished = new Promise<void>((resolve) => (endAnimation = resolve));
    dialog.getAnimations = () => [{ finished } as unknown as Animation];

    // A link in the menu is followed; the menu starts closing as the new
    // page comes in
    const menuLink = Array.from(dialog.querySelectorAll('a')).find(
      (a) => accessibleName(a) === 'Buttons',
    )!;
    menuLink.focus();
    const close = Array.from(dialog.querySelectorAll('button')).find(
      (button) => accessibleName(button) === 'Close menu',
    )!;
    close.click();
    await useRouter().push('/buttons');
    await afterRouteFocus();

    // Still closing: the shell is inert and cannot take focus yet
    expect(dialog.open).toBe(true);
    expect(document.activeElement).not.toBe(shell);

    endAnimation();
    await vi.waitFor(() => expect(dialog.open).toBe(false));
    await afterRouteFocus();

    expectFocused(shell);
  });

  it('takes focus after a link in a modal Dialog, once the dialog has closed and given focus back to its opener', async () => {
    const wrapper = await mountSuspended(AppShell, {
      slots: {
        default: () => [
          h('header', [
            h('button', { type: 'button' }, 'Search'),
            h(
              Dialog,
              { label: 'Search results' },
              {
                default: ({ closeDialog }: { closeDialog: () => void }) =>
                  h(
                    'a',
                    {
                      href: '/buttons',
                      onClick: (event: Event) => {
                        event.preventDefault();
                        closeDialog();
                      },
                    },
                    'Buttons',
                  ),
              },
            ),
          ]),
          h('main', { id: 'main', tabindex: '-1' }, [h('h1', 'Page')]),
        ],
      },
      attachTo: document.body,
    });
    await afterRouteFocus();

    const shell = shellOf(wrapper);
    const opener = wrapper.get('header > button').element as HTMLButtonElement;
    const dialog = wrapper.get('dialog').element as HTMLDialogElement;

    // happy-dom has no top layer: `showModal()` only sets `open`. The dialog
    // is modal while open, as the browser's `:modal` says, and the browser
    // gives focus back to its opener as it closes, before `close`
    const matches = dialog.matches.bind(dialog);
    dialog.matches = ((selector: string) =>
      selector === ':modal'
        ? dialog.open
        : matches(selector)) as typeof dialog.matches;
    const close = dialog.close.bind(dialog);
    dialog.close = (returnValue?: string) => {
      opener.focus();
      close(returnValue);
    };

    opener.focus();
    wrapper.findComponent(Dialog).vm.openDialog();
    await nextTick();
    expect(dialog.open).toBe(true);
    // No `inert` attribute: the top layer makes the page inert without one
    expect(shell.closest('[inert]')).toBeNull();

    // Its exit animation runs until the test ends it
    let endAnimation = () => {};
    const finished = new Promise<void>((resolve) => (endAnimation = resolve));
    dialog.getAnimations = () => [{ finished } as unknown as Animation];

    // A result is followed: the dialog starts closing as the new page comes in
    const result = Array.from(dialog.querySelectorAll('a')).find(
      (a) => accessibleName(a) === 'Buttons',
    )!;
    result.focus();
    result.click();
    await useRouter().push('/buttons');
    await afterRouteFocus();

    // Still open over the page, which cannot take focus yet
    expect(dialog.open).toBe(true);
    expect(document.activeElement).not.toBe(shell);

    endAnimation();
    await vi.waitFor(() => expect(dialog.open).toBe(false));
    await afterRouteFocus();

    // Not left on the opener the dialog gave focus back to
    expectFocused(shell);
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

    const header = wrapper.get('header');
    expect(roleOf(header)).toBe('banner');
    expect(
      header.findAll('a, button').map((item) => accessibleName(item)),
    ).toEqual(['Cardan', 'Audits', 'Account']);

    expect(await checkA11y()).toHaveNoViolations();
  });
});
