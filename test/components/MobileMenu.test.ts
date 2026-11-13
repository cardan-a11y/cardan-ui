import { describe, it, expect, vi, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { MobileMenu } from '#components';
import { accessibleName, checkA11y, expectFocused, roleOf } from '../a11y';
import { addToPage } from '../dom';

/**
 * A modal dialog opened by a disclosure button. happy-dom's showModal()
 * only sets `open`: initial focus in the native modal, Escape and the
 * browser's own focus return are for the browser suite.
 */
const list = [
  { id: 'home', label: 'Home', to: '/' },
  { id: 'buttons', label: 'Buttons', to: '/buttons' },
];

/** happy-dom's window: its viewport drives matchMedia */
interface HappyWindow {
  happyDOM: { setViewport: (viewport: { width: number }) => void };
}

function setViewportWidth(width: number) {
  (window as unknown as HappyWindow).happyDOM.setViewport({ width });
}

async function mountMenu(props: Record<string, unknown> = {}) {
  const wrapper = await mountSuspended(MobileMenu, {
    props: { list, ...props },
    attachTo: document.body,
  });

  // The dialog is teleported: the only button in place is the trigger
  const trigger = wrapper.get('button');
  const dialog = document.getElementById(
    trigger.attributes('aria-controls')!,
  ) as HTMLDialogElement;

  /** The button in the menu with this name */
  const button = (name: string) => {
    const found = Array.from(dialog.querySelectorAll('button')).find(
      (button) => accessibleName(button) === name,
    );
    if (!found) throw new Error(`No button named ${name}`);
    return found;
  };

  async function open() {
    trigger.element.click();
    // The loop renders, then focuses and locks the page
    await nextTick();
    await nextTick();
  }

  return { wrapper, trigger, dialog, button, open };
}

afterEach(() => {
  setViewportWidth(1024);
});

describe('MobileMenu', () => {
  it('is a button named "Menu" that controls the dialog and says whether it is open', async () => {
    const { trigger, dialog, open } = await mountMenu();

    expect(roleOf(trigger)).toBe('button');
    expect(accessibleName(trigger)).toBe('Menu');
    expect(roleOf(dialog)).toBe('dialog');
    expect(trigger.attributes('aria-expanded')).toBe('false');
    expect(await checkA11y()).toHaveNoViolations();

    await open();

    expect(dialog.open).toBe(true);
    expect(trigger.attributes('aria-expanded')).toBe('true');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('names the dialog by its label', async () => {
    const { dialog, open } = await mountMenu({ label: 'Site menu' });
    await open();

    expect(accessibleName(dialog)).toBe('Site menu');
  });

  it('names the dialog and its navigation "Mobile menu" without labels', async () => {
    const { dialog, open } = await mountMenu();
    await open();

    expect(accessibleName(dialog)).toBe('Mobile menu');
    expect(accessibleName(dialog.querySelector('nav')!)).toBe('Mobile menu');
  });

  it('has a navigation named by nav-label, under a heading of that text', async () => {
    const { dialog, open } = await mountMenu({ navLabel: 'Main' });
    await open();

    const nav = dialog.querySelector('nav')!;
    expect(roleOf(nav)).toBe('navigation');
    expect(accessibleName(nav)).toBe('Main');
    expect(dialog.querySelector('h2')?.textContent).toBe('Main');
    expect(
      Array.from(nav.querySelectorAll('a')).map((link) => accessibleName(link)),
    ).toEqual(['Home', 'Buttons']);
  });

  it('closes with "Close menu", and gives focus back to the trigger when it is on the body', async () => {
    const { trigger, dialog, button, open } = await mountMenu();
    await open();

    button('Close menu').click();

    await vi.waitFor(() => expect(dialog.open).toBe(false));
    expect(trigger.attributes('aria-expanded')).toBe('false');
    // And the page around it is no longer inert
    await vi.waitFor(() => expectFocused(trigger));
  });

  it('leaves focus that has moved on, such as to a new page after a link', async () => {
    const { dialog, button, open } = await mountMenu();
    const main = addToPage('<main tabindex="-1"><h1>Buttons</h1></main>');
    await open();

    // The new page takes focus by the time the menu has closed
    const close = dialog.close.bind(dialog);
    vi.spyOn(dialog, 'close').mockImplementation(() => {
      main.focus();
      close();
    });
    button('Close menu').click();

    await vi.waitFor(() => expect(dialog.open).toBe(false));
    await nextTick();
    expectFocused(main);
  });

  it('releases the page on Escape, before the browser closes the dialog', async () => {
    const { dialog, open } = await mountMenu();
    await open();
    expect(document.querySelectorAll('[inert]').length).toBeGreaterThan(0);

    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    await nextTick();

    expect(document.querySelectorAll('[inert]')).toHaveLength(0);
  });

  it('closes when the window grows to desktop width, unless close-on-desktop is off', async () => {
    setViewportWidth(400);
    // Each mount is an app of its own, with the same useId(): ids of their own
    const closing = await mountMenu({ id: 'closing' });
    const staying = await mountMenu({ id: 'staying', closeOnDesktop: false });
    await closing.open();
    await staying.open();

    setViewportWidth(1280);

    await vi.waitFor(() => expect(closing.dialog.open).toBe(false));
    expect(staying.dialog.open).toBe(true);
  });
});
