<script setup lang="ts">
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

// Basic
const topping = ref<string | null>(null);

// In a form
const formClient = ref<number | null>(7);
const submitted = ref('');

function handleSubmit(data: FormData) {
  submitted.value = JSON.stringify(Object.fromEntries(data));
}

// Loading
const loadedClient = ref<number | null>(12);
const loadedOption = ref<Client | null>({ id: 12, name: 'Océ' });
const requests = ref(0);
const answer = ref<'options' | 'failure' | 'nothing'>('options');
const optionsKey = ref(0);

const answerOptions = [
  { value: 'options', label: 'Answers the clients' },
  { value: 'failure', label: 'Fails' },
  { value: 'nothing', label: 'Answers an empty list' },
];

async function loadClients() {
  requests.value++;
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (answer.value === 'failure') throw new Error('The request failed');

  return answer.value === 'nothing' ? [] : clients;
}

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

// A value without its option: the list is asked at once
const lazyClient = ref<number | null>(3);

// Values
const sample = ref<boolean | null>(false);
const sampleOptions = [
  { value: false, label: 'None' },
  { value: true, label: 'Every page' },
];

const amount = ref<number | null>(0);
const amounts = [0, 1, 2, 5, 10];

const deleted = ref<number | null>(99);

// Create
const clientOptions = ref<Client[]>([...clients]);
const createdClient = ref<number | null>(null);
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

  const created = { id: clientOptions.value.length + 1, name };
  clientOptions.value = [...clientOptions.value, created];
  createdClient.value = created.id;
}

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

// Props
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

// In a Dialog and a Popover
const dialogRef = useTemplateRef<DialogComponent>('dialog');
const dialogClient = ref<number | null>(null);
const filterClient = ref<number | null>(null);
</script>

