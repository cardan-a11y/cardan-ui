<script setup lang="ts">
import type { StyleValue } from 'vue';

/**
 * The APG spinbutton for a whole number of zero or more, such as a quantity:
 * the alternative to `<Input type="number">`. Where it leaves the pattern:
 * - Home and End move the caret, not to `min` and `max`: a key pressed to
 *   edit the number would set a quantity to its maximum.
 * - The buttons, for pointer, touch and voice, are out of the tab order (the
 *   arrow keys do the same) and announce the new number in a live region.
 * - A typed number outside `min` and `max` reaches the model, and its error
 *   shows at once, without a submit, until the number is in range.
 */

defineOptions({ inheritAttrs: false });

const { t } = useI18n();
const model = defineModel<number>();

const {
  label,
  min = 0,
  max = undefined,
  name = undefined,
  instruction = undefined,
  customError = undefined,
  size = 'md',
  id = useId(),
  required,
  disabled,
  readonly,
  showInvalid,
} = defineProps<{
  /** Names the field, and the buttons: "Decrease <label>", "Increase <label>" */
  label: string;
  id?: string;
  name?: string;
  /** The lowest number, zero or more */
  min?: number;
  max?: number;
  required?: boolean;
  disabled?: boolean;
  /** Shown and submitted, but not changed: the keys and buttons do nothing */
  readonly?: boolean;
  hideLabel?: boolean;
  instruction?: string;
  /** Shows the error now; a Form shows it after a failed submit */
  showInvalid?: boolean;
  /** An error the browser cannot find, such as the server's: shown until the value changes */
  customError?: string;
  size?: InputSize;
}>();

const emit = defineEmits<{
  /** The number is final: a count, or a typed number on blur or Enter */
  change: [value: number | undefined];
}>();

const { attrs, controlAttrs } = useControlAttrs();

// `null` too, which a project's data may hold though the type says otherwise
function toText(value: number | null | undefined) {
  return value == null ? '' : String(value);
}

const text = ref(toText(model.value));

const value = computed(() =>
  text.value === '' ? undefined : Number(text.value),
);

watch(model, (newValue) => {
  if (newValue !== value.value) text.value = toText(newValue);
});

const rangeError = computed(() => {
  if (value.value === undefined) return undefined;
  if (value.value < min) return t('form.below-min', { min });
  if (max !== undefined && value.value > max) {
    return t('form.above-max', { max });
  }
  return undefined;
});

const invalid = computed(
  () => !!rangeError.value || (required && value.value === undefined),
);

const errorText = computed(
  () => rangeError.value ?? t('form.missing-value', { item: label }),
);

const inputRef = useTemplateRef<HTMLInputElement>('input');

watchPostEffect(() => {
  inputRef.value?.setCustomValidity(rangeError.value ?? '');
});

const rangeErrorShown = ref(false);

watch(rangeError, (error) => {
  if (!error) rangeErrorShown.value = false;
});

const { customErrorActive, clearCustomError, errorShown } = useCustomError(
  () => customError,
  {
    invalid: () => invalid.value,
    showInvalid: () => showInvalid || rangeErrorShown.value,
    exempt: () => disabled || readonly,
  },
);

const ariaDescribedby = computed(
  () =>
    [
      attrs['aria-describedby'],
      instruction && `instruction-${id}`,
      errorShown.value && `error-${id}`,
    ]
      .filter(Boolean)
      .join(' ') || undefined,
);

const widthInDigits = computed(() => Math.max(2, String(max ?? 999).length));

const chipSize = computed(() => (size === 'lg' ? 'sm' : 'xs'));

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const typed = target.value;
  const number = typed.replace(/\D/g, '');

  if (number !== typed) {
    const caret = Math.max(
      0,
      (target.selectionStart ?? typed.length) - (typed.length - number.length),
    );
    target.value = number;
    target.setSelectionRange(caret, caret);
  }

  text.value = number;
  model.value = value.value;
  if (rangeError.value) rangeErrorShown.value = true;
  clearCustomError();
}

function handleChange() {
  text.value = toText(value.value);
  emit('change', value.value);
}

function setValue(newValue: number) {
  if (newValue === value.value) return;

  text.value = toText(newValue);
  model.value = newValue;
  clearCustomError();
  emit('change', newValue);
}

function step(delta: number) {
  setValue(
    value.value === undefined
      ? min
      : Math.min(max ?? Infinity, Math.max(min, value.value + delta)),
  );
}

function handleKeydown(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (readonly) return;

  if (event.key === 'ArrowUp') step(1);
  else if (event.key === 'ArrowDown') step(-1);
  else return;

  event.preventDefault();
}

