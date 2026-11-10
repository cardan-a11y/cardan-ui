<script setup lang="ts">
import type { StyleValue } from 'vue';

// An attribute goes to the control; `class` and `style` stay on the wrapper
defineOptions({ inheritAttrs: false });

const { t } = useI18n();
const model = defineModel<string | number>();

const {
  label = undefined,
  required = undefined,
  errorMessage = undefined,
  customError = undefined,
  min = undefined,
  max = undefined,
  step = undefined,
  pattern = undefined,
  icon = undefined,
  name = undefined,
  title = undefined,
  autocomplete = undefined,
  placeholder = undefined,
  minlength = undefined,
  maxlength = undefined,
  ariaDescribedby = undefined,
  instruction = undefined,
  tabindex = undefined,
  inputmode = undefined,
  variant = 'default',
  list = undefined,
  type = 'text',
  size = 'md',
  showInvalid = false,
  id = useId(),
} = defineProps<{
  label?: string;
  id?: string;
  name?: string;
  title?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  autofocus?: boolean;
  list?: string;
  type?: string;
  autocomplete?: string;
  /** The virtual keyboard; by default the one that fits `type` */
  inputmode?:
    | 'none'
    | 'text'
    | 'decimal'
    | 'numeric'
    | 'tel'
    | 'search'
    | 'email'
    | 'url';
  pattern?: string;
  placeholder?: string;
  icon?: string;
  size?: InputSize;
  minlength?: number;
  maxlength?: number;
  hideLabel?: boolean;
  /** Shows the error now; a Form shows it after a failed submit */
  showInvalid?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  ariaDescribedby?: string;
  instruction?: string;
  /** The error text when the browser finds the field invalid; one per type by default */
  errorMessage?: string;
  /**
   * An error the browser cannot find, such as one from the server: the field
   * shows this text and is described by it until its value changes
   */
  customError?: string;
  tabindex?: string;
  variant?: InputVariant;
}>();

const attrs = useAttrs();

/** The attributes for the control, without the wrapper's `class` and `style` */
function controlAttrs() {
  return Object.fromEntries(
    Object.entries(attrs).filter(([key]) => key !== 'class' && key !== 'style'),
  );
}

const computedErrorMessage = computed(() => {
  if (errorMessage) {
    return errorMessage;
  } else if (required && !model.value) {
    return t('form.missing-value', { item: label });
  } else if (type === 'email') {
    return t('form.invalid-email');
  } else if (type === 'tel') {
    return t('form.invalid-phone');
  } else if (type === 'url') {
    return t('form.invalid-url');
  }
  return t('form.invalid-value');
});

const inputMode = computed(() => {
  if (inputmode) return inputmode;
  if (type === 'email') return 'email';
  if (type === 'tel') return 'tel';
  if (type === 'url') return 'url';
  if (type === 'number') return 'decimal';
  return 'text';
});

const chipSize = computed(() => {
  if (size === 'lg') return 'sm';
  if (size === 'md') return 'xs';
  if (size === 'sm') return 'xs';
  return 'xs';
});

const inputRef = useTemplateRef<HTMLInputElement>('input');
const formShowInvalid = inject(formShowInvalidKey, ref(false));
const isValid = ref(true);
const customErrorActive = ref(false);

function updateValidity() {
  isValid.value = inputRef.value?.validity.valid ?? true;
}

/**
 * The custom error shows like the browser's own, and describes the field,
 * but does not keep the form from submitting again: the server judges the
 * next attempt, and the parent moves focus to the field (`focusElement()`)
 */
function applyCustomError() {
  customErrorActive.value = !!customError;
}

onMounted(() => {
  applyCustomError();
  updateValidity();
});
watch(() => customError, applyCustomError, { flush: 'post' });

// A value or a constraint the parent changes
watch(
  [
    model,
    () => required,
    () => pattern,
    () => min,
    () => max,
    () => step,
    () => minlength,
    () => maxlength,
    () => type,
  ],
  updateValidity,
  { flush: 'post' },
);

/** The error text shows after a failed submit, or for a custom error */
const errorShown = computed(
  () =>
    customErrorActive.value ||
    ((showInvalid || formShowInvalid.value) && !isValid.value),
);

