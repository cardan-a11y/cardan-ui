<script setup lang="ts">
const { id = undefined, errorText = undefined } = defineProps<{
  id?: string;
  errorText?: string;
}>();
</script>

<template>
  <div
    :id="id ? `error-${id}` : undefined"
    class="error-wrapper"
    aria-live="polite"
  >
    <div class="error">
      <Icon name="material-symbols:warning-rounded" />

      <span>{{ errorText }}</span>
    </div>
  </div>
</template>

<style>
:where(.error-wrapper) {
  .error {
    display: none;
    align-items: center;
    gap: 0.25rem;
    color: var(--color-red-text);
    font-size: var(--font-size-xs);
    padding-block-start: 0.25rem;
  }

  .iconify {
    flex-shrink: 0;
  }
}

:where(.form-field-wrapper.show-invalid:has(:invalid)),
:where(.form-field-wrapper.custom-error),
:where(.show-invalid) .form-field-wrapper:has(:invalid) {
  .select,
  .textarea,
  .input {
    border-color: var(--color-red-graphic);
  }

  .error-wrapper .error {
    display: flex;
  }
}

:where(.show-invalid) .input-variant--3d:has(:invalid) .input:not(:focus),
:where(.show-invalid) .select-variant--3d:has(:invalid) .select:not(:focus),
:where(.show-invalid) .textarea-variant--3d:has(:invalid) .textarea:not(:focus),
:where(.custom-error.input-variant--3d) .input:not(:focus),
:where(.custom-error.select-variant--3d) .select:not(:focus),
:where(.custom-error.textarea-variant--3d) .textarea:not(:focus) {
  box-shadow: 0 1.5px 0 0 var(--color-red);
}
</style>
