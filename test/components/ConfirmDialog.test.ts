import { describe, it, expect, vi, afterEach } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { ConfirmDialog, ConfirmDialogHost } from '#components';
import { useConfirm } from '#imports';
import {
  accessibleName,
  description,
  expectFocused,
  expectNoViolations,
  roleOf,
} from '../a11y';
import { expectConsole } from '../console';
import { clickBackdrop } from '../dom';
import { fetchError } from '../fetch';

/**
 * ConfirmDialog and `useConfirm()`. The scoping rule comes first: the action
 * travels with the request, so a confirm only ever runs the action of the
 * caller that opened it. happy-dom closes a `<dialog>` at once and moves no
 * focus on its own: focus return, Escape and Tab are in
 * test/browser/confirm-dialog.spec.ts.
 */

const deleteFruit = vi.fn<(item: string) => unknown>();
const deleteVegetable = vi.fn<(item: string) => unknown>();

afterEach(() => {
  deleteFruit.mockReset();
  deleteVegetable.mockReset();
  vi.restoreAllMocks();
});

/** A page with two lists, each with its own delete handler, and the host */
function listsPage({ host = true } = {}) {
  const results: Promise<boolean>[] = [];

  const Page = defineComponent({
    setup() {
      const { confirm } = useConfirm();

      const list = (
        name: string,
        items: string[],
        remove: (item: string) => unknown,
        challenge = false,
      ) =>
        h(
          'section',
          { 'aria-label': name },
          h(
            'ul',
            items.map((item) =>
              h(
                'li',
                h(
                  'button',
                  {
                    type: 'button',
                    onClick: () =>
                      results.push(
                        confirm({
                          label: `Delete ${item}?`,
                          description: `${item} goes from ${name}.`,
                          challenge,
                          onConfirm: () => remove(item),
                        }),
                      ),
                  },
                  `Delete ${item}`,
                ),
              ),
            ),
          ),
        );

      return () =>
        h('div', [
          list('Fruit', ['apple', 'pear'], deleteFruit),
          list('Vegetables', ['leek'], deleteVegetable, true),
          host ? h(ConfirmDialogHost) : null,
        ]);
    },
  });

  return { Page, results };
}

async function mountLists(options: { host?: boolean } = {}) {
  const { Page, results } = listsPage(options);
  const wrapper = await mountSuspended(Page, { attachTo: document.body });
  const root = wrapper.element as HTMLElement;

  const pageButton = (name: string) => {
    const found = Array.from(root.querySelectorAll('section button')).find(
      (button) => accessibleName(button) === name,
    );
    if (!found) throw new Error(`No button named ${name}`);
    return found as HTMLButtonElement;
  };

  const dialog = () => root.querySelector('dialog')!;

  const dialogButton = (name: string) => {
    const found = Array.from(dialog().querySelectorAll('button')).find(
      (button) => accessibleName(button) === name,
    );
    if (!found) throw new Error(`No dialog button named ${name}`);
    return found as HTMLButtonElement;
  };

  /** Clicks a list's delete button; returns its `confirm()`, not awaited */
  async function ask(name: string): Promise<{ result: Promise<boolean> }> {
    pageButton(name).click();
    await flushPromises();
    await nextTick();
    return { result: results.at(-1)! };
  }

  return { wrapper, results, dialog, dialogButton, ask };
}

/** The digit the challenge names */
function namedDigit(dialog: HTMLDialogElement) {
  const input = dialog.querySelector('input')!;
  const digit = description(input).match(/\d/)?.[0];
  if (!digit) throw new Error('The challenge names no digit');
  return digit;
}

async function type(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input'));
  await nextTick();
}

