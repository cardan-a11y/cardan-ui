<script setup lang="ts" generic="T extends GroupOption">
const model = defineModel<(string | number)[]>();

const {
  options,
  valueKey = 'value' as keyof T & string,
  labelKey = 'label' as keyof T & string,
  disabledKey = 'disabled' as keyof T & string,
  nameKey = undefined,
  name = undefined,
  variant = 'default',
  titleKey = undefined,
  tabindex = undefined,
  errorMessage = undefined,
  customError = undefined,
  id = useId(),
  showInvalid = false,
  disabled,
  required,
} = defineProps<{
  /** Any objects; the keys name the value, label, disabled, name and title fields */
  options: T[];
  label: string;
  tabindex?: string;
  valueKey?: keyof T & string;
  labelKey?: keyof T & string;
  disabledKey?: keyof T & string;
  nameKey?: keyof T & string;
  name?: string;
  titleKey?: keyof T & string;
  hideLegend?: boolean;
  disabled?: boolean;
  /** At least one box must be ticked */
  required?: boolean;
  showInvalid?: boolean;
  /** Under the group when it is required and no box is ticked; "Tick at least one option" by default */
  errorMessage?: string;
  /** An error the browser cannot find, such as the server's: shown until a box changes */
  customError?: string;
  id?: string;
  variant?: 'default' | '3d';
}>();

const { t } = useI18n();

function optionValue(option: T) {
  return option[valueKey] as string | number;
}

function optionText(option: T, key?: keyof T & string) {
  const value = key === undefined ? undefined : option[key];

  return value === undefined ? undefined : String(value);
}

const message = computed(
  () => errorMessage ?? t('form.checkbox-group-required'),
);

const selectedArray = computed({
  get: () => (Array.isArray(model.value) ? model.value : []),
  set: (value) => (model.value = value),
});

const hasSelection = computed(() => selectedArray.value.length > 0);

const { customErrorActive, clearCustomError, errorShown } = useCustomError(
  () => customError,
  {
    invalid: () => required && !hasSelection.value,
    showInvalid: () => showInvalid,
    exempt: () => disabled,
  },
);

const listRef = useTemplateRef<HTMLElement>('list');

// Not `required` on each box, which would ask for every box: custom validity
// asks for one
function applyValidity() {
  const text = required && !hasSelection.value ? message.value : '';

  listRef.value
    ?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    .forEach((input) => input.setCustomValidity(text));
}

onMounted(applyValidity);

watch([hasSelection, message, () => required, () => options], applyValidity, {
  deep: true,
  flush: 'post',
});
</script>

<template>
  <div
    :class="[
      'checkboxes-wrapper',
      showInvalid && 'show-invalid',
      customErrorActive && 'custom-error',
    ]"
  >
    <template v-if="options?.length">
      <fieldset
        :aria-describedby="errorShown ? `error-${id}` : undefined"
        @change="clearCustomError"
      >
        <legend
          v-if="label"
          :class="[hideLegend && 'visuallyhidden', disabled && 'disabled']"
        >
          <span>{{ label }}</span>

          <RequiredChip v-if="required" />
        </legend>

        <ul ref="list" role="list" class="checkbox-list">
          <li
            v-for="option in options"
            :key="`checkbox-${String(option[valueKey])}`"
          >
            <Checkbox
              v-model="selectedArray"
              :value="optionValue(option)"
              :label="optionText(option, labelKey)"
              :disabled="disabled || !!option[disabledKey]"
              :title="optionText(option, titleKey)"
              :name="name || optionText(option, nameKey)"
              :hide-label="option.hideLabel"
              :tabindex="tabindex"
              :variant="variant"
            />
          </li>
        </ul>
      </fieldset>

      <InputError
        v-if="required || customError"
        :id="id"
        :error-text="customErrorActive ? customError : message"
      />
    </template>
  </div>
</template>

<style>
:where(legend) {
  padding: 0;
  font-weight: var(--font-weight-semibold);
  -webkit-user-select: none;
  user-select: none;
  transition-property: opacity;
  transition-duration: var(--duration-sm);

  &.disabled {
    opacity: 25%;
  }
}

:where(fieldset) {
  border: none;
  padding: 0;
  margin-inline: 0;
}

.checkboxes-wrapper {
  legend {
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-md);
    margin-block-end: 0.75rem;
  }

  .checkbox-list {
    display: grid;
    gap: 0.5rem;
  }
}

:where(.checkboxes-wrapper.show-invalid:has(:invalid)),
:where(.checkboxes-wrapper.custom-error),
:where(.show-invalid) .checkboxes-wrapper:has(:invalid) {
  legend {
    color: var(--color-red-text);
  }

  .error-wrapper .error {
    display: flex;
  }
}
</style>
