<script setup lang="ts" generic="T, M extends boolean = false">
import type { Ref, StyleValue } from 'vue';

/**
 * A searchable select: the APG combobox with a listbox popup, as in its
 * example "Editable Combobox With List Autocomplete". Typing shortens the
 * list and one option is picked as the value. With `multiple` it selects
 * several (below). Where it leaves the pattern:
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
 *
 * With `multiple` it selects several options, and the wrapper has the class
 * `is-multiple`. No pattern describes several values in one listbox
 * combobox, so the popup is the dialog that ARIA 1.2 allows a combobox (as
 * APG's "Date Picker Combobox"), and every option in it is a checkbox, which
 * every browser and screen reader knows. `multiple` is read once, when the
 * field is created. Where it differs from the above:
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
 *   open. Enter in the field does the same, without being stopped; while it
 *   is open, Enter in the field or on a checkbox never submits.
 * - `v-model` is an array of values, `[]` after a clear; `v-model:selected`
 *   the array of their options, so a field shows its labels without its
 *   list. `name` goes to a hidden input per value, since the checkboxes are
 *   only there while the dialog is open. `required` asks for one at least.
 * - Not `server-search`: a list too long to load whole needs a page of its
 *   own.
 * - `create-option` is a button after the list. It emits `create` and
 *   nothing more: the parent creates the record, adds it to `options` and
 *   its value to `v-model`. Focus moves to the field, whose text stays, so
 *   the new option shows ticked.
 * - A disabled option is an `aria-disabled` checkbox: Tab, the arrow keys
 *   and a search reach it, but a click or Space does not tick or untick it,
 *   nor does the clear button. Not a native disabled checkbox, which Tab
 *   skips.
 */

defineOptions({ inheritAttrs: false });

const { t } = useI18n();

/** The selected option's value (`value-key`), `null` after a clear; with `multiple` an array of them, `[]` after a clear */
// The default keeps Vue from casting an absent value to `false`, which is a value here
const model = defineModel<
  M extends true
    ? ComboBoxValue[] | null | undefined
    : ComboBoxValue | null | undefined
