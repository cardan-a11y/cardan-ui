<script setup lang="ts" generic="T">
import type { StyleValue } from 'vue';

/**
 * A searchable single select: the APG combobox with a listbox popup, as in
 * its example "Editable Combobox With List Autocomplete". Typing shortens the
 * list and one option is picked as the value. Where it leaves the pattern:
 * - The value is always one of the options, never the typed text. When focus
 *   leaves, or before its Form checks a submit, the field shows the selected
 *   option's label again; a field the user emptied clears the value (the
 *   label comes back without `can-clear`). The value changes on a pick, a
 *   clear or leaving an emptied field, never while the user types.
 * - Only the user's own edit empties a field, and ComboBox never changes a
 *   value by itself: a value without an option stays, shown as "Unknown
 *   option". Empty is `null` or `undefined`; `false` and `0` are values. A
 *   clear emits `null`, which JSON keeps.
 * - `aria-selected` marks the value's option, not the highlighted one (ARIA
 *   1.2: a single-selection container whose focused item is not selected).
 *   `aria-activedescendant` alone tells the highlight.
 * - The list opens whole: it filters on the text only once the user has
 *   edited it since focus or a pick, both of which select the text. An option
 *   matches when its label contains the text, ignoring case and diacritics.
 * - Every edit opens the popup. With nothing to show (loading, failed, empty,
 *   no results) it holds a text instead of a listbox and `aria-expanded` is
 *   `false`; a status element beside the field tells a screen reader.
 * - The first arrow key highlights the selected option, as a native select.
 * - Focus leaving the field and its buttons closes the list, as a press
 *   outside does. Tab and Shift + Tab pick a highlighted option first, but
 *   only an existing, enabled one: never the create option.
 * - Enter with the popup open never submits; Escape then only closes it and
 *   puts the label back, and is stopped there, so a Dialog stays open.
 *   Escape with the popup closed does not empty the field.
 * - Picking the selected option again only closes the list.
 * - A clear button in the Tab order, named "Clear <label>"; the open button
 *   follows the pattern (`tabindex="-1"`).
 * - `name` goes to a hidden input with the option's value, so a FormData
 *   holds the value and not the label; a disabled field submits nothing.
 *
 * The list is in the top layer, placed with CSS anchor positioning: below
 * the field, above it when it does not fit below, shortened when it fits
 * neither. The one thing measured is for the phone's keyboard, which iOS
 * leaves out of the viewport CSS knows: the list keeps out from under it,
 * and a field it still hides is scrolled into view.
 *
 * `options` is an array or a function, asked when the field is first touched
 * (or at once for a value without its option) and again only after a failure
 * or an empty answer, a new `options-key` or `refreshOptions()`.
 * `v-model:selected` holds the selected option itself, so a field shows its
 * label without its list. It is `null` without a value, and for a value the
 * whole list has no option for. The wrapper has the class `has-value` while
 * there is a value.
 *
 * With `server-search` the function does the search, for a list too long to
 * load whole: `options(query, { signal, page })` is asked after a pause in
 * typing, the request that typing overtook is aborted, and its answer for
 * an empty query is the list on open. It may answer one page,
 * `{ options, more }`: the next one is asked when the highlight or the
 * scroll reaches the end, and Down Arrow on the last loaded option then
 * loads and does not wrap. The label cannot come from such a list, so a
 * value needs `v-model:selected`, which a value outside the loaded pages
 * keeps.
 *
 * With `create-option`, the last option of the list offers to create the
 * typed text while no label is that text (ignoring case and the spaces
 * around it, not diacritics), once the whole list is there, so not with
 * `server-search`. It is never a value and is never highlighted by itself:
 * an arrow key and Enter, or a click, emit `create` with the trimmed text
 * and close the list, the text and the value staying as they were. The
 * parent creates the record, adds it to `options` and sets the value, or
 * shows its failure with `custom-error`. The status says that nothing
 * matched and that the option is there.
 *
 * An option whose `disabled-key` field is true has `aria-disabled`, shows
 * dimmed and stays in the list (APG listbox): a search finds it and the
 * arrow keys reach it, so a screen reader reads it as unavailable, but Enter
 * and a click leave the list open and the value as it was. A value whose
 * option is disabled keeps its label and checkmark.
 */

