<script setup lang="ts">
import Multiselect from '@vueform/multiselect';
import type MultiselectProps from '@vueform/multiselect';
import type { ComponentPublicInstance, StyleValue } from 'vue';

/**
 * Deprecated since 2.6.0 and removed in the next minor: a single select is
 * ComboBox, selecting several (`multiple` and `tags`) `<ComboBox multiple>`.
 */

defineOptions({ inheritAttrs: false });

const { t } = useI18n();

const model = defineModel<MultiselectProps['modelValue']>();

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
  customError = undefined,
  showInvalid = false,
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
  /** After the count, instead of "items selected" */
  itemsSelectedLabel?: string;
  instruction?: string;
  /** An error the browser cannot find, such as the server's: shown until the value changes */
  customError?: string;
  size?: InputSize;
}>();

const multiSelectRef = useTemplateRef('multiselect');

const hasValue = computed(() =>
  Array.isArray(model.value)
    ? model.value.length > 0
    : model.value !== undefined && model.value !== null && model.value !== '',
);

const { customErrorActive, clearCustomError, errorShown } = useCustomError(
  () => customError,
  {
    invalid: () => required && !hasValue.value,
    showInvalid: () => showInvalid,
  },
);

const computedAriaDescribedby = computed(
  () =>
    [instruction && `instruction-${id}`, errorShown.value && `error-${id}`]
      .filter(Boolean)
      .join(' ') || undefined,
);

// Only `aria` reaches the library's combobox, which it names by the
// selection alone: the label is added
const aria = computed(() => ({
  'aria-placeholder': null,
  'aria-multiselectable': null,
  'aria-labelledby': `label-${id}`,
  'aria-describedby': computedAriaDescribedby.value,
  'aria-invalid': errorShown.value || undefined,
}));

function forwardFakeInputFocus(event: FocusEvent) {
  const target = event.target as HTMLElement;
  if (target.classList.contains('multiselect-fake-input')) focusElement();
}

function hideFakeInput() {
  const container = (multiSelectRef.value as ComponentPublicInstance | null)
    ?.$el as HTMLElement | undefined;
  container
    ?.querySelector('.multiselect-fake-input')
    ?.setAttribute('aria-hidden', 'true');
}

onMounted(hideFakeInput);
watch(() => required, hideFakeInput, { flush: 'post' });