// The error describes the field only while it shows
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

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;

  // A new value clears the custom error, until the parent sets one again
  customErrorActive.value = false;

  // Also a number outside min and max: the field is invalid until the number
  // is in range, which the form reports. A model kept at the old value would
  // differ from the number the field shows.
  model.value = target.value;
  updateValidity();
}

function focusElement() {
  inputRef.value?.focus();
}

defineExpose({
  inputRef,
  focusElement,
});

const emit = defineEmits<{
  focus: [value: Event];
  blur: [value: Event];
}>();
</script>

<template>
  <FormField
    :id="id"
    :class="[`input-size--${size}`, `input-variant--${variant}`, $attrs.class]"
    :style="$attrs.style as StyleValue"
    :label="label"
    :hide-label="hideLabel"
    :required="required"
    :disabled="disabled"
    :chip-size="chipSize"
    :instruction="instruction"
    :error-text="customErrorActive ? customError : computedErrorMessage"
    :show-invalid="showInvalid"
    :custom-error="customErrorActive"
  >
    <div class="input-wrapper">
      <input
        :id="id"
        ref="input"
        class="input"
        v-bind="controlAttrs()"
        :value="model"
        :name="name"
        :title="title"
        :list="list"
        :type="type || 'text'"
        :autocomplete="autocomplete"
        :inputmode="inputMode"
        :pattern="pattern"
        :required="required"
        :disabled="disabled"
        :readonly="readonly"
        :autofocus="autofocus"
        :placeholder="placeholder"
        :minlength="minlength"
        :maxlength="maxlength"
        :min="min"
        :max="max"
        :step="step"
        :tabindex="tabindex"
        :data-1p-ignore="autocomplete === 'off' || undefined"
        :aria-describedby="computedAriaDescribedby"
        :aria-invalid="errorShown || undefined"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
        @input="handleInput"
        @change="updateValidity"
        @invalid="updateValidity"
      />

      <Icon v-if="icon" :name="icon" />
    </div>
  </FormField>
</template>

<style>
:where(input) {
  background-color: transparent;
  filter: none;

  &:-webkit-autofill {
    -webkit-text-fill-color: var(--color-accent-text);
    box-shadow: 0 0 0 100px var(--color-accent-bg) inset;
  }
}

:where(.form-field-wrapper) {
  &:has(.input:disabled) {
    opacity: 35%;
  }

  .input {
    font-family: var(--font-family-input, system-ui, sans-serif);
    font-size: 16px;
    width: 100%;
    border: 1px solid var(--color-grey-graphic);
    border-radius: var(--radius-md);

    &::placeholder {
      color: var(--color-grey-text);
    }

    &:focus {
      outline: 1px solid var(--focus-color);
      border-color: var(--focus-color);
    }
  }
}

.form-field-wrapper {
  .input-wrapper {
    position: relative;
  }

  .input {
    background-color: var(--color-input-bg);

    &[readonly] {
      background-color: var(--color-grey-bg);
      caret-color: transparent;
    }

    &:has(+ .iconify) {
      padding-inline-start: 1.75rem;
    }

    + .iconify {
      position: absolute;
      z-index: 1;
      left: 0.5rem;
      inset-block: 0;
      margin-block: auto;
      color: var(--color-grey-text);
    }
  }
}

.input-size--sm {
  .input {
    height: 2rem;
    padding-inline: 0.5em;
  }
}

.input-size--md {
  .input {
    height: 2.5rem;
    padding-inline: 0.5em;
  }
}

.input-size--lg {
  .input {
    height: 2.75rem;
    padding-inline: 0.65em;
  }
}

.input-size--xl {
  .input {
    height: 3rem;
    padding-inline: 0.75em;
  }
}

.input-variant--minimal {
  label {
    font-size: var(--font-size-sm);
  }

  &:focus-within {
    label {
      color: var(--color-text);
    }
  }

  .input {
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

.input-variant--3d {
  label {
    color: var(--color-grey-text);
    font-weight: var(--font-weight-semibold);
  }

  &:focus-within {
    label {
      color: var(--color-text);
    }
  }

  .input {
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