>({ default: undefined as never });
/** The selected option itself, or with `multiple` the array of them: written on a pick, read to show the label */
const selected = defineModel<(M extends true ? T[] : T) | null>('selected');

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
  multiple,
  required,
  disabled,
  loading,
  serverSearch,
  createOption,
  showInvalid,
} = defineProps<{
  /** Names the field, the popup and the open button, and the clear button: "Clear <label>" */
  label: string;
  /** Objects, strings or numbers; or a function that answers them, asked on first touch */
  options: T[] | ComboBoxLoader<T>;
  /** A new key asks the options function again */
  optionsKey?: string | number;
  /** Selects several: `v-model` is an array, the popup a dialog of checkboxes. Read once */
  // A Boolean prop at runtime (`& boolean`), so absent is `false`; the rule sees only `M`
  // eslint-disable-next-line vue/require-default-prop
  multiple?: M & boolean;
  /** The options function searches, and may answer in pages; a value then needs `v-model:selected`. Not with `multiple` */
  serverSearch?: boolean;
  valueKey?: string;
  labelKey?: string;
  /** The field of an option object that disables it */
  disabledKey?: string;
  id?: string;
  /** Of the hidden input that holds the option's value; with `multiple` one per value */
  name?: string;
  placeholder?: string;
  /** The text of an empty list */
  noOptionsText?: string;
  /** With `multiple`, at least one option */
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

const isMultiple = !!multiple;

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

const optionsOfField = useComboBoxOptions<T>(
  {
    options: () => options,
    optionsKey: () => optionsKey,
    serverSearch: () => serverSearch && !isMultiple,
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
    needsList: (): boolean => mode.needsList,
    say,
    onListChange: () => mode.forgetHighlight(),
  },
);
const {
  valueOf,
  labelOf,
  isDisabled,
  listing,
  shown,
  isBusy,
  message,
  createLabel,
} = optionsOfField;
const { touch, loadForLabel, refreshOptions } = optionsOfField;

const field = useComboBoxField({
  root: rootRef,
  input: inputRef,
  popup: popupRef,
  isOpen,
  isEdited,
  id,
  disabled: () => disabled,
  required: () => required,
  instruction: () => instruction,
  customError: () => customError,
  showInvalid: () => showInvalid,
  describedby: () => attrs['aria-describedby'],
  errorText: () => errorText.value,
  isFilled: () => mode.hasValue,
  touch,
  settle: () => mode.settle(),
  onClose: () => mode.forgetHighlight(),
  selectsOnFocus: () => several?.selectsOnFocus() ?? true,
});
const {
  customErrorActive,
  errorShown,
  ariaDescribedby,
  onFocus,
  onMouseDown,
  onMouseUp,
  onClick,
  onOpenButton,
  onFocusOut,
  focusElement,
} = field;

const { insetStyle } = useComboBoxPopup({
  popup: popupRef,
  control: controlRef,
  input: inputRef,
  isOpen,
});

const modeContext = {
  text,
  isEdited,
  isOpen,
  query,
  input: inputRef,
  popup: popupRef,
  id,
  canClear: () => canClear,
  disabled: () => disabled,
  options: optionsOfField,
  field: () => field,
  emitCreate: (typed: string) => emit('create', typed),
};

// `M` decides the model's type, `multiple` the mode: the two agree, which a
// conditional type cannot show inside the component
const single = isMultiple
  ? undefined
  : reactive(
      useComboBoxSingle<T>({
        ...modeContext,
        model: model as Ref<ComboBoxValue | null | undefined>,
        selected: selected as Ref<T | null | undefined>,
        label: () => label,
        createOption: () => createOption,
        say,
      }),
    );
const several = isMultiple
  ? reactive(
      useComboBoxMultiple<T>({
        ...modeContext,
        model: model as Ref<ComboBoxValue[] | null | undefined>,
        selected: selected as Ref<T[] | null | undefined>,
      }),
    )
  : undefined;
const mode = (single ?? several)!;

const errorText = computed(() =>
  isMultiple
    ? t('form.checkbox-group-required')
    : t('form.missing-value', { item: label }),
);

text.value = mode.valueText;

watch(
  () => mode.valueText,
  (newText) => {
    if (!isEdited.value) text.value = newText;
  },
);

watch(() => mode.needsList, loadForLabel);
onMounted(loadForLabel);

if (import.meta.dev || import.meta.test) {
  const named = `[ComboBox] "${label}"`;

  watch(
    () => !!multiple,
    () =>
      console.warn(
        `${named}: multiple changed after the field was created, which keeps the mode it began in. Give it a new key to change the mode.`,
      ),
  );
  watchEffect(() => {
    const value = model.value as unknown;

    if (!isMultiple && Array.isArray(value)) {
      console.warn(`${named} has an array as its value: add multiple.`);
    }
    if (isMultiple && value !== null && value !== undefined) {
      if (!Array.isArray(value)) {
        console.warn(
          `${named} has multiple, but its value is not an array: give it [] or an array of values.`,
        );
      }
    }
  });
  if (isMultiple && serverSearch) {
    console.warn(
      `${named} has multiple and server-search: multiple loads the whole list and ignores server-search.`,
    );
  }
}

const chipSize = computed(() => (size === 'lg' ? 'sm' : 'xs'));

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
      isMultiple && 'is-multiple',
      mode.hasValue && 'has-value',
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
          data-1p-ignore
          :aria-autocomplete="single ? 'list' : undefined"
          :aria-haspopup="several ? 'dialog' : undefined"
          :placeholder="placeholder"
          :disabled="disabled"
          :autofocus="autofocus"
          :aria-required="required || undefined"
          :aria-expanded="mode.expanded"
          :aria-controls="mode.expanded ? mode.popupId : undefined"
          :aria-activedescendant="single?.activeDescendant"
          :aria-describedby="ariaDescribedby"
          :aria-invalid="errorShown || undefined"
          @focus="onFocus"
          @mousedown="onMouseDown"
          @mouseup="onMouseUp"
          @click="onClick"
          @input="mode.onInput"
          @keydown="mode.onKeydown"
        />

        <div class="combobox-buttons">
          <Icon
            v-if="isBusy"
            name="svg-spinners:90-ring-with-bg"
            class="combobox-spinner"
          />

          <button
            v-if="mode.showsClear"
            type="button"
            class="combobox-button combobox-clear"
            :aria-label="t('combobox.clear', { label })"
            @mousedown.prevent
            @click="mode.clear"
          >
            <Icon name="material-symbols:close-rounded" />
          </button>

          <button
            type="button"
            class="combobox-button combobox-open"
            tabindex="-1"
            :disabled="disabled"
            :aria-label="label"
            :aria-expanded="mode.expanded"
            :aria-controls="mode.expanded ? mode.popupId : undefined"
            @mousedown.prevent
            @click="onOpenButton"
          >
            <Icon name="material-symbols:keyboard-arrow-down-rounded" />
          </button>
        </div>
      </div>

      <template v-if="name">
        <input
          v-for="value in mode.hiddenValues"
          :key="String(value)"
          type="hidden"
          :name="name"
          :value="String(value)"
          :disabled="disabled"
        />
      </template>

      <div
        v-if="single"
        ref="popup"
        popover="manual"
        class="combobox-popup"
        @mousedown.prevent
      >
        <template v-if="isOpen">
          <p v-if="!shown.length" class="combobox-message">{{ message }}</p>

          <!-- tabindex: a scrolling element is in the Tab order by itself -->

          <ul
            v-if="single.itemCount"
            :id="single.popupId"
            role="listbox"
            class="combobox-list"
            tabindex="-1"
            :aria-label="label"
            :aria-busy="isBusy || undefined"
            @scroll.passive="single.onListScroll"
          >
            <li
              v-for="(option, index) in shown"
              :id="single.optionId(index)"
              :key="String(valueOf(option))"
              role="option"
              :class="[
                'combobox-option',
                index === single.activeIndex && 'is-highlighted',
                isDisabled(option) && 'is-disabled',
              ]"
              :aria-selected="single.isSelected(option)"
              :aria-disabled="isDisabled(option) || undefined"
              :aria-setsize="listing?.more ? -1 : undefined"
              :aria-posinset="listing?.more ? index + 1 : undefined"
              @click="single.pickUnlessDisabled(option)"
            >
              <span>{{ labelOf(option) }}</span>

              <Icon
                v-if="single.isSelected(option)"
                name="material-symbols:check-rounded"
              />
            </li>

            <li
              v-if="createLabel"
              :id="single.optionId(single.createIndex)"
              role="option"
              :class="[
                'combobox-option',
                'combobox-create',
                single.createIndex === single.activeIndex && 'is-highlighted',
              ]"
              aria-selected="false"
              @click="single.create"
            >
              <Icon name="material-symbols:add-rounded" />
              <span>{{ createLabel }}</span>
            </li>
          </ul>
        </template>
      </div>

      <div
        v-else-if="several"
        :id="several.popupId"
        ref="popup"
        popover="manual"
        role="dialog"
        class="combobox-popup"
        :aria-label="label"
        @mousedown.prevent
        @focusin="several.onPopupFocusIn"
        @click="several.onPopupClick"
        @keydown="several.onPopupKeydown"
      >
        <template v-if="isOpen">
          <p class="combobox-count">
            {{
              t('combobox.selected', { count: several.count }, several.count)
            }}
          </p>

          <!-- tabindex: a scrolling element is in the Tab order by itself -->
          <ul
            v-if="shown.length"
            class="combobox-list"
            tabindex="-1"
            :aria-busy="isBusy || undefined"
          >
            <li
              v-for="(option, index) in shown"
              :key="String(valueOf(option))"
              :class="['combobox-check', isDisabled(option) && 'is-disabled']"
            >
              <Checkbox
                :id="several.checkboxId(index)"
                :model-value="several.isTicked(option)"
                :label="labelOf(option)"
                :aria-disabled="isDisabled(option)"
                @update:model-value="several.toggle(option, !!$event)"
              />
            </li>
          </ul>

          <p v-else class="combobox-message">{{ message }}</p>

          <button
            v-if="createLabel"
            type="button"
            class="combobox-option combobox-create"
            @click="several.create"
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

