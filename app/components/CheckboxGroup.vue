<script setup lang="ts" generic="T extends GroupOption">
const model = defineModel<boolean | (string | number)[]>();

const {
  options,
  valueKey = 'value' as keyof T & string,
  labelKey = 'label' as keyof T & string,
  disabledKey = 'disabled' as keyof T & string,
  nameKey = undefined,
  name = undefined,
  variant = 'default',
  titleKey = undefined,
  tabindex = undefined,
  errorMessage = undefined,
  customError = undefined,
  id = useId(),
  showInvalid = false,
  disabled,
  required,
} = defineProps<{
  /** Any objects; the keys name the value, label, disabled, name and title fields */
  options: T[];
  label: string;
  tabindex?: string;
  valueKey?: keyof T & string;
  labelKey?: keyof T & string;
  disabledKey?: keyof T & string;
  nameKey?: keyof T & string;
  name?: string;
  titleKey?: keyof T & string;
  hideLegend?: boolean;
  disabled?: boolean;
  /** At least one box must be ticked */
  required?: boolean;
  showInvalid?: boolean;
  /** Under the group when it is required and no box is ticked; "Tick at least one option" by default */
  errorMessage?: string;
  /**
   * An error the browser cannot find, such as one from the server: the group
   * shows this text and is described by it until a box is ticked or unticked
   */
  customError?: string;
  id?: string;
  variant?: 'default' | '3d';
}>();

const { t } = useI18n();

/** The value of an option, as the box's `value` */
function optionValue(option: T) {
  return option[valueKey] as string | number;
}

/** A text field of an option, for a prop that takes a string */
function text(option: T, key?: keyof T & string) {
  const value = key === undefined ? undefined : option[key];

  return value === undefined ? undefined : String(value);
}

const message = computed(
  () => errorMessage ?? t('form.checkbox-group-required'),
);

const hasSelection = computed(() =>
  Array.isArray(model.value) ? model.value.length > 0 : !!model.value,
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
    (required && !hasSelection.value && (showInvalid || formShowInvalid.value)),
);

const listRef = useTemplateRef<HTMLElement>('list');

/**
 * The browser's own `required` on a checkbox asks for that box, so on every
 * box of a group it would ask for all of them. The group asks for at least
 * one through the custom validity of its boxes: the form then reports it
 * like any other field and focuses the first box.
 */
function applyValidity() {
  const text = required && !hasSelection.value ? message.value : '';

  listRef.value
    ?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    .forEach((input) => input.setCustomValidity(text));
}

onMounted(applyValidity);

// Deep, so a box added to the options in place gets its validity too
watch([hasSelection, message, () => required, () => options], applyValidity, {
  deep: true,
  flush: 'post',
});
</script>

<template>
  <div
    :class="[
      'checkboxes-wrapper',
      showInvalid && 'show-invalid',
      customErrorActive && 'custom-error',
    ]"
  >
    <template v-if="options?.length">
      <!-- The error describes the group only while it shows -->
      <fieldset
        :aria-describedby="errorShown ? `error-${id}` : undefined"
        @change="customErrorActive = false"
      >
        <legend
          v-if="label"
          :class="[hideLegend && 'visuallyhidden', disabled && 'disabled']"
        >
          <span>{{ label }}</span>

          <RequiredChip v-if="required" />
        </legend>

        <ul ref="list" role="list" class="checkbox-list">
          <li
            v-for="option in options"
            :key="`checkbox-${String(option[valueKey])}`"
          >
            <Checkbox
              v-model="model"
              :value="optionValue(option)"
              :label="text(option, labelKey)"
              :disabled="disabled || !!option[disabledKey]"
              :title="text(option, titleKey)"
              :name="name || text(option, nameKey)"
              :hide-label="option.hideLabel"
              :tabindex="tabindex"
              :variant="variant"
            />
          </li>
        </ul>
      </fieldset>

      <InputError
        v-if="required || customError"
        :id="id"
        :error-text="customErrorActive ? customError : message"
      />
    </template>
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

.checkboxes-wrapper {
  legend {
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-md);
    margin-block-end: 0.75rem;
  }

  .checkbox-list {
    display: grid;
    gap: 0.5rem;
  }
}

/* A required group without a ticked box, once the form reports its state, or
   a custom error */
:where(.checkboxes-wrapper.show-invalid:has(:invalid)),
:where(.checkboxes-wrapper.custom-error),
:where(.show-invalid) .checkboxes-wrapper:has(:invalid) {
  legend {
    color: var(--color-red-text);
  }

  .error-wrapper .error {
    display: flex;
  }
}
</style>
