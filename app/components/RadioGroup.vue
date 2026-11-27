<script setup lang="ts" generic="T extends GroupOption">
const model = defineModel<string | number | boolean | undefined>({
  default: undefined,
});

const {
  options,
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
  /** An error the browser cannot find, such as the server's: shown until the choice changes */
  customError?: string;
  variant?: 'default' | '3d' | 'outline';
}>();

const { t } = useI18n();

function optionValue(option: T) {
  return option[valueKey] as string | number | boolean;
}

function optionText(option: T, key?: keyof T & string) {
  const value = key === undefined ? undefined : option[key];

  return value === undefined ? undefined : String(value);
}

const message = computed(
  () => errorMessage ?? t('form.missing-value', { item: label }),
);

// As Vue's radio v-model compares (looseEqual): '1' chooses the option 1
const hasChoice = computed(
  () =>
    model.value != null &&
    options.some(
      (option) => String(optionValue(option)) === String(model.value),
    ),
);

const { customErrorActive, clearCustomError, errorShown } = useCustomError(
  () => customError,
  {
    invalid: () => required && !hasChoice.value,
    showInvalid: () => showInvalid,
    exempt: () => disabled,
  },
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
    <fieldset
      v-if="options?.length"
      :aria-labelledby="tooltip ? `legend-${id}` : undefined"
      :aria-describedby="errorShown ? `error-${id}` : undefined"
      @change="clearCustomError"
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

        <!-- The group's name without the tooltip button's "(More info)" -->
        <span v-if="tooltip" :id="`legend-${id}`" hidden>
          {{ label }}{{ required ? ` ${$t('form.required')}` : '' }}
        </span>
      </legend>

      <ul role="list" :class="['radio-list', inline && 'inline']">
        <li
          v-for="option in options"
          :key="`radio-${String(option[valueKey])}`"
        >
          <Radio
            v-model="model"
            :value="optionValue(option)"
            :label="optionText(option, labelKey)"
            :disabled="disabled || !!option.disabled"
            :title="optionText(option, titleKey)"
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
