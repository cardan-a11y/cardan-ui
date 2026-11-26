<script setup lang="ts">
import type { Ref } from 'vue';

useHead({ title: 'ComboBox' });

interface Client {
  id: number;
  name: string;
}

const toppings = [
  { value: 'cheese', label: 'Cheese' },
  { value: 'ham', label: 'Ham' },
  { value: 'mushrooms', label: 'Mushrooms' },
  { value: 'olives', label: 'Olives' },
  { value: 'pineapple', label: 'Pineapple' },
  { value: 'jalapenos', label: 'Jalapeños' },
];

const statuses = [
  { value: 'todo', label: 'To do' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'pending-review', label: 'Pending review' },
  { value: 'on-hold', label: 'On hold' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
];

const clients: Client[] = [
  'Acme',
  'Belastingdienst',
  'Café Zürich',
  'De Nederlandsche Bank',
  'Gemeente Amsterdam',
  'Gemeente Rotterdam',
  'Gemeente Utrecht',
  'Hogeschool van Arnhem en Nijmegen',
  'Koninklijke Bibliotheek',
  'Ministerie van Binnenlandse Zaken en Koninkrijksrelaties, directie Digitale Samenleving',
  'Nederlandse Spoorwegen',
  'Océ',
  'Provincie Noord-Brabant',
  'Rijksmuseum',
  'Stichting Accessibility',
  'Technische Universiteit Eindhoven',
  'Universiteit van Amsterdam',
  'Vrije Universiteit',
  'Waterschap Rivierenland',
  'Zorgverzekeraar Zilveren Kruis',
].map((name, index) => ({ id: index + 1, name }));

const findings = [
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

// A list of options
const topping = ref<string | null>(null);
const extraToppings = ref<string[]>(['cheese', 'olives']);

// What the field shows
const amount = ref<number | null>(0);
const amounts = [0, 1, 2, 5, 10];
const deleted = ref<number | null>(99);

// In a form
const formClient = ref<number | null>(7);
const formStatuses = ref<string[]>([]);
const submitted = ref('');

function submitClient(data: FormData) {
  submitted.value = JSON.stringify(Object.fromEntries(data));
}

function submitStatuses(data: FormData) {
  submitted.value = JSON.stringify(data.getAll('status'));
}

// Options from a function
const loadedClient = ref<number | null>(12);
const loadedOption = ref<Client | null>({ id: 12, name: 'Océ' });
const findingIds = ref<number[]>([3, 7]);
const requests = ref(0);
const answer = ref<'options' | 'failure' | 'nothing'>('options');
const optionsKey = ref(0);

const answerOptions = [
  { value: 'options', label: 'Answers the options' },
  { value: 'failure', label: 'Fails' },
  { value: 'nothing', label: 'Answers an empty list' },
];

function loader<T>(list: T[]) {
  return async () => {
    requests.value++;
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (answer.value === 'failure') throw new Error('The request failed');

    return answer.value === 'nothing' ? [] : list;
  };
}

const loadClients = loader(clients);
const loadFindings = loader(findings);

// Search on the server, in pages
const serverClient = ref<number | null>(12);
const serverOption = ref<Client | null>({ id: 12, name: 'Océ' });
const serverRequests = ref<string[]>([]);
const PAGE_SIZE = 8;

async function searchClients(
  query: string,
  { signal, page }: { signal: AbortSignal; page: number },
) {
  serverRequests.value = [
    `"${query}", page ${page}`,
    ...serverRequests.value,
  ].slice(0, 4);
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

  const matches = clients.filter((client) =>
    client.name.toLowerCase().includes(query.toLowerCase()),
  );

  return {
    options: matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    more: matches.length > page * PAGE_SIZE,
  };
}

// Creating an option: the page creates the record and sets the value
function creator(list: Ref<Client[]>, select: (id: number) => void) {
  const state = reactive({ loading: false, error: '' });

  async function create(name: string) {
    state.error = '';
    state.loading = true;
    await new Promise((resolve) => setTimeout(resolve, 600));
    state.loading = false;

    if (name.toLowerCase().includes('fail')) {
      state.error = `“${name}” could not be created. Try another name.`;
      return;
    }

    const created = { id: list.value.length + 1, name };
    list.value = [...list.value, created];
    select(created.id);
  }

  return { state, create };
}

const clientOptions = ref<Client[]>([...clients]);
const createdClient = ref<number | null>(null);
const clientCreator = creator(clientOptions, (id) => {
  createdClient.value = id;
});

const tags = ref<Client[]>([
  { id: 1, name: 'Design' },
  { id: 2, name: 'Development' },
  { id: 3, name: 'Content' },
]);
const tagIds = ref<number[]>([1]);
const tagCreator = creator(tags, (id) => {
  tagIds.value = [...tagIds.value, id];
});

// Disabled options
const crust = ref<string | null>('stuffed');
const crusts = [
  { value: 'thin', label: 'Thin' },
  { value: 'classic', label: 'Classic' },
  { value: 'stuffed', label: 'Stuffed crust (sold out today)', disabled: true },
  {
    value: 'gluten-free',
    label: 'Gluten-free (sold out today)',
    disabled: true,
  },
];

const columns = ref<string[]>(['key', 'status']);
const columnOptions = [
  { value: 'key', label: 'Key (always shown)', disabled: true },
  { value: 'version', label: 'Version' },
  { value: 'status', label: 'Status' },
  { value: 'auditor', label: 'Auditor' },
  { value: 'reviewer', label: 'Reviewer (not in this plan)', disabled: true },
];

// Props, for a single and a multiple field
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
const propsValue = ref<string | null>('ham');
const propsStatuses = ref<string[]>(['on-hold']);

// The place of the list
const dialogRef = useTemplateRef<DialogComponent>('dialog');
const dialogClient = ref<number | null>(null);
const dialogFindings = ref<number[]>([]);
const filterClient = ref<number | null>(null);
</script>

<template>
  <div class="demo-page combobox-page">
    <h1>ComboBox</h1>

    <p class="mbe-2 fs-lg">
      ComboBox is a searchable select of our own: a text field with a list under
      it, which typing shortens. Without <code>multiple</code> one option is
      picked as the value, after the combobox pattern of the ARIA Authoring
      Practices Guide in the form of its example “Editable Combobox With List
      Autocomplete”. With <code>multiple</code> every option is a checkbox, and
      every ticked option is part of the value. ComboBox replaces MultiSelect,
      which is deprecated and removed in the next minor.
    </p>

    <p class="mbe-2">
      No pattern of the guide describes several values in one combobox: how an
      option is ticked while focus stays in the text field, and how a screen
      reader tells. So ComboBox does not invent one. With
      <code>multiple</code> its popup is a dialog, the second kind of popup that
      ARIA 1.2 allows a combobox, as in the guide's example “Date Picker
      Combobox”, and every option in it is a real checkbox, which every browser
      and every screen reader knows. Focus moves into the dialog to tick, and
      comes back to the field to search. The docblock of
      <code>ComboBox.vue</code> lists every place where ComboBox leaves the
      patterns, and why.
    </p>

    <div class="card-cols">
      <Card>
        <h2>A list of options</h2>

        <p class="c-grey-text">
          <code>options</code> is an array of objects, strings or numbers. For
          objects, <code>value-key</code> and <code>label-key</code> name the
          fields that hold the value and the label, <code>value</code> and
          <code>label</code> by default. <code>v-model</code> is the value of
          the selected option, and <code>null</code> after a clear. With
          <code>multiple</code> it is an array of the values of the ticked
          options, in the order they were ticked, and <code>[]</code> after a
          clear. <code>multiple</code> is read once, when the field is created,
          since it decides the type of the value; in development a warning says
          so when it changes anyway, and when the value does not fit the mode.
        </p>

        <p class="c-grey-text">
          The list opens with a click in the field, with the button at its end,
          with the arrow keys and when you type, but not on focus alone, so Tab
          through a row of filters opens nothing. An option matches when its
          label contains the text you typed, ignoring case and diacritics:
          “jala” finds “Jalapeños”. With <code>multiple</code>, a click on an
          option ticks or unticks it and the list stays open, with focus where
          it was, so you can tick several in a row or go on typing in between.
        </p>

        <div class="demo-box">
          <ComboBox v-model="topping" :options="toppings" label="Topping" />

          <ComboBox
            v-model="extraToppings"
            multiple
            :options="toppings"
            label="Extra toppings"
          />

          <p class="fs-sm">
            Values:
            <code>{{ JSON.stringify(topping) }}</code> and
            <code>{{ JSON.stringify(extraToppings) }}</code>
          </p>
        </div>

        <code
          >{{ `<ComboBox
            v-model="topping"
            :options="toppings"
            label="Topping"
          />` }}</code
        >

        <code
          >{{ `<ComboBox
            v-model="extraToppings"
            multiple
            :options="toppings"
            label="Extra toppings"
          />` }}</code
        >
      </Card>

      <Card>
        <h2>With the keyboard</h2>

        <p class="c-grey-text">
          Without <code>multiple</code>, focus stays in the text field the whole
          time, and the arrow keys move a highlight through the options, which
          is the focus indicator of the list: an outline in the focus color.
        </p>

        <ul class="c-grey-text">
          <li>
            <kbd>Down Arrow</kbd> and <kbd>Up Arrow</kbd> open the list and move
            the highlight. It starts on the selected option, or on the first or
            the last option without one, and wraps at both ends.
            <kbd>Alt</kbd> + <kbd>Down Arrow</kbd> opens the list without a
            highlight.
          </li>
          <li>
            <kbd>Enter</kbd> picks the highlighted option and closes the list.
            Without a highlight it only closes the list.
          </li>
          <li>
            <kbd>Tab</kbd> and <kbd>Shift</kbd> + <kbd>Tab</kbd> pick the
            highlighted option, if there is one, and move on.
          </li>
          <li>
            <kbd>Left Arrow</kbd>, <kbd>Right Arrow</kbd>, <kbd>Home</kbd> and
            <kbd>End</kbd> move the caret in the text and take the highlight
            away. Typing highlights nothing: what you typed is a search, not a
            choice, so leaving the field never picks the first match for you.
          </li>
        </ul>

        <p class="c-grey-text">
          With <code>multiple</code>, the text field searches and the checkboxes
          in the list tick. Focus moves between the two, so every key does what
          it does anywhere else.
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
            checkboxes, and <kbd>Up Arrow</kbd> on the first one returns to the
            field. <kbd>Space</kbd> ticks or unticks a checkbox, and the list
            stays open.
          </li>
          <li>
            <kbd>Tab</kbd> goes through the checkboxes too, while the list is
            open: they are ordinary checkboxes. Tab past the last one leaves the
            field and closes the list.
          </li>
          <li><kbd>Enter</kbd> in the field closes the list.</li>
        </ul>

        <p class="c-grey-text">
          In both modes <kbd>Escape</kbd> closes the list and puts the selected
          label or the selection back in the field, with focus there, which
          makes it the way out of typing by mistake. While the list is open,
          Enter never submits the form around the field.
        </p>
      </Card>

      <Card>
        <h2>What the field shows</h2>

        <p class="c-grey-text">
          The value is always an option: text that was typed and not picked is
          no value, and when focus leaves the field it shows the label of the
          selected option again. A field that you emptied yourself clears the
          value when you leave it; the clear button at its end does so at once
          and moves focus to the text field. The value never changes while you
          type, so a list of results that follows a filter does not reload in
          between.
        </p>

        <p class="c-grey-text">
          With <code>multiple</code> the closed field shows the selection as its
          value: the placeholder without a ticked option, its label with one,
          and with more how many: “3 selected”. A screen reader reads that text
          after the name of the field, which is the label alone. Focus selects
          it, so typing replaces it with a search, and when focus leaves the
          field and its list the selection is back. While the list is open, a
          line above it says how many options are ticked, also while it is
          filtered.
        </p>

        <p class="c-grey-text">
          Empty is <code>null</code> or <code>undefined</code>, and nothing
          else: <code>false</code> and <code>0</code> are values with a label
          and a clear button. A value that has no option, such as a record that
          was deleted, stays in the model, since ComboBox never changes a value
          by itself. The field then shows “Unknown option”.
        </p>

        <div class="demo-box">
          <ComboBox v-model="amount" :options="amounts" label="Amount" />

          <ComboBox
            v-model="deleted"
            :options="clients"
            value-key="id"
            label-key="name"
            label="Client that was deleted"
          />

          <p class="fs-sm">
            Values: <code>{{ JSON.stringify([amount, deleted]) }}</code>
          </p>
        </div>
      </Card>

      <Card>
        <h2>In a form</h2>

        <p class="c-grey-text">
          Before a Form checks a submit, ComboBox settles as when focus leaves
          it, so the form sends what the field shows. With a
          <code>name</code>, a hidden input holds the value of the option, and
          with <code>multiple</code> one holds each value, so the
          <code>FormData</code> of the form has the values and not the labels. A
          required field without a value fails the submit, also when it holds
          text that was not picked. With <code>multiple</code>,
          <code>required</code> asks for one ticked option at least, with the
          error of a CheckboxGroup: “Tick at least one option”.
        </p>

        <div class="demo-box">
          <Form @submit="submitClient">
            <ComboBox
              v-model="formClient"
              :options="clients"
              value-key="id"
              label-key="name"
              name="client_id"
              label="Client"
              instruction="Type a few letters and press Enter to submit without picking."
              required
            />

            <Button type="submit" label="Save" size="sm" />
          </Form>

          <Form @submit="submitStatuses">
            <ComboBox
              v-model="formStatuses"
              multiple
              :options="statuses"
              name="status"
              label="Statuses to show"
              required
            />

            <Button type="submit" label="Apply" size="sm" />
          </Form>

          <p role="status" class="fs-sm">
            <template v-if="submitted">
              Submitted: <code>{{ submitted }}</code>
            </template>
          </p>
        </div>
      </Card>

      <Card>
        <h2>Options from a function</h2>

        <p class="c-grey-text">
          <code>options</code> can also be an async function. ComboBox asks it
          when the field is first touched, on focus or when the pointer goes
          down on it, and not when the page opens, so the list is usually there
          by the time it opens. ComboBox keeps the answer and asks again only
          after a failure or an empty answer, when
          <code>options-key</code> changes, or through its exposed
          <code>refreshOptions()</code>.
        </p>

        <p class="c-grey-text">
          <code>v-model:selected</code> holds the selected option itself, or
          with <code>multiple</code> the ticked options. ComboBox writes it when
          you pick, and reads it to show the label, so a field shows its value
          without loading its list. The client below has it; the findings have
          only their values, so they ask for their list at once.
        </p>

        <p class="c-grey-text">
          While the list loads, when it is empty, when nothing matches and when
          the request failed, the list shows a text. A screen reader gets the
          same text from a status element next to the field.
        </p>

        <div class="demo-box">
          <ComboBox
            v-model="loadedClient"
            v-model:selected="loadedOption"
            :options="loadClients"
            :options-key="optionsKey"
            value-key="id"
            label-key="name"
            label="Loaded client"
          />

          <ComboBox
            v-model="findingIds"
            multiple
            :options="loadFindings"
            :options-key="optionsKey"
            value-key="id"
            label-key="title"
            label="Default findings"
            placeholder="Choose findings"
            instruction="The findings are added to every page of the test."
          />

          <RadioGroup
            v-model="answer"
            :options="answerOptions"
            :inline="false"
            label="The next request"
          />

          <Button
            label="Change options-key"
            variant="outline"
            size="sm"
            @click="optionsKey++"
          />

          <p role="status" class="fs-sm">
            Requests: {{ requests }}. Selected option:
            <code>{{ JSON.stringify(loadedOption) }}</code>
          </p>
        </div>

        <code
          >{{ `<ComboBox
            v-model="clientId"
            v-model:selected="client"
            :options="loadClients"
            value-key="id"
            label-key="name"
            label="Client"
          />` }}</code
        >
      </Card>

      <Card>
        <h2>Search on the server</h2>

        <p class="c-grey-text">
          A list that is filtered in the browser has to be loaded whole, which
          is fine up to about a thousand options. For a longer list,
          <code>server-search</code> hands the search to the function:
          <code>options(query, { signal, page })</code> is asked after a pause
          of 300 milliseconds in typing, and the request that typing overtook is
          cancelled through the signal. What the function answers for an empty
          query is the list that shows when the field opens. While a search is
          under way, the results before stay in the list.
        </p>

        <p class="c-grey-text">
          The function may answer one page and say that there is more:
          <code>{ options, more }</code>. ComboBox asks for the next page when
          the scroll or the highlight reaches the end of the list. While there
          is more, Down Arrow on the last loaded option loads the next page and
          does not go back to the first option. The example below has pages of
          eight clients.
        </p>

        <p class="c-grey-text">
          The label of a value cannot come from such a list, so the field needs
          <code>v-model:selected</code> to show it, and in development ComboBox
          warns about a value without it. With <code>multiple</code>,
          <code>server-search</code> is ignored, with a warning in development:
          a list too long to load whole needs a page of its own, not a field.
        </p>

        <div class="demo-box">
          <ComboBox
            v-model="serverClient"
            v-model:selected="serverOption"
            :options="searchClients"
            value-key="id"
            label-key="name"
            label="Client, searched on the server"
            server-search
          />

          <div role="status" class="fs-sm">
            <p>
              Value: <code>{{ JSON.stringify(serverClient) }}</code>
            </p>

            <p v-if="serverRequests.length">Asked, the newest first:</p>

            <ul v-if="serverRequests.length">
              <li v-for="(request, index) in serverRequests" :key="index">
                <code>{{ request }}</code>
              </li>
            </ul>
          </div>
        </div>

        <code
          >{{ `<ComboBox
            v-model="clientId"
            v-model:selected="client"
            :options="searchClients"
            server-search
            label="Client"
          />` }}</code
        >
      </Card>

      <Card>
        <h2>Creating an option</h2>

        <p class="c-grey-text">
          With <code>create-option</code>, ComboBox offers to create what you
          typed, while no label is that text. Case and the spaces around it
          count as the same, diacritics do not: “acme” is “Acme”, but “Oce” is
          not “Océ”, and the server refuses a name it counts as the same.
          <code>create-text</code> is a function that gives the offer its text,
          for a wording of the project's own, such as “Create client “Acme””.
          The offer needs the whole list, so it does not combine with
          <code>server-search</code>.
        </p>

        <p class="c-grey-text">
          Without <code>multiple</code> the offer is the last option of the
          list. It is never highlighted by itself, also when it is the only one,
          so a typo followed by Enter creates nothing, and Tab never creates
          either. With <code>multiple</code> it is a button after the list.
          Either emits <code>create</code> with the text and does nothing more:
          the page creates the record, adds it to the options and sets the value
          or adds to it, and meanwhile sets <code>loading</code>. A failure
          shows in the field through <code>custom-error</code>, with the text
          still there to correct. Type a name with “fail” in it to see one.
        </p>

        <div class="demo-box">
          <ComboBox
            v-model="createdClient"
            :options="clientOptions"
            value-key="id"
            label-key="name"
            label="Client, or a new one"
            create-option
            :create-text="(text: string) => `Create client “${text}”`"
            :loading="clientCreator.state.loading"
            :custom-error="clientCreator.state.error || undefined"
            @create="clientCreator.create"
          />

          <ComboBox
            v-model="tagIds"
            multiple
            :options="tags"
            value-key="id"
            label-key="name"
            label="Tags"
            create-option
            :create-text="(text: string) => `Create tag “${text}”`"
            :loading="tagCreator.state.loading"
            :custom-error="tagCreator.state.error || undefined"
            @create="tagCreator.create"
          />

          <p class="fs-sm">
            Values:
            <code>{{ JSON.stringify(createdClient) }}</code> and
            <code>{{ JSON.stringify(tagIds) }}</code>
          </p>
        </div>

        <code
          >{{ `<ComboBox
            v-model="client"
            :options="clients"
            value-key="id"
            label-key="name"
            :label="t('clients.heading')"
            create-option
            :create-text="(text) => t('clients.create', { text })"
            :loading="isCreating"
            :custom-error="createError"
            @create="createClient"
          />` }}</code
        >
      </Card>

      <Card>
        <h2>Disabled options</h2>

        <p class="c-grey-text">
          An option object whose <code>disabled</code> field is true, or the
          field that <code>disabled-key</code> names, cannot be picked or
          ticked. It stays in the list, dimmed: a search and the arrow keys
          reach it, and with <code>multiple</code> Tab does too, so a screen
          reader reads it as unavailable. Hiding it from the keyboard would hide
          it from the people who cannot see it, which is why it is no native
          disabled checkbox. Enter, Space and a click leave the value as it was.
          Say why it is unavailable in its label or in the field's instruction:
          an option has no description of its own.
        </p>

        <p class="c-grey-text">
          A value whose option is disabled, set by the page or disabled after it
          was picked, keeps its label, passes <code>required</code> and goes
          with the form; with <code>multiple</code> the clear button leaves it
          ticked.
        </p>

        <div class="demo-box">
          <ComboBox v-model="crust" :options="crusts" label="Crust" />

          <ComboBox
            v-model="columns"
            multiple
            :options="columnOptions"
            label="Columns"
          />

          <p class="fs-sm">
            Values:
            <code>{{ JSON.stringify(crust) }}</code> and
            <code>{{ JSON.stringify(columns) }}</code>
          </p>
        </div>
      </Card>

      <Card>
        <h2>Props</h2>

        <p class="c-grey-text">
          ComboBox renders through FormField, like every field:
          <code>label</code>, <code>hide-label</code>, <code>instruction</code>,
          <code>required</code>, <code>disabled</code>, <code>size</code>,
          <code>placeholder</code>, <code>show-invalid</code> and
          <code>custom-error</code> work as they do on Input. An attribute goes
          to the text field, and <code>class</code> and <code>style</code> go to
          the wrapper, which has the class <code>has-value</code> while there is
          a value, and <code>is-multiple</code> with <code>multiple</code>.
        </p>

        <p class="c-grey-text">
          Without <code>can-clear</code> the field has no clear button, and
          emptying it puts the label back. <code>loading</code> shows the
          spinner, and <code>no-options-text</code> is the text of an empty
          list. The controls below set both fields.
        </p>

        <div class="demo-box">
          <ComboBox
            v-model="propsValue"
            :options="toppings"
            :size="size"
            :required="required"
            :disabled="disabled"
            :can-clear="canClear"
            :show-invalid="showInvalid"
            :loading="loading"
            :custom-error="
              customError ? 'This topping is sold out.' : undefined
            "
            label="Topping"
            placeholder="Choose a topping"
            instruction="One topping per pizza."
          />

          <ComboBox
            v-model="propsStatuses"
            multiple
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

          <ComboBox
            :options="[]"
            label="Empty list"
            no-options-text="No clients yet. Add one first."
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
        <h2>The place of the list</h2>

        <p class="c-grey-text">
          The list is in the top layer, as wide as the field, so no scrolling or
          clipping container cuts it off: it shows over a modal Dialog and past
          the edge of a Popover. It opens below the field, above it when it does
          not fit below, and is shortened to the room it has when it fits on
          neither side. It follows the field when the page scrolls. A long label
          wraps, also beside its checkbox, so at 400% zoom the list scrolls down
          and never sideways. On a phone the keyboard counts as out of bounds,
          so the list stays in view while you type.
        </p>

        <p class="c-grey-text">
          While the list is open, Escape closes only the list: the Dialog or the
          Popover around the field stays open, and a second Escape closes that.
        </p>

        <div class="demo-box clipping">
          <ComboBox
            :options="clients"
            value-key="id"
            label-key="name"
            label="In a container that clips"
          />
        </div>

        <div class="demo-box">
          <Button
            label="Open dialog"
            variant="outline"
            size="sm"
            @click="dialogRef?.openDialog()"
          />

          <Popover label="Filters" :max-width="320">
            <div class="popover-filter">
              <ComboBox
                v-model="filterClient"
                :options="clients"
                value-key="id"
                label-key="name"
                label="Filter by client"
                size="sm"
              />
            </div>
          </Popover>
        </div>

        <Dialog ref="dialog" label="Choose a client and findings">
          <div class="dialog-fields">
            <ComboBox
              v-model="dialogClient"
              :options="clients"
              value-key="id"
              label-key="name"
              label="Client in a dialog"
            />

            <ComboBox
              v-model="dialogFindings"
              multiple
              :options="findings"
              value-key="id"
              label-key="title"
              label="Default findings"
              placeholder="Choose findings"
            />
          </div>
        </Dialog>
      </Card>
    </div>
  </div>
</template>

<style>
.demo-page.combobox-page {
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

    /* A button keeps its own width, in the grid and in a Form */
    > :is(.button, .popover-wrapper) {
      justify-self: start;
    }

    .form > .button {
      --form-col-width: auto;
    }
  }

  .clipping {
    block-size: 6rem;
    overflow: hidden;
  }

  .popover-filter {
    inline-size: 16rem;
    max-inline-size: 100%;
    padding: 1rem;
  }

  .dialog-fields {
    display: grid;
    gap: 1rem;
    padding: 1rem;
  }

  code {
    overflow-wrap: anywhere;
  }
}
</style>