<template>
  <div class="demo-page combobox-page">
    <h1>ComboBox</h1>

    <p class="mbe-2 fs-lg">
      ComboBox is a searchable single select: a text field with a list under it.
      Typing shortens the list, and one option is picked as the value. It
      follows the combobox pattern of the ARIA Authoring Practices Guide, in the
      form of its example “Editable Combobox With List Autocomplete”, and has no
      library under it. It replaces MultiSelect, which stays in this version and
      is removed in the next minor.
    </p>

    <div class="card-cols">
      <Card>
        <h2>A list of options</h2>

        <p class="c-grey-text">
          <code>options</code> is an array of objects, strings or numbers. For
          objects, <code>value-key</code> and <code>label-key</code> name the
          fields that hold the value and the label, <code>value</code> and
          <code>label</code> by default. <code>v-model</code> is the value of
          the selected option, and <code>null</code> after the field is cleared.
        </p>

        <p class="c-grey-text">
          The list opens with a click in the field, with the button at its end,
          with the arrow keys and when you type. It does not open on focus
          alone, so Tab through a row of filters opens nothing. An option
          matches when its label contains the text you typed, ignoring case and
          diacritics: “jala” finds “Jalapeños”.
        </p>

        <div class="demo-box">
          <ComboBox v-model="topping" :options="toppings" label="Topping" />

          <p class="fs-sm">
            Value: <code>{{ JSON.stringify(topping) }}</code>
          </p>
        </div>

        <code
          >{{ `<ComboBox
            v-model="topping"
            :options="toppings"
            label="Topping"
          />` }}</code
        >
      </Card>

      <Card>
        <h2>With the keyboard</h2>

        <p class="c-grey-text">
          Focus stays in the text field the whole time. The arrow keys move a
          highlight through the options, which is the focus indicator of the
          list: an outline in the focus color.
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
            Without a highlight it only closes the list. While the list is open,
            Enter never submits the form.
          </li>
          <li>
            <kbd>Escape</kbd> closes the list and puts the label of the selected
            option back, which makes it the way out of typing by mistake. A
            Dialog around the field stays open.
          </li>
          <li>
            <kbd>Tab</kbd> and <kbd>Shift</kbd> + <kbd>Tab</kbd> pick the
            highlighted option, if there is one, and move on.
          </li>
          <li>
            <kbd>Left Arrow</kbd>, <kbd>Right Arrow</kbd>, <kbd>Home</kbd> and
            <kbd>End</kbd> move the caret in the text and take the highlight
            away.
          </li>
        </ul>

        <p class="c-grey-text">
          Typing highlights nothing: what you typed is a search, not a choice,
          so leaving the field never picks the first match for you.
        </p>
      </Card>

      <Card>
        <h2>The value is always an option</h2>

        <p class="c-grey-text">
          Text that was typed and not picked is no value. When focus leaves the
          field, it shows the label of the selected option again. A field that
          you emptied yourself clears the value when you leave it. The clear
          button at the end of the field does the same at once, and moves focus
          to the text field. The value never changes while you type, so a list
          of results that follows a filter does not reload in between.
        </p>

        <p class="c-grey-text">
          The same happens before a Form checks a submit, so the form sends what
          the field shows. With a <code>name</code>, a hidden input holds the
          value of the option, so the <code>FormData</code> of the form has the
          value and not the label. A required field without a value fails the
          submit, also when it holds text that was not picked.
        </p>

        <div class="demo-box">
          <Form @submit="handleSubmit">
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

          <p class="fs-sm">
            Value: <code>{{ JSON.stringify(formClient) }}</code>
          </p>

          <p role="status" class="fs-sm">
            <template v-if="submitted">
              Submitted: <code>{{ submitted }}</code>
            </template>
          </p>
        </div>

        <code
          >{{ `<ComboBox
            v-model="client"
            :options="clients"
            value-key="id"
            label-key="name"
            name="client_id"
            label="Client"
            required
          />` }}</code
        >
      </Card>

      <Card>
        <h2>Options from a function</h2>

        <p class="c-grey-text">
          <code>options</code> can also be an async function. ComboBox asks it
          when the field is first touched, on focus or when the pointer goes
          down on it, and not when the page opens. The list is then usually
          there by the time it opens. ComboBox keeps the answer and asks again
          only after a failure or an empty answer, when
          <code>options-key</code> changes, or through its exposed
          <code>refreshOptions()</code>.
        </p>

        <p class="c-grey-text">
          <code>v-model:selected</code> holds the selected option itself.
          ComboBox writes it when you pick, and reads it to show the label, so a
          field shows its value without loading its list. The first field below
          has it; the second has only a value, so it asks for its list at once
          to find the label.
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
            label="Client, with the selected option"
          />

          <ComboBox
            v-model="lazyClient"
            :options="loadClients"
            :options-key="optionsKey"
            value-key="id"
            label-key="name"
            label="Client, with only a value"
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
          With search on the server the label of a value cannot come from the
          list, so the field needs <code>v-model:selected</code> to show it. In
          development ComboBox warns in the console about a value that comes
          without it.
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
        <h2>Values</h2>

        <p class="c-grey-text">
          Empty is <code>null</code> or <code>undefined</code>, and nothing
          else. <code>false</code> and <code>0</code> are values with a label
          and a clear button. A value that has no option, such as a record that
          was deleted, stays in the model: ComboBox never changes a value by
          itself. The field then shows “Unknown option”, with the clear button.
        </p>

        <div class="demo-box">
          <ComboBox v-model="sample" :options="sampleOptions" label="Sample" />

          <ComboBox v-model="amount" :options="amounts" label="Amount" />

          <ComboBox
            v-model="deleted"
            :options="clients"
            value-key="id"
            label-key="name"
            label="Client that was deleted"
          />

          <p class="fs-sm">
            Values: <code>{{ JSON.stringify([sample, amount, deleted]) }}</code>
          </p>
        </div>
      </Card>

      <Card>
        <h2>Creating an option</h2>

        <p class="c-grey-text">
          With <code>create-option</code>, the last option of the list offers to
          create what you typed, while no label is that text. Case and the
          spaces around it count as the same, diacritics do not: “acme” is
          “Acme”, but “Oce” is not “Océ”, and the server refuses a name it
          counts as the same. <code>create-text</code> is a function that gives
          the option its text, for a wording of the project's own, such as
          “Create client “Acme””.
        </p>

        <p class="c-grey-text">
          The option is never highlighted by itself, also when it is the only
          one: an arrow key and Enter create, so a typo followed by Enter
          creates nothing. Tab never creates either: leaving the field would
          make a record. Picking it emits <code>create</code> with the text and
          closes the list; the text and the value stay as they were. The page
          creates the record, adds it to the options and sets the value, which
          shows its label, and meanwhile sets <code>loading</code>. A failure
          shows in the field through <code>custom-error</code>, with the text
          still there to correct. Type a name with “fail” in it to see one. The
          option needs the whole list, so it does not combine with
          <code>server-search</code>.
        </p>

        <div class="demo-box">
          <ComboBox
            v-model="createdClient"
            :options="clientOptions"
            value-key="id"
            label-key="name"
            label="Client"
            create-option
            :create-text="(text: string) => `Create client “${text}”`"
            :loading="isCreating"
            :custom-error="createError"
            @create="handleCreate"
          />

          <p class="fs-sm">
            Value: <code>{{ JSON.stringify(createdClient) }}</code>
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
          field that <code>disabled-key</code> names, cannot be picked. It stays
          in the list, dimmed, and a search finds it. The arrow keys reach it,
          so a screen reader reads it as unavailable: hiding it from the
          keyboard would hide it from the people who cannot see it. Enter and a
          click on it leave the list open and the value as it was, and Tab picks
          nothing. Say why it is unavailable in its label or in the field's
          instruction: an option has no description of its own.
        </p>

        <p class="c-grey-text">
          A value whose option is disabled, set by the page or disabled after it
          was picked, keeps its label and its checkmark, passes
          <code>required</code> and goes with the form: ComboBox never changes a
          value by itself.
        </p>

        <div class="demo-box">
          <ComboBox v-model="crust" :options="crusts" label="Crust" />
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
          a value.
        </p>

        <p class="c-grey-text">
          Without <code>can-clear</code> the field has no clear button, and
          emptying it puts the label back. <code>loading</code> shows the
          spinner, and <code>no-options-text</code> is the text of an empty
          list.
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
          clipping container cuts it off. It opens below the field, above it
          when it does not fit below, and is shortened to the room it has when
          it fits on neither side. It follows the field when the page scrolls. A
          long label wraps, so the list never scrolls sideways. On a phone the
          keyboard counts as out of bounds, so the list stays in view while you
          type.
        </p>

        <div class="demo-box clipping">
          <ComboBox
            :options="clients"
            value-key="id"
            label-key="name"
            label="In a container that clips"
          />
        </div>
      </Card>

      <Card>
        <h2>In a Dialog and a Popover</h2>

        <p class="c-grey-text">
          The list shows over a modal Dialog and past the edge of a Popover.
          While the list is open, Escape closes only the list: the Dialog or the
          Popover around the field stays open, and a second Escape closes that.
          Enter in the open list picks, and does not submit a form around the
          field.
        </p>

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

        <Dialog ref="dialog" label="Choose a client">
          <div class="dialog-client">
            <ComboBox
              v-model="dialogClient"
              :options="clients"
              value-key="id"
              label-key="name"
              label="Client in a dialog"
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

  .dialog-client {
    display: grid;
    padding: 1rem;
  }

  code {
    overflow-wrap: anywhere;
  }
}
</style>
