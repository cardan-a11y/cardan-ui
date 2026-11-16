<script setup lang="ts">
import type { StyleValue } from 'vue';

// An attribute goes to the control; `class` and `style` stay on the wrapper
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
  /**
   * An error the browser cannot find, such as one from the server: the field
   * shows this text and is described by it until its value changes
   */
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

const attrs = useAttrs();

/** The attributes for the control, without the wrapper's `class` and `style` */
function controlAttrs() {
  return Object.fromEntries(
    Object.entries(attrs).filter(([key]) => key !== 'class' && key !== 'style'),
  );
}

const computedErrorMessage = computed(() => {
  if (errorMessage) return errorMessage;
  if (required && !String(model.value ?? '').trim()) {
    return t('form.missing-value', { item: label });
  }
  return t('form.invalid-value');
});

const textareaRef = useTemplateRef<HTMLTextAreaElement>('textarea');
const formShowInvalid = inject(formShowInvalidKey, ref(false));
const isValid = ref(true);
const customErrorActive = ref(false);

/**
 * The browser's constraints only: a required text of only spaces passes here
 * and the API, which trims it to empty, refuses it (a textarea has no
 * `pattern`, as Input uses for this)
 */
function updateValidity() {
  isValid.value = textareaRef.value?.validity.valid ?? true;
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
watch([model, () => required], updateValidity, { flush: 'post' });

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
  const target = event.target as HTMLTextAreaElement;

  // A new value clears the custom error, until the parent sets one again
  customErrorActive.value = false;

  model.value = target.value;
  // Not left to the model's watcher: under `v-model.trim` a space changes
  // the length `minlength` checks, not the model
  updateValidity();
}

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

// Also a value the parent loads after mount, as in an edit form
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
