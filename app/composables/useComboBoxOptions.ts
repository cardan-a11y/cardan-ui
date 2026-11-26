interface Listing<T> {
  query: string;
  options: T[];
  more: boolean;
  page: number;
}

const SEARCH_PAUSE_MS = 300;

/** Case and diacritics folded away, for a filter that ignores both */
function foldCaseAndDiacritics(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * The options of ComboBox and MultiComboBox: an array, or a function asked
 * when the field is first touched (or at once when `needsList`) and again
 * only after a failure or an empty answer, a new `optionsKey` or
 * `refreshOptions()`. With `serverSearch` the function searches after a
 * pause in typing and may answer in pages; without it the options are
 * filtered here. `message` is the popup's text while there are no options to
 * show, and the status element says the results through `say`.
 *
 * With `createOption`, `createLabel` is the text of the option that creates
 * one from the typed text: only while the whole list is there and no label
 * is that text, ignoring case and the spaces around it but not diacritics
 * ("Andre" next to "André" is offered, and the server refuses a name it
 * counts as the same).
 */
export function useComboBoxOptions<T>(
  source: {
    options: () => T[] | ComboBoxLoader<T>;
    optionsKey: () => unknown;
    serverSearch?: () => boolean | undefined;
    valueKey: () => string;
    labelKey: () => string;
    /** The field of an option object that disables it */
    disabledKey?: () => string;
    noOptionsText: () => string | undefined;
    disabled: () => boolean | undefined;
    loading: () => boolean | undefined;
    createOption?: () => boolean | undefined;
    /** The create option's text for the typed text; "Create “…”" by default */
    createText?: () => ((text: string) => string) | undefined;
  },
  field: {
    /** The text to filter on, trimmed: empty until the user edited it */
    query: () => string;
    isEdited: () => boolean;
    isOpen: () => boolean;
    /**
     * A value has no option yet, so a function's list is asked at once: the
     * component calls `loadForLabel()` on mount and when this changes
     */
    needsList: () => boolean;
    say: (text: () => string, delay?: number) => void;
    /** The options shown were replaced */
    onListChange: () => void;
  },
) {
  const { t } = useI18n();

  function isRecord(option: unknown): option is Record<string, unknown> {
    return typeof option === 'object' && option !== null;
  }

  function valueOf(option: T) {
    return (
      isRecord(option) ? option[source.valueKey()] : option
    ) as ComboBoxValue;
  }

  function labelOf(option: T) {
    return String(
      isRecord(option) ? (option[source.labelKey()] ?? '') : option,
    );
  }

  function isDisabled(option: T) {
    return isRecord(option) && !!option[source.disabledKey?.() ?? 'disabled'];
  }

  const loaded = shallowRef<Listing<T>>();
  const loadState = ref<'idle' | 'loading' | 'loaded' | 'failed'>('idle');
  const found = shallowRef<Listing<T>>();
  const searchState = ref<'idle' | 'loading' | 'failed'>('idle');
  const isLoadingMore = ref(false);

  let request: AbortController | undefined;
  let searchRequest: AbortController | undefined;
  let moreRequest: AbortController | undefined;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  const isLoader = computed(() => typeof source.options() === 'function');
  const isServerSearch = computed(
    () => !!source.serverSearch?.() && isLoader.value,
  );
  const allOptions = computed(() => {
    const options = source.options();

    return Array.isArray(options) ? options : (loaded.value?.options ?? []);
  });
  const hasWholeList = computed(
    () =>
      !source.loading() &&
      (isLoader.value
        ? loadState.value === 'loaded' && !isServerSearch.value
        : true),
  );

  async function ask(
    query: string,
    page: number,
    signal: AbortSignal,
  ): Promise<Listing<T>> {
    const loader = source.options() as ComboBoxLoader<T>;
    const answer = await loader(query, { signal, page });
    const isList = Array.isArray(answer);

    return {
      query,
      page,
      options: isList ? answer : answer.options,
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

    field.onListChange();
  }

  /** The field is touched: a function is asked for a list it has not got */
  function touch() {
    if (source.disabled() || !isLoader.value || loadState.value === 'loading') {
      return;
    }

    if (loadState.value !== 'loaded' || !loaded.value?.options.length) {
      void load();
    }
  }

  function stopLoadingMore() {
    moreRequest?.abort();
    moreRequest = undefined;
    isLoadingMore.value = false;
  }

  function forgetSearchRequest() {
    clearTimeout(searchTimer);
    searchRequest?.abort();
    searchRequest = undefined;
    stopLoadingMore();
  }

  function forgetSearch() {
    forgetSearchRequest();
    found.value = undefined;
    searchState.value = 'idle';
  }

  /** With `serverSearch`: asks for the query after a pause in typing */
  function searchSoon() {
    const query = field.query();

    forgetSearchRequest();
    if (!query) {
      found.value = undefined;
      searchState.value = 'idle';
      return;
    }

    searchState.value = 'loading';
    searchTimer = setTimeout(() => void search(query), SEARCH_PAUSE_MS);
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

    field.onListChange();
    if (field.isOpen()) sayResults(0);
  }

  const listing = computed(() =>
    isServerSearch.value && field.query() ? found.value : loaded.value,
  );

  async function loadMore() {
    const current = listing.value;
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
      const next = await ask(
        current.query,
        current.page + 1,
        controller.signal,
      );
      if (moreRequest !== controller) return;

      const longer = {
        ...next,
        options: [...current.options, ...next.options],
        more: next.more && next.options.length > 0,
      };
      if (current === found.value) found.value = longer;
      else if (current === loaded.value) loaded.value = longer;

      if (field.isOpen()) field.say(() => t('combobox.more-loaded'));
    } catch {
      if (moreRequest !== controller) return;

      if (field.isOpen()) field.say(() => t('combobox.more-failed'));
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

  function resumeSearch() {
    if (isServerSearch.value && field.query()) searchSoon();
  }

  /** Asks the options function again, now */
  async function refreshOptions() {
    forgetOptions();
    resumeSearch();
    await load();
  }

  function loadForLabel() {
    if (field.needsList() && loadState.value === 'idle') void load();
  }

  function reloadOptions() {
    forgetOptions();
    resumeSearch();

    if (field.isOpen()) void load();
    else loadForLabel();
  }

  watch(source.optionsKey, reloadOptions);
  watch(isLoader, reloadOptions);
  watch(isServerSearch, reloadOptions);

  onBeforeUnmount(forgetOptions);

  const shown = computed(() => {
    const query = field.query();

    if (isServerSearch.value) {
      return (query && found.value?.options) || allOptions.value;
    }

    const folded = foldCaseAndDiacritics(query);

    return folded
      ? allOptions.value.filter((option) =>
          foldCaseAndDiacritics(labelOf(option)).includes(folded),
        )
      : allOptions.value;
  });

  const isBusy = computed(
    () =>
      !!source.loading() ||
      loadState.value === 'loading' ||
      searchState.value === 'loading' ||
      isLoadingMore.value,
  );

  /** The popup's text while it has no options to show */
  const message = computed(() => {
    if (shown.value.length) return undefined;
    if (
      source.loading() ||
      loadState.value === 'loading' ||
      searchState.value === 'loading'
    ) {
      return t('combobox.loading');
    }
    if (isServerSearch.value && field.query()) {
      return searchState.value === 'failed'
        ? t('combobox.search-failed')
        : t('combobox.no-results');
    }
    if (loadState.value === 'failed') return t('combobox.failed');
    if (!allOptions.value.length) {
      return source.noOptionsText() ?? t('combobox.no-options');
    }
    return t('combobox.no-results');
  });

  const createLabel = computed(() => {
    const query = field.query();
    if (!source.createOption?.() || !query || !hasWholeList.value) {
      return undefined;
    }

    const lowered = query.toLowerCase();
    if (
      allOptions.value.some(
        (option) => labelOf(option).trim().toLowerCase() === lowered,
      )
    ) {
      return undefined;
    }

    return (
      source.createText?.()?.(query) ?? t('combobox.create', { text: query })
    );
  });

  /** Says the number of results, or the popup's text, and the create option */
  function sayResults(delay: number) {
    field.say(() => {
      const results =
        message.value ??
        t(
          'combobox.results',
          { count: shown.value.length },
          shown.value.length,
        );

      return createLabel.value
        ? `${results}. ${t('combobox.create-available', { option: createLabel.value })}`
        : results;
    }, delay);
  }

  watch([field.isOpen, message], ([nowOpen, newMessage]) => {
    if (nowOpen && newMessage && !field.isEdited()) {
      field.say(() => newMessage);
    }
  });

  watch(
    [loadState, source.loading],
    ([, nowLoading], [stateBefore, wasLoading]) => {
      const arrived =
        (stateBefore === 'loading' && loadState.value !== 'loading') ||
        (wasLoading && !nowLoading);
      const isSearching = isServerSearch.value && !!field.query();

      if (arrived && field.isOpen() && field.isEdited() && !isSearching) {
        sayResults(0);
      }
    },
  );

  return {
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
    load,
    loadForLabel,
    loadMore,
    searchSoon,
    forgetSearch,
    refreshOptions,
    sayResults,
  };
}
