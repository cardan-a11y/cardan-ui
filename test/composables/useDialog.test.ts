import { describe, it, expect, vi } from 'vitest';
import { defineComponent, h, type PropType } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { ConfirmDialog, Dialog, MobileMenu } from '#components';

// The development warnings are not tested: `import.meta.dev` is false here

declare global {
  interface DialogKeys {
    'opener-demo': true;
    'first-key': true;
    'second-key': true;
    'never-mounted': true;
    'unmounted-key': true;
    'closing-key': true;
    'menu-key': true;
    'confirm-key': true;
  }
}

/** The component that mounts the dialogs, each under its key as its label */
function dialogsUnder(...keys: DialogKey[]) {
  const KeyedDialog = defineComponent({
    props: {
      dialogKey: { type: String as PropType<DialogKey>, required: true },
    },
    setup(props) {
      const { dialogRef } = useDialog(props.dialogKey);
      return () =>
        h(Dialog, { ref: dialogRef, label: props.dialogKey }, () => 'Content');
    },
  });

  return defineComponent({
    setup() {
      return () => keys.map((key) => h(KeyedDialog, { dialogKey: key, key }));
    },
  });
}

async function mountDialogs(...keys: DialogKey[]) {
  const wrapper = await mountSuspended(dialogsUnder(...keys), {
    attachTo: document.body,
  });
  const isShown = (key: string) =>
    [...document.querySelectorAll('dialog')].some(
      (dialog) => dialog.open && dialog.textContent?.includes(key),
    );
  return { wrapper, isShown };
}

describe('useDialog', () => {
  it('opens and closes a dialog that another component mounts, with isOpen following', async () => {
    const { isShown } = await mountDialogs('opener-demo');
    const elsewhere = useDialog('opener-demo');

    expect(elsewhere.isOpen.value).toBe(false);

    elsewhere.open();
    await flushPromises();
    expect(isShown('opener-demo')).toBe(true);
    expect(elsewhere.isOpen.value).toBe(true);

    await elsewhere.close();
    expect(isShown('opener-demo')).toBe(false);
    expect(elsewhere.isOpen.value).toBe(false);
  });

  it('keeps two keys apart', async () => {
    const { isShown } = await mountDialogs('first-key', 'second-key');

    useDialog('first-key').open();
    await flushPromises();

    expect(isShown('first-key')).toBe(true);
    expect(isShown('second-key')).toBe(false);
    expect(useDialog('second-key').isOpen.value).toBe(false);

    await useDialog('second-key').close();
    expect(isShown('first-key')).toBe(true);
  });

  it('does nothing without a mounted dialog', async () => {
    const { dialogRef, open, close, isOpen } = useDialog('never-mounted');

    expect(dialogRef.value).toBeNull();
    expect(() => open()).not.toThrow();
    expect(isOpen.value).toBe(false);
    await expect(close()).resolves.toBeUndefined();
  });

  it('holds null again once the dialog unmounts', async () => {
    const { wrapper } = await mountDialogs('unmounted-key');
    const { dialogRef } = useDialog('unmounted-key');
    expect(dialogRef.value).not.toBeNull();

    wrapper.unmount();

    expect(dialogRef.value).toBeNull();
  });

  it('resolves close() only once the dialog has closed', async () => {
    const { isShown } = await mountDialogs('closing-key');
    const { open, close } = useDialog('closing-key');
    open();
    await flushPromises();

    const shownWhenClosed = close().then(() => isShown('closing-key'));

    await expect(shownWhenClosed).resolves.toBe(false);
  });

  it('opens and closes a MobileMenu too', async () => {
    const Menu = defineComponent({
      setup() {
        const { dialogRef } = useDialog<MobileMenuComponent>('menu-key');
        return () => h(MobileMenu, { ref: dialogRef, label: 'Menu', list: [] });
      },
    });
    await mountSuspended(Menu, { attachTo: document.body });
    const menu = useDialog<MobileMenuComponent>('menu-key');
    const dialog = () => document.querySelector('dialog');

    menu.open();
    await flushPromises();
    expect(dialog()?.open).toBe(true);
    expect(menu.isOpen.value).toBe(true);

    await menu.close();
    await vi.waitFor(() => expect(dialog()?.open).toBe(false));
    expect(menu.isOpen.value).toBe(false);
  });

  it('follows a ConfirmDialog with isOpen', async () => {
    const Owner = defineComponent({
      setup() {
        const { dialogRef } = useDialog<ConfirmDialogComponent>('confirm-key');
        return () => h(ConfirmDialog, { ref: dialogRef, label: 'Delete?' });
      },
    });
    await mountSuspended(Owner, { attachTo: document.body });
    const { open, close, isOpen } = useDialog('confirm-key');

    open();
    await flushPromises();
    expect(isOpen.value).toBe(true);

    await close();
    expect(isOpen.value).toBe(false);
  });
});
