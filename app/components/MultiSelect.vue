<script setup lang="ts">
import Multiselect from '@vueform/multiselect';
import type MultiselectProps from '@vueform/multiselect';

const model = defineModel<MultiselectProps['modelValue']>();

// https://github.com/vueform/multiselect#basic-props
const {
  id = useId(),
  mode = 'multiple',
  searchable = true,
  valueKey = 'value',
  labelKey = 'label',
  disabledKey = 'disabled',
  size = 'md',
  autofocus,
  required,
  showOptionIcons = true,
  placeholder = undefined,
  tabindex = undefined,
  itemsSelectedLabel = undefined,
  instruction = undefined,
} = defineProps<{
  mode?: 'single' | 'multiple' | 'tags';
  id?: string;
  label: string;
  placeholder?: string;
  hideLabel?: boolean;
  hideSelected?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  required?: boolean;
  autofocus?: boolean;
  showInvalid?: boolean;
  showOptionIcons?: boolean;
  tabindex?: string;
  valueKey?: string;
  labelKey?: string;
  disabledKey?: string;
  itemsSelectedLabel?: string;
  instruction?: string;
  size?: InputSize;
}>();

const multiSelectRef = useTemplateRef('multiselect');

// The error message is only rendered for required fields
const computedAriaDescribedby = computed(
  () =>
    [instruction && `instruction-${id}`, required && id && `error-${id}`]
      .filter(Boolean)
      .join(' ') || undefined,
);

function formatMultipleLabels(values: Record<string, string>[]) {
  if (values.length === 1) {
    return values[0]?.[labelKey];
  }
  return `${values.length} ${itemsSelectedLabel || $t('multiselect.items-selected')}`;
}

function selectAll() {
  multiSelectRef.value?.selectAll();
}

function focusElement() {
  multiSelectRef.value?.focus();
}

defineExpose({
  selectAll,
  focusElement,
});

const isExpanded = ref(false);

onMounted(() => {
  if (autofocus) setTimeout(() => focusElement(), 200);

  document.addEventListener('keydown', (event) => preventEscape(event));
});

onUnmounted(() => document.removeEventListener('keydown', preventEscape));

function preventEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && isExpanded.value) {
    event.preventDefault();
  }
}

// https://github.com/vueform/multiselect#events
</script>

<template>
  <div
    :class="[
      'form-field-wrapper',
      'cardan-multiselect',
      `multi-select-size--${size}`,
      showInvalid && 'show-invalid',
      showOptionIcons && 'show-option-icons',
    ]"
  >
    <label
      :for="id"
      :class="[hideLabel && 'visuallyhidden', disabled && 'disabled']"
    >
      <span>{{ label }}</span>

      <RequiredChip v-if="required" />
    </label>

    <Multiselect
      v-bind="$attrs"
      :id="id"
      ref="multiselect"
      v-model="model"
      :locale="$i18n.locale"
      :hide-selected="hideSelected"
      :mode="mode"
      :placeholder="placeholder"
      :searchable="searchable"
      :disabled="disabled"
      :required="required"
      :tabindex="tabindex"
      :label="labelKey"
      :value-prop="valueKey"
      :disabled-prop="disabledKey"
      :aria-describedby="computedAriaDescribedby"
      :aria="{
        'aria-placeholder': null,
        'aria-multiselectable': null,
      }"
      :multiple-label="formatMultipleLabels"
      @open="isExpanded = true"
      @close="isExpanded = false"
    >
      <!-- https://github.com/vueform/multiselect#slots -->
      <template #spinner>
        <slot name="spinner" />
      </template>

      <template #singlelabel="{ value }">
        <slot name="singlelabel" :value="value" />
      </template>

      <template #multiplelabel="{ values }">
        <slot name="label" :value="values" />
      </template>

      <template #clear="{ clear }">
        <button type="button" class="clear-button" @click="clear">
          <Icon name="material-symbols:close-rounded" />
          <span class="visuallyhidden">{{ $t('general.clear') }}</span>
        </button>

        <slot name="clear" :clear="clear" />
      </template>

      <template #caret="{ handleCaretClick, isOpen }">
        <slot
          name="caret"
          :handle-caret-click="handleCaretClick"
          :is-open="isOpen"
        />
      </template>

      <template #option="{ option, isPointed, isSelected, search }">
        <slot
          name="option"
          :option="option"
          :is-pointed="isPointed"
          :is-selected="isSelected"
          :search="search"
        />
      </template>

      <template #tag="{ option, handleTagRemove }">
        <div class="tag-wrapper">
          <span>{{ option[labelKey] }}</span>

          <button
            type="button"
            class="clear-button"
            @click="(e) => handleTagRemove(option, e)"
          >
            <Icon name="material-symbols:close-rounded" />
            <span class="visuallyhidden">{{ $t('general.clear') }}</span>
          </button>
        </div>
        <slot
          name="tag"
          :option="option"
          :handle-tag-remove="handleTagRemove"
        />
      </template>
    </Multiselect>

    <InputError
      v-if="required"
      :id="id"
      :error-text="$t('form.missing-value', { item: label })"
    />

    <p v-if="instruction" :id="`instruction-${id}`" class="instruction">
      {{ instruction }}
    </p>
  </div>