defineOptions({ inheritAttrs: false });

const { t } = useI18n();

/** The selected option's value (`value-key`); `null` after a clear */
// The default keeps Vue from casting an absent value to `false`, which is a value here
const model = defineModel<ComboBoxValue | null | undefined>({
  default: undefined,
});
/** The selected option itself: written on a pick, read to show the label */
const selected = defineModel<T | null>('selected');

const {
  label,
  options,
  optionsKey = undefined,
  valueKey = 'value',
  labelKey = 'label',
  name = undefined,
  placeholder = undefined,
  noOptionsText = undefined,
  instruction = undefined,
  customError = undefined,
  createText = undefined,
  disabledKey = 'disabled',
  size = 'md',
  canClear = true,
  id = useId(),
  required,
  disabled,
  loading,
  serverSearch,
  createOption,
  showInvalid,
} = defineProps<{
  /** Names the field, the listbox and the open button, and the clear button: "Clear <label>" */
  label: string;
  /** Objects, strings or numbers; or a function that answers them, asked on first touch */
  options: T[] | ComboBoxLoader<T>;
  /** A new key asks the options function again */
  optionsKey?: string | number;
  /** The options function searches, and may answer in pages; a value then needs `v-model:selected` */
  serverSearch?: boolean;
  valueKey?: string;
  labelKey?: string;
  /** The field of an option object that disables it */
  disabledKey?: string;
  id?: string;
  /** Of the hidden input that holds the option's value */
  name?: string;
  placeholder?: string;
  /** The text of an empty list */
  noOptionsText?: string;
  required?: boolean;
  disabled?: boolean;
  autofocus?: boolean;
  /** Shows the spinner, as while the options load */
  loading?: boolean;
  /** Without it the field has no clear button and emptying it puts the label back */
  canClear?: boolean;
  /** Offers to create the typed text when no label is that text: emits `create` */
  createOption?: boolean;
  /** The create option's text for the typed text; "Create “…”" by default */
  createText?: (text: string) => string;
  hideLabel?: boolean;
  instruction?: string;
  /** Shows the error now; a Form shows it after a failed submit */
  showInvalid?: boolean;
  /** An error the browser cannot find, such as the server's: shown until the value changes */
  customError?: string;
  size?: InputSize;
}>();

const emit = defineEmits<{
  /** The create option was picked, with the trimmed text */
  create: [text: string];
}>();

const { attrs, controlAttrs } = useControlAttrs();

const rootRef = useTemplateRef<HTMLElement>('root');
const controlRef = useTemplateRef<HTMLElement>('control');
const inputRef = useTemplateRef<HTMLInputElement>('input');
const popupRef = useTemplateRef<HTMLElement>('popup');

const text = ref('');
const isEdited = ref(false);
const isOpen = ref(false);
const highlighted = ref(-1);

const query = computed(() => (isEdited.value ? text.value.trim() : ''));

const { status, say } = useComboBoxStatus();

const {
  valueOf,
  labelOf,
  isDisabled,
  isLoader,
  isServerSearch,
  allOptions,
  hasWholeList,
  listing,
  shown,
  isBusy,
  message,
  createLabel,
  touch,
  loadForLabel,
  loadMore,
  searchSoon,
  forgetSearch,
  refreshOptions,
  sayResults,
} = useComboBoxOptions<T>(
  {
    options: () => options,
    optionsKey: () => optionsKey,
    serverSearch: () => serverSearch,
    valueKey: () => valueKey,
    labelKey: () => labelKey,
    disabledKey: () => disabledKey,
    noOptionsText: () => noOptionsText,
    disabled: () => disabled,
    loading: () => loading,
    createOption: () => createOption,
    createText: () => createText,
  },
  {
    query: () => query.value,
    isEdited: () => isEdited.value,
    isOpen: () => isOpen.value,
    needsList: (): boolean => needsList.value,
    say,
    onListChange: () => (highlighted.value = -1),
  },
);

