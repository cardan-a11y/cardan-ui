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
 *   outside does. Tab and Shift + Tab pick a highlighted option first.
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
 * label without its list. The wrapper has the class `has-value` while there
 * is a value.
 *
 * With `server-search` the function does the search, for a list too long to
 * load whole: `options(query, { signal, page })` is asked after a pause in
 * typing, the request that typing overtook is aborted, and its answer for
 * an empty query is the list on open. It may answer one page,
 * `{ options, more }`: the next one is asked when the highlight or the
 * scroll reaches the end, and Down Arrow on the last loaded option then
 * loads and does not wrap. The label cannot come from such a list, so a
 * value needs `v-model:selected`.
 */

defineOptions({ inheritAttrs: false });

type Value = string | number | boolean;
type Answer = T[] | { options: T[]; more?: boolean };
type Loader = (
  query: string,
  context: { signal: AbortSignal; page: number },
) => Answer | Promise<Answer>;

/** One answer of the options function, with the pages that followed it */
interface Listing {
  query: string;
  options: T[];
  more: boolean;
  page: number;
}

/** The pause in typing before `server-search` asks, in milliseconds */
const SEARCH_PAUSE = 300;

const { t } = useI18n();

/** The selected option's value (`value-key`); `null` after a clear */
// The default keeps Vue from casting an absent value to `false`, which is a value here
const model = defineModel<Value | null | undefined>({ default: undefined });
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
  size = 'md',
  canClear = true,
  id = useId(),
  required,
  disabled,
  loading,
  serverSearch,
  showInvalid,
} = defineProps<{
  /** Names the field, the listbox and the open button, and the clear button: "Clear <label>" */
  label: string;
  /** Objects, strings or numbers; or a function that answers them, asked on first touch */
  options: T[] | Loader;
  /** A new key asks the options function again */
  optionsKey?: string | number;
  /** The options function searches, and may answer in pages; a value then needs `v-model:selected` */
  serverSearch?: boolean;
  valueKey?: string;
  labelKey?: string;
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

function isRecord(option: unknown): option is Record<string, unknown> {
  return typeof option === 'object' && option !== null;
}

function valueOf(option: T) {
  return (isRecord(option) ? option[valueKey] : option) as Value;
}

function labelOf(option: T) {
  return String(isRecord(option) ? (option[labelKey] ?? '') : option);
}

/** Without case and diacritics: "e" finds "é" */
function fold(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** The list on open: the answer to an empty query */
const loaded = shallowRef<Listing>();
const loadState = ref<'idle' | 'loading' | 'loaded' | 'failed'>('idle');
/** With `server-search`: the answer to the text in the field */
const found = shallowRef<Listing>();
const searchState = ref<'idle' | 'loading' | 'failed'>('idle');
const isLoadingMore = ref(false);

let request: AbortController | undefined;
let searchRequest: AbortController | undefined;
let moreRequest: AbortController | undefined;
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const isLoader = computed(() => typeof options === 'function');
const isServerSearch = computed(() => !!serverSearch && isLoader.value);
const allOptions = computed(() =>
  Array.isArray(options) ? options : (loaded.value?.options ?? []),
);
/** The whole list is here, so a value without an option has none */
const isKnown = computed(
  () =>
    !loading &&
    (isLoader.value
      ? loadState.value === 'loaded' && !isServerSearch.value
      : true),
);

async function ask(
  query: string,
  page: number,
  signal: AbortSignal,
): Promise<Listing> {
  const answer = await (options as Loader)(query, { signal, page });
  const isList = Array.isArray(answer);

  return {
    query,
    page,
    options: isList ? answer : answer.options,
    // A list that is filtered in the browser has to be whole
    more: !isList && !!answer.more && isServerSearch.value,
  };
}

async function load() {
  if (!isLoader.value || loadState.value === 'loading') return;

  const controller = new AbortController();
  request = controller;
  loadState.value = 'loading';

  try {
    const listing = await ask('', 1, controller.signal);
    if (request !== controller) return;

    loaded.value = listing;
    loadState.value = 'loaded';
  } catch {
    if (request !== controller) return;

    loadState.value = 'failed';
  }

  highlighted.value = -1;
}

/** The first touch asks; later ones only after a failure or an empty answer */
function touch() {
  if (disabled || !isLoader.value || loadState.value === 'loading') return;

  if (loadState.value !== 'loaded' || !loaded.value?.options.length) {
    void load();
  }
}

function stopLoadingMore() {
  moreRequest?.abort();
  moreRequest = undefined;
  isLoadingMore.value = false;
}

function forgetSearch() {
  clearTimeout(searchTimer);
  searchRequest?.abort();
  searchRequest = undefined;
  stopLoadingMore();
  found.value = undefined;
  searchState.value = 'idle';
}

/** After a pause in typing; the request that typing overtook is aborted */
function searchSoon() {
  const query = text.value.trim();

  forgetSearchRequest();
  if (!query) {
    found.value = undefined;
    searchState.value = 'idle';
    return;
  }

  // The results of the search before stay in the list meanwhile
  searchState.value = 'loading';
  searchTimer = setTimeout(() => void search(query), SEARCH_PAUSE);
}

function forgetSearchRequest() {
  clearTimeout(searchTimer);
  searchRequest?.abort();
  searchRequest = undefined;
  stopLoadingMore();
}

async function search(query: string) {
  const controller = new AbortController();
  searchRequest = controller;

  try {
    const listing = await ask(query, 1, controller.signal);
    if (searchRequest !== controller) return;

    stopLoadingMore();
    found.value = listing;
    searchState.value = 'idle';
  } catch {
    if (searchRequest !== controller) return;

    stopLoadingMore();
    found.value = { query, page: 1, options: [], more: false };
    searchState.value = 'failed';
  }

  // Enter never picks an option of the search before
  highlighted.value = -1;
  if (isOpen.value) sayResults(0);
}

/** The next page of the list that shows, one request at a time */
async function loadMore() {
  const current = listing.value;
  // Not while a search is under way: the list that shows is the one before
  if (
    !current?.more ||
    isLoadingMore.value ||
    searchState.value === 'loading'
  ) {
    return;
  }

  const controller = new AbortController();
  moreRequest = controller;
  isLoadingMore.value = true;

  try {
    const next = await ask(current.query, current.page + 1, controller.signal);
    if (moreRequest !== controller) return;

    const longer = {
      ...next,
      options: [...current.options, ...next.options],
      // A page without options would be asked for again and again
      more: next.more && next.options.length > 0,
    };
    // Only the list it started from takes the page
    if (current === found.value) found.value = longer;
    else if (current === loaded.value) loaded.value = longer;

    if (isOpen.value) say(() => t('combobox.more-loaded'));
  } catch {
    if (moreRequest !== controller) return;

    if (isOpen.value) say(() => t('combobox.more-failed'));
  }

  isLoadingMore.value = false;
}

function forgetOptions() {
  request?.abort();
  request = undefined;
  forgetSearch();
  loaded.value = undefined;
  loadState.value = 'idle';
}

/** Asks the options function again, now */
async function refreshOptions() {
  forgetOptions();
  resumeSearch();
  await load();
}

/** A search the user has typed is asked again once the options are forgotten */
function resumeSearch() {
  if (isServerSearch.value && query.value) searchSoon();
}

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

  return isKnown.value ? t('combobox.unknown-option') : '';
});