describe('useConfirm: the action travels with the request', () => {
  it('runs only the action of the list it was opened from, with its item', async () => {
    const { dialog, dialogButton, ask } = await mountLists();

    const { result } = await ask('Delete pear');
    expect(dialog().open).toBe(true);
    dialogButton('Delete').click();

    await expect(result).resolves.toBe(true);
    expect(deleteFruit).toHaveBeenCalledExactlyOnceWith('pear');
    expect(deleteVegetable).not.toHaveBeenCalled();
    expect(dialog().open).toBe(false);
  });

  it('runs nothing on Cancel, and resolves false', async () => {
    const { dialog, dialogButton, ask } = await mountLists();

    const { result } = await ask('Delete apple');
    dialogButton('Cancel').click();

    await expect(result).resolves.toBe(false);
    expect(dialog().open).toBe(false);
    expect(deleteFruit).not.toHaveBeenCalled();
    expect(deleteVegetable).not.toHaveBeenCalled();
  });

  it('resolves false for the close button, a click outside and Escape', async () => {
    const { dialog, dialogButton, ask } = await mountLists();

    const { result: closed } = await ask('Delete apple');
    dialogButton('Close').click();
    await expect(closed).resolves.toBe(false);

    const { result: outside } = await ask('Delete apple');
    clickBackdrop(dialog());
    await expect(outside).resolves.toBe(false);

    const { result: escaped } = await ask('Delete apple');
    // Escape: a cancel on the dialog, then the browser closes it
    dialog().dispatchEvent(new Event('cancel', { cancelable: true }));
    dialog().close();
    await expect(escaped).resolves.toBe(false);

    expect(deleteFruit).not.toHaveBeenCalled();
  });

  it('after a cancel in one list, runs only the next list’s action', async () => {
    const { dialog, dialogButton, ask } = await mountLists();

    const { result: cancelled } = await ask('Delete apple');
    dialogButton('Cancel').click();
    await expect(cancelled).resolves.toBe(false);

    const { result: confirmed } = await ask('Delete leek');
    expect(accessibleName(dialog())).toBe('Delete leek?');
    const input = dialog().querySelector('input')!;
    await type(input, namedDigit(dialog()));
    dialogButton('Delete').click();

    await expect(confirmed).resolves.toBe(true);
    expect(deleteVegetable).toHaveBeenCalledExactlyOnceWith('leek');
    expect(deleteFruit).not.toHaveBeenCalled();
  });

  it('refuses a second confirm() while one is open, and the first runs its own action', async () => {
    expectConsole('warn', /another confirmation is open/);
    const { dialog, dialogButton, ask, results } = await mountLists();

    const { result: first } = await ask('Delete apple');
    const { result: second } = await ask('Delete leek');

    await expect(second).resolves.toBe(false);
    expect(results).toHaveLength(2);
    expect(accessibleName(dialog())).toBe('Delete apple?');

    dialogButton('Delete').click();
    await expect(first).resolves.toBe(true);
    expect(deleteFruit).toHaveBeenCalledExactlyOnceWith('apple');
    expect(deleteVegetable).not.toHaveBeenCalled();
  });

  it('runs the action once for two clicks, also while it runs', async () => {
    let finish!: () => void;
    deleteFruit.mockImplementation(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    const { dialog, dialogButton, ask } = await mountLists();

    const { result } = await ask('Delete apple');
    dialogButton('Delete').click();
    dialogButton('Delete').click();
    await nextTick();

    const busy = dialog().querySelector<HTMLElement>('button[aria-busy]')!;
    expect(accessibleName(busy)).toContain('Delete');
    busy.click();

    finish();
    await expect(result).resolves.toBe(true);
    expect(deleteFruit).toHaveBeenCalledOnce();
  });

  it('clears the request on close: a later open shows its own text, without the earlier error', async () => {
    deleteFruit.mockRejectedValueOnce(
      fetchError(500, { message: 'Apple is in a basket.' }),
    );
    const { dialog, dialogButton, ask } = await mountLists();

    const { result: failed } = await ask('Delete apple');
    dialogButton('Delete').click();
    await flushPromises();
    expect(dialog().querySelector('[role="alert"]')!.textContent).toContain(
      'Apple is in a basket.',
    );
    dialogButton('Cancel').click();
    await expect(failed).resolves.toBe(false);

    const { result: next } = await ask('Delete pear');
    expect(accessibleName(dialog())).toBe('Delete pear?');
    expect(description(dialog())).toBe('pear goes from Fruit.');
    expect(dialog().querySelector('[role="alert"]')!.textContent).toBe('');

    dialogButton('Delete').click();
    await expect(next).resolves.toBe(true);
    expect(deleteFruit.mock.calls).toEqual([['apple'], ['pear']]);
  });

  it('without a host resolves false, runs nothing and warns', async () => {
    expectConsole('warn', /needs a mounted <ConfirmDialogHost \/>/);
    const { ask } = await mountLists({ host: false });

    const { result } = await ask('Delete apple');
    await expect(result).resolves.toBe(false);
    expect(deleteFruit).not.toHaveBeenCalled();
  });

  it('warns about a second host, which shows nothing', async () => {
    expectConsole('warn', /is mounted twice/);
    const { dialogButton, ask } = await mountLists();
    const second = await mountSuspended(ConfirmDialogHost, {
      attachTo: document.body,
    });

    const { result } = await ask('Delete apple');
    expect((second.element as HTMLDialogElement).open).toBe(false);
    dialogButton('Delete').click();
    await expect(result).resolves.toBe(true);
  });

  it('resolves false when the host unmounts with a request open', async () => {
    const { wrapper, ask } = await mountLists();

    const { result } = await ask('Delete apple');
    wrapper.unmount();

    await expect(result).resolves.toBe(false);
    expect(deleteFruit).not.toHaveBeenCalled();
  });
});

describe('useConfirm: a failing action', () => {
  it('stays open with the error, busy no longer, and can be tried again', async () => {
    deleteFruit.mockRejectedValueOnce(
      fetchError(422, { message: 'Apple is in a basket.' }),
    );
    const { dialog, dialogButton, ask } = await mountLists();

    const { result } = await ask('Delete apple');
    dialogButton('Delete').click();
    await flushPromises();

    expect(dialog().open).toBe(true);
    const alert = dialog().querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain('Apple is in a basket.');
    expect(dialogButton('Delete').getAttribute('aria-busy')).toBeNull();
    await expectNoViolations();

    dialogButton('Delete').click();
    await expect(result).resolves.toBe(true);
    expect(deleteFruit).toHaveBeenCalledTimes(2);
  });

  it('resolves false once an action that fails after a cancel settles', async () => {
    let fail!: () => void;
    deleteFruit.mockImplementation(
      () =>
        new Promise<void>((_, reject) => (fail = () => reject(new Error()))),
    );
    const { dialogButton, ask } = await mountLists();

    const { result } = await ask('Delete apple');
    dialogButton('Delete').click();
    await nextTick();
    dialogButton('Cancel').click();
    await flushPromises();

    let settled = false;
    result.then(() => (settled = true));
    await flushPromises();
    expect(settled).toBe(false);

    fail();
    await expect(result).resolves.toBe(false);
  });
});

describe('useConfirm: the digit challenge', () => {
  it('names the digit, waits for it, runs the action on it and starts empty the next time', async () => {
    const { dialog, dialogButton, ask } = await mountLists();

    const { result } = await ask('Delete leek');
    const input = dialog().querySelector('input')!;
    const digit = namedDigit(dialog());

    expect(description(dialog())).toContain(`Type ${digit} to confirm.`);
    expect(accessibleName(input)).toBe('Confirm number');
    expect(dialogButton('Delete').disabled).toBe(true);

    const wrong = digit === '9' ? '1' : String(Number(digit) + 1);
    await type(input, wrong);
    expect(dialogButton('Delete').disabled).toBe(true);
    dialogButton('Delete').click();
    await flushPromises();
    expect(deleteVegetable).not.toHaveBeenCalled();

    await type(input, digit);
    expect(dialogButton('Delete').disabled).toBe(false);
    await expectNoViolations();
    dialogButton('Delete').click();
    await expect(result).resolves.toBe(true);
    expect(deleteVegetable).toHaveBeenCalledExactlyOnceWith('leek');

    const { result: again } = await ask('Delete leek');
    expect(dialog().querySelector('input')!.value).toBe('');
    expect(dialogButton('Delete').disabled).toBe(true);
    dialogButton('Cancel').click();
    await expect(again).resolves.toBe(false);
  });
});

describe('ConfirmDialog', () => {
  async function mountDialog(
    props: Record<string, unknown> = {},
    slots: Record<string, string> = {},
  ) {
    const wrapper = await mountSuspended(ConfirmDialog, {
      props: {
        label: 'Delete the course?',
        description: 'The course goes from your cart.',
        ...props,
      },
      slots,
      attachTo: document.body,
    });
    const exposed = wrapper.vm as unknown as ConfirmDialogComponent;
    const dialog = wrapper.get('dialog').element as HTMLDialogElement;
    exposed.openDialog();
    await flushPromises();
    await nextTick();
    return { wrapper, exposed, dialog };
  }

  const buttonIn = (dialog: Element, name: string) =>
    Array.from(dialog.querySelectorAll('button')).find(
      (button) => accessibleName(button) === name,
    )!;

  // The component's focus() on Cancel; where the browser puts focus is in
  // test/browser/confirm-dialog.spec.ts ("focus starts on Cancel")
  it('is an alertdialog named by its label, described by its description, Cancel focused', async () => {
    const { dialog } = await mountDialog();

    expect(roleOf(dialog)).toBe('alertdialog');
    expect(accessibleName(dialog)).toBe('Delete the course?');
    expect(description(dialog)).toBe('The course goes from your cart.');
    expectFocused(buttonIn(dialog, 'Cancel'));
    await expectNoViolations();
  });

  it('is described by its slot when the description needs markup', async () => {
    const { dialog } = await mountDialog(
      { description: undefined },
      {
        default:
          '<p>Remove <strong lang="nl">Toegankelijkheid</strong> from your cart?</p>',
      },
    );

    expect(description(dialog)).toBe('Remove Toegankelijkheid from your cart?');
    expect(dialog.querySelector('strong')!.getAttribute('lang')).toBe('nl');
  });

  // As above: test/browser/confirm-dialog.spec.ts ("the challenge starts in its field")
  it('starts in the digit field with challenge and autofocus', async () => {
    const { dialog } = await mountDialog({ challenge: true, autofocus: true });

    expectFocused(dialog.querySelector('input')!);
  });

  it('shows its error in the dialog, and a busy confirm button while loading', async () => {
    const { dialog } = await mountDialog({
      loading: true,
      error: { message: 'The course is in use.', language: 'en' },
    });

    expect(dialog.querySelector('[role="alert"]')!.textContent).toContain(
      'The course is in use.',
    );
    const busy = dialog.querySelector('button[aria-busy="true"]')!;
    expect(accessibleName(busy)).toContain('Delete');
  });

  it('emits cancel for a close of its own, never for closeDialog()', async () => {
    const { wrapper, exposed, dialog } = await mountDialog();

    buttonIn(dialog, 'Delete').click();
    expect(wrapper.emitted('confirm')).toHaveLength(1);
    await exposed.closeDialog();
    await flushPromises();
    expect(wrapper.emitted('cancel')).toBeUndefined();

    exposed.openDialog();
    await flushPromises();
    buttonIn(dialog, 'Cancel').click();
    await vi.waitFor(() => expect(wrapper.emitted('cancel')).toHaveLength(1));
  });

  it('two on one page: each emits only its own confirm', async () => {
    const first = await mountDialog({ label: 'Delete the first?' });
    const second = await mountDialog({ label: 'Delete the second?' });

    buttonIn(second.dialog, 'Delete').click();
    expect(second.wrapper.emitted('confirm')).toHaveLength(1);
    expect(first.wrapper.emitted('confirm')).toBeUndefined();

    buttonIn(first.dialog, 'Delete').click();
    expect(first.wrapper.emitted('confirm')).toHaveLength(1);
    expect(second.wrapper.emitted('confirm')).toHaveLength(1);
  });
});