const hasValue = computed(
  () => model.value !== null && model.value !== undefined,
);

const selectedOption = computed(() => {
  if (!hasValue.value) return undefined;

  const given = selected.value;
  if (given !== null && given !== undefined && valueOf(given) === model.value) {
    return given;
  }

  return allOptions.value.find((option) => valueOf(option) === model.value);
});

const valueLabel = computed(() => {
  if (!hasValue.value) return '';
  if (selectedOption.value !== undefined) return labelOf(selectedOption.value);

  return hasWholeList.value ? t('combobox.unknown-option') : '';
});

const needsList = computed<boolean>(
  () =>
    hasValue.value &&
    selectedOption.value === undefined &&
    isLoader.value &&
    !isServerSearch.value,
);

text.value = valueLabel.value;

function endEdit() {
  isEdited.value = false;
  forgetSearch();
}

watch(valueLabel, (newLabel) => {
  if (!isEdited.value) text.value = newLabel;
});

watch(needsList, loadForLabel);

watch(selectedOption, giveSelected);

function giveSelected() {
  const option = selectedOption.value;
  if (option !== undefined && option !== selected.value) {
    selected.value = option;
  }
}

watch([hasValue, hasWholeList, selectedOption], dropSelectedOfAnotherValue);

function dropSelectedOfAnotherValue() {
  const isUnknown = hasWholeList.value && selectedOption.value === undefined;

  if (
    (!hasValue.value || isUnknown) &&
    selected.value !== null &&
    selected.value !== undefined
  ) {
    selected.value = null;
  }
}

if (import.meta.dev) {
  watchEffect(() => {
    if (
      isServerSearch.value &&
      hasValue.value &&
      selectedOption.value === undefined
    ) {
      console.warn(
        `[ComboBox] "${label}" has a value and server-search, but no v-model:selected with its option: it cannot show the label.`,
      );
    }
    if (createOption && isServerSearch.value) {
      console.warn(
        `[ComboBox] "${label}" has create-option and server-search: the create option needs the whole list, so it never shows.`,
      );
    }
  });
}

onMounted(() => {
  loadForLabel();
  giveSelected();
});

const createIndex = computed(() =>
  createLabel.value ? shown.value.length : -1,
);
const itemCount = computed(
  () => shown.value.length + (createLabel.value ? 1 : 0),
);
const hasList = computed(() => isOpen.value && itemCount.value > 0);
const activeIndex = computed(() =>
  hasList.value && highlighted.value < itemCount.value ? highlighted.value : -1,
);

const listboxId = computed(() => `${id}-listbox`);
const optionId = (index: number) => `${id}-option-${index}`;

function open() {
  if (disabled || isOpen.value) return;

  isOpen.value = true;
  touch();
}

function close() {
  isOpen.value = false;
  highlighted.value = -1;
}

function move(step: 1 | -1) {
  const count = itemCount.value;
  if (!count) return;

  if (activeIndex.value === -1) {
    const atValue = isEdited.value
      ? -1
      : shown.value.findIndex(
          (option) => hasValue.value && valueOf(option) === model.value,
        );

    highlighted.value = atValue !== -1 ? atValue : step === 1 ? 0 : count - 1;
  } else if (
    step === 1 &&
    activeIndex.value === shown.value.length - 1 &&
    listing.value?.more
  ) {
    void loadMore();
  } else {
    highlighted.value = (activeIndex.value + step + count) % count;
  }
}

function onListScroll(event: Event) {
  const list = event.target as HTMLElement;

  if (list.scrollTop + list.clientHeight >= list.scrollHeight - 48) {
    void loadMore();
  }
}

