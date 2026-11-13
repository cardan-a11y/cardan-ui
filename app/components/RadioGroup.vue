<script setup lang="ts" generic="T extends GroupOption">
const model = defineModel<string | number | boolean>();

const {
  valueKey = 'value' as keyof T & string,
  labelKey = 'label' as keyof T & string,
  variant = 'default',
  id = useId(),
  name = undefined,
  tooltip = undefined,
  tabindex = undefined,
  titleKey = undefined,
  errorMessage = undefined,
  customError = undefined,
  showInvalid = false,
  label,
  disabled,
  required,
} = defineProps<{
  /** Any objects; the keys name the value, label and title fields */
  options: T[];
  label: string;
  /** Shared by the radios, so the arrow keys move between them; the group's id by default */
  name?: string;
  tooltip?: string;
  tabindex?: string;
  valueKey?: keyof T & string;
  labelKey?: keyof T & string;
  titleKey?: keyof T & string;
  id?: string;
  hideLegend?: boolean;
  required?: boolean;
  disabled?: boolean;
  inline?: boolean;
  showInvalid?: boolean;
  /** Under the group when it is required and no option is chosen; "<label> is missing" by default */
  errorMessage?: string;
  /**
   * An error the browser cannot find, such as one from the server: the group
   * shows this text and is described by it until another option is chosen
   */
  customError?: string;
  variant?: 'default' | '3d' | 'outline';
}>();

const { t } = useI18n();

/** The value of an option, as the radio's `value` */
function optionValue(option: T) {
  return option[valueKey] as string | number | boolean;
}

/** A text field of an option, for a prop that takes a string */
function text(option: T, key?: keyof T & string) {
  const value = key === undefined ? undefined : option[key];

  return value === undefined ? undefined : String(value);
}

const message = computed(
  () => errorMessage ?? t('form.missing-value', { item: label }),
);

// A v-model passes undefined until a choice is made. Without any v-model, Vue
// casts the absent value to false, since the type allows a boolean, and that
// would count as a choice; a group that posts natively still shows its error.
const hasChoice = computed(
  () => model.value !== undefined && model.value !== '',
);

const formShowInvalid = inject(formShowInvalidKey, ref(false));
const customErrorActive = ref(false);

/**
 * The custom error shows like the group's own, and describes the group, but
 * does not keep the form from submitting again: the server judges the next
 * attempt
 */
function applyCustomError() {
  customErrorActive.value = !!customError;
}

onMounted(applyCustomError);
watch(() => customError, applyCustomError, { flush: 'post' });

/** The error text shows after a failed submit, or for a custom error */
const errorShown = computed(
  () =>
    customErrorActive.value ||
    (required && !hasChoice.value && (showInvalid || formShowInvalid.value)),
);
</script>

<template>
  <div
    :class="[
      'radios-wrapper',
      showInvalid && 'show-invalid',
      customErrorActive && 'custom-error',
    ]"
  >
    <!-- The error describes the group only while it shows -->
    <fieldset
      v-if="options?.length"
      :aria-describedby="errorShown ? `error-${id}` : undefined"
      @change="customErrorActive = false"
    >
      <legend
        v-if="label || tooltip"
        :class="[hideLegend && 'visuallyhidden', disabled && 'disabled']"
      >
        <Tooltip
          v-if="tooltip"
          :label="label"
          :hide-label="false"
          icon-color="accent-text"
        >
          {{ tooltip }}
        </Tooltip>
        <span v-else>{{ label }}</span>

        <RequiredChip v-if="required" />
      </legend>

      <ul role="list" :class="['radio-list', inline && 'inline']">
        <li
          v-for="option in options"
          :key="`radio-${String(option[valueKey])}`"
        >
          <Radio
            v-model="model"
            :value="optionValue(option)"
            :label="text(option, labelKey)"
            :disabled="disabled || !!option.disabled"
            :title="text(option, titleKey)"
            :lang="option.lang"
            :name="name ?? id"
            :tabindex="tabindex"
            :required="required"
            :variant="variant"
            type="radio"
          />
        </li>
      </ul>
    </fieldset>

    <InputError
      v-if="required || customError"
      :id="id"
      :error-text="customErrorActive ? customError : message"
    />
  </div>
</template>

<style>
:where(legend) {
  padding: 0;
  font-weight: var(--font-weight-semibold);
  -webkit-user-select: none;
  user-select: none;
  transition-property: opacity;
  transition-duration: var(--duration-sm);

  &.disabled {
    opacity: 25%;
  }
}

:where(fieldset) {
  border: none;
  padding: 0;
  margin-inline: 0;
}

.radios-wrapper {
  legend {
    margin-block-end: 0.5rem;
  }

  legend {
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-md);

    .tooltip-content {
      font-weight: 400;
    }
  }

  .radio-list {
    display: grid;
    gap: 0.5rem;

    &.inline {
      display: flex;
      flex-wrap: wrap;
      column-gap: 1rem;
    }
  }
}

/* A required group without a chosen option, once the form reports its state,
   or a custom error */
:where(.radios-wrapper.show-invalid:has(:invalid)),
:where(.radios-wrapper.custom-error),
:where(.show-invalid) .radios-wrapper:has(:invalid) {
  legend {
    color: var(--color-red-text);
  }

  .error-wrapper .error {
    display: flex;
  }
}
</style>