/** A value without its option, which only the whole list can give */
const needsList = computed(
  () =>
    hasValue.value &&
    selectedOption.value === undefined &&
    isLoader.value &&
    !isServerSearch.value,
);

const text = ref(valueLabel.value);
/** The user edited the text since focus or a pick: the list filters on it */
const isEdited = ref(false);

function endEdit() {
  isEdited.value = false;
  forgetSearch();
}

watch(valueLabel, (newLabel) => {
  if (!isEdited.value) text.value = newLabel;
});

function loadForLabel() {
  if (needsList.value && loadState.value === 'idle') void load();
}

function reloadOptions() {
  forgetOptions();
  resumeSearch();

  if (isOpen.value) void load();
  else loadForLabel();
}

watch(() => optionsKey, reloadOptions);
watch(isLoader, reloadOptions);
watch(isServerSearch, reloadOptions);
watch(needsList, loadForLabel);

// An option found in the list is handed to `v-model:selected`
watch(selectedOption, giveSelected);

function giveSelected() {
  const option = selectedOption.value;
  if (option !== undefined && option !== selected.value) {
    selected.value = option;
  }
}

// A value the parent emptied takes its option along
watch(hasValue, (valueIsThere) => {
  if (
    !valueIsThere &&
    selected.value !== null &&
    selected.value !== undefined
  ) {
    selected.value = null;
  }
});

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
  });
}

onMounted(() => {
  loadForLabel();
  giveSelected();
});

const isOpen = ref(false);
const highlighted = ref(-1);

const query = computed(() => (isEdited.value ? text.value.trim() : ''));

/** The answer that shows, which may have more pages */
const listing = computed(() =>
  isServerSearch.value && query.value ? found.value : loaded.value,
);

const shown = computed(() => {
  if (isServerSearch.value) {
    // Until the first answer of a search, the list before stays
    return (query.value && found.value?.options) || allOptions.value;
  }

  const folded = fold(query.value);

  return folded
    ? allOptions.value.filter((option) =>
        fold(labelOf(option)).includes(folded),
      )
    : allOptions.value;
});