</template>

<style>
@import '@vueform/multiselect/themes/default.css';

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

:root {
  --ms-font-size: var(--font-size-md);
  --ms-line-height: 1.125;
  --ms-bg: var(--color-input-bg);

  .card {
    --ms-bg: var(--color-input-bg);
  }

  --ms-bg-disabled: var(--color-white);
  --ms-border-color: var(--color-grey-light);
  --ms-border-width: 1px;
  --ms-border-color-active: var(--color-grey-light);
  /* --ms-border-width-active: 1px; */
  --ms-radius: var(--radius-md);
  --ms-py: 0.35em;
  --ms-px: 0.5em;
  --ms-ring-width: 1px;
  --ms-ring-color: var(--focus-color);
  --ms-placeholder-color: var(--color-grey-text);
  --ms-max-height: 16rem;

  --ms-spinner-color: var(--color-accent-graphic);
  --ms-caret-color: var(--color-grey-graphic);
  --ms-clear-color: var(--color-grey-text);
  --ms-clear-color-hover: var(--color-text);

  --ms-tag-font-size: var(--font-size-xs);
  /* --ms-tag-line-height: 1.25rem; */
  --ms-tag-font-weight: var(--font-weight-medium);
  --ms-tag-bg: var(--color-accent-bg);
  --ms-tag-bg-disabled: var(--color-grey-bg);
  --ms-tag-color: var(--color-accent-text);
  --ms-tag-color-disabled: var(--color-grey-graphic);
  --ms-tag-radius: var(--radius-sm);
  /* --ms-tag-py: 0.125rem; */
  /* --ms-tag-px: 0.5rem; */
  /* --ms-tag-my: 0.25rem; */
  /* --ms-tag-mx: 0.25rem; */

  /* --ms-tag-remove-radius: 4px; */
  /* --ms-tag-remove-py: 0.25rem; */
  /* --ms-tag-remove-px: 0.25rem; */
  /* --ms-tag-remove-my: 0rem; */
  /* --ms-tag-remove-mx: 0.125rem; */

  --ms-dropdown-bg: var(--color-card-bg);
  --ms-dropdown-border-color: var(--color-grey-light);
  --ms-dropdown-border-width: 1px;
  --ms-dropdown-radius: var(--radius-md);

  /* --ms-group-label-py: 0.3rem; */
  /* --ms-group-label-px: 0.75rem; */
  /* --ms-group-label-line-height: 1.375; */
  --ms-group-label-bg: var(--color-white);
  --ms-group-label-color: var(--color-grey-text);
  --ms-group-label-bg-pointed: var(--color-grey-bg);
  --ms-group-label-color-pointed: var(--color-text);
  --ms-group-label-bg-disabled: var(--color-grey-bg);
  --ms-group-label-color-disabled: var(--color-grey-graphic);
  --ms-group-label-bg-selected: var(--color-accent);
  --ms-group-label-color-selected: var(--color-on-accent);
  --ms-group-label-bg-selected-pointed: var(--color-accent);
  --ms-group-label-color-selected-pointed: var(--color-on-accent);
  /* --ms-group-label-bg-selected-disabled: #75cfb1; */
  /* --ms-group-label-color-selected-disabled: #d1fae5; */

  --ms-option-font-size: var(--font-size-sm);
  /* --ms-option-line-height: 1.375; */
  /* The pointed (hovered or keyboard-highlighted) option needs a 3:1 contrast change */
  --ms-option-bg-pointed: var(--color-accent-bg);
  --ms-option-color-pointed: var(--color-accent-text);
  --ms-option-bg-selected: var(--color-green-bg);
  --ms-option-color-selected: var(--color-green-text);
  --ms-option-bg-disabled: var(--color-grey-bg);
  --ms-option-color-disabled: var(--color-grey-graphic);
  --ms-option-bg-selected-pointed: var(--color-green);
  --ms-option-color-selected-pointed: var(--color-white);
  --ms-option-bg-selected-disabled: var(--color-grey-bg);
  --ms-option-color-selected-disabled: var(--color-grey-graphic);
  /* --ms-option-py: 0.5rem; */
  /* --ms-option-px: 0.75rem; */

  /* --ms-empty-color: #4B5563; */
}

