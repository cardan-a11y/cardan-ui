import { describe, it, expect, vi } from 'vitest';
import { nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Dialog } from '#components';
import {
  accessibleName,
  expectFocused,
  expectNoViolations,
  roleOf,
} from '../a11y';
import { addToPage, clickBackdrop } from '../dom';

/**
 * The APG modal dialog, on the native `<dialog>`. happy-dom's showModal()
 * only sets `open`: initial focus, the inert page, Tab containment, Escape
 * and focus return are for the browser suite. This pins the names, the
 * ways the component closes itself and what it does on the browser's
 * events.
 */
async function mountDialog(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = { default: '<p>The settings.</p>' },
) {
  const wrapper = await mountSuspended(Dialog, {
    props: { label: 'Settings', ...props },
    slots,
    attachTo: document.body,
  });
  const exposed = wrapper.vm as unknown as DialogComponent;
  const dialog = wrapper.get('dialog').element as HTMLDialogElement;

  const button = (name: string) => {
    const found = Array.from(dialog.querySelectorAll('button')).find(
      (button) => accessibleName(button) === name,
    );
    if (!found) throw new Error(`No button named ${name}`);
    return found;
  };

  exposed.openDialog();
  await nextTick();

  return { wrapper, exposed, dialog, button };
}

/** Waits long enough for a close that is not coming */
const settle = () => new Promise((resolve) => setTimeout(resolve));

describe('Dialog', () => {
  it('is a modal dialog named by its label, with a close button named "Close"', async () => {
    const { dialog, button } = await mountDialog();

    expect(dialog.open).toBe(true);
    expect(roleOf(dialog)).toBe('dialog');
    expect(accessibleName(dialog)).toBe('Settings');
    expect(accessibleName(button('Close'))).toBe('Close');
    await expectNoViolations();
  });

  it('is named by aria-label without a label, and passes role alertdialog on', async () => {
    const { dialog } = await mountDialog({
      label: undefined,
      ariaLabel: 'Delete the course?',
      role: 'alertdialog',
    });

    expect(roleOf(dialog)).toBe('alertdialog');
    expect(accessibleName(dialog)).toBe('Delete the course?');
    await expectNoViolations();
  });

  it('closes with its close button, no longer visible before the dialog closes', async () => {
    const { exposed, dialog, button } = await mountDialog();
    let visibleAtClose: boolean | undefined;
    const close = dialog.close.bind(dialog);
    vi.spyOn(dialog, 'close').mockImplementation(() => {
      visibleAtClose = exposed.isVisible;
      close();
    });

    button('Close').click();

    await vi.waitFor(() => expect(dialog.open).toBe(false));
    expect(visibleAtClose).toBe(false);
  });

  it('resolves closeDialog() once the dialog has closed, the same promise for a second call', async () => {
    const { exposed, dialog } = await mountDialog();

    const first = exposed.closeDialog();
    const second = exposed.closeDialog();
    expect(second).toBe(first);

    await first;
    expect(dialog.open).toBe(false);
    // Closed already: nothing to wait for
    await expect(exposed.closeDialog()).resolves.toBeUndefined();
  });

  it('closes only once its exit animation has ended, also when that is cancelled', async () => {
    const { exposed, dialog } = await mountDialog();
    let end!: () => void;
    const finished = new Promise<void>((resolve) => (end = resolve));
    const animations = vi
      .spyOn(dialog, 'getAnimations')
      .mockReturnValue([{ finished } as unknown as Animation]);

    const closed = exposed.closeDialog();
    await settle();
    expect(dialog.open).toBe(true);
    end();
    await closed;
    expect(dialog.open).toBe(false);

    exposed.openDialog();
    animations.mockImplementation(() => [
      {
        finished: Promise.reject(new DOMException('', 'AbortError')),
      } as unknown as Animation,
    ]);
    await exposed.closeDialog();
    expect(dialog.open).toBe(false);
  });

  it('stays visible when the close event of an earlier close arrives after it reopened', async () => {
    const { exposed, dialog } = await mountDialog();
    await exposed.closeDialog();

    exposed.openDialog();
    dialog.dispatchEvent(new Event('close'));

    expect(exposed.isVisible).toBe(true);
  });

  it('closes with Cancel next to the buttons of the buttons slot', async () => {
    const { dialog, button } = await mountDialog(
      {},
      { default: '<p>Leave?</p>', buttons: '<button>Leave</button>' },
    );

    button('Cancel').click();

    await vi.waitFor(() => expect(dialog.open).toBe(false));
  });

  it('starts focus on Cancel with focus-cancel', async () => {
    const { button } = await mountDialog(
      { focusCancel: true },
      { default: '<p>Delete?</p>', buttons: '<button>Delete</button>' },
    );
    await settle();

    expectFocused(button('Cancel'));
  });

  it('stays open on a click on the dialog element without a press outside it', async () => {
    const { dialog } = await mountDialog();

    dialog.click();
    await settle();

    expect(dialog.open).toBe(true);
  });

  it('closes on a press and release on the backdrop, never on a click inside', async () => {
    const { dialog } = await mountDialog();

    dialog.querySelector('p')!.click();
    await settle();
    expect(dialog.open).toBe(true);

    clickBackdrop(dialog);
    await vi.waitFor(() => expect(dialog.open).toBe(false));
  });

  it('stays open on a click on the backdrop without click-outside', async () => {
    const { dialog } = await mountDialog({ clickOutside: false });

    clickBackdrop(dialog);
    await settle();

    expect(dialog.open).toBe(true);
  });

  it('leaves the page to the native modal: nothing outside is made inert', async () => {
    addToPage('<button>Outside</button>');
    await mountDialog();
    // The loop would lock the page the tick after it opens
    await settle();

    expect(document.querySelectorAll('[inert]')).toHaveLength(0);
  });

  it('lets Escape close it, no longer visible first, unless disable-escape', async () => {
    // Escape fires a cancel on the dialog, and the browser closes it after
    const open = await mountDialog();
    const cancel = new Event('cancel', { cancelable: true });
    open.dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(false);
    expect(open.exposed.isVisible).toBe(false);

    const kept = await mountDialog({ disableEscape: true });
    const keptCancel = new Event('cancel', { cancelable: true });
    kept.dialog.dispatchEvent(keptCancel);
    expect(keptCancel.defaultPrevented).toBe(true);
    expect(kept.exposed.isVisible).toBe(true);
  });

  it('keeps its content when a file picker in it is dismissed', async () => {
    const { exposed, dialog, button } = await mountDialog(
      { disableEscape: true },
      { default: '<input type="file" aria-label="Avatar" />' },
    );

    // A dismissed picker fires a cancel that bubbles from the input
    const cancel = new Event('cancel', { bubbles: true, cancelable: true });
    dialog.querySelector('input')!.dispatchEvent(cancel);
    await nextTick();

    expect(cancel.defaultPrevented).toBe(false);
    expect(exposed.isVisible).toBe(true);
    expect(dialog.querySelector('input')).not.toBeNull();
    expect(button('Close')).toBeTruthy();
  });
});