function formatMultipleLabels(values: Record<string, string>[]) {
  if (values.length === 1) {
    return values[0]?.[labelKey];
  }
  if (itemsSelectedLabel) return `${values.length} ${itemsSelectedLabel}`;
  return t('multiselect.items-selected', { count: values.length });
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

const { attrs, controlAttrs } = useControlAttrs();

const fixedOpenDirection = computed(
  () =>
    (attrs.openDirection ?? attrs['open-direction']) as
      'top' | 'bottom' | undefined,
);

const openDirection = ref<'top' | 'bottom'>('bottom');
const availableHeight = ref<number>();
const dropdownPosition = ref<Record<string, string>>({});

function dropdownElements() {
  const container = (multiSelectRef.value as ComponentPublicInstance | null)
    ?.$el as HTMLElement | undefined;
  const dropdown = container?.querySelector<HTMLElement>(
    '.multiselect-dropdown',
  );
  return container && dropdown ? { container, dropdown } : undefined;
}

const hasPopoverApi =
  typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;

function setDropdownLayer(show: boolean) {
  const dropdown = dropdownElements()?.dropdown;
  if (!hasPopoverApi || !dropdown?.hasAttribute('popover')) return;
  try {
    if (show) dropdown.showPopover();
    else dropdown.hidePopover();
  } catch {
    // Already in that state, or no longer in the document
  }
}

onMounted(() => {
  if (hasPopoverApi) {
    dropdownElements()?.dropdown.setAttribute('popover', 'manual');
  }
});

const VIEWPORT_MARGIN_PX = 8;

function positionDropdown() {
  const elements = dropdownElements();
  if (!elements) return;

  const { container } = elements;
  const { top, bottom, left, width } = container.getBoundingClientRect();
  const border = parseFloat(getComputedStyle(container).borderTopWidth) || 0;
  const viewportHeight = document.documentElement.clientHeight;
  const upwards = (fixedOpenDirection.value ?? openDirection.value) === 'top';

  dropdownPosition.value = {
    '--multi-select-dropdown-left': `${left}px`,
    '--multi-select-dropdown-width': `${width}px`,
    ...(upwards
      ? {
          '--multi-select-dropdown-bottom': `${viewportHeight - top - border}px`,
        }
      : { '--multi-select-dropdown-top': `${bottom - border}px` }),
  };
  availableHeight.value = Math.max(
    0,
    upwards
      ? top - VIEWPORT_MARGIN_PX
      : viewportHeight - bottom - VIEWPORT_MARGIN_PX,
  );
}

// The library has no placement of its own; anchor positioning can take over
// once every target browser has it (README; test/browser/multiselect.spec.ts)
async function placeDropdown() {
  setDropdownLayer(true);
  positionDropdown();
  if (fixedOpenDirection.value) return;

  const elements = dropdownElements();
  if (!elements) return;

  availableHeight.value = undefined;
  await nextTick();

  const { container, dropdown } = elements;
  const { top, bottom } = container.getBoundingClientRect();
  const spaceAbove = top - VIEWPORT_MARGIN_PX;
  const spaceBelow =
    document.documentElement.clientHeight - bottom - VIEWPORT_MARGIN_PX;
  const neededHeight = Math.min(
    dropdown.scrollHeight || Infinity,
    parseFloat(getComputedStyle(dropdown).maxHeight),
  );

  openDirection.value =
    spaceBelow < neededHeight && spaceAbove > spaceBelow ? 'top' : 'bottom';
  positionDropdown();
}

let frame: number | undefined;

function followField(event: Event) {
  const dropdown = dropdownElements()?.dropdown;
  if (event.target instanceof Node && dropdown?.contains(event.target)) return;
  if (frame !== undefined) return;
  frame = requestAnimationFrame(() => {
    frame = undefined;
    positionDropdown();
  });
}

function stopFollowing() {
  window.removeEventListener('scroll', followField, true);
  window.removeEventListener('resize', followField);
  if (frame !== undefined) cancelAnimationFrame(frame);
  frame = undefined;
}

// The library asks an options function only on load, so a first empty answer
// stayed: asked again on open, as in its README's example #15
// (test/components/MultiSelect.test.ts)
function handleOpen(instance: MultiselectProps) {
  isExpanded.value = true;

  // Its types leave these out
  const select$ = instance as unknown as {
    noOptions: boolean;
    resolveOptions: () => Promise<void>;
  };

  const resolveOnLoad = attrs.resolveOnLoad ?? attrs['resolve-on-load'];
  if (
    typeof attrs.options === 'function' &&
    resolveOnLoad !== false &&
    select$.noOptions
  ) {
    select$.resolveOptions();
  }

  placeDropdown();
  window.addEventListener('scroll', followField, {
    capture: true,
    passive: true,
  });
  window.addEventListener('resize', followField, { passive: true });
}

function handleClose() {
  isExpanded.value = false;
  stopFollowing();
  setDropdownLayer(false);
}

onBeforeUnmount(stopFollowing);

onMounted(() => {
  if (autofocus) setTimeout(() => focusElement(), 200);
});

// The library blurs the field on Escape and has no option against it: a no-op
// `blur` until the event leaves keeps focus (test/browser/containers.spec.ts)
function keepFocusOnEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;

  if (isExpanded.value) {
    event.preventDefault();
    multiSelectRef.value?.close();
  }
  (event.target as HTMLElement).blur = () => {};
}

function restoreBlur(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    Reflect.deleteProperty(event.target as HTMLElement, 'blur');
  }
}
</script>

<template>
  <FormField
    :id="id"
    :class="[
      'cardan-multiselect',
      `multi-select-size--${size}`,
      showOptionIcons && 'show-option-icons',
      $attrs.class,
    ]"
    :style="[
      $attrs.style as StyleValue,
      availableHeight === undefined
        ? undefined
        : { '--ms-available-height': `${availableHeight}px` },
      dropdownPosition,
    ]"
    :label="label"
    :hide-label="hideLabel"
    :required="required"
    :disabled="disabled"
    :instruction="instruction"
    :error-text="
      customErrorActive
        ? customError
        : required
          ? $t('form.missing-value', { item: label })
          : undefined
    "
    :show-invalid="showInvalid"
    :custom-error="customErrorActive"
    @keydown.capture="keepFocusOnEscape"
    @keydown="restoreBlur"
  >
    <Multiselect
      v-bind="controlAttrs()"
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
      :aria="aria"
      :multiple-label="formatMultipleLabels"
      :open-direction="fixedOpenDirection ?? openDirection"
      @focusin="forwardFakeInputFocus"
      @change="clearCustomError"
      @open="handleOpen"
      @close="handleClose"
    >
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
  </FormField>
