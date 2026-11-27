<script setup lang="ts">
/**
 * A text field that also refuses what the Laravel APIs refuse: a required
 * value of only spaces, and an e-mail domain without a dot. A project's own
 * `pattern` replaces the dot check; it compiles with the `v` flag (escape `-`
 * in a class).
 */
import type { StyleValue } from 'vue';

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
  /** An error the browser cannot find, such as the server's: shown until the value changes */
  customError?: string;
  tabindex?: string;
  variant?: InputVariant;
}>();

const { controlAttrs } = useControlAttrs();

function mismatchMessage() {
  if (type === 'email') return t('form.invalid-email');
  if (type === 'tel') return t('form.invalid-phone');
  if (type === 'url') return t('form.invalid-url');
  return t('form.invalid-value');
}

const computedErrorMessage = computed(() => {
  if (errorMessage) return errorMessage;

  switch (reason.value) {
    case 'missing':
      return t('form.missing-value', { item: label });
    case 'below-min':
      return t('form.below-min', { min });
    case 'above-max':
      return t('form.above-max', { max });
    case 'too-short':
      return t('form.too-short', { length: minlength });
    case 'too-long':
      return t('form.too-long', { length: maxlength });
    case 'mismatch':
      return mismatchMessage();
    case 'invalid':
      return t('form.invalid-value');
  }

  return required && !String(model.value ?? '').trim()
    ? t('form.missing-value', { item: label })
    : mismatchMessage();
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
const isValid = ref(true);
const reason = ref<ValidityReason>();

const EMAIL_PATTERN = '.+@.+\\..+';
const NOT_ONLY_SPACES = '(?=.*\\S)';

const computedPattern = computed(() => {
  const own = pattern ?? (type === 'email' ? EMAIL_PATTERN : undefined);
  if (!required) return own;
  return `${NOT_ONLY_SPACES}(?:${own ?? '.*'})`;
});

function updateValidity() {
  isValid.value = inputRef.value?.validity.valid ?? true;
  reason.value = inputRef.value ? validityReason(inputRef.value) : undefined;
}

const { customErrorActive, clearCustomError, errorShown } = useCustomError(
  () => customError,
  { invalid: () => !isValid.value, showInvalid: () => showInvalid },
);

onMounted(updateValidity);

watch(
  [
    model,
    () => required,
    computedPattern,
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
  takeValue(event.target as HTMLInputElement);
  remember();
}

function takeValue(target: HTMLInputElement) {
  clearCustomError();

  model.value = target.value;
  updateValidity();
}

const { remember, sync } = useAutofillSync(inputRef, (control) =>
  takeValue(control as HTMLInputElement),
);
watch(model, remember, { flush: 'post' });

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
        :pattern="computedPattern"
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
        @change="sync"
        @invalid="updateValidity"
      />

      <Icon v-if="icon" :name="icon" />
    </div>
  </FormField>
</template>

<style>
.form-field-wrapper {
  .input-wrapper {
    position: relative;
  }

  .input {
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