const isBusy = computed(
  () =>
    loading ||
    loadState.value === 'loading' ||
    searchState.value === 'loading' ||
    isLoadingMore.value,
);

/** The text in the popup when there is no option to show */
const message = computed(() => {
  if (shown.value.length) return undefined;
  if (
    loading ||
    loadState.value === 'loading' ||
    searchState.value === 'loading'
  ) {
    return t('combobox.loading');
  }
  if (isServerSearch.value && query.value) {
    return searchState.value === 'failed'
      ? t('combobox.search-failed')
      : t('combobox.no-results');
  }
  if (loadState.value === 'failed') return t('combobox.failed');
  if (!allOptions.value.length) {
    return noOptionsText ?? t('combobox.no-options');
  }
  return t('combobox.no-results');
});

/** A listbox without options is invalid, so the popup may be open without one */
const hasList = computed(() => isOpen.value && shown.value.length > 0);
const activeIndex = computed(() =>
  hasList.value && highlighted.value < shown.value.length
    ? highlighted.value
    : -1,
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
  const count = shown.value.length;
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
    activeIndex.value === count - 1 &&
    listing.value?.more
  ) {
    // With more pages the last loaded option does not wrap to the first
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

const status = ref('');
let statusTimer: ReturnType<typeof setTimeout> | undefined;

function say(statusText: () => string, delay = 0) {
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    status.value = statusText();
    statusTimer = setTimeout(() => (status.value = ''), 3000);
  }, delay);
}

/** After a pause in typing: the text of the popup, or the number of results */
function sayResults(delay: number) {
  say(
    () =>
      message.value ??
      t('combobox.results', { count: shown.value.length }, shown.value.length),
    delay,
  );
}

watch([isOpen, message], ([nowOpen, newMessage]) => {
  if (nowOpen && newMessage && !isEdited.value) say(() => newMessage);
});

// An answer that arrives after the pause in typing is said too; a search
// on the server says its own
watch(
  [loadState, () => loading],
  ([, nowLoading], [stateBefore, wasLoading]) => {
    const arrived =
      (stateBefore === 'loading' && loadState.value !== 'loading') ||
      (wasLoading && !nowLoading);
    const isSearching = isServerSearch.value && !!query.value;

    if (arrived && isOpen.value && isEdited.value && !isSearching)
      sayResults(0);
  },
);

onBeforeUnmount(() => clearTimeout(statusTimer));

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
  // The option first, so a watcher on the value reads the new one
  selected.value = option;
  model.value = option === null ? null : valueOf(option);
  clearCustomError();
  applyValidity(option !== null);
}

function pick(option: T) {
  if (!hasValue.value || valueOf(option) !== model.value) setValue(option);

  // Not read back from the model: the parent's update arrives a tick later
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

/**
 * What leaving does, and a submit: the field shows its value again, and a
 * field the user emptied clears it. Returns whether anything changed.
 */
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
  // A search on the server says its results when they arrive
  if (!isServerSearch.value || !query.value) sayResults(600);
}

function onKeydown(event: KeyboardEvent) {
  // An input method composing a character keeps its keys
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
      if (option !== undefined) pick(option);
      else close();
      break;
    }
    case 'Escape':
      if (!isOpen.value) return;

      // Only the popup closes: a Dialog or Popover around it stays open
      event.preventDefault();
      event.stopPropagation();
      text.value = valueLabel.value;
      endEdit();
      close();
      break;
    case 'Tab': {
      // The list closes also when focus goes to the clear button
      const option = shown.value[activeIndex.value];
      if (option !== undefined) pick(option);
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
  // Another window took focus: nothing closes
  if (!next && !document.hasFocus()) return;

  // A press on the list's scrollbar takes focus in Firefox (148): until it
  // no longer does, focus goes back
  if (isPressInPopup) {
    inputRef.value?.focus();
    return;
  }

  settle();
}

/** A press that moves focus nowhere (an empty part of the page) settles too */
function onDocumentPress(event: PointerEvent) {
  const target = event.target as Node;

  isPressInPopup = !!popupRef.value?.contains(target);

  // The field's own label is part of it: a press there keeps the search
  const field = rootRef.value?.closest('.form-field-wrapper') ?? rootRef.value;

  if (!field?.contains(target) && (isOpen.value || isEdited.value)) settle();
}

function onDocumentPressEnd() {
  isPressInPopup = false;
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPress, true);
  document.addEventListener('pointerup', onDocumentPressEnd, true);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPress, true);
  document.removeEventListener('pointerup', onDocumentPressEnd, true);
  untrackViewport();
  forgetOptions();
});

/** What the visual viewport leaves out of the layout viewport: the phone's keyboard */
const insets = ref<{ top: number; bottom: number }>();