const errorText = computed(() => t('form.missing-value', { item: label }));

function applyValidity(valueIsThere = hasValue.value) {
  inputRef.value?.setCustomValidity(
    required && !valueIsThere ? errorText.value : '',
  );
}

watchPostEffect(() => applyValidity());

const { customErrorActive, clearCustomError, errorShown } = useCustomError(
  () => customError,
  {
    invalid: () => required && !hasValue.value,
    showInvalid: () => showInvalid,
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

const chipSize = computed(() => (size === 'lg' ? 'sm' : 'xs'));

function setValue(option: T | null) {
  selected.value = option;
  model.value = option === null ? null : valueOf(option);
  clearCustomError();
  applyValidity(option !== null);
}

function pick(option: T) {
  if (!hasValue.value || valueOf(option) !== model.value) setValue(option);

  text.value = labelOf(option);
  endEdit();
  close();
  nextTick(() => {
    if (document.activeElement === inputRef.value) inputRef.value?.select();
  });
}

function clear() {
  if (hasValue.value) setValue(null);

  text.value = '';
  endEdit();
  close();
  inputRef.value?.focus();
}

function create() {
  const typed = query.value;

  endEdit();
  close();
  emit('create', typed);
}

function pickUnlessDisabled(option: T) {
  if (!isDisabled(option)) pick(option);
}

function settle() {
  const wasBusy = isEdited.value || isOpen.value;
  const isEmptied = isEdited.value && text.value.trim() === '';

  if (isEmptied && hasValue.value && canClear) {
    setValue(null);
    text.value = '';
    say(() => t('combobox.cleared'));
  } else {
    text.value = valueLabel.value;
  }

  endEdit();
  close();

  return wasBusy;
}

const registerSync = inject(formSyncKey, null);
let unregisterSync: (() => void) | undefined;

onMounted(() => {
  unregisterSync = registerSync?.(settle);
});
onBeforeUnmount(() => unregisterSync?.());

let isFocusingByPress = false;
let keepSelection = false;

function onFocus() {
  touch();
  inputRef.value?.select();
  keepSelection = isFocusingByPress;
}

function onMouseDown() {
  isFocusingByPress = document.activeElement !== inputRef.value;
}

/** The mouseup of the press that gave focus would undo the selection */
function onMouseUp(event: MouseEvent) {
  if (keepSelection) event.preventDefault();

  keepSelection = false;
  isFocusingByPress = false;
}

function onClick() {
  if (isOpen.value) close();
  else open();
}

function onInput(event: Event) {
  text.value = (event.target as HTMLInputElement).value;
  isEdited.value = true;
  highlighted.value = -1;
  open();

  if (isServerSearch.value) searchSoon();
  if (!isServerSearch.value || !query.value) sayResults(600);
}

function onKeydown(event: KeyboardEvent) {
  if (event.isComposing) return;

  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowUp':
      event.preventDefault();

      if (event.altKey && event.key === 'ArrowUp') {
        close();
        return;
      }

      if (!isOpen.value) {
        open();
        if (event.altKey) return;
      }

      move(event.key === 'ArrowDown' ? 1 : -1);
      break;
    case 'Enter': {
      if (!isOpen.value) return;

      event.preventDefault();

      const option = shown.value[activeIndex.value];
      if (createLabel.value && activeIndex.value === createIndex.value) {
        create();
      } else if (option !== undefined) pickUnlessDisabled(option);
      else close();
      break;
    }
    case 'Escape':
      if (!isOpen.value) return;

      event.preventDefault();
      event.stopPropagation();
      text.value = valueLabel.value;
      endEdit();
      close();
      break;
    case 'Tab': {
      const option = shown.value[activeIndex.value];
      if (option !== undefined && !isDisabled(option)) pick(option);
      else close();
      break;
    }
    case 'ArrowLeft':
    case 'ArrowRight':
    case 'Home':
    case 'End':
      highlighted.value = -1;
      break;
  }
}

function onOpenButton() {
  inputRef.value?.focus();

  if (isOpen.value) close();
  else open();
}

let isPressInPopup = false;

function onFocusOut(event: FocusEvent) {
  const next = event.relatedTarget as Node | null;

  if (next && rootRef.value?.contains(next)) return;
  // Another window took focus: nothing closes, and the pointerup of a press
  // that was held may never arrive
  if (!next && !document.hasFocus()) {
    isPressInPopup = false;
    return;
  }

  // Until a press on the list's scrollbar no longer takes focus in Firefox
  // (148): a press in the popup that takes focus gives it back, in every
  // browser, once per press
  if (isPressInPopup) {
    isPressInPopup = false;
    inputRef.value?.focus();
    return;
  }

  settle();
}

function onDocumentPress(event: PointerEvent) {
  const target = event.target as Node;

  isPressInPopup = !!popupRef.value?.contains(target);

  const field = rootRef.value?.closest('.form-field-wrapper') ?? rootRef.value;

  if (!field?.contains(target) && (isOpen.value || isEdited.value)) settle();
}

function onDocumentPressEnd() {
  isPressInPopup = false;
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPress, true);
  document.addEventListener('pointerup', onDocumentPressEnd, true);
  document.addEventListener('pointercancel', onDocumentPressEnd, true);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPress, true);
  document.removeEventListener('pointerup', onDocumentPressEnd, true);
  document.removeEventListener('pointercancel', onDocumentPressEnd, true);
});

