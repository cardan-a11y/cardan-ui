<script setup lang="ts" generic="T">
import type { StyleValue } from 'vue';

/**
 * A searchable select of several options: ComboBox's field, with a popup of
 * real checkboxes. No pattern describes several values in one listbox
 * combobox, so the popup is the dialog that ARIA 1.2 allows a combobox (as
 * APG's "Date Picker Combobox"), and every option in it is a checkbox, which
 * every browser and screen reader knows. Where it differs from ComboBox:
 * - Focus moves into the dialog: Down Arrow in the field goes to the first
 *   checkbox, Up Arrow to the last; in the dialog the arrow keys, Home and End
 *   move between them, and Up Arrow on the first returns to the field. So the
 *   field has no `aria-activedescendant` and no `aria-autocomplete`.
 * - The checkboxes are ordinary Tab stops, while the dialog is open. Space
 *   ticks one and the dialog stays open, as on a click, which keeps focus
 *   where it was, so a pointer user goes on typing.
 * - The closed field shows the selection as its value, never its name: the
 *   label of one option, or "3 selected". Focus selects it and typing
 *   replaces it with the search; when focus leaves the field and the dialog,
 *   the selection is back. The dialog says the number above the list, so it
 *   stays in sight while the list is filtered.
 * - Escape in the field or the dialog closes it, puts the selection back and
 *   focuses the field, and is stopped there, so a Dialog around it stays
 *   open. Enter in the field or on a checkbox never submits.
 * - `v-model` is an array of values, `[]` after a clear; `v-model:selected`
 *   the array of their options, so a field shows its labels without its
 *   list. `name` goes to a hidden input per value, since the checkboxes are
 *   only there while the dialog is open. `required` asks for one at least.
 *
 * As in ComboBox: an option matches when its label contains the text,
 * ignoring case and diacritics, and the status element says the number of
 * results; `options` is an array or a function, asked when the field is
 * first touched (or at once for a value without its option) and again only
 * after a failure or an empty answer, a new `options-key` or
 * `refreshOptions()`. Not `server-search`: a list too long to load whole
 * needs a page of its own.
 *
 * With `create-option`, a button after the list offers to create the typed
 * text while no label is that text (ignoring case and the spaces around it).
 * It emits `create` with the trimmed text and nothing more: the parent
 * creates the record, adds it to `options` and its value to `v-model`, or
 * shows its failure with `custom-error`. Focus moves to the field, whose
 * text stays, so the new option shows ticked.
 *
 * An option whose `disabled-key` field is true is an `aria-disabled`
 * checkbox, as ComboBox's disabled option: Tab, the arrow keys and a search
 * reach it, so a screen reader reads it as unavailable, but a click or Space
 * does not tick or untick it, nor does the clear button. Not a native
 * disabled checkbox, which Tab skips.
 */

defineOptions({ inheritAttrs: false });

const { t } = useI18n();

/** The values of the ticked options (`value-key`); `[]` after a clear */
const model = defineModel<ComboBoxValue[] | null | undefined>({
  default: undefined,
});
/** The ticked options themselves: written on a tick, read to show the labels */
const selected = defineModel<T[] | null>('selected');

const emit = defineEmits<{
  /** The create button was pressed, with the trimmed text */
  create: [text: string];
}>();

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
  createOption,
  showInvalid,
} = defineProps<{
  /** Names the field, the dialog and the open button, and the clear button: "Clear <label>" */
  label: string;
  /** Objects, strings or numbers; or a function that answers them, asked on first touch */
  options: T[] | ComboBoxLoader<T>;
  /** A new key asks the options function again */
  optionsKey?: string | number;
  valueKey?: string;
  labelKey?: string;
  /** The field of an option object that disables it */
  disabledKey?: string;
  id?: string;
  /** Of the hidden inputs, one per value */
  name?: string;
  placeholder?: string;
  /** The text of an empty list */
  noOptionsText?: string;
  /** At least one option must be ticked */
  required?: boolean;
  disabled?: boolean;
  autofocus?: boolean;
  /** Shows the spinner, as while the options load */
  loading?: boolean;
  /** Without it the field has no clear button */
  canClear?: boolean;
  /** Offers to create the typed text when no label is that text: emits `create` */
  createOption?: boolean;
  /** The create button's text for the typed text; "Create “…”" by default */
  createText?: (text: string) => string;
  hideLabel?: boolean;
  instruction?: string;
  /** Shows the error now; a Form shows it after a failed submit */
  showInvalid?: boolean;
  /** An error the browser cannot find, such as the server's: shown until the value changes */
  customError?: string;
  size?: InputSize;
}>();

