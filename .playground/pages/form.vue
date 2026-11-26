<script setup lang="ts">
useHead({ title: 'Form inputs' });

const inputVariant = ref<InputVariant>('default');
const singleSelection = ref('');
const rangeValue = ref(0);
const quantity = ref<number | undefined>(1);
const min = ref(0);
const max = ref(10);
const step = ref(1);
const showTicks = ref(true);
const showOutput = ref(false);
const date = ref();
const selectedCheckboxes = ref<string[]>([]);
const selectedRadio = ref<string>();
const raw = ref();
const disabled = ref(false);
const readonly = ref(false);
const required = ref(false);
const checked = ref(false);
const avatar = ref<File>();

const serverError = ref<string>();

const wcagLevel = ref<string[]>([]);
const wcagLevels = [
  { value: 'A', label: 'Level A' },
  { value: 'AA', label: 'Level AA' },
  { value: 'AAA', label: 'Level AAA' },
];

const rules = [
  {
    title: 'Instruction and error',
    text: 'A field points its control at its instruction with aria-describedby, and at its error only while the error shows: after a failed submit of its Form, or with show-invalid.',
  },
  {
    title: 'error-message',
    text: 'The text for a constraint the browser checks. Input adds to its pattern what the Laravel APIs refuse: a required value of only spaces and an e-mail domain without a dot.',
  },
  {
    title: 'custom-error',
    text: 'An error the browser cannot find, such as one from the server. It describes the field until its value changes and does not hold the form back.',
  },
  {
    title: 'A whole number',
    text: 'SpinButton is the alternative to Input type="number" for a whole number of zero or more, such as a quantity.',
  },
];

const inputSize = ref<InputSize>('md');

const choiceVariant = computed(() =>
  inputVariant.value === 'minimal' ? 'default' : inputVariant.value,
);

const selectOptions = [
  {
    id: 'option-1',
    name: 'Long option 1',
  },
  {
    id: 'option-2',
    name: 'Longer text option 2',
  },
  {
    id: 'option-3',
    name: 'The longest text option 3',
  },
  {
    id: 'option-4',
    name: 'Disabled option',
    disabled: true,
  },
];

const checkboxOptions = [
  {
    value: 'checkbox-a',
    label: 'Checkbox A',
  },
  {
    value: 'checkbox-b',
    label: 'Checkbox B',
  },
  {
    value: 'checkbox-c',
    label: 'Checkbox C',
    disabled: true,
  },
];

const radioOptions = [
  {
    value: 'radio-a',
    label: 'Radio A',
  },
  {
    value: 'radio-b',
    label: 'Radio B',
  },
  {
    value: 'radio-c',
    label: 'Radio C',
    disabled: true,
  },
];

const inputSizes = [
  {
    value: 'sm',
    label: 'sm',
  },
  {
    value: 'md',
    label: 'md',
  },
  {
    value: 'lg',
    label: 'lg',
  },
];

const inputVariants = [
  {
    value: 'default',
    label: 'default',
  },
  {
    value: '3d',
    label: '3d',
  },
  {
    value: 'minimal',
    label: 'minimal',
  },
];

async function handleSubmit(formData: FormData) {
  console.log(formData);
  raw.value = Object.fromEntries(formData);

  // Cleared first, so the same answer shows again after the user typed
  serverError.value = undefined;
  await nextTick();
  serverError.value =
    formData.get('input') === 'Ada'
      ? 'This name is taken. Choose another one.'
      : undefined;
}
</script>

