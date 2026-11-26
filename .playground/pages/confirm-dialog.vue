<script setup lang="ts">
useHead({ title: 'Confirm dialog' });

const { confirm } = useConfirm();

const rules = [
  {
    title: 'One host',
    text: 'A project mounts ConfirmDialogHost once, in its layout, as it does ToastManager. useConfirm() opens the dialog it renders.',
  },
  {
    title: 'The action travels along',
    text: 'Pass the action as onConfirm, a function that closes over its item. Nothing shared holds an item or decides which handler runs.',
  },
  {
    title: 'One at a time',
    text: 'While one confirmation is open, another confirm() resolves false at once and leaves the first as it is.',
  },
  {
    title: 'Errors stay in the dialog',
    text: 'A failed action shows in the dialog, so the user can try again or cancel. A toast would be under the backdrop.',
  },
];

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
    <p class="demo-eyebrow">Actions</p>
    <h1>Confirm dialog</h1>
    <p class="demo-lead">
      ConfirmDialog asks before an action, such as a delete. It is an APG
      <Button
        label="alert dialog"
        to="https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog"
        variant="link"
        target="_blank"
      />: a modal dialog that interrupts the user to get an answer.
    </p>

    <ul role="list" class="demo-grid">
      <li v-for="rule in rules" :key="rule.title" class="demo-tile">
        <strong>{{ rule.title }}</strong>
        <span>{{ rule.text }}</span>
      </li>
    </ul>

    <section class="demo-section" aria-labelledby="confirm-use-confirm">
      <h2 id="confirm-use-confirm">useConfirm()</h2>
      <p class="demo-hint">
        <code>confirm()</code> opens the one ConfirmDialog that
        <code>&lt;ConfirmDialogHost /&gt;</code> renders. Its promise resolves
        <code>true</code> once the action has succeeded and the dialog has
        closed, and <code>false</code> after a cancel.
      </p>

      <Card>
        <pre><code>{{ example }}</code></pre>

        <ul class="confirm-demo-notes">
          <li>
            While <code>onConfirm</code> runs, the dialog stays open and its
            button shows that it is busy; a second click does not run the action
            again.
          </li>
          <li>
            When the action throws, the dialog stays open and shows the error
            that <code>extractApiError()</code> reads from it.
          </li>
          <li>
            A cancel is the Cancel button, the close button,
            <kbd>Escape</kbd> or a click outside the dialog. The request is
            cleared when the dialog closes, however it closes.
          </li>
          <li>
            By then the browser has given focus back to the button that opened
            the dialog. When that button went with the deleted item, move focus
            yourself, for example to the heading of the list, as the lists below
            do.
          </li>
          <li>
            Without a mounted host, <code>confirm()</code> runs nothing and
            resolves <code>false</code>, with a warning in development. This
            playground mounts the host in its default layout.
          </li>
        </ul>

        <div class="flex-wrapper">
          <Button label="Delete the report" @click="askPlain" />
          <Button label="Archive the course (slow)" @click="askSlow" />
          <Button label="Delete the client (fails once)" @click="askFailing" />
        </div>

        <p role="status" class="confirm-demo-result">{{ lastResult }}</p>
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="confirm-challenge">
      <h2 id="confirm-challenge">The digit challenge</h2>
      <p class="demo-hint">
        For an action that cannot be undone and takes a lot with it, such as a
        project with all its audits, pass <code>challenge: true</code>. The
        confirm button stays disabled until the user has typed the digit the
        dialog names.
      </p>

      <Card>
        <ul class="confirm-demo-notes">
          <li>
            The digit is random and new at every open; its field is described by
            the text that names it.
          </li>
          <li>
            Focus starts on the dialog's first element, unless you pass
            <code>autofocus: true</code> (the Auditor passes its user
            preference), which starts it in the field.
          </li>
          <li>
            Without a challenge, focus starts on Cancel, the least destructive
            action.
          </li>
        </ul>

        <Switch v-model="autofocusChallenge" label="Start focus in the field" />

        <div class="flex-wrapper">
          <Button label="Delete the project" @click="askChallenge" />
        </div>
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="confirm-lists">
      <h2 id="confirm-lists">Two lists on one page</h2>
      <p class="demo-hint">
        Each list deletes from itself: its delete buttons pass their own item
        and their own list in the action. After a delete, focus moves to the
        list's heading, since the button that opened the dialog is gone.
      </p>

      <Card>
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
    </section>

    <section class="demo-section" aria-labelledby="confirm-declarative">
      <h2 id="confirm-declarative">Declarative, with markup</h2>
      <p class="demo-hint">
        When the description needs markup, such as the name of a course in
        another language in a <code>&lt;strong lang&gt;</code>, put
        <code>&lt;ConfirmDialog&gt;</code> in the page and give it the text in
        its default slot.
      </p>

      <Card>
        <ul class="confirm-demo-notes">
          <li>
            Its state stays in the instance, behind its own template ref, so two
            of them on one page know nothing of each other.
          </li>
          <li>
            Open it with <code>openDialog()</code>; it emits
            <code>confirm</code> to ask you to act.
          </li>
          <li>
            Close it with <code>closeDialog()</code> once the action is done, or
            show the failure in its <code>error</code> prop while
            <code>loading</code> is off again.
          </li>
          <li>Any other close emits <code>cancel</code>.</li>
        </ul>

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
          <Button
            label="Put it back"
            variant="outline"
            @click="inCart = true"
          />
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
    </section>

    <section class="demo-section" aria-labelledby="confirm-nested">
      <h2 id="confirm-nested">From an open dialog</h2>
      <p class="demo-hint">
        A confirmation can open over another dialog, such as a finding with its
        files. Both are in the top layer; when the confirmation closes, focus
        returns into the first dialog.
      </p>

      <Card>
        <Button
          label="Open the finding"
          @click="filesDialogRef?.openDialog()"
        />

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
    </section>

    <section class="demo-section" aria-labelledby="confirm-a11y">
      <h2 id="confirm-a11y">Accessibility Requirements</h2>

      <Card>
        <ul class="a11y-list">
          <li>
            The dialog has <code>role="alertdialog"</code>, is named by its
            title and described by its description with
            <code>aria-describedby</code>.
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
            When the dialog closes, focus returns to the button that opened it,
            or the page moves it when that button is gone.
          </li>
          <li>
            An error shows inside the dialog, in an alert: a toast would be
            under the backdrop, out of reach and unannounced.
          </li>
        </ul>
      </Card>
    </section>
  </div>
</template>

<style>
.demo-page.confirm-demo {
  .card {
    margin-block-end: 0;
  }

  pre {
    margin-block: 0 1.5rem;
  }

  .confirm-demo-notes {
    margin-block: 0 1.5rem;
  }

  .a11y-list {
    margin-block: 0;
  }

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
