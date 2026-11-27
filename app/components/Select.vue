<script setup lang="ts" generic="T extends SelectOption">
import type { StyleValue } from 'vue';

defineOptions({ inheritAttrs: false });

const { t } = useI18n();
const model = defineModel<string | number | boolean>();

const {
  label = undefined,
  name = undefined,
  errorMessage = undefined,
  customError = undefined,
  placeholder = undefined,
  options = undefined,
  noOptionsLabel = undefined,
  ariaDescribedby = undefined,
  instruction = undefined,
  tabindex = undefined,
  color = undefined,
  required,
  disabled,
  variant = 'default',
  placeholderValue = '',
  size = 'md',
  showInvalid = false,
  valueKey = 'value' as keyof T & string,
  labelKey = 'label' as keyof T & string,
  disabledKey = 'disabled' as keyof T & string,
  id = useId(),
} = defineProps<{
  label?: string;
  name?: string;
  /** Any objects; the keys name the value, label and disabled fields */
  options?: T[];
  placeholder?: string;
  placeholderValue?: string | number;
  size?: InputSize;
  valueKey?: keyof T & string;
  labelKey?: keyof T & string;
  disabledKey?: keyof T & string;
  hideLabel?: boolean;
  /** Shows the error now; a Form shows it after a failed submit */
  showInvalid?: boolean;
  required?: boolean;
  disabled?: boolean;
  autofocus?: boolean;
  noOptionsLabel?: string;
  ariaDescribedby?: string;
  instruction?: string;
  /** The error text when the browser finds the field invalid; "<label> is missing" by default */
  errorMessage?: string;
  /** An error the browser cannot find, such as the server's: shown until the value changes */
  customError?: string;
  tabindex?: string;
  color?: BaseColor;
  id?: string;
  variant?: InputVariant;
}>();

const { controlAttrs } = useControlAttrs();

const modelOrPlaceholder = computed({
  get: () => model.value ?? placeholderValue,
  set: (value) => (model.value = value),
});

const computedErrorMessage = computed(() => {
  if (errorMessage) return errorMessage;
  if (required && !model.value) {
    return t('form.missing-value', { item: label });
  }
  return t('form.invalid-value');
});

const selectRef = useTemplateRef<HTMLSelectElement>('select');
const isValid = ref(true);

function updateValidity() {
  isValid.value = selectRef.value?.validity.valid ?? true;
}

const { customErrorActive, clearCustomError, errorShown } = useCustomError(
  () => customError,
  {
    invalid: () => !isValid.value,
    showInvalid: () => showInvalid,
    exempt: () => disabled,
  },
);

onMounted(updateValidity);
// nextTick: v-model sets the select's value in its updated hook, after this
// watcher, and the DOM flush is done by then
watch([model, () => required, () => options], () => nextTick(updateValidity), {
  flush: 'post',
});

const computedAriaDescribedby = computed(
  () =>
    [
      ariaDescribedby,
      instruction && `instruction-${id}`,
      errorShown.value && `error-${id}`,
    ]
      .filter(Boolean)
      .join(' ') || undefined,
);

function handleChange() {
  clearCustomError();
  updateValidity();
  remember();
}

const { remember } = useAutofillSync(selectRef, (control) =>
  control.dispatchEvent(new Event('change')),
);
watch(model, remember, { flush: 'post' });

function focusElement() {
  selectRef.value?.focus();
}

defineExpose({
  focusElement,
});
</script>

<template>
  <FormField
    :id="id"
    :class="[
      `select-size--${size}`,
      `select-variant--${variant}`,
      color && `select-color--${color}`,
      $attrs.class,
    ]"
    :style="$attrs.style as StyleValue"
    :label="label"
    :hide-label="hideLabel"
    :required="required"
    :disabled="disabled"
    :instruction="instruction"
    :error-text="customErrorActive ? customError : computedErrorMessage"
    :show-invalid="showInvalid"
    :custom-error="customErrorActive"
  >
    <div class="select-wrapper">
      <select
        :id="id"
        ref="select"
        v-model="modelOrPlaceholder"
        class="select"
        v-bind="controlAttrs()"
        :name="name"
        :required="required"
        :disabled="disabled"
        :autofocus="autofocus"
        :tabindex="tabindex"
        :aria-describedby="computedAriaDescribedby"
        :aria-invalid="errorShown || undefined"
        size="1"
        @change="handleChange"
        @invalid="updateValidity"
      >
        <option
          v-if="!options?.length && !$slots.default"
          selected
          disabled
          :value="placeholderValue"
        >
          {{ noOptionsLabel || $t('select.no-options') }}
        </option>
        <option v-else-if="placeholder" hidden :value="placeholderValue">
          {{ placeholder }}
        </option>

        <slot v-if="$slots.default" />

        <template v-else>
          <option
            v-for="option in options"
            :key="`${String(option[valueKey])}-${id}`"
            :value="option[valueKey]"
            :disabled="!!option[disabledKey]"
            :lang="option.lang"
          >
            {{ option[labelKey] }}
          </option>
        </template>
      </select>

      <Icon
        name="material-symbols:keyboard-arrow-down-rounded"
        class="select-arrow"
      />
    </div>
  </FormField>