const { insetStyle } = useComboBoxPopup({
  popup: popupRef,
  control: controlRef,
  input: inputRef,
  isOpen,
});

function fillList() {
  const list = popupRef.value?.querySelector('[role="listbox"]');

  if (list && list.clientHeight > 0 && list.scrollHeight <= list.clientHeight) {
    void loadMore();
  }
}

watch([isOpen, listing], ([nowOpen]) => nowOpen && fillList(), {
  flush: 'post',
});

watch(
  activeIndex,
  (index) => {
    if (index === -1) return;

    document
      .getElementById(optionId(index))
      ?.scrollIntoView?.({ block: 'nearest' });
  },
  { flush: 'post' },
);

function focusElement() {
  inputRef.value?.focus();
}

defineExpose({
  inputRef,
  focusElement,
  refreshOptions,
});
</script>

<template>
  <FormField
    :id="id"
    :class="[
      'combobox',
      `input-size--${size}`,
      hasValue && 'has-value',
      $attrs.class,
    ]"
    :style="$attrs.style as StyleValue"
    :label="label"
    :hide-label="hideLabel"
    :required="required"
    :disabled="disabled"
    :chip-size="chipSize"
    :instruction="instruction"
    :error-text="customErrorActive ? customError : errorText"
    :show-invalid="showInvalid"
    :custom-error="customErrorActive"
  >
    <div
      ref="root"
      class="combobox-root"
      :style="insetStyle"
      @pointerdown="touch"
      @focusout="onFocusOut"
    >
      <div ref="control" class="combobox-control">
        <input
          :id="id"
          ref="input"
          class="input"
          v-bind="controlAttrs()"
          :value="text"
          type="text"
          role="combobox"
          autocomplete="off"
          autocapitalize="none"
          spellcheck="false"
          aria-autocomplete="list"
          data-1p-ignore
          :placeholder="placeholder"
          :disabled="disabled"
          :autofocus="autofocus"
          :aria-required="required || undefined"
          :aria-expanded="hasList"
          :aria-controls="hasList ? listboxId : undefined"
          :aria-activedescendant="
            activeIndex === -1 ? undefined : optionId(activeIndex)
          "
          :aria-describedby="ariaDescribedby"
          :aria-invalid="errorShown || undefined"
          @focus="onFocus"
          @mousedown="onMouseDown"
          @mouseup="onMouseUp"
          @click="onClick"
          @input="onInput"
          @keydown="onKeydown"
        />

        <div class="combobox-buttons">
          <Icon
            v-if="isBusy"
            name="svg-spinners:90-ring-with-bg"
            class="combobox-spinner"
          />

          <button
            v-if="canClear && !disabled && (hasValue || text)"
            type="button"
            class="combobox-button combobox-clear"
            :aria-label="t('combobox.clear', { label })"
            @mousedown.prevent
            @click="clear"
          >
            <Icon name="material-symbols:close-rounded" />
          </button>

          <button
            type="button"
            class="combobox-button combobox-open"
            tabindex="-1"
            :disabled="disabled"
            :aria-label="label"
            :aria-expanded="hasList"
            :aria-controls="hasList ? listboxId : undefined"
            @mousedown.prevent
            @click="onOpenButton"
          >
            <Icon name="material-symbols:keyboard-arrow-down-rounded" />
          </button>
        </div>
      </div>

      <input
        v-if="name && hasValue"
        type="hidden"
        :name="name"
        :value="String(model)"
        :disabled="disabled"
      />

      <div
        ref="popup"
        popover="manual"
        class="combobox-popup"
        @mousedown.prevent
      >
        <template v-if="isOpen">
          <p v-if="!shown.length" class="combobox-message">{{ message }}</p>

          <!-- tabindex: a scrolling element is in the Tab order by itself -->

          <ul
            v-if="itemCount"
            :id="listboxId"
            role="listbox"
            class="combobox-list"
            tabindex="-1"
            :aria-label="label"
            :aria-busy="isBusy || undefined"
            @scroll.passive="onListScroll"
          >
            <li
              v-for="(option, index) in shown"
              :id="optionId(index)"
              :key="String(valueOf(option))"
              role="option"
              :class="[
                'combobox-option',
                index === activeIndex && 'is-highlighted',
                isDisabled(option) && 'is-disabled',
              ]"
              :aria-selected="hasValue && valueOf(option) === model"
              :aria-disabled="isDisabled(option) || undefined"
              :aria-setsize="listing?.more ? -1 : undefined"
              :aria-posinset="listing?.more ? index + 1 : undefined"
              @click="pickUnlessDisabled(option)"
            >
              <span>{{ labelOf(option) }}</span>

              <Icon
                v-if="hasValue && valueOf(option) === model"
                name="material-symbols:check-rounded"
              />
            </li>

            <li
              v-if="createLabel"
              :id="optionId(createIndex)"
              role="option"
              :class="[
                'combobox-option',
                'combobox-create',
                createIndex === activeIndex && 'is-highlighted',
              ]"
              aria-selected="false"
              @click="create"
            >
              <Icon name="material-symbols:add-rounded" />
              <span>{{ createLabel }}</span>
            </li>
          </ul>
        </template>
      </div>

      <p role="status" class="visuallyhidden">{{ status }}</p>
    </div>
  </FormField>
</template>

<style src="../assets/combobox.css"></style>

<style>
.combobox-popup {
  .combobox-option {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-sm);
    overflow-wrap: anywhere;
    cursor: pointer;

    .iconify {
      flex: none;
      font-size: 1.25rem;
    }

    &:hover {
      background-color: var(--color-grey-bg);
    }

    /* The focus indicator: focus itself stays in the text field */
    &.is-highlighted {
      outline: 2px solid var(--focus-color);
      outline-offset: -2px;
    }

    /* As the layer's other disabled controls; exempt from contrast (1.4.3) */
    &.is-disabled {
      cursor: not-allowed;

      > * {
        opacity: 0.35;
      }

      &:hover {
        background-color: transparent;
      }
    }
  }

  .combobox-create {
    justify-content: start;
    color: var(--color-accent-text);
    font-weight: var(--font-weight-medium);
  }
}

/* An icon is a mask over a background, which forced colors would paint as the page */
@media (forced-colors: active) {
  .combobox-option .iconify {
    forced-color-adjust: none;
    background-color: CanvasText;
  }
}
</style>