<style>
.combobox {
  --combobox-button-size: 2rem;
  /* The buttons keep the same distance to the frame on every side */
  --combobox-button-inset: 0.25rem;

  .combobox-root {
    display: grid;
    min-inline-size: 0;
    anchor-scope: --combobox;
  }

  .combobox-control {
    position: relative;
    anchor-name: --combobox;
  }

  .combobox-control:has(.combobox-spinner) {
    --combobox-spinner-room: 1.5rem;
  }

  .input {
    padding-inline-end: calc(
      var(--combobox-button-size) + var(--combobox-button-inset) + 0.25rem +
        var(--combobox-spinner-room, 0rem)
    );
    text-overflow: ellipsis;
  }

  .combobox-control:has(.combobox-clear) .input {
    padding-inline-end: calc(
      2 * var(--combobox-button-size) + var(--combobox-button-inset) +
        0.375rem + var(--combobox-spinner-room, 0rem)
    );
  }

  .combobox-buttons {
    position: absolute;
    inset-block: 0;
    inset-inline-end: var(--combobox-button-inset);
    display: flex;
    align-items: center;
    gap: 0.125rem;
  }

  .combobox-button {
    display: grid;
    place-content: center;
    inline-size: var(--combobox-button-size);
    block-size: var(--combobox-button-size);
    padding: 0;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--color-text);
    background: none;
    cursor: pointer;
    transition-property: background-color;
    transition-duration: var(--duration-xs);

    &:not(:disabled):hover {
      background-color: var(--color-grey-bg);
    }

    &:disabled {
      cursor: default;
    }
  }

  .combobox-spinner {
    margin-inline-end: 0.25rem;
    color: var(--color-grey-text);
  }

  &.input-size--sm {
    --combobox-button-size: 1.5rem;
  }

  &.input-size--lg {
    --combobox-button-inset: 0.375rem;
  }
}