</template>

<style>
:where(.form-field-wrapper) {
  &:has(.select:disabled) {
    opacity: 35%;
  }

  .select {
    font-family: var(--font-family-input);
    font-size: 16px;
    width: 100%;
    border: 1px solid var(--color-grey-graphic);
    border-radius: var(--radius-md);
    color: var(--color-text);

    &::placeholder {
      color: var(--color-grey-text);
    }

    &:focus-visible {
      outline: 1px solid var(--focus-color);
      border-color: var(--focus-color);
    }
  }
}

.form-field-wrapper {
  .select-wrapper {
    display: grid;
    grid-template-columns: 1fr auto;
  }

  .select {
    -webkit-appearance: none;
    appearance: none;
    margin-inline-end: 1.25em;
    grid-row: 1;
    grid-column: 1 / -1;
    accent-color: var(--color-text);
    background-color: var(--color-input-bg);
  }

  .select-arrow {
    color: inherit;
    pointer-events: none;
    height: 100%;
    margin-inline-end: 0.5em;
    grid-row: 1;
    grid-column: 2;
  }
}

.select-size--sm .select {
  height: 2rem;
  padding-inline: 0.5em;
}

.select-size--md .select {
  height: 2.5rem;
  padding-inline: 0.5em;
}

.select-size--lg .select {
  height: 2.75rem;
  padding-inline: 0.65em;
}

.select-color--blue {
  .select {
    color: var(--color-blue-text);
    accent-color: var(--color-blue-text);
    border-color: var(--color-blue-graphic);
    background-color: var(--color-blue-bg);
  }

  .select-arrow {
    color: var(--color-blue-text);
  }
}

.select-color--green {
  .select {
    color: var(--color-green-text);
    accent-color: var(--color-green-text);
    border-color: var(--color-green-graphic);
    background-color: var(--color-green-bg);
  }

  .select-arrow {
    color: var(--color-green-text);
  }
}

.select-color--orange {
  .select {
    color: var(--color-orange-text);
    accent-color: var(--color-orange-text);
    border-color: var(--color-orange-graphic);
    background-color: var(--color-orange-bg);
  }

  .select-arrow {
    color: var(--color-orange-text);
  }
}

.select-color--red {
  .select {
    color: var(--color-red-text);
    accent-color: var(--color-red-text);
    border-color: var(--color-red-graphic);
    background-color: var(--color-red-bg);
  }

  .select-arrow {
    color: var(--color-red-text);
  }
}

.select-variant--minimal {
  label {
    font-size: var(--font-size-sm);
  }

  &:focus-within {
    label {
      color: var(--color-text);
    }
  }

  .select {
    padding-inline: 0;
    border-radius: 0;
    background-color: transparent;
    border-color: transparent;
    border-block-end-color: var(--color-grey-graphic);

    &:focus {
      border-block-end-color: var(--color-accent-graphic);
      outline-color: transparent;
    }
  }
}

.select-variant--3d {
  label {
    color: var(--color-grey-text);
    font-weight: var(--font-weight-semibold);
  }
  &:focus-within {
    label {
      color: var(--color-text);
    }
  }

  .select {
    border-radius: var(--radius-sm);
    border-width: 1.5px;
    border-color: var(--color-grey-text);
    box-shadow: 0 1.5px 0 0 var(--color-grey-text);

    &:focus {
      outline-color: transparent;
      border-color: var(--color-accent-graphic);
      box-shadow: 0 1.5px 0 0 var(--color-accent-graphic);
    }
  }
}
</style>