const { attrs, controlAttrs } = useControlAttrs();

const rootRef = useTemplateRef<HTMLElement>('root');
const controlRef = useTemplateRef<HTMLElement>('control');
const inputRef = useTemplateRef<HTMLInputElement>('input');
const popupRef = useTemplateRef<HTMLElement>('popup');

const text = ref('');
const isEdited = ref(false);
const isOpen = ref(false);

const query = computed(() => (isEdited.value ? text.value.trim() : ''));

const { status, say } = useComboBoxStatus();

const {
  valueOf,
  labelOf,
  isDisabled,
  isLoader,
  allOptions,
  hasWholeList,
  shown,
  isBusy,
  message,
  createLabel,
  touch,
  loadForLabel,
  forgetSearch,
  refreshOptions,
  sayResults,
} = useComboBoxOptions<T>(
  {
    options: () => options,
    optionsKey: () => optionsKey,
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
    onListChange: () => {},
  },
);

const values = computed(() => model.value ?? []);
const count = computed(() => values.value.length);

/** The options of the values, in their order: given in `selected`, or found in the list */
const selectedOptions = computed<T[]>(() =>
  values.value.flatMap((value) => {
    const option =
      selected.value?.find((given) => valueOf(given) === value) ??
      allOptions.value.find((option) => valueOf(option) === value);

    return option === undefined ? [] : [option];
  }),
);

const needsList = computed<boolean>(
  () => isLoader.value && selectedOptions.value.length < count.value,
);

const summary = computed(() => {
  if (count.value > 1) {
    return t('multicombobox.selected', { count: count.value }, count.value);
  }
  if (count.value === 0) return '';

  const option = selectedOptions.value[0];
  if (option !== undefined) return labelOf(option);

  return hasWholeList.value ? t('combobox.unknown-option') : '';
});

text.value = summary.value;

function endEdit() {
  isEdited.value = false;
  forgetSearch();
}

watch(summary, (newSummary) => {
  if (!isEdited.value) text.value = newSummary;
});

watch(needsList, loadForLabel);

function sameValues(a: T[], b: T[] | null | undefined) {
  return (
    a.length === (b?.length ?? 0) &&
    a.every((option, index) => valueOf(option) === valueOf(b![index]!))
  );
}

function giveSelected() {
  if (!sameValues(selectedOptions.value, selected.value)) {
    selected.value = selectedOptions.value;
  }
}

watch(selectedOptions, giveSelected);

onMounted(() => {
  loadForLabel();
  giveSelected();
});

const dialogId = computed(() => `${id}-dialog`);
const checkboxId = (index: number) => `${id}-option-${index}`;

function isTicked(option: T) {
  return values.value.includes(valueOf(option));
}

function open() {
  if (disabled || isOpen.value) return;

  isOpen.value = true;
  touch();
}

function close() {
  isOpen.value = false;
}

const errorText = computed(() => t('form.checkbox-group-required'));

function applyValidity(isTickedNow = count.value > 0) {
  inputRef.value?.setCustomValidity(
    required && !isTickedNow ? errorText.value : '',
  );
}

watchPostEffect(() => applyValidity());

