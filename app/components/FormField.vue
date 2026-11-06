<script setup lang="ts">
/**
 * The frame of a form field: the label with its required chip, the control
 * in the default slot, then the error text and the instruction. Input,
 * Select, Textarea, MultiSelect, DatePicker and RangeInput render through
 * it, so the layout and styles they share live here once. A field points its
 * control at the texts with `aria-describedby`: `error-<id>` and
 * `instruction-<id>`.
 */
const {
  id,
  labelFor = undefined,
  label = undefined,
  chipSize = 'xs',
  instruction = undefined,
  errorText = undefined,
} = defineProps<{
  /** The id of the control, and the base of the error and instruction ids */
  id: string;
  /** What the label points to, when that is not `id` */
  labelFor?: string;
  label?: string;
  hideLabel?: boolean;
  required?: boolean;
  disabled?: boolean;
  chipSize?: ChipSize;
  instruction?: string;
  /** In the document for `show-invalid` to reveal; no error element without it */
  errorText?: string;
  showInvalid?: boolean;
}>();
</script>

<template>
  <div :class="['form-field-wrapper', showInvalid && 'show-invalid']">
    <label
      v-if="label"
      :for="labelFor ?? id"
      :class="[hideLabel && 'visuallyhidden', disabled && 'disabled']"
    >
      <span>{{ label }}</span>

      <RequiredChip v-if="required" :size="chipSize" />
    </label>

    <slot name="label" />

    <slot />

    <InputError
      v-if="errorText !== undefined"
      :id="id"
      :error-text="errorText"
    />

    <p v-if="instruction" :id="`instruction-${id}`" class="instruction">
      {{ instruction }}
    </p>
  </div>
</template>

<style>
:where(label) {
  font-weight: var(--font-weight-medium);
  -webkit-user-select: none;
  user-select: none;
  transition-property: opacity;
  transition-duration: var(--duration-sm);

  &.disabled {
    opacity: 25%;
  }
}

:where(.form-field-wrapper) {
  position: relative;
  display: inline-grid;
  align-items: center;
  align-content: start;
  transition-property: opacity;
  transition-duration: var(--duration-sm);

  label,
  .label {
    display: inline-flex;
    gap: 0.35rem;
    min-height: 1.25rem;
    align-items: center;
    font-size: var(--font-size-sm);
    margin-block-end: 0.25rem;
    color: var(--color-text);
  }

  .instruction {
    margin-block-start: 0.25rem;
    margin-block-end: 0;
    font-size: var(--font-size-xs);
    color: var(--color-grey-text);
  }
}
</style>
