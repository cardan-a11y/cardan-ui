import type { Ref } from 'vue';

/**
 * ComboBox's selection and keyboard with `multiple`: an array of values,
 * ticked as checkboxes in a dialog that focus moves into. The names it
 * shares with `useComboBoxSingle()` do the same there.
 */
export function useComboBoxMultiple<T>(context: {
  model: Ref<ComboBoxValue[] | null | undefined>;
  selected: Ref<T[] | null | undefined>;
  text: Ref<string>;
  isEdited: Ref<boolean>;
  isOpen: Readonly<Ref<boolean>>;
  query: Readonly<Ref<string>>;
  input: Readonly<Ref<HTMLInputElement | null>>;
  popup: Readonly<Ref<HTMLElement | null>>;
  id: string;
  canClear: () => boolean;
  disabled: () => boolean | undefined;
  options: ReturnType<typeof useComboBoxOptions<T>>;
  field: () => ReturnType<typeof useComboBoxField>;
  emitCreate: (text: string) => void;
}) {
  const { t } = useI18n();
  const { model, selected, text, isEdited, isOpen, query, input } = context;
  const {
    valueOf,
    labelOf,
    isDisabled,
    isLoader,
    allOptions,
    hasWholeList,
    forgetSearch,
    sayResults,
  } = context.options;

  // A value that is not an array is a mistake ComboBox warns about: no selection
  const values = computed(() =>
    Array.isArray(model.value) ? model.value : [],
  );
  const count = computed(() => values.value.length);
  const hasValue = computed(() => count.value > 0);

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

  /** What the field shows while it is not edited: one label, or "3 selected" */
  const valueText = computed(() => {
    if (count.value > 1) {
      return t('combobox.selected', { count: count.value }, count.value);
    }
    if (count.value === 0) return '';

    const option = selectedOptions.value[0];
    if (option !== undefined) return labelOf(option);

    return hasWholeList.value ? t('combobox.unknown-option') : '';
  });

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
  onMounted(giveSelected);

  /** The dialog is open: what `aria-expanded` says */
  const expanded = computed(() => isOpen.value);
  const popupId = `${context.id}-dialog`;
  const checkboxId = (index: number) => `${context.id}-option-${index}`;

  function isTicked(option: T) {
    return values.value.includes(valueOf(option));
  }

  function endEdit() {
    isEdited.value = false;
    forgetSearch();
  }

  function setValues(newValues: ComboBoxValue[], newOptions: T[]) {
    selected.value = newOptions;
    model.value = newValues;
    context.field().clearCustomError();
    context.field().applyValidity(newValues.length > 0);
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

  const showsClear = computed(
    () =>
      context.canClear() &&
      !context.disabled() &&
      (count.value > keptOnClear.value.length ||
        (isEdited.value && !!text.value)),
  );

  function clear() {
    if (count.value > keptOnClear.value.length) {
      setValues(keptOnClear.value.map(valueOf), keptOnClear.value);
    }

    text.value = '';
    endEdit();
    context.field().close();
    input.value?.focus();
  }

  /** Puts the selection back in the field and closes the dialog */
  function settle() {
    const wasBusy = isEdited.value || isOpen.value;

    text.value = valueText.value;
    endEdit();
    context.field().close();

    return wasBusy;
  }

  function returnToField() {
    settle();
    input.value?.focus();
    input.value?.select();
  }

  function create() {
    const typed = query.value;

    input.value?.focus();
    context.emitCreate(typed);
  }

  /** The values the hidden inputs hold for `name`, one each */
  const hiddenValues = values;

  function onInput(event: Event) {
    text.value = (event.target as HTMLInputElement).value;
    isEdited.value = true;
    context.field().open();
    sayResults(600);
  }

  /** The checkboxes and the create button, in order */
  function stops() {
    return [
      ...(context.popup.value?.querySelectorAll<HTMLElement>(
        'input[type="checkbox"], .combobox-create',
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
          context.field().close();
          return;
        }

        context.field().open();
        if (!event.altKey) {
          void focusStop(event.key === 'ArrowDown' ? 'first' : 'last');
        }
        break;
      case 'Enter':
        if (!isOpen.value) return;

        event.preventDefault();
        returnToField();
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
        if (index <= 0) input.value?.focus();
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

  /** Where focus was when a press in the popup began */
  let focusBeforePress: HTMLElement | null = null;
  let isRestoringFocus = false;

  function onDocumentPress(event: PointerEvent) {
    focusBeforePress = context.popup.value?.contains(event.target as Node)
      ? (document.activeElement as HTMLElement | null)
      : null;
  }

  onMounted(() =>
    document.addEventListener('pointerdown', onDocumentPress, true),
  );
  onBeforeUnmount(() =>
    document.removeEventListener('pointerdown', onDocumentPress, true),
  );

  // A click on an option's label focuses its checkbox: the press keeps focus
  // where it was, so a pointer user goes on typing
  function onPopupFocusIn(event: FocusEvent) {
    if (focusBeforePress && event.target !== focusBeforePress) {
      isRestoringFocus = true;
      focusBeforePress.focus({ preventScroll: true });
      isRestoringFocus = false;
    }
  }

  function onPopupClick() {
    setTimeout(() => (focusBeforePress = null));
  }

  /** Focus that comes back after a press keeps the search as it is */
  function selectsOnFocus() {
    return !isRestoringFocus;
  }

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
    forgetHighlight: () => {},
    onInput,
    onKeydown,
    count,
    checkboxId,
    isTicked,
    toggle,
    onPopupKeydown,
    onPopupFocusIn,
    onPopupClick,
    selectsOnFocus,
  };
}
