<script setup lang="ts">
useHead({ title: 'Form inputs' });

const inputVariant = ref<InputVariant>('default');
const singleSelection = ref('');
const multiSelection = ref<string | string[]>();
const rangeValue = ref(0);
const min = ref(0);
const max = ref(10);
const step = ref(1);
const showTicks = ref(true);
const showOutput = ref(false);
const date = ref();
const selectedCheckboxes = ref<string[]>([]);
const showOptionIcons = ref(true);
const selectedRadio = ref<string>();
const raw = ref();
const disabled = ref(false);
const readonly = ref(false);
const required = ref(false);
const checked = ref(false);
const avatar = ref<File>();

const multiselectMode = ref<'single' | 'multiple' | 'tags'>('multiple');
const inputSize = ref<InputSize>('md');

// Checkboxes and radios have no minimal variant
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

const multiSelectOptions = [
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
    name: 'The longest text option 3 The longest text option 3 with way more tet that can possible fit anywhere in this drop dead gorgeous UI',
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

const multiselectModes = [
  {
    value: 'single',
    label: 'single',
  },
  {
    value: 'multiple',
    label: 'multiple',
  },
  {
    value: 'tags',
    label: 'tags',
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

function handleSubmit(formData: FormData) {
  console.log(formData);
  raw.value = Object.fromEntries(formData);
}
</script>

<template>
  <div class="demo-page form-page">
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

    <Card>
      <Search :size="inputSize" />
    </Card>

    <Card>
      <Form @submit="handleSubmit" @reset="raw = ''">
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

        <Input
          :required="required"
          name="input"
          label="Input"
          :variant="inputVariant"
          :disabled="disabled"
          :readonly="readonly"
          :size="inputSize"
          style="--col-width: var(--col-width-60)"
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
          style="--col-width: var(--col-width-40)"
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
              style="--col-width: var(--col-width-auto)"
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
              style="--col-width: var(--col-width-50)"
            />
          </section>
        </div>

        <section>
          <h2>Switch</h2>
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
              <h2>MultiSelect</h2>

              <Popover
                icon="material-symbols:settings-rounded"
                :max-width="480"
              >
                <div class="popover-settings-content">
                  <h2>Props</h2>

                  <div class="props-wrapper">
                    <Select
                      v-model="multiselectMode"
                      :options="multiselectModes"
                      label="mode"
                      size="sm"
                      @update:model-value="multiSelection = undefined"
                    />

                    <Select
                      v-model="inputSize"
                      :options="inputSizes"
                      label="size"
                      size="sm"
                    />

                    <Switch v-model="showOptionIcons" label="showOptionIcons" />

                    <code
                      >{{`<MultiSelect
                        mode="${multiselectMode}"
                        size="${inputSize}"
                        show-option-icons="${showOptionIcons}"
                      />`}}</code
                    >
                  </div>
                </div>
              </Popover>
            </div>

            <p>
              Cardan UI uses
              <Button
                to="https://vueform.com/reference/multiselect-element"
                label="@vueform/multiselect"
                variant="link"
                target="_blank"
              />
            </p>

            <MultiSelect
              v-model="multiSelection"
              :required="required"
              searchable
              create-option
              native-support
              name="multiselect"
              value-key="id"
              label-key="name"
              label="MultiSelect"
              placeholder="Make a selection"
              :mode="multiselectMode"
              :options="multiSelectOptions"
              :show-option-icons="showOptionIcons"
              :size="inputSize"
              :disabled="disabled"
              class="demo-multiselect"
            />
          </section>

          <section>
            <div class="title-wrapper">
              <h2>DatePicker</h2>
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
        <!-- <MarkdownPreview :content="'```ts\n' + raw + '\n```'" /> -->
      </template>
    </Card>

    <Card>
      <h2>File Input</h2>
      <DemoFileForm :disabled="disabled" :required="required" />
    </Card>

    <Card>
      <h2>File Input with a circle</h2>
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

    <Card>
      <DemoDocumentUpload :disabled="disabled" />
    </Card>
  </div>
</template>

<style>
.demo-page.form-page {
  .button[type='submit'] {
    flex-basis: auto;
  }

  section {
    padding-block: 0.75rem;
  }

  .form-bottom-row {
    display: flex;
    justify-content: space-between;
  }
}

.demo-multiselect {
  min-width: 240px;
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