</template>

<style>
@import '@vueform/multiselect/themes/default.css';

:root {
  --ms-font-size: var(--font-size-md);
  --ms-line-height: 1.125;
  --ms-bg: var(--color-input-bg);

  .card {
    --ms-bg: var(--color-input-bg);
  }

  --ms-bg-disabled: var(--color-white);
  --ms-border-color: var(--color-grey-graphic);
  --ms-border-width: 1px;
  --ms-border-color-active: var(--color-grey-graphic);
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
  --ms-tag-font-weight: var(--font-weight-medium);
  --ms-tag-bg: var(--color-accent-bg);
  --ms-tag-bg-disabled: var(--color-grey-bg);
  --ms-tag-color: var(--color-accent-text);
  --ms-tag-color-disabled: var(--color-grey-graphic);
  --ms-tag-radius: var(--radius-sm);

  --ms-dropdown-bg: var(--color-card-bg);
  --ms-dropdown-border-color: var(--color-grey-graphic);
  --ms-dropdown-border-width: 1px;
  --ms-dropdown-radius: var(--radius-md);

  --ms-group-label-bg: var(--color-white);
  --ms-group-label-color: var(--color-grey-text);
  --ms-group-label-bg-pointed: var(--color-grey-bg);
  --ms-group-label-color-pointed: var(--color-text);
  --ms-group-label-bg-disabled: var(--color-grey-bg);
  --ms-group-label-color-disabled: var(--color-grey-graphic);
  --ms-group-label-bg-selected: var(--color-accent-text);
  --ms-group-label-color-selected: var(--color-white);
  --ms-group-label-bg-selected-pointed: var(--color-accent-text);
  --ms-group-label-color-selected-pointed: var(--color-white);

  --ms-option-font-size: var(--font-size-sm);
  --ms-option-bg-pointed: var(--color-accent-bg);
  --ms-option-color-pointed: var(--color-accent-text);
  --ms-option-bg-selected: var(--color-green-bg);
  --ms-option-color-selected: var(--color-green-text);
  --ms-option-bg-disabled: var(--color-grey-bg);
  --ms-option-color-disabled: var(--color-grey-graphic);
  --ms-option-bg-selected-pointed: var(--color-red-bg);
  --ms-option-color-selected-pointed: var(--color-red-text);
  --ms-option-bg-selected-disabled: var(--color-grey-bg);
  --ms-option-color-selected-disabled: var(--color-grey-graphic);
}

.multiselect-wrapper {
  height: var(--multi-select-height);
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
  scrollbar-width: none;
}

.cardan-multiselect {
  flex-basis: var(--form-col-width, 240px);
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
    line-height: var(--multi-select-height);
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

.multiselect.is-active.is-open,
.multiselect.is-active.is-open-top {
  box-shadow: none;
}

.cardan-multiselect .multiselect-dropdown {
  position: fixed;
  inset: var(--multi-select-dropdown-top, auto) auto
    var(--multi-select-dropdown-bottom, auto) var(--multi-select-dropdown-left);
  width: var(--multi-select-dropdown-width);
  margin: 0;
  padding: 0;
  transform: none;
  color: inherit;
  max-height: min(
    var(--ms-max-height, 10rem),
    var(--ms-available-height, 100dvh)
  );
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

.cardan-multiselect.custom-error {
  --ms-border-color: var(--color-red-graphic);
}

.multi-select-size--sm .multiselect-wrapper {
  --multi-select-height: calc(2rem - 2px);
}

.multi-select-size--md .multiselect-wrapper {
  --multi-select-height: calc(2.5rem - 2px);
}

.multi-select-size--lg .multiselect-wrapper {
  --multi-select-height: calc(2.75rem - 2px);
}
</style>
