<script setup lang="ts">
const model = defineModel<boolean | (string | number)[]>();

const {
  id = useId(),
  variant = 'default',
  label = undefined,
  title = undefined,
  name = undefined,
  value = undefined,
  tabindex = undefined,
  errorMessage = undefined,
  showInvalid = false,
  required,
} = defineProps<{
  label?: string;
  title?: string;
  name?: string;
  value?: string | number;
  required?: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
  showInvalid?: boolean;
  /** Under the box when it is required and not ticked; "Tick this box to continue" by default */
  errorMessage?: string;
  tabindex?: string;
  id?: string;
  variant?: 'default' | '3d';
}>();

const { t } = useI18n();

const computedErrorMessage = computed(
  () => errorMessage ?? t('form.checkbox-required'),
);

const isTicked = computed(() =>
  Array.isArray(model.value)
    ? value !== undefined && model.value.includes(value)
    : !!model.value,
);

const formShowInvalid = inject(formShowInvalidKey, ref(false));

// The error text describes the box only while it shows
const describedBy = computed(() =>
  required && !isTicked.value && (showInvalid || formShowInvalid.value)
    ? `error-${id}`
    : undefined,
);
</script>

<template>
  <div
    :class="[
      'checkbox-wrapper',
      disabled && 'disabled',
      showInvalid && 'show-invalid',
      `checkbox-variant--${variant}`,
    ]"
  >
    <input
      :id="id"
      v-model="model"
      :name="name"
      :value="value"
      :disabled="disabled"
      :required="required"
      :tabindex="tabindex"
      :aria-describedby="describedBy"
      type="checkbox"
    />

    <label
      :for="id"
      :title="title"
      :class="[hideLabel && 'visuallyhidden', disabled && 'disabled']"
    >
      <slot name="label" />

      <span v-if="label">{{ label }}</span>

      <RequiredChip v-if="required" />
    </label>

    <slot name="default" />

    <InputError v-if="required" :id="id" :error-text="computedErrorMessage" />
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

.checkbox-wrapper {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  transition-property: opacity;
  transition-duration: var(--duration-sm);

  &.disabled {
    opacity: 0.35;
  }

  label {
    /* Wraps its text beside the box instead of dropping under it: the row
       wraps for the error text */
    flex: 1 1 0;
    min-width: 0;
    max-width: max-content;
    font-size: var(--font-size-sm);
    padding-inline-start: 0.5rem;
  }

  input[type='checkbox'] {
    appearance: none;
    margin: 0;
    width: 1.25rem;
    height: 1.25rem;
    position: relative;
    border-radius: var(--radius-sm);

    &::before {
      position: absolute;
      content: '';
      width: 100%;
      height: 100%;
      border: 1px solid var(--color-grey-text);
      border-radius: inherit;
      background-color: var(--color-card-bg);
    }

    &:checked {
      &::before {
        border-color: var(--color-accent-graphic);
      }

      + label {
        color: var(--color-accent-text);
        font-weight: var(--font-weight-semibold);
      }

      &::after {
        content: '';
        display: inline-block;
        width: 1rem;
        height: 1rem;
        position: absolute;
        inset: 0;
        margin: auto;
        background-color: var(--color-accent-graphic);
        mask-image: url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.8568 7.39978L20.5033 7.7533L9.90371 18.3539L9.55019 18.7074L3.14297 12.3002L5.2748 10.1683L9.54922 14.4427L18.3715 5.62146L18.725 5.26794L20.8568 7.39978Z" fill="red" stroke="red"/></svg>');
        mask-size: contain;
        mask-repeat: no-repeat;
      }
    }

    &:focus-visible {
      outline: 1px solid var(--focus-color);

      &::before {
        border-color: var(--focus-color);
      }
    }
  }
}

.checkbox-variant--3d {
  input[type='checkbox'] {
    width: 1.5rem;
    height: 1.5rem;

    &::before {
      border-width: 1.5px;
      box-shadow: 1.5px 1.5px 0 0 var(--color-grey-text);
      transition-property: border-color, outline-color, box-shadow;
      transition-duration: var(--duration-sm);
    }

    &:focus-visible {
      &::before {
        box-shadow: 1.5px 1.5px 0 0 var(--focus-color);
      }

      &:checked:before {
        box-shadow: 1.5px 1.5px 0 0 var(--focus-color);
      }
    }

    &:checked::before {
      box-shadow: 1.5px 1.5px 0 0 var(--color-accent-graphic);
    }

    &:checked::after {
      width: 1.25rem;
      height: 1.25rem;
    }
  }
}

.checkbox-wrapper > .error-wrapper {
  flex-basis: 100%;
}

/* A required box that is not ticked, once the form reports its state */
:where(.checkbox-wrapper.show-invalid:has(:invalid)),
:where(.show-invalid) .checkbox-wrapper:has(:invalid) {
  input[type='checkbox']::before {
    border-color: var(--color-red-graphic);
  }

  .error-wrapper .error {
    display: flex;
  }
}
</style>
