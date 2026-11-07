<script setup lang="ts">

const { t } = useI18n();
const model = defineModel<string | number>();

const {
  label = undefined,
  placeholder = undefined,
  pattern = undefined,
  ariaDescribedby = undefined,
  name = undefined,
  instruction = undefined,
  errorMessage = undefined,
  variant = 'default',
  required,
  autoresize,
  id = useId(),
} = defineProps<{
  label?: string;
  placeholder?: string;
  id?: string;
  name?: string;
  pattern?: string;
  ariaDescribedby?: string;
  instruction?: string;
  errorMessage?: string;
  showInvalid?: boolean;
  hideLabel?: boolean;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  autofocus?: boolean;
  autoresize?: boolean;
  variant?: InputVariant;
}>();

const computedErrorMessage = computed(() => {
  if (errorMessage) return errorMessage;
  if (required && !model.value) {
    return t('form.missing-value', { item: label });
  }
  return t('form.invalid-value');
});

const computedAriaDescribedby = computed(() =>
  [
    ariaDescribedby,
    instruction && `instruction-${id}`,
    id && required && `error-${id}`,
  ]
    .filter(Boolean)
    .join(' '),
);

const textareaInput = ref('');
const textareaRef = useTemplateRef<HTMLTextAreaElement>('textarea');

function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement;
  textareaInput.value = target.value;
  model.value = target.value;
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

watch(textareaInput, () => {
  resizeTextarea();
});

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
    :class="['textarea-wrapper', `textarea-variant--${variant}`]"
    :label="label"
    :hide-label="hideLabel"
    :required="required"
    :disabled="disabled"
    :instruction="instruction"
    :error-text="required ? computedErrorMessage : undefined"
    :show-invalid="showInvalid"
  >
    <template #label>
      <slot name="label" />
    </template>

    <textarea
      :id="id"
      ref="textarea"
      v-model="model"
      :class="['textarea', autoresize && 'autoresize']"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      :pattern="pattern"
      :autofocus="autofocus"
      :name="name"
      :aria-describedby="computedAriaDescribedby"
      @input="handleInput"
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
