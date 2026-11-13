import { describe, it, expect, vi } from 'vitest';
import { h, nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { UserMenu } from '#components';
import { accessibleName, checkA11y, expectFocused, roleOf } from '../a11y';
import { addToPage, press } from '../dom';

/**
 * A disclosure (not the menu role): a button that shows the links and
 * buttons of the slot in a focus loop, with Escape and an outside click to
 * close it, and the sign-out dialog. The native dialog's own focus handling
 * is for the browser suite.
 */
async function mountUserMenu(logout = vi.fn()) {
  const wrapper = await mountSuspended(UserMenu, {
    props: { initials: 'MH', logout },
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

  /** The element with this name, in the menu or the dialog */
  const named = (name: string) => {
    const found = Array.from(
      (wrapper.element as HTMLElement).querySelectorAll<HTMLElement>(
        'a, button',
      ),
    ).find((element) => accessibleName(element) === name);
    if (!found) throw new Error(`Nothing named ${name}`);
    return found;
  };
  // The hidden label, then the initials it shows (WCAG 2.5.3)
  const trigger = named('open user menu MH');

  async function open() {
    trigger.click();
    // The loop renders, then focuses and locks the page
    await nextTick();
    await nextTick();
  }

  return { wrapper, exposed, dialog, trigger, named, open, logout };
}

describe('UserMenu', () => {
  it('is a button that says whether the part it controls is open, and moves focus into it', async () => {
    const { trigger, named, open } = await mountUserMenu();

    expect(roleOf(trigger)).toBe('button');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(await checkA11y()).toHaveNoViolations();

    await open();

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const controlled = document.getElementById(
      trigger.getAttribute('aria-controls')!,
    );
    expect(controlled?.contains(named('Profile'))).toBe(true);
    expectFocused(named('Profile'));
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('closes on Escape and gives focus back to the trigger', async () => {
    const { trigger, open } = await mountUserMenu();
    await open();

    await press('Escape');
    await nextTick();

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    // The page around it is no longer inert
    expectFocused(trigger);
  });

  it('closes from the slot, with focus back on the trigger', async () => {
    const { trigger, named, open } = await mountUserMenu();
    await open();

    named('Settings').click();
    await nextTick();
    await nextTick();

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expectFocused(trigger);
  });

  it('closes on a click outside it, not on one inside', async () => {
    const { trigger, named, open } = await mountUserMenu();
    const outside = addToPage('<p>Outside</p>');
    await open();

    const click = (element: Element) => {
      element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    };

    click(named('Profile').parentElement!);
    await nextTick();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    // A later click, in a task of its own
    await new Promise((resolve) => setTimeout(resolve));
    click(outside);
    await nextTick();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens the sign-out dialog only after the menu has closed and released the page', async () => {
    const { exposed, dialog, trigger, open } = await mountUserMenu();
    await open();

    let atOpen: { expanded: string | null; inert: boolean } | undefined;
    const showModal = dialog.showModal.bind(dialog);
    vi.spyOn(dialog, 'showModal').mockImplementation(() => {
      atOpen = {
        expanded: trigger.getAttribute('aria-expanded'),
        inert: !!dialog.closest('[inert]'),
      };
      showModal();
    });

    await exposed.openLogoutDialog();

    expect(atOpen).toEqual({ expanded: 'false', inert: false });
    expect(dialog.open).toBe(true);
    expect(accessibleName(dialog)).toBe('Sign out');
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