.multiselect-wrapper {
  height: var(--height);
  min-height: 0;
}

.multiselect-caret {
  z-index: 1;
  margin-inline: 0.25rem 0.75rem;
}

.multiselect-tags {
  margin-block: 0.25rem;
  gap: 0.25rem;
  flex-wrap: nowrap;

  overflow: auto;
  scroll-snap-type: x mandatory;
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
  &::-webkit-scrollbar {
    display: none; /* Chrome and Safari */
  }
}

.cardan-multiselect {
  flex-basis: var(--col-width, 240px);
  flex-shrink: 0;

  .clear-button {
    padding: 0.25rem;
    z-index: 0;
    aspect-ratio: 1;
    display: inline-grid;
    place-content: center;
    border-radius: var(--radius-full);
    border: none;
    background-color: transparent;

    &:hover {
      background-color: var(--color-grey-bg);
    }
  }
  .multiselect-multiple-label,
  .multiselect-placeholder,
  .multiselect-single-label {
    padding-inline-end: calc(1.5rem + var(--ms-px, 0.875rem) * 3);
    line-height: var(--height);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
    -webkit-user-select: none;
    user-select: none;
  }

  .multiselect-spinner {
    margin-inline-end: 0.25em;
  }

  .tag-wrapper {
    scroll-snap-align: start;
    scroll-margin-inline: 0.25rem;
    white-space: nowrap;
    display: inline-flex;
    border-radius: var(--radius-sm);
    color: var(--color-accent-text);
    background-color: var(--color-accent-bg);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    padding-block: 0.125rem;
    padding-inline-start: 0.5rem;
  }
}

.multiselect-fake-input {
  opacity: 0;
}

.multiselect {
  transition-property: opacity;
  transition-duration: var(--duration-sm);
}

.multiselect.is-disabled {
  opacity: 35%;

  .multiselect-wrapper {
    cursor: default;
  }
}

.multiselect.is-active.is-open {
  box-shadow: none;
}

.multiselect-option {
  -webkit-user-select: none;
  user-select: none;

  + .multiselect-option {
    border-block-start: 2px solid var(--color-card-bg);
  }
}

.show-option-icons {
  .multiselect-option {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;

    &::after {
      flex-shrink: 0;
      display: inline-block;
      vertical-align: middle;
      width: 1em;
      height: 1em;
      color: var(--ms-option-bg-pointed);
      background-color: var(--ms-option-color-pointed);
      mask-size: contain;
      mask-repeat: no-repeat;
    }

    &.is-pointed::after {
      content: '';
      mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 20 20"><path fill="currentColor" fill-rule="evenodd" d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1" clip-rule="evenodd"/></svg>');
    }

    &.is-selected {
      &::after {
        content: '';
        color: var(--ms-option-bg-selected);
        background-color: var(--ms-option-color-selected);
        mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 20 20"><path fill="currentColor" fill-rule="evenodd" d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0" clip-rule="evenodd"/></svg>');
      }

      &.is-disabled::after {
        color: var(--ms-option-bg-selected-disabled);
        background-color: var(--ms-option-color-selected-disabled);
      }

      &.is-pointed::after {
        content: '';
        color: var(--ms-option-bg-selected-pointed);
        background-color: var(--ms-option-color-selected-pointed);
        mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 20 20"><path fill="currentColor" fill-rule="evenodd" d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10L4.293 5.707a1 1 0 0 1 0-1.414" clip-rule="evenodd"/></svg>');
      }
    }
  }
}

.show-invalid .cardan-multiselect:has(:invalid) {
  .error-wrapper .error {
    display: flex;
  }

  --ms-border-color: var(--color-red-graphic);
}

/* Sizes */
.multi-select-size--sm .multiselect-wrapper {
  --height: calc(2rem - 2px);
}

.multi-select-size--md .multiselect-wrapper {
  --height: calc(2.5rem - 2px);
}

.multi-select-size--lg .multiselect-wrapper {
  --height: calc(2.75rem - 2px);
}
</style>
