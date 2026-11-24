<script setup lang="ts">
useHead({ title: 'Confirm dialog' });

const { confirm } = useConfirm();

const lastResult = ref('');

async function ask(options: ConfirmOptions, name: string) {
  const confirmed = await confirm(options);
  lastResult.value = `${name}: ${confirmed ? 'confirmed' : 'cancelled'}`;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function askPlain() {
  ask(
    {
      label: 'Delete the report?',
      description: 'The report and its findings will be gone for good.',
      onConfirm: () => wait(300),
    },
    'Plain',
  );
}

const autofocusChallenge = ref(false);

function askChallenge() {
  ask(
    {
      label: 'Delete the project?',
      description:
        'This project could contain multiple audits. If you delete it, these audits cannot be recovered.',
      challenge: true,
      autofocus: autofocusChallenge.value,
      onConfirm: () => wait(300),
    },
    'Challenge',
  );
}

function askSlow() {
  ask(
    {
      label: 'Archive the course?',
      description: 'Learners keep their certificates.',
      confirmLabel: 'Archive',
      confirmIcon: 'material-symbols:archive-outline-rounded',
      confirmVariant: 'black',
      onConfirm: () => wait(2000),
    },
    'Slow',
  );
}

let failures = 0;

function askFailing() {
  failures = 0;
  ask(
    {
      label: 'Delete the client?',
      description:
        'The first attempt fails, as when the server refuses; the second one succeeds.',
      onConfirm: async () => {
        await wait(500);
        if (failures++ === 0) {
          throw { data: { message: 'This client still has open audits.' } };
        }
      },
    },
    'Failing',
  );
}

// Two lists on one page, each with its own delete action
const fruitList = ['Apple', 'Pear', 'Plum'];
const vegetableList = ['Leek', 'Carrot', 'Kale'];
const fruit = ref([...fruitList]);
const vegetables = ref([...vegetableList]);
const fruitHeading = useTemplateRef<HTMLElement>('fruitHeading');
const vegetableHeading = useTemplateRef<HTMLElement>('vegetableHeading');

async function deleteFruit(item: string) {
  const confirmed = await confirm({
    label: `Delete ${item}?`,
    description: `${item} goes from the list of fruit.`,
    onConfirm: async () => {
      await wait(300);
      fruit.value = fruit.value.filter((entry) => entry !== item);
    },
  });

  // The button that opened the dialog went with the item
  if (confirmed) fruitHeading.value?.focus();
}

async function deleteVegetable(item: string) {
  const confirmed = await confirm({
    label: `Delete ${item}?`,
    description: `${item} goes from the list of vegetables.`,
    onConfirm: async () => {
      await wait(300);
      vegetables.value = vegetables.value.filter((entry) => entry !== item);
    },
  });

  if (confirmed) vegetableHeading.value?.focus();
}

function restoreLists() {
  fruit.value = [...fruitList];
  vegetables.value = [...vegetableList];
}

// Declarative, with markup in the description
const cartDialogRef = useTemplateRef<ConfirmDialogComponent>('cartDialog');
const inCart = ref(true);
const cartHeading = useTemplateRef<HTMLElement>('cartHeading');

async function removeFromCart() {
  inCart.value = false;
  await cartDialogRef.value?.closeDialog();
  cartHeading.value?.focus();
}

// A confirm over an open Dialog
const filesDialogRef = useTemplateRef<DialogComponent>('filesDialog');
const files = ref(['report.pdf', 'screenshot.png']);

const filesList = useTemplateRef<HTMLElement>('filesList');

async function deleteFile(file: string) {
  const confirmed = await confirm({
    label: `Delete ${file}?`,
    description: 'The file goes from this finding.',
    onConfirm: () => {
      files.value = files.value.filter((entry) => entry !== file);
    },
  });
  lastResult.value = `File: ${confirmed ? 'confirmed' : 'cancelled'}`;

  // The button that opened the dialog went with the file
  if (confirmed) filesList.value?.focus();
}

const example = `const { confirm } = useConfirm();

const confirmed = await confirm({
  label: t('audits.delete'),
  description: t('audits.delete-confirm'),
  challenge: true,
  onConfirm: () => deleteAudit(audit),
});`;
</script>

<template>
  <div class="demo-page confirm-demo">
    <h1>Confirm dialog</h1>

    <blockquote>
      <p class="fs-md">
        An alert dialog is a modal dialog that interrupts the user's workflow to
        communicate an important message and acquire a response. Examples
        include action confirmation prompts and error message confirmations.
      </p>

      <p class="fs-sm mbe-2 c-grey-text">
        Source:
        <Button
          label="ARIA Design Patterns"
          to="https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog"
          variant="link"
          target="_blank"
        />
      </p>
    </blockquote>

    <Card>
      <h2>useConfirm()</h2>

      <p>
        Every project asks "are you sure?" before it deletes something.
        <code>useConfirm()</code> asks it in one dialog, ConfirmDialog, which
        <code>&lt;ConfirmDialogHost /&gt;</code> renders. A project mounts the
        host once, in its layout, as it does ToastManager; this playground
        mounts it in its default layout. Without a mounted host,
        <code>confirm()</code> runs nothing and resolves <code>false</code>,
        with a warning in development.
      </p>

      <p>
        The action travels with the request. You pass it as
        <code>onConfirm</code>, a function that closes over the item it acts on,
        so the dialog can only ever run the action of the caller that opened it.
        Nothing shared holds an item or decides which handler runs, and the
        request is cleared when the dialog closes, however it closes. While one
        confirmation is open, another <code>confirm()</code> resolves
        <code>false</code> at once and leaves the first as it is.
      </p>

      <pre><code>{{ example }}</code></pre>

      <p>
        While <code>onConfirm</code> runs, the dialog stays open and its button
        shows that it is busy; a second click does not run the action again.
        When the action throws, the dialog stays open and shows the error that
        <code>extractApiError()</code> reads from it, so the user can try again
        or cancel. The promise resolves <code>true</code> once the action has
        succeeded and the dialog has closed, and <code>false</code> after a
        cancel: the Cancel button, the close button, <kbd>Escape</kbd> or a
        click outside the dialog. By then the browser has given focus back to
        the button that opened the dialog. When that button went with the
        deleted item, move focus yourself, for example to the heading of the
        list, as the lists below do.
      </p>

      <div class="flex-wrapper">
        <Button label="Delete the report" @click="askPlain" />
        <Button label="Archive the course (slow)" @click="askSlow" />
        <Button label="Delete the client (fails once)" @click="askFailing" />
      </div>

      <p role="status" class="confirm-demo-result">{{ lastResult }}</p>
    </Card>

    <Card>
      <h2>The digit challenge</h2>

      <p>
        For an action that cannot be undone and takes a lot with it, such as a
        project with all its audits, pass <code>challenge: true</code>. The
        dialog then names a random digit, new at every open, and asks the user
        to type it in a field that is described by that text. The confirm button
        stays disabled until the typed digit matches. Focus starts on the
        dialog's first element, unless you pass <code>autofocus: true</code>
        (the Auditor passes its user preference), which starts it in the field.
        Without a challenge, focus starts on Cancel, the least destructive
        action.
      </p>

      <Switch v-model="autofocusChallenge" label="Start focus in the field" />

      <div class="flex-wrapper">
        <Button label="Delete the project" @click="askChallenge" />
      </div>
    </Card>

    <Card>
      <h2>Two lists on one page</h2>

      <p>
        Each list deletes from itself: its delete buttons pass their own item
        and their own list in the action. After a delete, focus moves to the
        list's heading, since the button that opened the dialog is gone.
      </p>

      <div class="confirm-demo-lists">
        <section aria-labelledby="fruit-heading">
          <h3 id="fruit-heading" ref="fruitHeading" tabindex="-1">Fruit</h3>
          <ul role="list">
            <li v-for="item in fruit" :key="item">
              {{ item }}
              <Button
                variant="ghost-red"
                size="sm"
                icon="material-symbols:delete-outline-rounded"
                :aria-label="`Delete ${item}`"
                @click="deleteFruit(item)"
              />
            </li>
          </ul>
        </section>

        <section aria-labelledby="vegetable-heading">
          <h3 id="vegetable-heading" ref="vegetableHeading" tabindex="-1">
            Vegetables
          </h3>
          <ul role="list">
            <li v-for="item in vegetables" :key="item">
              {{ item }}
              <Button
                variant="ghost-red"
                size="sm"
                icon="material-symbols:delete-outline-rounded"
                :aria-label="`Delete ${item}`"
                @click="deleteVegetable(item)"
              />
            </li>
          </ul>
        </section>
      </div>

      <Button
        label="Restore the lists"
        variant="outline"
        @click="restoreLists"
      />
    </Card>

    <Card>
      <h2>Declarative, with markup</h2>

      <p>
        When the description needs markup, such as the name of a course in
        another language in a <code>&lt;strong lang&gt;</code>, put
        <code>&lt;ConfirmDialog&gt;</code> in the page and give it the text in
        its default slot. Its state stays in the instance, behind its own
        template ref, so two of them on one page know nothing of each other.
        Open it with <code>openDialog()</code>; it emits <code>confirm</code>,
        and you close it with <code>closeDialog()</code> once the action is
        done, or show the failure in its <code>error</code> prop while
        <code>loading</code> is off again. Any other close emits
        <code>cancel</code>.
      </p>

      <h3 ref="cartHeading" tabindex="-1">Your cart</h3>

      <p v-if="inCart">
        <span lang="nl">Toegankelijkheid voor ontwikkelaars</span>
        <Button
          variant="ghost-red"
          size="sm"
          icon="material-symbols:delete-outline-rounded"
          aria-label="Remove from cart"
          @click="cartDialogRef?.openDialog()"
        />
      </p>
      <template v-else>
        <p>Your cart is empty.</p>
        <Button label="Put it back" variant="outline" @click="inCart = true" />
      </template>

      <ConfirmDialog
        ref="cartDialog"
        label="Remove from your cart?"
        :confirm-label="$t('general.remove')"
        @confirm="removeFromCart"
      >
        <p>
          Remove
          <strong lang="nl">Toegankelijkheid voor ontwikkelaars</strong> from
          your cart?
        </p>
      </ConfirmDialog>
    </Card>

    <Card>
      <h2>From an open dialog</h2>

      <p>
        A confirmation can open over another dialog, such as a finding with its
        files. Both are in the top layer; when the confirmation closes, focus
        returns into the first dialog.
      </p>

      <Button label="Open the finding" @click="filesDialogRef?.openDialog()" />

      <Dialog ref="filesDialog" label="Finding" class="confirm-demo-files">
        <ul ref="filesList" role="list" aria-label="Files" tabindex="-1">
          <li v-for="file in files" :key="file">
            {{ file }}
            <Button
              variant="ghost-red"
              size="sm"
              icon="material-symbols:delete-outline-rounded"
              :aria-label="`Delete ${file}`"
              @click="deleteFile(file)"
            />
          </li>
        </ul>
      </Dialog>
    </Card>

    <Card>
      <h2>Accessibility Requirements</h2>

      <ul class="a11y-list">
        <li>
          The dialog has <code>role="alertdialog"</code>, is named by its title
          and described by its description with <code>aria-describedby</code>.
        </li>
        <li>
          Focus starts on Cancel, the least destructive action. With the
          challenge it starts in the digit's field when asked to, otherwise on
          the dialog's first element.
        </li>
        <li>
          Keyboard focus is trapped inside the dialog, and <kbd>Escape</kbd>
          cancels.
        </li>
        <li>
          When the dialog closes, focus returns to the button that opened it, or
          the page moves it when that button is gone.
        </li>
        <li>
          An error shows inside the dialog, in an alert: a toast would be under
          the backdrop, out of reach and unannounced.
        </li>
      </ul>
    </Card>
  </div>
</template>

<style>
.confirm-demo {
  .confirm-demo-result:empty {
    margin-block: 0;
  }

  .confirm-demo-lists {
    display: grid;
    gap: 1.5rem;
    margin-block-end: 1.5rem;

    @media (min-width: 640px) {
      grid-template-columns: 1fr 1fr;
    }

    li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
  }
}

.confirm-demo-files {
  --dialog-max-width: 360px;

  ul {
    padding-inline: 0;
  }

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
}
</style>