.combobox-popup {
  position-anchor: --combobox;
  position-area: block-end;
  /* Below while the whole list fits there, else above, else shortened to its room */
  position-try-fallbacks:
    --combobox-above, --combobox-fit-below, --combobox-fit-above;
  /* Both block insets set: with one left auto the list sticks to the other edge */
  inset-inline: auto;
  inset-block: 0 var(--combobox-inset-bottom, 0px);
  inline-size: anchor-size(width);
  max-block-size: 20rem;
  margin-block: 0.25rem;
  margin-inline: 0;
  padding: 0.25rem;
  overflow: hidden;
  border: 1px solid var(--color-grey-graphic);
  border-radius: var(--radius-md);
  color: var(--color-text);
  background-color: var(--color-card-bg);

  &:popover-open {
    display: flex;
    flex-direction: column;
  }

  /* The list scrolls, not the popup: it is the element the combobox controls */
  .combobox-list {
    min-block-size: 0;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    list-style: none;
  }

  .combobox-message {
    margin: 0;
    padding: 0.5rem 0.75rem;
    color: var(--color-grey-text);
  }

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

  /* With `multiple`: the create button after the list */
  button.combobox-create {
    flex: none;
    inline-size: 100%;
    border: none;
    background: none;
    font: inherit;
    font-weight: var(--font-weight-medium);
    text-align: start;

    &:focus-visible {
      outline: 2px solid var(--focus-color);
      outline-offset: -2px;
    }
  }

  .combobox-count {
    margin: 0;
    padding-block: 0.75rem 0.5rem;
    padding-inline: 0.75rem;
    color: var(--color-grey-text);
    font-size: var(--font-size-sm);
  }

  .combobox-check {
    border-radius: var(--radius-sm);
    margin-block-end: 0.25rem;

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
      margin-block: 0.5rem;
      margin-inline-start: 0.75rem;
    }

    label {
      flex: 1;
      max-width: none;
      margin-block-end: 0;
      padding-block: 0.5rem;
      padding-inline: 0.5rem;
      font-size: inherit;
      overflow-wrap: anywhere;
      cursor: pointer;
    }
  }
}

/* An icon is a mask over a background, which forced colors would paint as the page */
@media (forced-colors: active) {
  .combobox-button .iconify,
  .combobox-option .iconify {
    forced-color-adjust: none;
    background-color: CanvasText;
  }

  .combobox-button .iconify,
  button.combobox-create .iconify {
    background-color: ButtonText;
  }

  .combobox-button:disabled .iconify {
    background-color: GrayText;
  }
}

/* Not flip-block: that would move the keyboard's inset to the other side too */
@position-try --combobox-above {
  position-area: block-start;
  inset-block: var(--combobox-inset-top, 0px) 0;
}

/* A percentage is of the room without the inset, so the inset comes off too */
@position-try --combobox-fit-below {
  position-area: block-end;
  inset-block: 0 var(--combobox-inset-bottom, 0px);
  min-block-size: 8rem;
  max-block-size: min(
    calc(100% - 0.5rem - var(--combobox-inset-bottom, 0px)),
    20rem
  );
}

@position-try --combobox-fit-above {
  position-area: block-start;
  inset-block: var(--combobox-inset-top, 0px) 0;
  max-block-size: min(
    calc(100% - 0.5rem - var(--combobox-inset-top, 0px)),
    20rem
  );
}
</style>