const atMin = computed(() => value.value !== undefined && value.value <= min);
const atMax = computed(
  () => max !== undefined && value.value !== undefined && value.value >= max,
);

const announcement = ref('');

const MAX_EXACT_DIGITS = String(Number.MAX_SAFE_INTEGER).length - 1;
let announcementTimer: ReturnType<typeof setTimeout> | undefined;

function handleButton(delta: number) {
  if (readonly || (delta < 0 ? atMin.value : atMax.value)) return;

  step(delta);

  announcement.value = text.value;
  clearTimeout(announcementTimer);
  announcementTimer = setTimeout(() => (announcement.value = ''), 2000);
}

onBeforeUnmount(() => clearTimeout(announcementTimer));

function focusElement() {
  inputRef.value?.focus();
}

defineExpose({
  inputRef,
  focusElement,
});
</script>

<template>
  <FormField
    :id="id"
    :class="['spin-button', `input-size--${size}`, $attrs.class]"
    :style="[
      `--spin-button-digits: ${widthInDigits}`,
      $attrs.style as StyleValue,
    ]"
    :label="label"
    :hide-label="hideLabel"
    :required="required"
    :disabled="disabled"
    :chip-size="chipSize"
    :instruction="instruction"
    :error-text="customErrorActive ? customError : errorText"
    :show-invalid="showInvalid || rangeErrorShown"
    :custom-error="customErrorActive"
  >
    <div class="spin-button-control">
      <button
        type="button"
        class="spin-button-step"
        tabindex="-1"
        :aria-label="t('spinbutton.decrease', { label })"
        :aria-controls="id"
        :aria-disabled="atMin || undefined"
        :disabled="disabled || readonly"
        @click="handleButton(-1)"
      >
        <Icon name="material-symbols:remove-rounded" />
      </button>

      <input
        :id="id"
        ref="input"
        class="input"
        v-bind="controlAttrs()"
        :value="text"
        :name="name"
        type="text"
        role="spinbutton"
        inputmode="numeric"
        autocomplete="off"
        :maxlength="MAX_EXACT_DIGITS"
        :required="required"
        :disabled="disabled"
        :readonly="readonly"
        :aria-valuenow="value"
        :aria-valuemin="min"
        :aria-valuemax="max"
        :aria-describedby="ariaDescribedby"
        :aria-invalid="errorShown || undefined"
        @input="handleInput"
        @change="handleChange"
        @keydown="handleKeydown"
      />

      <button
        type="button"
        class="spin-button-step"
        tabindex="-1"
        :aria-label="t('spinbutton.increase', { label })"
        :aria-controls="id"
        :aria-disabled="atMax || undefined"
        :disabled="disabled || readonly"
        @click="handleButton(1)"
      >
        <Icon name="material-symbols:add-rounded" />
      </button>
    </div>

    <output class="visuallyhidden">{{ announcement }}</output>
  </FormField>
</template>

<style>
.spin-button {
  .spin-button-control {
    display: flex;
    justify-self: start;
  }

  .input {
    inline-size: calc(var(--spin-button-digits) * 1ch + 1.5em);
    border-radius: 0;
    text-align: center;
    font-variant-numeric: tabular-nums;

    &:focus {
      position: relative;
      z-index: 1;
    }
  }

  .spin-button-step {
    display: grid;
    place-items: center;
    flex: none;
    inline-size: 2.5rem;
    padding: 0;
    border: 1px solid var(--color-grey-graphic);
    font-size: var(--font-size-lg);
    color: var(--color-text);
    background-color: var(--color-input-bg);
    cursor: pointer;
    transition-property: background-color;
    transition-duration: var(--duration-xs);

    &:first-child {
      border-inline-end-width: 0;
      border-start-start-radius: var(--radius-md);
      border-end-start-radius: var(--radius-md);
    }

    &:last-child {
      border-inline-start-width: 0;
      border-start-end-radius: var(--radius-md);
      border-end-end-radius: var(--radius-md);
    }

    &:not(:disabled, [aria-disabled='true']):hover {
      background-color: var(--color-grey-bg);
    }

    &:focus-visible {
      position: relative;
      z-index: 1;
    }

    &:disabled,
    &[aria-disabled='true'] {
      cursor: default;
    }

    &[aria-disabled='true'] .iconify {
      opacity: 35%;
    }
  }

  &.input-size--sm .spin-button-step {
    inline-size: 2rem;
  }

  &.input-size--lg .spin-button-step {
    inline-size: 2.75rem;
  }
}
</style>
