<script setup lang="ts">
const model = defineModel<string | number>();

const searchInputRef = useTemplateRef('searchInput');

const {
  hideLabel = true,
  label = undefined,
  placeholder = undefined,
  autocomplete = undefined,
  list = undefined,
  size = 'md',
} = defineProps<{
  label?: string;
  placeholder?: string;
  autocomplete?: string;
  autofocus?: boolean;
  hideLabel?: boolean;
  size?: InputSize;
  hideSubmitButton?: boolean;
  list?: string;
}>();

function handleSearch() {
  emit('submit', model.value);
}

function handleReset() {
  model.value = '';
  emit('reset', model.value);
  searchInputRef.value?.focusElement();
}

function focusElement() {
  searchInputRef.value?.focusElement();
}

defineExpose({
  searchInputRef,
  focusElement,
});

const computedSize = computed(() => {
  if (size === 'lg') return 'sm';
  if (size === 'md') return 'xs';
  if (size === 'sm') return 'xs';
  return 'sm';
});

const emit = defineEmits<{
  submit: [value?: string | number];
  reset: [value: string | number];
}>();
</script>

<template>
  <Form
    role="search"
    :class="['search-form', hideSubmitButton && 'hide-submit-button']"
    @submit="handleSearch"
  >
    <div class="search-input-wrapper">
      <Input
        ref="searchInput"
        v-model="model"
        type="search"
        :size="size"
        :list="list"
        :icon="hideSubmitButton ? 'material-symbols:search-rounded' : undefined"
        :placeholder="placeholder"
        :label="label || $t('general.search')"
        :hide-label="hideLabel"
        :autocomplete="autocomplete"
        :autofocus="autofocus"
      />

      <Button
        v-if="model"
        type="reset"
        :title="$t('general.reset')"
        icon="material-symbols:close-rounded"
        :size="computedSize"
        icon-size="md"
        hide-label
        variant="ghost"
        @click="handleReset"
      />
    </div>

    <Button
      v-if="!hideSubmitButton"
      type="submit"
      :label="$t('general.search')"
      icon="material-symbols:search-rounded"
      :size="size"
      icon-size="lg"
      hide-label
    />
  </Form>
</template>

<style>
.search-form {
  --search-color: var(--focus-color);
  --column-gap: 0rem;

  flex-grow: 1;
  flex-basis: 240px;
  display: grid;
  align-content: end;
  align-items: end;

  &:has(.button[type='submit']) {
    grid-template-columns: 1fr auto;
  }

  .form-field-wrapper {
    position: relative;
    width: 100%;
  }

  input[type='search']::-webkit-search-cancel-button {
    appearance: none;
  }

  &:not(.hide-submit-button) {
    .input {
      border-start-end-radius: 0;
      border-end-end-radius: 0;
    }

    input[type='search'] {
      border-inline-end: 0;
    }
  }

  .search-input-wrapper {
    display: flex;
    position: relative;
  }

  .button {
    &[type='submit'] {
      right: 0;
      bottom: 0;
      color: var(--color-white);
      background-color: var(--search-color);
      border-color: var(--search-color);
      min-width: 2rem;
      border-end-start-radius: 0;
      border-start-start-radius: 0;
      border-inline-start: 0;
      outline-offset: -1px;
      transition-duration: 0s;

      .iconify {
        transition-duration: 0s;
      }

      &:focus {
        color: var(--color-white);
        background-color: var(--search-color);
        outline-offset: 1px;
      }
    }

    &[type='reset'] {
      z-index: 1;
      position: absolute;
      right: 0.25rem;
      bottom: 0.25rem;
      outline-offset: -1px;
    }
  }

  &:has(input[type='search']:focus) {
    .button[type='submit'] {
      color: var(--color-white);
      border-color: var(--search-color);
      background-color: var(--search-color);
      outline: 2px solid var(--focus-color);
    }
  }

  .input-size--sm {
    + .button[type='reset'] {
      bottom: 0.25rem;
      right: 0.25rem;
    }

    input[type='search'] {
      padding-inline-end: 1.75rem;
    }
  }

  .input-size--md {
    + .button[type='reset'] {
      bottom: 0.5rem;
      right: 0.5rem;
    }

    input[type='search'] {
      padding-inline-end: 2rem;
    }
  }

  .input-size--lg {
    + .button[type='reset'] {
      bottom: 0.375rem;
      right: 0.375rem;
    }

    input[type='search'] {
      padding-inline-end: 2.5rem;
    }
  }
}
</style>
