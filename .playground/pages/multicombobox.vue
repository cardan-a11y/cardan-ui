<script setup lang="ts">
useHead({ title: 'MultiComboBox' });

interface Finding {
  id: number;
  title: string;
}

const statuses = [
  { value: 'todo', label: 'To do' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'pending-review', label: 'Pending review' },
  { value: 'on-hold', label: 'On hold' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
];

const findings: Finding[] = [
  'Image without a text alternative',
  'Decorative image read out by screen readers',
  'Heading levels skip a level',
  'Link text does not describe its destination',
  'Form field without a label',
  'Error message not tied to its field',
  'Text contrast below 4.5:1',
  'Focus indicator missing on buttons',
  'Keyboard trap in the cookie banner',
  'Content lost at 400% zoom: the table scrolls in two directions',
  'Page title does not describe the page',
  'Language of the page not set',
  'Status message not announced',
  'Target size of the icon buttons below 24 by 24 pixels',
  'Video without captions',
  'Autoplaying carousel without a pause button',
  'Required field marked by colour alone',
  'Tooltip disappears when the pointer moves onto it',
  'Reading order differs from the visual order',
  'Dragging is the only way to sort the list',
].map((title, index) => ({ id: index + 1, title }));

// Basic
const status = ref<string[]>(['todo', 'in-progress']);

// In a form
const formStatuses = ref<string[]>([]);
const submitted = ref('');

function handleSubmit(data: FormData) {
  submitted.value = JSON.stringify(data.getAll('status'));
}

// Options from a function
const findingIds = ref<number[]>([3, 7]);
const requests = ref(0);

async function loadFindings() {
  requests.value++;
  await new Promise((resolve) => setTimeout(resolve, 800));

  return findings;
}

// Create
const tags = ref([
  { id: 1, name: 'Design' },
  { id: 2, name: 'Development' },
  { id: 3, name: 'Content' },
]);
const tagIds = ref<number[]>([1]);
const isCreating = ref(false);
const createError = ref<string>();

async function handleCreate(name: string) {
  createError.value = undefined;
  isCreating.value = true;
  await new Promise((resolve) => setTimeout(resolve, 600));
  isCreating.value = false;

  if (name.toLowerCase().includes('fail')) {
    createError.value = `“${name}” could not be created. Try another name.`;
    return;
  }

  const tag = { id: tags.value.length + 1, name };
  tags.value = [...tags.value, tag];
  tagIds.value = [...tagIds.value, tag.id];
}

// Disabled options
const columns = ref<string[]>(['key', 'status']);
const columnOptions = [
  { value: 'key', label: 'Key (always shown)', disabled: true },
  { value: 'version', label: 'Version' },
  { value: 'status', label: 'Status' },
  { value: 'auditor', label: 'Auditor' },
  { value: 'reviewer', label: 'Reviewer (not in this plan)', disabled: true },
];

// Props
const propsValue = ref<string[]>(['on-hold']);
const size = ref<InputSize>('md');
const sizes = [
  { value: 'sm', label: 'sm' },
  { value: 'md', label: 'md' },
  { value: 'lg', label: 'lg' },
];
const required = ref(false);
const disabled = ref(false);
const canClear = ref(true);
const showInvalid = ref(false);
const loading = ref(false);
const customError = ref(false);

// In a Dialog
const dialogRef = useTemplateRef<DialogComponent>('dialog');
const dialogFindings = ref<number[]>([]);
</script>

<template>
  <div class="demo-page multicombobox-page">
    <h1>MultiComboBox</h1>

    <p class="mbe-2 fs-lg">
      MultiComboBox selects several options: the text field of ComboBox, with a
      list of checkboxes under it. Typing shortens the list, and every option
      you tick is part of the value. It replaces the multiple and tags modes of
      MultiSelect, which is deprecated and removed in a next minor.
    </p>

    <p class="mbe-2">
      No pattern of the ARIA Authoring Practices Guide describes several values
      in one combobox: how an option is ticked while focus stays in the text
      field, and how a screen reader tells. So MultiComboBox does not invent
      one. Its popup is a dialog, the second kind of popup that ARIA 1.2 allows
      a combobox, as in the guide's example “Date Picker Combobox”, and every
      option in it is a real checkbox, which every browser and every screen
      reader knows. Focus moves into the dialog to tick, and comes back to the
      field to search.
    </p>

    <div class="card-cols">
      <Card>
        <h2>A list of options</h2>

        <p class="c-grey-text">
          <code>options</code> is an array of objects, strings or numbers, as in
          ComboBox: <code>value-key</code> and <code>label-key</code> name the
          fields of an object that hold the value and the label.
          <code>v-model</code> is an array of the values of the ticked options,
          in the order they were ticked, and <code>[]</code> after a clear.
        </p>

        <p class="c-grey-text">
          The list opens with a click in the field, with the button at its end,
          with the arrow keys and when you type. A click on an option ticks or
          unticks it, and the list stays open, so you can tick several in a row.
          Focus stays where it was, so you can also go on typing between two
          clicks.
        </p>

        <div class="demo-box">
          <MultiComboBox v-model="status" :options="statuses" label="Status" />

          <p class="fs-sm">
            Value: <code>{{ JSON.stringify(status) }}</code>
          </p>
        </div>

        <code
          >{{ `<MultiComboBox
            v-model="status"
            :options="statuses"
            label="Status"
          />` }}</code
        >
      </Card>

      <Card>
        <h2>With the keyboard</h2>

        <p class="c-grey-text">
          The text field searches, and the checkboxes in the list tick. Focus
          moves between the two, so every key does what it does anywhere else.
        </p>

        <ul class="c-grey-text">
          <li>
            <kbd>Down Arrow</kbd> in the field opens the list and moves focus to
            the first checkbox, <kbd>Up Arrow</kbd> to the last one.
            <kbd>Alt</kbd> + <kbd>Down Arrow</kbd> only opens the list.
          </li>
          <li>
            In the list, <kbd>Down Arrow</kbd>, <kbd>Up Arrow</kbd>,
            <kbd>Home</kbd> and <kbd>End</kbd> move focus between the
            checkboxes. <kbd>Up Arrow</kbd> on the first one returns to the
            field.
          </li>
          <li>
            <kbd>Space</kbd> ticks or unticks the checkbox, and the list stays
            open.
          </li>
          <li>
            <kbd>Tab</kbd> goes through the checkboxes too, while the list is
            open: they are ordinary checkboxes. Tab past the last one leaves the
            field and closes the list.
          </li>
          <li>
            <kbd>Escape</kbd> closes the list, puts the selection back in the
            field and moves focus there, wherever it was. A Dialog around the
            field stays open.
          </li>
          <li>
            <kbd>Enter</kbd> in the field closes the list. Neither in the field
            nor on a checkbox does it submit the form while the list is open.
          </li>
        </ul>
      </Card>

      <Card>
        <h2>What the field shows</h2>

        <p class="c-grey-text">
          Without a ticked option the field shows its placeholder. With one, it
          shows that option's label; with more, how many: “3 selected”. That
          text is the value of the field, which a screen reader reads after its
          name, and never part of the name, which is the label alone.
        </p>

        <p class="c-grey-text">
          Focus in the field selects that text, so typing replaces it with a
          search. When focus leaves the field and its list, the selection is
          back. While the list is open, a line above it says how many options
          are ticked, so you see it while the list is filtered. The clear button
          at the end of the field unticks them all.
        </p>
      </Card>

      <Card>
        <h2>In a form</h2>

        <p class="c-grey-text">
          The checkboxes are only there while the list is open, so with a
          <code>name</code> a hidden input holds each value, and the
          <code>FormData</code> of the form has them all under that name.
          <code>required</code> asks for one ticked option at least, with the
          error of a CheckboxGroup: “Tick at least one option”.
        </p>

        <div class="demo-box">
          <Form @submit="handleSubmit">
            <MultiComboBox
              v-model="formStatuses"
              :options="statuses"
              name="status"
              label="Statuses to show"
              required
            />

            <Button type="submit" label="Save" size="sm" />
          </Form>

          <p role="status" class="fs-sm">
            <template v-if="submitted">
              Submitted: <code>{{ submitted }}</code>
            </template>
          </p>
        </div>

        <code
          >{{ `<MultiComboBox
            v-model="statuses"
            :options="statusOptions"
            name="status"
            label="Statuses to show"
            required
          />` }}</code
        >
      </Card>

      <Card>
        <h2>Options from a function</h2>

        <p class="c-grey-text">
          As in ComboBox, <code>options</code> can be an async function, asked
          when the field is first touched, or at once when a value has no option
          to show its label. <code>v-model:selected</code> holds the ticked
          options themselves, so a field shows its labels without its list.
          MultiComboBox has no search on the server: a list too long to load
          whole needs a page of its own, not a field.
        </p>

        <div class="demo-box">
          <MultiComboBox
            v-model="findingIds"
            :options="loadFindings"
            value-key="id"
            label-key="title"
            label="Default findings"
            placeholder="Choose findings"
            instruction="The findings are added to every page of the test."
            size="lg"
          />

          <p class="fs-sm">
            Value: <code>{{ JSON.stringify(findingIds) }}</code>, requests:
            {{ requests }}
          </p>
        </div>
      </Card>

      <Card>
        <h2>Creating an option</h2>

        <p class="c-grey-text">
          With <code>create-option</code>, a button after the list offers to
          create what you typed, while no label is that text. Case and the
          spaces around it count as the same, diacritics do not: “andre” is
          “Andre”, but “Andre” is not “André”. <code>create-text</code> is a
          function that gives the button its text, for a wording of the
          project's own.
        </p>

        <p class="c-grey-text">
          The button emits <code>create</code> with the text and does nothing
          more. The page creates the record, adds it to the options and its
          value to <code>v-model</code>; meanwhile it sets <code>loading</code>.
          A failure shows in the field through <code>custom-error</code>. Focus
          goes to the field, whose text stays, so the new option shows ticked in
          the list. Type a name with “fail” in it to see a failure.
        </p>

        <div class="demo-box">
          <MultiComboBox
            v-model="tagIds"
            :options="tags"
            value-key="id"
            label-key="name"
            label="Tags"
            create-option
            :create-text="(text: string) => `Create tag “${text}”`"
            :loading="isCreating"
            :custom-error="createError"
            @create="handleCreate"
          />

          <p class="fs-sm">
            Value: <code>{{ JSON.stringify(tagIds) }}</code>
          </p>
        </div>

        <code
          >{{ `<MultiComboBox
            v-model="tagIds"
            :options="tags"
            value-key="id"
            label-key="name"
            label="Tags"
            create-option
            :create-text="(text) => t('tags.create', { text })"
            :loading="isCreating"
            :custom-error="createError"
            @create="createTag"
          />` }}</code
        >
      </Card>

      <Card>
        <h2>Disabled options</h2>

        <p class="c-grey-text">
          An option object whose <code>disabled</code> field is true, or the
          field that <code>disabled-key</code> names, is a checkbox that cannot
          be ticked or unticked: a click and Space leave it as it is. It is not
          a native disabled checkbox, which Tab would skip: Tab, the arrow keys
          and a search reach it, so a screen reader reads it as unavailable, the
          same choice as ComboBox makes. A ticked option that is disabled stays
          ticked, also when the clear button unticks the rest. Say why in its
          label or the field's instruction.
        </p>

        <div class="demo-box">
          <MultiComboBox
            v-model="columns"
            :options="columnOptions"
            label="Columns"
          />

          <p class="fs-sm">
            Value: <code>{{ JSON.stringify(columns) }}</code>
          </p>
        </div>
      </Card>

      <Card>
        <h2>Props</h2>

        <p class="c-grey-text">
          MultiComboBox renders through FormField, like every field, and takes
          the props of ComboBox: <code>label</code>, <code>hide-label</code>,
          <code>instruction</code>, <code>required</code>,
          <code>disabled</code>, <code>size</code>, <code>placeholder</code>,
          <code>show-invalid</code>, <code>custom-error</code>,
          <code>can-clear</code>, <code>loading</code> and
          <code>no-options-text</code>. An attribute goes to the text field, and
          <code>class</code> and <code>style</code> go to the wrapper, which has
          the class <code>has-value</code> while an option is ticked.
        </p>

        <div class="demo-box">
          <MultiComboBox
            v-model="propsValue"
            :options="statuses"
            :size="size"
            :required="required"
            :disabled="disabled"
            :can-clear="canClear"
            :show-invalid="showInvalid"
            :loading="loading"
            :custom-error="
              customError ? 'These statuses cannot be combined.' : undefined
            "
            label="Status"
            placeholder="Every status"
            instruction="Audits with one of these statuses are shown."
          />

          <RadioGroup v-model="size" :options="sizes" label="size" />

          <Switch v-model="required" label="required" />
          <Switch v-model="disabled" label="disabled" />
          <Switch v-model="canClear" label="can-clear" />
          <Switch v-model="showInvalid" label="show-invalid" />
          <Switch v-model="loading" label="loading" />
          <Switch v-model="customError" label="custom-error" />
        </div>
      </Card>

      <Card>
        <h2>In a Dialog, and the place of the list</h2>

        <p class="c-grey-text">
          The list is in the top layer and placed as ComboBox's: below the
          field, above it when it does not fit below, shortened to the room it
          has when it fits on neither side. The checkbox is at the start of each
          option and a long label wraps, so at 400% zoom the list scrolls down
          and never sideways. While the list is open, Escape closes only the
          list: a second Escape closes the Dialog.
        </p>

        <div class="demo-box">
          <Button
            label="Open dialog"
            variant="outline"
            size="sm"
            @click="dialogRef?.openDialog()"
          />
        </div>

        <Dialog ref="dialog" label="Connect findings">
          <div class="dialog-findings">
            <MultiComboBox
              v-model="dialogFindings"
              :options="findings"
              value-key="id"
              label-key="title"
              label="Default findings"
              placeholder="Choose findings"
              size="lg"
            />
          </div>
        </Dialog>
      </Card>
    </div>
  </div>
</template>

<style>
.demo-page.multicombobox-page {
  .card {
    display: grid;
    align-content: start;
    gap: 1rem;

    h2,
    p,
    ul {
      margin-block: 0;
    }
  }

  .demo-box {
    display: grid;
    gap: 1rem;
    padding: 1rem;
    border: 1px dashed var(--color-grey-light);
    border-radius: var(--radius-md);

    p {
      overflow-wrap: anywhere;
    }
  }

  .dialog-findings {
    display: grid;
    padding: 1rem;
  }

  code {
    overflow-wrap: anywhere;
  }
}
</style>