/**
 * The part the visual viewport leaves out becomes an inset of the list's
 * room, until iOS makes the layout viewport smaller for its keyboard.
 */
function trackViewport() {
  const viewport = window.visualViewport;

  if (!viewport || Math.abs(viewport.scale - 1) > 0.01) {
    insets.value = undefined;
    return;
  }

  const visibleEnd = viewport.offsetTop + viewport.height;
  const top = Math.max(0, Math.round(viewport.offsetTop));
  const bottom = Math.max(
    0,
    Math.round(document.documentElement.clientHeight - visibleEnd),
  );

  insets.value = top || bottom ? { top, bottom } : undefined;

  clearTimeout(revealTimer);
  if (insets.value) revealTimer = setTimeout(revealField, 250);
}

let revealTimer: ReturnType<typeof setTimeout> | undefined;

// Until iOS always brings a focused field above its keyboard: one still out
// of view once the keyboard has settled is centred there, as iOS does
function revealField() {
  const viewport = window.visualViewport;
  const control = controlRef.value;

  if (!viewport || !control || document.activeElement !== inputRef.value) {
    return;
  }

  // Client coordinates start at the layout viewport, or on iOS at what is
  // visible: an element fixed at the top tells which
  const probe = document.createElement('div');
  probe.style.cssText =
    'position: fixed; inset: 0 auto auto 0; visibility: hidden';
  document.body.append(probe);
  const visibleTop = probe.getBoundingClientRect().top + viewport.offsetTop;
  probe.remove();

  const box = control.getBoundingClientRect();
  if (box.top >= visibleTop && box.bottom <= visibleTop + viewport.height) {
    return;
  }

  scrollerOf(control)?.scrollBy(
    0,
    box.top - visibleTop - (viewport.height - box.height) / 2,
  );
}

/** What scrolls the field: a container of its own, the window, or nothing (in a Dialog) */
function scrollerOf(element: Element) {
  for (
    let parent = element.parentElement;
    parent && parent !== document.body;
    parent = parent.parentElement
  ) {
    const style = getComputedStyle(parent);

    if (
      /auto|scroll/.test(style.overflowY) &&
      parent.scrollHeight > parent.clientHeight
    ) {
      return parent;
    }
    if (style.position === 'fixed') return undefined;
  }

  return window;
}

function untrackViewport() {
  clearTimeout(revealTimer);
  window.visualViewport?.removeEventListener('resize', trackViewport);
  window.visualViewport?.removeEventListener('scroll', trackViewport);
  insets.value = undefined;
}

watch(
  isOpen,
  (nowOpen) => {
    const popup = popupRef.value;
    if (!popup) return;

    if (nowOpen) {
      if (!popup.matches(':popover-open')) popup.showPopover?.();
      window.visualViewport?.addEventListener('resize', trackViewport);
      window.visualViewport?.addEventListener('scroll', trackViewport);
      trackViewport();
    } else {
      if (popup.matches(':popover-open')) popup.hidePopover?.();
      untrackViewport();
    }
  },
  { flush: 'post' },
);

/** A page that does not fill the list leaves a pointer nothing to scroll */
function fillList() {
  const list = popupRef.value?.querySelector('[role="listbox"]');

  if (list && list.clientHeight > 0 && list.scrollHeight <= list.clientHeight) {
    void loadMore();
  }
}

// Both after the watcher that shows the popup: a hidden list has no size
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
      :style="
        insets && {
          '--combobox-inset-top': `${insets.top}px`,
          '--combobox-inset-bottom': `${insets.bottom}px`,
        }
      "
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
          <!-- tabindex: a scrolling element is in the Tab order by itself -->
          <ul
            v-if="shown.length"
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
              ]"
              :aria-selected="hasValue && valueOf(option) === model"
              :aria-setsize="listing?.more ? -1 : undefined"
              :aria-posinset="listing?.more ? index + 1 : undefined"
              @click="pick(option)"
            >
              <span>{{ labelOf(option) }}</span>

              <Icon
                v-if="hasValue && valueOf(option) === model"
                name="material-symbols:check-rounded"
              />
            </li>
          </ul>

          <p v-else class="combobox-message">{{ message }}</p>
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

  /* The listbox scrolls, not the popup: it is the element the combobox controls */
  .combobox-list {
    min-block-size: 0;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    list-style: none;
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
  }

  .combobox-message {
    margin: 0;
    padding: 0.5rem 0.75rem;
    color: var(--color-grey-text);
  }
}

/* An icon is a mask over a background, which forced colors would paint as the page */
@media (forced-colors: active) {
  .combobox-option .iconify {
    forced-color-adjust: none;
    background-color: CanvasText;
  }

  .combobox-button .iconify {
    forced-color-adjust: none;
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
