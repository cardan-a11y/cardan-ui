import type { Ref } from 'vue';

/**
 * ComboBox's selection and keyboard without `multiple`: one option as the
 * value, a listbox with `aria-activedescendant` for the highlight. The
 * names it shares with `useComboBoxMultiple()` do the same there.
 */
export function useComboBoxSingle<T>(context: {
  model: Ref<ComboBoxValue | null | undefined>;
  selected: Ref<T | null | undefined>;
  text: Ref<string>;
  isEdited: Ref<boolean>;
  isOpen: Readonly<Ref<boolean>>;
  query: Readonly<Ref<string>>;
  input: Readonly<Ref<HTMLInputElement | null>>;
  popup: Readonly<Ref<HTMLElement | null>>;
  id: string;
  label: () => string;
  canClear: () => boolean;
  disabled: () => boolean | undefined;
  createOption: () => boolean | undefined;
  options: ReturnType<typeof useComboBoxOptions<T>>;
  field: () => ReturnType<typeof useComboBoxField>;
  say: (text: () => string, delay?: number) => void;
  emitCreate: (text: string) => void;
}) {
  const { t } = useI18n();
  const { model, selected, text, isEdited, isOpen, query, input } = context;
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
    createLabel,
    loadMore,
    searchSoon,
    forgetSearch,
    sayResults,
  } = context.options;

  const highlighted = ref(-1);

  const hasValue = computed(
    () => model.value !== null && model.value !== undefined,
  );

  const selectedOption = computed(() => {
    if (!hasValue.value) return undefined;

    const given = selected.value;
    if (
      given !== null &&
      given !== undefined &&
      valueOf(given) === model.value
    ) {
      return given;
    }

    return allOptions.value.find((option) => valueOf(option) === model.value);
  });

  /** What the field shows while it is not edited: the option's label */
  const valueText = computed(() => {
    if (!hasValue.value) return '';
    if (selectedOption.value !== undefined)
      return labelOf(selectedOption.value);

    return hasWholeList.value ? t('combobox.unknown-option') : '';
  });

  const needsList = computed<boolean>(
    () =>
      hasValue.value &&
      selectedOption.value === undefined &&
      isLoader.value &&
      !isServerSearch.value,
  );

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

  if (import.meta.dev || import.meta.test) {
    watchEffect(() => {
      if (
        isServerSearch.value &&
        hasValue.value &&
        selectedOption.value === undefined
      ) {
        console.warn(
          `[ComboBox] "${context.label()}" has a value and server-search, but no v-model:selected with its option: it cannot show the label.`,
        );
      }
      if (context.createOption() && isServerSearch.value) {
        console.warn(
          `[ComboBox] "${context.label()}" has create-option and server-search: the create option needs the whole list, so it never shows.`,
        );
      }
    });
  }

  onMounted(giveSelected);

  const createIndex = computed(() =>
    createLabel.value ? shown.value.length : -1,
  );
  const itemCount = computed(
    () => shown.value.length + (createLabel.value ? 1 : 0),
  );
  /** The popup holds a listbox: what `aria-expanded` says */
  const expanded = computed(() => isOpen.value && itemCount.value > 0);
  const activeIndex = computed(() =>
    expanded.value && highlighted.value < itemCount.value
      ? highlighted.value
      : -1,
  );

  const popupId = `${context.id}-listbox`;
  const optionId = (index: number) => `${context.id}-option-${index}`;

  const activeDescendant = computed(() =>
    activeIndex.value === -1 ? undefined : optionId(activeIndex.value),
  );

  function isSelected(option: T) {
    return hasValue.value && valueOf(option) === model.value;
  }

  /** The list changed or closed: nothing is highlighted */
  function forgetHighlight() {
    highlighted.value = -1;
  }

  function endEdit() {
    isEdited.value = false;
    forgetSearch();
  }

  function move(step: 1 | -1) {
    const count = itemCount.value;
    if (!count) return;

    if (activeIndex.value === -1) {
      const atValue = isEdited.value ? -1 : shown.value.findIndex(isSelected);

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

  function setValue(option: T | null) {
    selected.value = option;
    model.value = option === null ? null : valueOf(option);
    context.field().clearCustomError();
    context.field().applyValidity(option !== null);
  }

  function pick(option: T) {
    if (!isSelected(option)) setValue(option);

    text.value = labelOf(option);
    endEdit();
    context.field().close();
    nextTick(() => {
      if (document.activeElement === input.value) input.value?.select();
    });
  }

  function pickUnlessDisabled(option: T) {
    if (!isDisabled(option)) pick(option);
  }

  const showsClear = computed(
    () =>
      context.canClear() &&
      !context.disabled() &&
      (hasValue.value || !!text.value),
  );

  function clear() {
    if (hasValue.value) setValue(null);

    text.value = '';
    endEdit();
    context.field().close();
    input.value?.focus();
  }

  function create() {
    const typed = query.value;

    endEdit();
    context.field().close();
    context.emitCreate(typed);
  }

  function settle() {
    const wasBusy = isEdited.value || isOpen.value;
    const isEmptied = isEdited.value && text.value.trim() === '';

    if (isEmptied && hasValue.value && context.canClear()) {
      setValue(null);
      text.value = '';
      context.say(() => t('combobox.cleared'));
    } else {
      text.value = valueText.value;
    }

    endEdit();
    context.field().close();

    return wasBusy;
  }

  /** The values the hidden inputs hold for `name` */
  const hiddenValues = computed(() =>
    hasValue.value ? [model.value as ComboBoxValue] : [],
  );

  function onInput(event: Event) {
    text.value = (event.target as HTMLInputElement).value;
    isEdited.value = true;
    highlighted.value = -1;
    context.field().open();

    if (isServerSearch.value) searchSoon();
    if (!isServerSearch.value || !query.value) sayResults(600);
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.isComposing) return;

    const { open, close } = context.field();

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
        text.value = valueText.value;
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

  function fillList() {
    const list = context.popup.value?.querySelector('[role="listbox"]');

    if (
      list &&
      list.clientHeight > 0 &&
      list.scrollHeight <= list.clientHeight
    ) {
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

  return {
    hasValue,
    valueText,
    needsList,
    expanded,
    popupId,
    hiddenValues,
    showsClear,
    settle,
    clear,
    create,
    forgetHighlight,
    onInput,
    onKeydown,
    activeIndex,
    activeDescendant,
    createIndex,
    itemCount,
    optionId,
    isSelected,
    pickUnlessDisabled,
    onListScroll,
  };
}
