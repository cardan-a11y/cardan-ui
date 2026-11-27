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

const rules = [
  {
    title: 'Open it through its ref',
    text: 'Dialog is a native dialog element. Its ref exposes openDialog() and closeDialog().',
  },
  {
    title: 'From another component',
    text: 'useDialog(key) keeps the ref under a key, so any component opens the dialog without a prop.',
  },
  {
    title: 'Only "are you sure?"',
    text: 'A dialog that only asks whether the user is sure goes through useConfirm().',
  },
  {
    title: 'No toast over a dialog',
    text: 'A toast is under the backdrop of an open modal dialog, out of reach and unannounced. Show the message in the dialog, with ErrorMessage.',
  },
];

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
    <p class="demo-eyebrow">Actions</p>
    <h1>Modal dialog pattern</h1>
    <p class="demo-lead">
      A modal dialog is a window over the page: what is under it is inert until
      it closes. Dialog follows the APG
      <Button
        label="modal dialog pattern"
        to="https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal"
        variant="link"
        target="_blank"
      />.
    </p>

    <ul role="list" class="demo-grid">
      <li v-for="rule in rules" :key="rule.title" class="demo-tile">
        <strong>{{ rule.title }}</strong>
        <span>{{ rule.text }}</span>
      </li>
    </ul>

    <section class="demo-section" aria-labelledby="dialog-dialog">
      <h2 id="dialog-dialog">Dialog</h2>
      <p class="demo-hint">
        Open a dialog with <code>openDialog()</code> and close it with
        <code>closeDialog()</code>, both exposed on the component's ref.
        <code>position</code> puts it in the center or at one of the four sides.
      </p>

      <Card>
        <ul class="dialog-notes">
          <li>
            The dialog plays its exit animation before it closes;
            <code>closeDialog()</code> returns a promise that resolves once it
            has closed.
          </li>
          <li>
            Wait for it before you change what the dialog shows, or before you
            leave the page, so the change does not show while the dialog fades
            out.
          </li>
        </ul>

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
    </section>

    <section class="demo-section" aria-labelledby="dialog-use-dialog">
      <h2 id="dialog-use-dialog">Opening a dialog from another component</h2>
      <p class="demo-hint">
        A button in the header opens a search dialog, a row in a table the
        dialog that edits it. <code>useDialog(key)</code> keeps the dialog's ref
        under a key, so every component that calls it with the same key reaches
        the same dialog.
      </p>

      <Card>
        <ul class="dialog-notes">
          <li>
            The component that holds the dialog binds <code>dialogRef</code> as
            its template ref: <code>&lt;Dialog ref="dialogRef"&gt;</code> after
            <code>const { dialogRef, close } = useDialog('search')</code>.
          </li>
          <li>
            Any other component opens it with
            <code>useDialog('search').open()</code>.
          </li>
          <li>
            <code>close()</code> returns a promise that resolves once the dialog
            has played its exit animation and closed, and
            <code>isOpen</code> follows whether the dialog is open.
          </li>
          <li>
            The same works for a MobileMenu, with
            <code>useDialog&lt;MobileMenuComponent&gt;('menu')</code>.
          </li>
          <li>
            Each dialog needs its own key. In development, the console warns
            when <code>open()</code> is called for a key whose dialog is not
            mounted, and when a second dialog is bound to a key that already
            holds one.
          </li>
          <li>
            Any string is a key. A project that lists its keys in the
            <code>DialogKeys</code> interface turns a typo in a key into a type
            error; this playground lists its own in
            <code>types/dialog-keys.ts</code>.
          </li>
        </ul>

        <p>
          The button below is one component and the dialog it opens is another,
          mounted at the end of this page.
        </p>

        <DemoShortcutsButton />
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="dialog-mobile-menu">
      <h2 id="dialog-mobile-menu">Mobile Menu</h2>
      <p class="demo-hint">
        MobileMenu is a button with the dialog it opens: a panel with the items
        of its <code>list</code>, at the side that <code>position</code> names.
      </p>

      <Card>
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
    </section>

    <section class="demo-section" aria-labelledby="dialog-cookies">
      <h2 id="dialog-cookies">Cookies Dialog</h2>
      <p class="demo-hint">
        The consent dialog of a site: Accept or Deny is stored in a cookie for a
        year, and a button such as this one opens it again. On a site it opens
        by itself until a choice is stored; here only from this button.
        <NuxtLink to="/cookies">Cookie consent</NuxtLink> shows a first
        visit, and what loads from Google when.
      </p>

      <Card>
        <Button label="Open cookies dialog" @click="showCookiesDialog" />
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="dialog-links">
      <h2 id="dialog-links">Dialog with links</h2>
      <p class="demo-hint">
        A search dialog in a header stays on screen while its result opens
        another page and it closes. Focus then goes to the top of the new page,
        not back to the button that opened the dialog. Here the result is a page
        within this one, which stays, with the dialog.
      </p>

      <Card>
        <Button
          label="Open search dialog"
          @click="searchDialogRef?.openDialog()"
        />

        <NuxtPage />
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="dialog-a11y">
      <h2 id="dialog-a11y">Accessibility Requirements</h2>

      <Card>
        <ul class="a11y-list">
          <li>The dialog has a label, either visible or for screen readers.</li>

          <li>
            When a dialog opens, focus moves to an element contained in the
            dialog. Generally, focus is initially set on the first focusable
            element. However, the most appropriate focus placement will depend
            on the nature and size of the content.
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
    </section>

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
.demo-page.dialog-demo {
  .card {
    margin-block-end: 0;
  }

  .dialog-notes {
    margin-block: 0 1.5rem;
  }

  .a11y-list {
    margin-block: 0;
  }
}

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