<template>
  <div class="demo-page form-page">
    <p class="demo-eyebrow">Forms</p>
    <div class="section-topbar">
      <h1>Form inputs</h1>

      <Popover
        icon="material-symbols:settings-rounded"
        :max-width="480"
        class="range-input-props"
      >
        <div class="popover-settings-content">
          <div class="props-wrapper">
            <Select
              v-model="inputVariant"
              :options="inputVariants"
              label="variant"
              size="sm"
            />
          </div>

          <h2>RangeInput Props</h2>

          <div class="props-wrapper">
            <Input v-model.number="min" type="number" label="min" size="sm" />
            <Input v-model.number="max" type="number" label="max" size="sm" />
            <Input v-model.number="step" type="number" label="step" size="sm" />

            <Switch v-model="showTicks" label="showTicks" />

            <Switch v-model="showOutput" label="showOutput" />

            <Select
              v-model="inputSize"
              :options="inputSizes"
              label="size"
              size="sm"
            />

            <code
              >{{`<RangeInput
                :min="${min}"
                :max="${max}"
                :step="${step}"
                :show-ticks="${showTicks}"
                :show-output="${showOutput}"
              />`}}</code
            >
          </div>
        </div>
      </Popover>
    </div>
    <p class="demo-lead">
      The field components share one frame, FormField: a label with its required
      chip, the control, the error text and the instruction. The settings button
      next to the heading sets the variant and the size of the fields below, and
      the props of the RangeInput.
    </p>

    <ul role="list" class="demo-grid">
      <li v-for="rule in rules" :key="rule.title" class="demo-tile">
        <strong>{{ rule.title }}</strong>
        <span>{{ rule.text }}</span>
      </li>
    </ul>

    <section class="demo-section" aria-labelledby="form-search-heading">
      <h2 id="form-search-heading">Search</h2>
      <p class="demo-hint">
        A Form with <code>role="search"</code> that emits <code>submit</code>
        with the term and <code>reset</code> when it is cleared. Its label is
        hidden by default (<code>hide-label</code>) and stays the accessible
        name.
      </p>

      <Card>
        <Search :size="inputSize" />
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="form-fields-heading">
      <h2 id="form-fields-heading">Form fields</h2>
      <p class="demo-hint">
        A Form checks its fields on submit and moves focus to the first one that
        fails. The switches in the form make every field required, read-only or
        disabled.
      </p>

      <Card>
      <Form
        aria-labelledby="form-fields-heading"
        @submit="handleSubmit"
        @reset="raw = ''"
      >
        <Input
          :required="required"
          name="input"
          label="Input"
          instruction="Submit the name Ada for an error from the server"
          :custom-error="serverError"
          :variant="inputVariant"
          :disabled="disabled"
          :readonly="readonly"
          :size="inputSize"
          style="--form-col-width: var(--form-col-width-60)"
        />

        <Select
          v-model="singleSelection"
          :required="required"
          name="select"
          label="Select"
          placeholder="Choose an option"
          :variant="inputVariant"
          :options="selectOptions"
          :disabled="disabled"
          label-key="name"
          value-key="id"
          :size="inputSize"
          style="--form-col-width: var(--form-col-width-40)"
        />

        <Input
          :required="required"
          type="email"
          name="email"
          label="Email address"
          autocomplete="email"
          instruction="The browser accepts an address without a dot in its domain, such as a@b, but the Laravel APIs refuse it, so this field does too."
          :variant="inputVariant"
          :disabled="disabled"
          :readonly="readonly"
          :size="inputSize"
        />

        <SpinButton
          v-model="quantity"
          :required="required"
          :min="1"
          :max="20"
          name="spin-button"
          label="Spin button"
          instruction="A whole number from 1 to 20: type it, or count with the buttons or the arrow keys"
          :disabled="disabled"
          :size="inputSize"
        />

        <Textarea
          :required="required"
          name="textarea"
          label="Textarea"
          instruction="Example of an instruction text, programmatically connected to the input with aria-describedby."
          :variant="inputVariant"
          :disabled="disabled"
          :readonly="readonly"
        />

        <Checkbox
          v-model="checked"
          :disabled="disabled"
          :required="required"
          name="single-checkbox"
          label="Checkbox"
        />

        <div class="card-cols">
          <section>
            <CheckboxGroup
              v-model="selectedCheckboxes"
              :inline="false"
              :required="required"
              :options="checkboxOptions"
              :variant="choiceVariant"
              :disabled="disabled"
              label="Checkbox group"
              name="checkbox-group[]"
              style="--form-col-width: var(--form-col-width-auto)"
            />
          </section>
          <section>
            <RadioGroup
              v-model="selectedRadio"
              :inline="false"
              :required="required"
              :options="radioOptions"
              :variant="choiceVariant"
              :disabled="disabled"
              label="Radio buttons group"
              name="radio-group"
              style="--form-col-width: var(--form-col-width-50)"
            />
          </section>
        </div>

        <RangeInput
          v-model.number="rangeValue"
          :required="required"
          :min="min"
          :max="max"
          :step="step"
          label="Range Input"
          name="range"
          class="demo-range-input"
          :show-ticks="showTicks"
          :show-output="showOutput"
          :disabled="disabled"
        />

        <section>
          <h3>Switch</h3>
          <ul role="list" class="switches-list">
            <li>
              <Switch
                v-model="required"
                name="switch-required"
                label="Require form inputs"
                variant="outline"
                class="demo-switch"
              />
            </li>
            <li>
              <Switch
                v-model="readonly"
                label="Readonly form inputs"
                variant="outline"
                class="demo-switch"
              />
            </li>
            <li>
              <Switch
                v-model="disabled"
                label="Disable form inputs"
                variant="outline"
                class="demo-switch"
              />
            </li>
            <li>
              <Switch
                v-model="disabled"
                label="Disable form inputs (default variant)"
                class="demo-switch"
                variant="outline"
                disabled
              />
            </li>
          </ul>
        </section>

        <div class="card-cols">
          <section>
            <div class="title-wrapper">
              <h3>DatePicker</h3>
            </div>

            <p>
              Cardan UI uses
              <Button
                to="https://vue3datepicker.com"
                label="@vuepic/vue-datepicker"
                variant="link"
                target="_blank"
              />
            </p>

            <DatePicker
              v-model="date"
              :required="required"
              name="date"
              label="DatePicker"
              placeholder="Pick a date"
              class="demo-datepicker"
              :disabled="disabled"
              :size="inputSize"
            />
          </section>
        </div>

        <div class="form-bottom-row">
          <div class="button-group">
            <Button
              type="submit"
              icon="material-symbols:check-rounded"
              :loading="disabled"
              variant="primary"
              label="Submit"
            />

            <Button type="reset" label="Reset" :disabled="disabled" />
          </div>
        </div>
      </Form>

      <template v-if="raw">
        <hr class="demo-divider" />
        <pre><code>{{ raw }}</code></pre>
      </template>
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="form-file-heading">
      <h2 id="form-file-heading">File Input</h2>
      <p class="demo-hint">
        FileInput previews and compresses an image and keeps it as its value.
        With <code>mode="document"</code> it checks a file against the
        extensions in <code>accept</code> and hands it to the parent to upload
        (<code>select</code>), uncompressed.
      </p>

      <ul class="form-notes">
        <li>
          Compression uses compressorjs, which a project that uses FileInput
          installs itself.
        </li>
        <li><code>shape="circle"</code> is the avatar upload.</li>
        <li>
          In document mode with a <code>name</code>, the file also stays in the
          input a form post reads, so <code>required</code> holds a submit back.
        </li>
      </ul>

    <div class="card-cols">
      <Card>
        <h3>File Input in a form</h3>
        <DemoFileForm :disabled="disabled" :required="required" />
      </Card>

      <Card>
        <h3>File Input with a circle</h3>
        <FileInput
          v-model="avatar"
          shape="circle"
          name="avatar"
          accept="image/*"
          :label="$t('general.avatar')"
          :disabled="disabled"
          :required="required"
          class="demo-avatar-input"
        />
      </Card>
    </div>
    </section>

    <div class="card-cols form-documents">
      <Card>
        <DemoDocumentUpload :disabled="disabled" />
      </Card>

      <Card>
        <DemoDocumentForm :disabled="disabled" />
      </Card>
    </div>

    <section class="demo-section" aria-labelledby="form-error-heading">
      <h2 id="form-error-heading">ErrorMessage</h2>
      <p class="demo-hint">
        The error box of a form or a page. It shows what a failed request
        answered, in either shape the Laravel APIs answer in; without a usable
        answer it says that the browser was offline or that something went
        wrong. <code>text</code> is the page's own text, shown before the API's
        messages.
      </p>

      <Card class="demo-error-messages">
      <h3>Laravel validation (422)</h3>
      <ErrorMessage
        :data="{
          message: 'The name field is required. (and 1 more error)',
          errors: {
            name: ['The name field is required.'],
            email: ['The email field must be a valid email address.'],
          },
          language: 'en',
        }"
      />

      <h3>CSRF mismatch (419) or a 500</h3>
      <ErrorMessage
        :data="{ message: 'CSRF token mismatch.', language: 'en' }"
      />

      <h3>JSON:API, with a summary of the page's own</h3>
      <ErrorMessage
        text="Check your order."
        :data="{ message: 'De offerte is niet meer geldig.', language: 'nl' }"
      />

      <h3>An HTML error page, or a server that did not answer</h3>
      <ErrorMessage :data="{}" />

      <h3>No answer: the browser was offline</h3>
      <ErrorMessage :data="{ offline: true }" />
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="form-multiselect">
      <h2 id="form-multiselect">MultiSelect</h2>
      <p class="demo-hint">
        Deprecated: it goes in the next minor. New work uses ComboBox, with
        <code>multiple</code> for several values.
      </p>

      <Card>
        <div class="demo-multiselect">
          <MultiSelect
            v-model="wcagLevel"
            :options="wcagLevels"
            label="WCAG level filter"
            mode="tags"
            placeholder="All levels"
            show-option-icons
          />
        </div>
      </Card>
    </section>
  </div>
</template>

<style>
.demo-page.form-page {
  .button[type='submit'] {
    flex-basis: auto;
  }

  .card {
    margin-block-end: 0;

    > h3:first-child {
      margin-block-start: 0;
    }

    section {
      padding-block: 1rem;
    }
  }

  .demo-error-messages [role='alert'] + h3 {
    margin-block-start: 1.5rem;
  }

  .form-notes {
    max-inline-size: 44rem;
    margin-block: 0 1.5rem;
    color: var(--color-grey-text);
  }

  .form-documents {
    margin-block-start: 1.5rem;
  }

  .form-bottom-row {
    display: flex;
    justify-content: space-between;
  }
}

.demo-multiselect {
  max-inline-size: 24rem;
}

.demo-avatar-input {
  max-width: 400px;
}

.demo-datepicker {
  max-width: 240px;
}

.switches-list {
  display: flex;
  flex-wrap: wrap;
  row-gap: 0.5rem;
  column-gap: 1rem;
}

:where(.button-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;

  > .button {
    flex-grow: 1;
  }
}
</style>
