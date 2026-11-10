<script setup lang="ts">
useHead({ title: 'Modal dialog pattern' });

const dialogRef = useTemplateRef<DialogComponent>('dialog');
const position = ref<DialogPosition>('center');
const date = ref();

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
