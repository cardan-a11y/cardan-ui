<script setup lang="ts">
import type { StyleValue } from 'vue';

/**
 * A number field with a button on each side to count down and up: the
 * alternative to `<Input type="number">` for a whole number of zero or more,
 * such as a quantity. It is the APG spinbutton
 * (https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/): a text field with
 * the `spinbutton` role, in which Arrow Up and Arrow Down count and a number
 * can be typed. The buttons are for a pointer, touch and voice control: they
 * stay out of the tab order, since the arrow keys do the same, and a live
 * region reads the new number when one is pressed, as focus is not in the
 * field then.
 *
 * Home and End stay with the text field, where they move the caret, unlike in
 * the pattern: a key that is pressed to edit the number would set a quantity
 * to its maximum.
 *
 * A typed number outside `min` and `max` reaches the model, as in Input: the
 * field is invalid until the number is in range, which its Form reports.
 */

// An attribute goes to the control; `class` and `style` stay on the wrapper
defineOptions({ inheritAttrs: false });

const { t } = useI18n();
const model = defineModel<number>();

const {
  label,
  min = 0,
  max = undefined,
  name = undefined,
  instruction = undefined,
  size = 'md',
  id = useId(),
  required,
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
  hideLabel?: boolean;
  instruction?: string;
  /** Shows the error now; a Form shows it after a failed submit */
  showInvalid?: boolean;
  size?: InputSize;
}>();

const emit = defineEmits<{
  /** The number is final: a count, or a typed number on blur or Enter */
  change: [value: number | undefined];
}>();

const attrs = useAttrs();

/** The attributes for the control, without the wrapper's `class` and `style` */
function controlAttrs() {
  return Object.fromEntries(
    Object.entries(attrs).filter(([key]) => key !== 'class' && key !== 'style'),
  );
}

function toText(value: number | undefined) {
  return value === undefined ? '' : String(value);
}

/** What the field shows: the model, or the digits being typed */
const text = ref(toText(model.value));

/** The number in the field; none while it is empty */
const value = computed(() =>
  text.value === '' ? undefined : Number(text.value),
);

// A number the parent sets; not the one just typed, which may read "007"
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

/** In the document for the error styles to reveal: the range, or no number */
const errorText = computed(
  () => rangeError.value ?? t('form.missing-value', { item: label }),
);

const inputRef = useTemplateRef<HTMLInputElement>('input');

// A browser checks no range on a text field: this makes the field `:invalid`
// for the Form and the error styles, as `min` and `max` do on a number field
watchPostEffect(() => {
  inputRef.value?.setCustomValidity(rangeError.value ?? '');
});

const formShowInvalid = inject(formShowInvalidKey, ref(false));

/** The error text shows after a failed submit, or with `show-invalid` */
const errorShown = computed(
  () => (showInvalid || formShowInvalid.value) && invalid.value,
);

// The error describes the field only while it shows; a project's own
// `aria-describedby` comes first
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

/** Room for the longest number, three digits without a `max` */
const digits = computed(() => Math.max(2, String(max ?? 999).length));

const chipSize = computed(() => (size === 'lg' ? 'sm' : 'xs'));

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const typed = target.value;
  const number = typed.replace(/\D/g, '');

  // A character that is not a digit is ignored, with the caret where it was
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
}

/** A typed number is final on blur or Enter: "007" reads "7" from then on */
function handleChange() {
  text.value = toText(value.value);
  emit('change', value.value);
}

function setValue(newValue: number) {
  if (newValue === value.value) return;

  text.value = toText(newValue);
  model.value = newValue;
  emit('change', newValue);
}

/** Counts from the number in the field, back into the range; from nothing it starts at `min` */
function step(delta: number) {
  setValue(
    value.value === undefined
      ? min
      : Math.min(max ?? Infinity, Math.max(min, value.value + delta)),
  );
}

function handleKeydown(event: KeyboardEvent) {
  // An arrow with a modifier edits the text: Cmd+Arrow Up moves the caret
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

  if (event.key === 'ArrowUp') step(1);
  else if (event.key === 'ArrowDown') step(-1);
  else return;

  event.preventDefault();
}

const atMin = computed(() => value.value !== undefined && value.value <= min);
const atMax = computed(
  () => max !== undefined && value.value !== undefined && value.value >= max,
);

/** For the live region: the number after a button was pressed */
const announcement = ref('');
let announcementTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * A button at the end of the range stays focusable (`aria-disabled`), so
 * focus does not fall to the page at the last count, and ignores its clicks
 */
function handleButton(delta: number) {
  if (delta < 0 ? atMin.value : atMax.value) return;

  step(delta);

  // Emptied again, so the number is not found there later as stale text
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
    :style="[`--spin-button-digits: ${digits}`, $attrs.style as StyleValue]"
    :label="label"
    :hide-label="hideLabel"
    :required="required"
    :disabled="disabled"
    :chip-size="chipSize"
    :instruction="instruction"
    :error-text="errorText"
    :show-invalid="showInvalid"
  >
    <div class="spin-button-control">
      <button
        type="button"
        class="spin-button-step"
        tabindex="-1"
        :aria-label="t('spinbutton.decrease', { label })"
        :aria-controls="id"
        :aria-disabled="atMin || undefined"
        :disabled="disabled"
        @click="handleButton(-1)"
      >
        <Icon name="material-symbols:remove-rounded" />
      </button>

      <!-- At most 15 digits: a longer number is not exact any more -->
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
        maxlength="15"
        :required="required"
        :disabled="disabled"
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
        :disabled="disabled"
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

    /* Its focus ring lies over the buttons next to it */
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

  /* As wide as the field is high */
  &.input-size--sm .spin-button-step {
    inline-size: 2rem;
  }

  &.input-size--lg .spin-button-step {
    inline-size: 2.75rem;
  }
}
</style>
