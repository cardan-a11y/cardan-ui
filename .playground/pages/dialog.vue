<script setup lang="ts">
useHead({ title: 'Modal dialog pattern' });

const dialogRef = useTemplateRef<DialogComponent>('dialog');
const searchDialogRef = useTemplateRef<DialogComponent>('searchDialog');
const position = ref<DialogPosition>('center');
const date = ref();

// Mounted on the first press only: mounted, it opens until a choice is stored
const { openCookiesDialog } = useCookiesDialog();
const cookiesDialogMounted = ref(false);

function showCookiesDialog() {
  cookiesDialogMounted.value = true;
  openCookiesDialog();
}

function makeToast() {
  const { createToast } = useToast();

  createToast({
    color: 'green',
    label: 'Lorem ipsum dolor sit amet consectetur adipisicing elit',
  });
}
</script>

<template>
  <div class="demo-page dialog-demo">
    <h1>Modal dialog pattern</h1>

    <blockquote>
      <p class="fs-md">
        A dialog is a window overlaid on either the primary window or another
        dialog window. Windows under a modal dialog are inert. That is, users
        cannot interact with content outside an active dialog window. Inert
        content outside an active dialog is typically visually obscured or
        dimmed so it is difficult to discern, and in some implementations,
        attempts to interact with the inert content cause the dialog to close.
      </p>

      <p class="fs-sm mbe-2 c-grey-text">
        Source:
        <Button
          label="ARIA Design Patterns"
          to="https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal"
          variant="link"
          target="_blank"
        />
      </p>
    </blockquote>

    <Card>
      <h2>Dialog</h2>

      <p>
        Open a dialog with <code>openDialog()</code> and close it with
        <code>closeDialog()</code>, both exposed on the component's ref. The
        dialog plays its exit animation before it closes, and
        <code>closeDialog()</code> returns a promise that resolves once it has
        closed. Wait for it before you change what the dialog shows, such as the
        language after a user saved another one, or before you leave the page,
        so the change does not show while the dialog fades out.
      </p>

      <div class="flex-wrapper">
        <Button
          label="Open dialog left"
          @click="
            () => {
              position = 'inline-start';
              dialogRef?.openDialog();
            }
          "
        />
        <Button
          label="Open dialog center"
          @click="
            () => {
              position = 'center';
              dialogRef?.openDialog();
            }
          "
        />
        <Button
          label="Open dialog right"
          @click="
            () => {
              position = 'inline-end';
              dialogRef?.openDialog();
            }
          "
        />
        <Button
          label="Open dialog top"
          @click="
            () => {
              position = 'block-start';
              dialogRef?.openDialog();
            }
          "
        />
        <Button
          label="Open dialog bottom"
          @click="
            () => {
              position = 'block-end';
              dialogRef?.openDialog();
            }
          "
        />
      </div>
    </Card>

    <Card>
      <h2>Opening a dialog from another component</h2>

      <p>
        A dialog is often opened from somewhere other than the component that
        holds it: a button in the header opens a search dialog, a row in a table
        opens the dialog that edits it. Both components then need the dialog's
        ref. <code>useDialog(key)</code> keeps that ref under a key, so every
        component that calls it with the same key reaches the same dialog,
        without passing a ref through props or keeping one in a composable of
        your own.
      </p>

      <p>
        The component that holds the dialog binds <code>dialogRef</code> as its
        template ref: <code>&lt;Dialog ref="dialogRef"&gt;</code> after
        <code>const { dialogRef, close } = useDialog('search')</code>. Any other
        component opens it with <code>useDialog('search').open()</code>.
        <code>close()</code> returns a promise that resolves once the dialog has
        played its exit animation and closed, and <code>isOpen</code> follows
        whether the dialog is open. The same works for a MobileMenu, with
        <code>useDialog&lt;MobileMenuComponent&gt;('menu')</code>.
      </p>

      <p>
        The button below is one component and the dialog it opens is another,
        mounted at the end of this page. In development, the console warns when
        <code>open()</code> is called for a key whose dialog is not mounted, and
        when a second dialog is bound to a key that already holds one: the last
        one mounted would win, so each dialog needs its own key. A dialog that
        only asks whether the user is sure goes through
        <code>useConfirm()</code> instead.
      </p>

      <p>
        Any string is a key. A project that lists its keys in the
        <code>DialogKeys</code> interface turns a typo in a key into a type
        error; this playground lists its own in
        <code>types/dialog-keys.ts</code>.
      </p>

      <DemoShortcutsButton />
    </Card>

    <Card>
      <h2>Mobile Menu</h2>

      <div class="flex-wrapper">
        <MobileMenu
          :list="navList"
          :hide-button-label="false"
          button-label="Open left menu"
          menu-button-size="lg"
          position="inline-start"
          class="demo-mobile-menu"
        />

        <MobileMenu
          :list="navList"
          :hide-button-label="false"
          button-label="Open right menu"
          button-icon-pos="end"
          menu-button-size="lg"
          position="inline-end"
          class="demo-mobile-menu"
        />
      </div>
    </Card>

    <Card>
      <h2>Cookies Dialog</h2>

      <p>
        The consent dialog of a site: Accept or Deny is stored in a cookie for a
        year, and a button such as this one opens it again. On a site it opens
        by itself until a choice is stored; here only from this button.
      </p>

      <Button label="Open cookies dialog" @click="showCookiesDialog" />
    </Card>

    <Card>
      <h2>Dialog with links</h2>

      <p>
        A search dialog in a header stays on screen while its result opens
        another page and it closes. Focus then goes to the top of the new page,
        not back to the button that opened the dialog. Here the result is a page
        within this one, which stays, with the dialog.
      </p>

      <Button
        label="Open search dialog"
        @click="searchDialogRef?.openDialog()"
      />

      <NuxtPage />
    </Card>

    <Card>
      <h2>Accessibility Requirements</h2>

      <ul class="a11y-list">
        <li>The dialog has a label, either visible or for screen readers.</li>

        <li>
          When a dialog opens, focus moves to an element contained in the
          dialog. Generally, focus is initially set on the first focusable
          element. However, the most appropriate focus placement will depend on
          the nature and size of the content.
          <ul>
            <li class="small">
              Note that an immediate focus change can prevent screen readers
              from announcing the dialog label. You can use
              <code>aria-describedby</code> on the first focusable element to
              add context for the user.
            </li>
          </ul>
        </li>

        <li>Keyboard focus is trapped inside the dialog.</li>

        <li>The dialog can be closed with the <kbd>Escape</kbd> key.</li>

        <li>
          When the dialog is closed, the trigger button that opened the dialog
          receives focus.
        </li>

        <li>
          By default, the dialog is closed when clicking on the backdrop. Set
          <code>clickOutside</code> prop to false to disable this behaviour.
        </li>

        <li>
          If your dialog should divert users' attention to a brief, important
          message, you can set <code>role="alertdialog"</code>. Its usage is
          described in the
          <Button
            label="Alert and Message Dialog Pattern"
            to="https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog"
            variant="link"
            target="_blank"
          />.
        </li>
      </ul>
    </Card>

    <Dialog
      ref="dialog"
      :position="position"
      label="Dialog title"
      class="demo-dialog"
    >
      <div class="demo-dialog-content">
        <DevOnly>
          <Button
            icon="material-symbols:add-circle-rounded"
            variant="outline"
            label="Add Toast"
            @click="makeToast"
          />
        </DevOnly>

        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Eligendi quos
          nesciunt quam. Totam iste quasi nemo saepe a distinctio architecto?
          Maxime odio nam a placeat qui illo iure cupiditate et.
        </p>

        <Input label="Name" />

        <Popover>
          <template #default>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Vitae
            nesciunt dolor quae at. Omnis, officia ipsam. Corrupti aut dolor
            provident reprehenderit. Explicabo, repellat molestiae! Amet unde
            laboriosam tempora ut reprehenderit.
          </template>
        </Popover>

        <Tooltip />

        <MultiSelect
          label="MultiSelect"
          :options="['Lorem ipsum test long text']"
          style="min-width: 240px"
        />

        <DatePicker v-model="date" label="DatePicker" />
      </div>
    </Dialog>

    <Dialog ref="searchDialog" label="Search results">
      <template #default="{ closeDialog }">
        <ul role="list">
          <li>
            <Button
              to="/dialog/results"
              label="Search result"
              variant="link"
              @click="closeDialog"
            />
          </li>
        </ul>
      </template>
    </Dialog>

    <DemoShortcutsDialog />

    <CookiesDialog
      v-if="cookiesDialogMounted"
      description="This cookies dialog is for demo purposes only."
    />
  </div>
</template>

<style>
.demo-dialog {
  .dialog-content {
    padding: 1.5rem;
  }
}

.demo-mobile-menu {
  .dialog-content {
    padding-inline: 1.5rem;
  }
}

.demo-dialog-content {
  --dialog-max-width: 360px;

  p {
    font-size: var(--font-size-sm);
  }
}
</style>