const { customErrorActive, clearCustomError, errorShown } = useCustomError(
  () => customError,
  {
    invalid: () => required && count.value === 0,
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

function setValues(newValues: ComboBoxValue[], newOptions: T[]) {
  selected.value = newOptions;
  model.value = newValues;
  clearCustomError();
  applyValidity(newValues.length > 0);
}

function toggle(option: T, tick: boolean) {
  const value = valueOf(option);
  if (tick === values.value.includes(value)) return;

  if (tick) {
    setValues([...values.value, value], [...selectedOptions.value, option]);
  } else {
    setValues(
      values.value.filter((other) => other !== value),
      selectedOptions.value.filter((given) => valueOf(given) !== value),
    );
  }
}

/** The ticked options a clear keeps: a disabled one is never unticked */
const keptOnClear = computed(() => selectedOptions.value.filter(isDisabled));

function clear() {
  if (count.value > keptOnClear.value.length) {
    setValues(keptOnClear.value.map(valueOf), keptOnClear.value);
  }

  text.value = '';
  endEdit();
  close();
  inputRef.value?.focus();
}

/** Puts the selection back in the field and closes the dialog */
function settle() {
  const wasBusy = isEdited.value || isOpen.value;

  text.value = summary.value;
  endEdit();
  close();

  return wasBusy;
}

function returnToField() {
  settle();
  inputRef.value?.focus();
  inputRef.value?.select();
}

function create() {
  const typed = query.value;

  inputRef.value?.focus();
  emit('create', typed);
}

const registerSync = inject(formSyncKey, null);
let unregisterSync: (() => void) | undefined;

onMounted(() => {
  unregisterSync = registerSync?.(settle);
});
onBeforeUnmount(() => unregisterSync?.());

let isFocusingByPress = false;
let keepSelection = false;

let isRestoringFocus = false;

function onFocus() {
  touch();
  if (!isRestoringFocus) inputRef.value?.select();
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
  open();
  sayResults(600);
}

/** The checkboxes and the create button, in order */
function stops() {
  return [
    ...(popupRef.value?.querySelectorAll<HTMLElement>(
      'input[type="checkbox"], .multicombobox-create',
    ) ?? []),
  ];
}

async function focusStop(which: 'first' | 'last') {
  await nextTick();

  const all = stops();
  (which === 'first' ? all[0] : all.at(-1))?.focus();
}

function onKeydown(event: KeyboardEvent) {
  focusBeforePress = null;
  if (event.isComposing) return;

  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowUp':
      event.preventDefault();

      if (event.altKey && event.key === 'ArrowUp') {
        close();
        return;
      }

      open();
      if (!event.altKey) {
        void focusStop(event.key === 'ArrowDown' ? 'first' : 'last');
      }
      break;
    case 'Enter':
      if (!isOpen.value) return;

      event.preventDefault();
      close();
      break;
    case 'Escape':
      if (!isOpen.value) return;

      event.preventDefault();
      event.stopPropagation();
      returnToField();
      break;
  }
}

function onPopupKeydown(event: KeyboardEvent) {
  focusBeforePress = null;

  const all = stops();
  const index = all.indexOf(event.target as HTMLElement);

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      all[Math.min(index + 1, all.length - 1)]?.focus();
      break;
    case 'ArrowUp':
      event.preventDefault();
      if (index <= 0) inputRef.value?.focus();
      else all[index - 1]?.focus();
      break;
    case 'Home':
      event.preventDefault();
      all[0]?.focus();
      break;
    case 'End':
      event.preventDefault();
      all.at(-1)?.focus();
      break;
    case 'Escape':
      event.preventDefault();
      event.stopPropagation();
      returnToField();
      break;
    case 'Enter':
      // Never a submit from the list, which a browser may do for a checkbox
      if ((event.target as HTMLInputElement).type === 'checkbox') {
        event.preventDefault();
      }
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

  // As in ComboBox: a press in the popup that takes focus (the list's
  // scrollbar in Firefox) gives it back, once per press
  if (isPressInPopup) {
    isPressInPopup = false;
    (event.target as HTMLElement).focus();
    return;
  }

  settle();
}

/** Where focus was when a press in the popup began */
let focusBeforePress: HTMLElement | null = null;

// A click on an option's label focuses its checkbox: the press keeps focus
// where it was, so a pointer user goes on typing
function onPopupFocusIn(event: FocusEvent) {
  if (focusBeforePress && event.target !== focusBeforePress) {
    isRestoringFocus = true;
    focusBeforePress.focus({ preventScroll: true });
    isRestoringFocus = false;
  }
}

function forgetPress() {
  setTimeout(() => (focusBeforePress = null));
}

function onDocumentPress(event: PointerEvent) {
  const target = event.target as Node;

  isPressInPopup = !!popupRef.value?.contains(target);
  focusBeforePress = isPressInPopup
    ? (document.activeElement as HTMLElement | null)
    : null;

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
      'multicombobox',
      `input-size--${size}`,
      count > 0 && 'has-value',
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
          aria-haspopup="dialog"
          data-1p-ignore
          :placeholder="placeholder"
          :disabled="disabled"
          :autofocus="autofocus"
          :aria-required="required || undefined"
          :aria-expanded="isOpen"
          :aria-controls="isOpen ? dialogId : undefined"
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
            v-if="
              canClear &&
              !disabled &&
              (count > keptOnClear.length || (isEdited && text))
            "
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
            :aria-expanded="isOpen"
            :aria-controls="isOpen ? dialogId : undefined"
            @mousedown.prevent
            @click="onOpenButton"
          >
            <Icon name="material-symbols:keyboard-arrow-down-rounded" />
          </button>
        </div>
      </div>

      <template v-if="name">
        <input
          v-for="value in values"
          :key="String(value)"
          type="hidden"
          :name="name"
          :value="String(value)"
          :disabled="disabled"
        />
      </template>

      <div
        :id="dialogId"
        ref="popup"
        popover="manual"
        role="dialog"
        class="combobox-popup multicombobox-popup"
        :aria-label="label"
        @mousedown.prevent
        @focusin="onPopupFocusIn"
        @click="forgetPress"
        @keydown="onPopupKeydown"
      >
        <template v-if="isOpen">
          <p v-if="count > 0" class="multicombobox-count">
            {{ t('multicombobox.selected', { count }, count) }}
          </p>

          <!-- tabindex: a scrolling element is in the Tab order by itself -->
          <ul
            v-if="shown.length"
            class="combobox-list multicombobox-list"
            tabindex="-1"
            :aria-busy="isBusy || undefined"
          >
            <li
              v-for="(option, index) in shown"
              :key="String(valueOf(option))"
              :class="[
                'multicombobox-option',
                isDisabled(option) && 'is-disabled',
              ]"
            >
              <Checkbox
                :id="checkboxId(index)"
                :model-value="isTicked(option)"
                :label="labelOf(option)"
                :aria-disabled="isDisabled(option)"
                @update:model-value="toggle(option, !!$event)"
              />
            </li>
          </ul>

          <p v-else class="combobox-message">{{ message }}</p>

          <button
            v-if="createLabel"
            type="button"
            class="multicombobox-create"
            @click="create"
          >
            <Icon name="material-symbols:add-rounded" />
            <span>{{ createLabel }}</span>
          </button>
        </template>
      </div>

      <p role="status" class="visuallyhidden">{{ status }}</p>
    </div>
  </FormField>
</template>

<style src="../assets/combobox.css"></style>

<style>
.multicombobox-popup {
  .multicombobox-count {
    margin: 0;
    padding: 0.25rem 0.75rem;
    color: var(--color-grey-text);
    font-size: var(--font-size-sm);
  }

  .multicombobox-option {
    border-radius: var(--radius-sm);

    &:hover {
      background-color: var(--color-grey-bg);
    }

    &:has(:focus-visible) {
      outline: 2px solid var(--focus-color);
      outline-offset: -2px;
    }

    &.is-disabled {
      &:hover {
        background-color: transparent;
      }

      label {
        cursor: not-allowed;
      }
    }

    .checkbox-wrapper {
      flex-wrap: nowrap;
      align-items: start;
    }

    input[type='checkbox'] {
      flex: none;
      margin-block: 0.625rem;
      margin-inline-start: 0.75rem;
    }

    label {
      flex: 1;
      max-width: none;
      padding: 0.5rem 0.75rem 0.5rem 0.5rem;
      font-size: inherit;
      overflow-wrap: anywhere;
      cursor: pointer;
    }
  }

  .multicombobox-create {
    display: flex;
    align-items: start;
    gap: 0.5rem;
    flex: none;
    inline-size: 100%;
    padding: 0.5rem 0.75rem;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--color-accent-text);
    background: none;
    font: inherit;
    font-weight: var(--font-weight-medium);
    text-align: start;
    overflow-wrap: anywhere;
    cursor: pointer;

    .iconify {
      flex: none;
      font-size: 1.25rem;
    }

    &:hover {
      background-color: var(--color-grey-bg);
    }

    &:focus-visible {
      outline: 2px solid var(--focus-color);
      outline-offset: -2px;
    }
  }
}

/* An icon is a mask over a background, which forced colors would paint as the page */
@media (forced-colors: active) {
  .multicombobox-create .iconify {
    forced-color-adjust: none;
    background-color: ButtonText;
  }
}
</style>
