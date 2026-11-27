<script setup lang="ts">
import type { StyleValue } from 'vue';

defineOptions({ inheritAttrs: false });

const { t } = useI18n();
const model = defineModel<string | number>();

const {
  label = undefined,
  placeholder = undefined,
  ariaDescribedby = undefined,
  name = undefined,
  instruction = undefined,
  errorMessage = undefined,
  customError = undefined,
  variant = 'default',
  showInvalid = false,
  required,
  autoresize,
  id = useId(),
} = defineProps<{
  label?: string;
  placeholder?: string;
  id?: string;
  name?: string;
  ariaDescribedby?: string;
  instruction?: string;
  /** The error text when the browser finds the field invalid; "<label> is missing" or "Value invalid" by default */
  errorMessage?: string;
  /** An error the browser cannot find, such as the server's: shown until the value changes */
  customError?: string;
  /** Shows the error now; a Form shows it after a failed submit */
  showInvalid?: boolean;
  hideLabel?: boolean;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  autofocus?: boolean;
  autoresize?: boolean;
  variant?: InputVariant;
}>();

const { controlAttrs } = useControlAttrs();

const textareaRef = useTemplateRef<HTMLTextAreaElement>('textarea');
const isValid = ref(true);
const reason = ref<ValidityReason>();

// `minlength` and `maxlength` come as attributes: read from the control
const computedErrorMessage = computed(() => {
  if (errorMessage) return errorMessage;
  if (reason.value === 'too-short') {
    return t('form.too-short', { length: textareaRef.value?.minLength });
  }
  if (reason.value === 'too-long') {
    return t('form.too-long', { length: textareaRef.value?.maxLength });
  }
  if (
    reason.value === 'missing' ||
    (required && !String(model.value ?? '').trim())
  ) {
    return t('form.missing-value', { item: label });
  }
  return t('form.invalid-value');
});

function updateValidity() {
  isValid.value = textareaRef.value?.validity.valid ?? true;
  reason.value = textareaRef.value
    ? validityReason(textareaRef.value)
    : undefined;
}

const { customErrorActive, clearCustomError, errorShown } = useCustomError(
  () => customError,
  { invalid: () => !isValid.value, showInvalid: () => showInvalid },
);

onMounted(updateValidity);
watch([model, () => required], updateValidity, { flush: 'post' });

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
  takeValue(event.target as HTMLTextAreaElement);
  remember();
}

function takeValue(target: HTMLTextAreaElement) {
  clearCustomError();

  model.value = target.value;
  updateValidity();
}

const { remember, sync } = useAutofillSync(textareaRef, (control) =>
  takeValue(control as HTMLTextAreaElement),
);
watch(model, remember, { flush: 'post' });

function focusElement() {
  textareaRef.value?.focus();
}

function resizeTextarea() {
  if (autoresize && textareaRef.value) {
    textareaRef.value.style.height = 'auto';

    const height = textareaRef.value.scrollHeight;
    textareaRef.value.style.height = `${height + 2}px`;
  }
}

onMounted(() => {
  window.addEventListener('resize', resizeTextarea);
  resizeTextarea();
});

watch(model, resizeTextarea, { flush: 'post' });

onUnmounted(() => window.removeEventListener('resize', resizeTextarea));

defineExpose({
  focusElement,
});

const emit = defineEmits<{
  blur: [value: Event];
  paste: [value: Event];
}>();
</script>

<template>
  <FormField
    :id="id"
    :class="['textarea-wrapper', `textarea-variant--${variant}`, $attrs.class]"
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
    <template #label>
      <slot name="label" />
    </template>

    <textarea
      :id="id"
      ref="textarea"
      :class="['textarea', autoresize && 'autoresize']"
      v-bind="controlAttrs()"
      :value="model"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      :autofocus="autofocus"
      :name="name"
      :aria-describedby="computedAriaDescribedby"
      :aria-invalid="errorShown || undefined"
      @input="handleInput"
      @change="sync"
      @invalid="updateValidity"
      @blur="emit('blur', $event)"
      @paste="emit('paste', $event)"
    />
  </FormField>
</template>

<style>
:where(textarea) {
  padding: 0.5rem;
  resize: vertical;
}

:where(.form-field-wrapper) {
  &:has(.textarea:disabled) {
    opacity: 35%;
  }

  .textarea {
    font-family: var(--font-family-input);
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

.textarea-wrapper {
  .textarea {
    background-color: var(--color-input-bg);
    min-height: 7.5rem;
    padding-inline-end: 1.5rem;

    &[readonly] {
      background-color: var(--color-grey-bg);
      caret-color: transparent;
    }

    &.autoresize {
      height: auto;
      overflow: auto;
      min-height: 2.5rem;
    }
  }
}

.textarea-variant--minimal {
  label {
    font-size: var(--font-size-sm);
  }

  &:focus-within {
    label {
      color: var(--color-text);
    }
  }

  .textarea {
    padding-inline: 0;
    padding-block-end: 0.5em;
    line-height: var(--line-height);
    border-radius: 0;
    background-color: transparent;
    border-color: transparent;
    border-block-end-color: var(--color-grey-graphic);
    min-height: 2.5rem;
    resize: none;

    &:focus {
      border-block-end-color: var(--color-accent-graphic);
      outline-color: transparent;
    }
  }
}

.textarea-variant--3d {
  label {
    color: var(--color-grey-text);
    font-weight: var(--font-weight-semibold);
  }

  &:focus-within {
    label {
      color: var(--color-text);
    }
  }

  .textarea {
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
