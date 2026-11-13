import { describe, it, expect, vi, afterEach } from 'vitest';
import { h, nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { UserMenu } from '#components';
import { useNuxtApp, useRouter } from '#imports';
import { accessibleName, checkA11y, expectFocused, roleOf } from '../a11y';
import { addToPage, press, toggle } from '../dom';

/**
 * A non-modal disclosure (see its docblock): a button that shows the links
 * and buttons of the slot in a native popover, and the sign-out dialog.
 * happy-dom has no Popover API, so the browser opening and light-dismissing
 * the panel, its place in the top layer and Tab past the last item are for
 * the browser suite (usermenu.spec.ts); this pins what the component does on
 * the browser's events.
 */

/**
 * The Popover API, as far as the component uses it: the open state that
 * `:popover-open` reads, and `showPopover()` and `hidePopover()`, which fire
 * the toggle event
 */
function fakePopover(element: HTMLElement) {
  let open = false;
  const matches = element.matches.bind(element);
  element.matches = ((selector: string) =>
    selector === ':popover-open'
      ? open
      : matches(selector)) as typeof element.matches;

  const showPopover = vi.fn(() => {
    if (open) return;
    open = true;
    void toggle(element, 'open');
  });
  const hidePopover = vi.fn(() => {
    if (!open) return;
    open = false;
    void toggle(element, 'closed');
  });
  element.showPopover = showPopover;
  element.hidePopover = hidePopover;

  return {
    showPopover,
    hidePopover,
    isOpen: () => open,
    /** Opened by the browser: a click on the trigger */
    async show() {
      open = true;
      await toggle(element, 'open');
      // The component focuses the first item in the tick after the event
      await nextTick();
    },
  };
}

async function mountUserMenu(logout = vi.fn()) {
  const wrapper = await mountSuspended(UserMenu, {
    props: {
      initials: 'MH',
      logout,
      'onUpdate:modelValue': (value: boolean) =>
        wrapper.setProps({ modelValue: value }),
    },
    slots: {
      default: ({ hideMenu }: { hideMenu: () => void }) => [
        h('a', { href: '/profile' }, 'Profile'),
        h('button', { type: 'button', onClick: hideMenu }, 'Settings'),
      ],
    },
    attachTo: document.body,
  });

  const exposed = wrapper.vm as unknown as {
    openLogoutDialog: () => Promise<void>;
  };
  const dialog = wrapper.get('dialog').element as HTMLDialogElement;
  const trigger = wrapper.get('button[popovertarget]').element as HTMLElement;
  const panel = document.getElementById(
    trigger.getAttribute('popovertarget')!,
  )!;

  /** The element in the panel with this name */
  const item = (name: string) => {
    const found = Array.from(
      panel.querySelectorAll<HTMLElement>('a, button'),
    ).find((element) => accessibleName(element) === name);
    if (!found) throw new Error(`Nothing named ${name}`);
    return found;
  };

  return {
    wrapper,
    exposed,
    dialog,
    trigger,
    panel,
    item,
    logout,
    popover: fakePopover(panel),
  };
}

/** Focus leaving one element for another, as the browser reports it */
function leave(from: Element, to: Element | null) {
  from.dispatchEvent(
    new FocusEvent('focusout', { relatedTarget: to, bubbles: true }),
  );
}

const inert = () => document.querySelectorAll('[inert]').length;

afterEach(async () => {
  await useNuxtApp().$i18n.setLocale('en');
  await useRouter().push('/');
});

describe('UserMenu', () => {
  it('is a button named "User menu" and the initials it shows, that controls the panel', async () => {
    const { trigger, panel, item } = await mountUserMenu();

    expect(roleOf(trigger)).toBe('button');
    // The visible initials stay in the name (WCAG 2.5.3)
    expect(accessibleName(trigger)).toBe('User menu MH');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.hasAttribute('popover')).toBe(true);
    // Rendered while closed, where the native popover hides it
    expect(panel.contains(item('Profile'))).toBe(true);
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('is named "Gebruikersmenu" and the initials in Dutch', async () => {
    await useNuxtApp().$i18n.setLocale('nl');
    const { trigger } = await mountUserMenu();

    expect(accessibleName(trigger)).toBe('Gebruikersmenu MH');
  });

  it('says it is open when the browser opens it, moves focus to the first item, and makes nothing inert', async () => {
    const { wrapper, trigger, item, popover } = await mountUserMenu();

    await popover.show();

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]]);
    expectFocused(item('Profile'));
    expect(inert()).toBe(0);
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('opens and closes through v-model, anchored to its trigger', async () => {
    const { wrapper, trigger, popover } = await mountUserMenu();

    await wrapper.setProps({ modelValue: true });
    expect(popover.showPopover).toHaveBeenCalledWith({ source: trigger });
    expect(popover.isOpen()).toBe(true);

    await wrapper.setProps({ modelValue: false });
    expect(popover.isOpen()).toBe(false);
    await nextTick();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on Escape and gives focus back to the trigger', async () => {
    const { trigger, popover } = await mountUserMenu();
    await popover.show();

    await press('Escape');
    await nextTick();

    expect(popover.isOpen()).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expectFocused(trigger);
  });

  it("closes from the slot's hideMenu, with focus back on the trigger", async () => {
    const { trigger, item, popover } = await mountUserMenu();
    await popover.show();

    item('Settings').click();
    await nextTick();
    await nextTick();

    expect(popover.isOpen()).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expectFocused(trigger);
  });

  it('closes when focus leaves it, but not for a move within it or to its trigger', async () => {
    const { trigger, item, popover } = await mountUserMenu();
    const outside = addToPage('<button>Outside</button>');
    await popover.show();

    leave(item('Profile'), item('Settings'));
    leave(item('Settings'), trigger);
    leave(trigger, item('Profile'));
    await nextTick();
    expect(popover.isOpen()).toBe(true);

    // Tab past the last item
    leave(item('Settings'), outside);
    await nextTick();
    expect(popover.isOpen()).toBe(false);

    // Shift+Tab from the trigger
    await popover.show();
    leave(trigger, outside);
    await nextTick();
    expect(popover.isOpen()).toBe(false);
  });

  it('stays open when a press on its text or its trigger moves focus to the page around it', async () => {
    const { panel, trigger, item, popover } = await mountUserMenu();
    const shell = addToPage('<div tabindex="-1"><a href="#">Next</a></div>');
    await popover.show();

    panel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    leave(item('Profile'), shell);
    await nextTick();
    expect(popover.isOpen()).toBe(true);

    // The next Tab, after the press is over
    await new Promise((resolve) => setTimeout(resolve));
    leave(shell, shell.querySelector('a'));
    await nextTick();
    expect(popover.isOpen()).toBe(false);

    // Safari does not focus a pressed button: the click that follows closes
    // it, as the trigger's own toggle
    await popover.show();
    trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    leave(item('Profile'), shell);
    await nextTick();
    expect(popover.isOpen()).toBe(true);
  });

  it('closes on a route change', async () => {
    const { popover } = await mountUserMenu();
    await popover.show();

    await useRouter().push('/buttons');
    await nextTick();

    expect(popover.isOpen()).toBe(false);
  });

  it('opens the sign-out dialog only after the menu has closed', async () => {
    const { exposed, dialog, trigger, popover } = await mountUserMenu();
    await popover.show();

    let atOpen: { menuOpen: boolean; expanded: string | null } | undefined;
    const showModal = dialog.showModal.bind(dialog);
    vi.spyOn(dialog, 'showModal').mockImplementation(() => {
      atOpen = {
        menuOpen: popover.isOpen(),
        expanded: trigger.getAttribute('aria-expanded'),
      };
      showModal();
    });

    await exposed.openLogoutDialog();

    expect(atOpen).toEqual({ menuOpen: false, expanded: 'false' });
    expect(dialog.open).toBe(true);
    expect(accessibleName(dialog)).toBe('Sign out');
    expect(inert()).toBe(0);
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('signs out from the dialog, which closes and gives focus back to the trigger', async () => {
    const { exposed, dialog, trigger, logout } = await mountUserMenu();
    await exposed.openLogoutDialog();
    await nextTick();

    const signOut = Array.from(dialog.querySelectorAll('button')).find(
      (button) => accessibleName(button) === 'Sign out',
    )!;
    signOut.click();

    expect(logout).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(dialog.open).toBe(false));
    await vi.waitFor(() => expectFocused(trigger));
  });
});
