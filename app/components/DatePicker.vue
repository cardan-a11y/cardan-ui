<script setup lang="ts">
import { VueDatePicker } from '@vuepic/vue-datepicker';
import type {
  ModelValue,
  FormatsConfig,
  CalendarDay,
} from '@vuepic/vue-datepicker';
import { nl, enGB } from 'date-fns/locale';
import { format } from 'date-fns';
import type { Day, Locale as DateFnsLocale } from 'date-fns';
import type { StyleValue } from 'vue';
import '@vuepic/vue-datepicker/dist/main.css';

// An attribute goes to the date picker, `aria-describedby` to its input;
// `class` and `style` stay on the wrapper
defineOptions({ inheritAttrs: false });

const model = defineModel<ModelValue>();

const { t, locale } = useI18n();

// The date-fns locale of each i18n locale; a new language adds its pair here
const dateFnsLocales: Record<string, DateFnsLocale> = { nl, en: enGB };

const computedLocale = computed(() => dateFnsLocales[locale.value] ?? enGB);

// https://vue3datepicker.com/props/modes/
const {
  formats = { input: 'yyyy-MM-dd', preview: 'yyyy-MM-dd' },
  enableTimePicker = false,
  showSelect = true,
  showCancel = true,
  monthChangeOnScroll = false,
  id = useId(),
  size = 'md',
  ariaLabels = undefined,
  required = false,
  name = undefined,
  autocomplete = undefined,
  clearable = true,
  hideInputIcon = false,
  alwaysClearable = false,
  escClose = false,
  showInvalid = false,
  instruction = undefined,
  customError = undefined,
  label,
} = defineProps<{
  /** Names the input, also for the library's own label of it */
  label: string;
  formats?: Partial<FormatsConfig>;
  disabled?: boolean;
  required?: boolean;
  /** Shows the error now; a Form shows it after a failed submit */
  showInvalid?: boolean;
  instruction?: string;
  /**
   * An error the browser cannot find, such as one from the server: the field
   * shows this text and is described by it until its value changes
   */
  customError?: string;
  name?: string;
  autocomplete?: string;
  clearable?: boolean;
  alwaysClearable?: boolean;
  escClose?: boolean;
  hideInputIcon?: boolean;
  utc?: boolean;
  textInput?: boolean;
  enableTimePicker?: boolean;
  showSelect?: boolean;
  showCancel?: boolean;
  showNow?: boolean;
  showPreview?: boolean;
  centered?: boolean;
  monthChangeOnScroll?: boolean;
  id?: string;
  size?: InputSize;
  ariaLabels?: DatePickerAriaLabels;
}>();

const inputId = `dp-input-${id}`;

const computedInputAttrs = computed(() => {
  return {
    // The label points to this id
    id: inputId,
    required: required,
    name: name,
    autocomplete: autocomplete,
    clearable: clearable,
    alwaysClearable: alwaysClearable,
    hideInputIcon: hideInputIcon,
  };
});

const datepickerRef = useTemplateRef('datepicker');
const colorMode = useColorMode();
const isMounted = ref(false);
const isDark = computed(() => isMounted.value && colorMode.value === 'dark');

const formShowInvalid = inject(formShowInvalidKey, ref(false));
const customErrorActive = ref(false);

/**
 * The custom error shows like the missing date, and describes the field,
 * but does not keep the form from submitting again: the server judges the
 * next attempt
 */
function applyCustomError() {
  customErrorActive.value = !!customError;
}

watch(() => customError, applyCustomError, { flush: 'post' });

/** The error text shows after a failed submit, or for a custom error */
const errorShown = computed(
  () =>
    customErrorActive.value ||
    (required && !model.value && (showInvalid || formShowInvalid.value)),
);

const attrs = useAttrs();

/** The attributes for the date picker, without the wrapper's and the input's */
function controlAttrs() {
  return Object.fromEntries(
    Object.entries(attrs).filter(
      ([key]) =>
        !['class', 'style', 'aria-describedby', 'ariaDescribedby'].includes(
          key,
        ),
    ),
  );
}

/**
 * The library takes no `aria-describedby` or `aria-invalid` for its input,
 * so they are set on the input itself. The error describes the input only
 * while it shows; a project's own `aria-describedby` comes first. `attrs` is
 * not reactive, so this runs after every render, which a changed attribute
 * causes, and when the error shows or hides.
 */
function describeInput() {
  const input = document.getElementById(inputId);
  if (!input) return;

  const describedBy = [
    attrs['aria-describedby'] ?? attrs.ariaDescribedby,
    instruction && `instruction-${id}`,
    errorShown.value && `error-${id}`,
  ]
    .filter(Boolean)
    .join(' ');

  if (describedBy) input.setAttribute('aria-describedby', describedBy);
  else input.removeAttribute('aria-describedby');

  if (errorShown.value) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

watch(errorShown, describeInput, { flush: 'post' });
onUpdated(describeInput);

const isExpanded = ref(false);

function handleOpen() {
  isExpanded.value = true;
}

function handleClose() {
  isExpanded.value = false;
}

function preventEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && isExpanded.value) {
    event.preventDefault();
    datepickerRef.value?.closeMenu();
    isExpanded.value = false;
  }
}

/**
 * The library cancels every key but Tab in its input while text input is
 * off, Escape included, so a Dialog around it never got its `cancel`. While
 * the calendar is closed, the input's own handler cannot cancel Escape (from
 * the capture phase until the event leaves the wrapper), so the browser
 * closes the dialog; a handler further up can still cancel it.
 */
function releaseEscape(event: KeyboardEvent) {
  if (
    event.key === 'Escape' &&
    !isExpanded.value &&
    (event.target as Element).id === inputId
  ) {
    event.preventDefault = () => {};
  }
}

function restoreEscape(event: KeyboardEvent) {
  Reflect.deleteProperty(event, 'preventDefault');
}

onMounted(() => {
  isMounted.value = true;
  applyCustomError();
  describeInput();
  document.addEventListener('keydown', preventEscape);
});

onUnmounted(() => document.removeEventListener('keydown', preventEscape));

/** The first day of the week as the library takes it: the `week-start` attribute, else the locale's, else date-fns's Sunday */
const weekStart = computed(() => {
  const given = attrs['week-start'] ?? attrs.weekStart;
  if (given !== undefined) return Number(given);
  return computedLocale.value.options?.weekStartsOn ?? 0;
});

// Each day with its weekday, and the full weekday on the abbreviated headers,
// so assistive technology can tell which day a date is (Cardan Auditor
// finding CAN-11.F48)
const computedAriaLabels = computed(() => {
  return {
    day: (day: CalendarDay) =>
      format(day.value, 'EEEE d MMMM yyyy', { locale: computedLocale.value }),
    weekDay: (day: number) =>
      computedLocale.value.localize.day(((day + weekStart.value) % 7) as Day, {
        width: 'wide',
      }),
    // The library's `aria-label` on the input wins over the `<label>`
    input: label,
    clearInput: t('datepicker.clearInput'),
    toggleOverlay: t('datepicker.toggleOverlay'),
    calendarWrap: t('datepicker.calendarWrap'),
    calendarDays: t('datepicker.calendarDays'),
    openTimePicker: t('datepicker.openTimePicker'),
    closeTimePicker: t('datepicker.closeTimePicker'),
    openYearsOverlay: t('datepicker.openYearsOverlay'),
    openMonthsOverlay: t('datepicker.openMonthsOverlay'),
    nextMonth: t('datepicker.nextMonth'),
    prevMonth: t('datepicker.prevMonth'),
    nextYear: t('datepicker.nextYear'),
    prevYear: t('datepicker.prevYear'),
    ...ariaLabels,
  };
});
</script>

<template>
  <FormField
    :id="id"
    :class="[
      'cardan-datepicker-container',
      `datepicker-size--${size}`,
      $attrs.class,
    ]"
    :style="$attrs.style as StyleValue"
    :label="label"
    :label-for="inputId"
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
    @keydown.capture="releaseEscape"
    @keydown="restoreEscape"
  >
    <VueDatePicker
      :id="id"
      ref="datepicker"
      v-model="model"
      v-bind="controlAttrs()"
      auto-apply
      :esc-close="escClose"
      :text-input="textInput"
      :timezone="utc ? 'utc' : undefined"
      :time-config="{ enableTimePicker: enableTimePicker }"
      :formats="formats"
      :input-attrs="computedInputAttrs"
      :disabled="disabled"
      :month-change-on-scroll="monthChangeOnScroll"
      :action-row="{
        showSelect,
        showCancel,
        showNow,
        showPreview,
        selectBtnLabel: $t('datepicker.selectText'),
        cancelBtnLabel: $t('datepicker.cancelText'),
        nowBtnLabel: $t('datepicker.nowButtonLabel'),
      }"
      :dark="isDark"
      :locale="computedLocale"
      :aria-labels="computedAriaLabels"
      class="cardan-datepicker"
      @open="handleOpen"
      @closed="handleClose"
      @update:model-value="customErrorActive = false"
    >
      <template #input-icon>
        <Icon name="material-symbols:calendar-month-outline-rounded" />
      </template>
    </VueDatePicker>
  </FormField>
</template>

<style>
.cardan-datepicker-container {
  display: grid;
  transition-property: opacity;
  transition-duration: var(--duration-sm);

  &:has(.dp--disabled) {
    opacity: 35%;
  }
}

.dp--theme-light,
.dp--theme-dark {
  --dp-background-color: var(--color-card-bg);
  --dp-text-color: var(--color-text);
  --dp-hover-color: var(--color-grey-bg);
  --dp-hover-text-color: var(--color-text);
  --dp-hover-icon-color: var(--dp-icon-color);
  --dp-primary-color: var(--color-accent-text);
  --dp-primary-disabled-color: var(--color-accent-bg);
  --dp-primary-text-color: var(--color-white);
  --dp-secondary-color: var(--color-grey-bg);
  --dp-border-color: var(--color-grey-graphic);
  --dp-menu-border-color: var(--color-grey-light);
  --dp-border-color-hover: var(--dp-border-color);
  --dp-border-color-focus: var(--focus-color);
  --dp-disabled-color: var(--color-grey-light);
  --dp-scroll-bar-background: var(--color-grey-bg);
  --dp-scroll-bar-color: var(--color-grey-graphic);
  --dp-success-color: var(--color-green);
  --dp-success-color-disabled: var(--color-green-bg);
  --dp-icon-color: var(--color-grey-text);
  --dp-danger-color: var(--color-red);
  --dp-marker-color: var(--color-red);
  --dp-disabled-color-text: var(--color-grey-graphic);
  --dp-highlight-color: var(--color-accent-bg);
}

:root {
  --dp-font-family: var(--font-family-input);
  --dp-border-radius: var(--radius-md);
  --dp-input-padding: 0;
}

.dp--button {
  color: var(--color-text);

  &:hover {
    color: var(--color-text);
  }

  &::after {
    content: attr(aria-label);
    margin-inline-start: 0.5rem;
  }
}

.dp--input {
  &::placeholder {
    opacity: 1;
    color: var(--color-grey-text);
  }
}

.dp--input-focus {
  outline: 1px solid var(--dp-border-color-focus);
}
.dp--input-icon {
  display: flex;
  margin-inline-start: 0.5rem;

  .iconify {
    width: 20px;
    height: 20px;
  }
}

.dp--input-icons {
  padding: 6px;
}

.show-invalid {
  .dp--input {
    &:invalid {
      border-color: var(--color-red-graphic);
      outline: 1px solid var(--color-red-graphic);
    }
  }

  .cardan-datepicker-container:has(:invalid) {
    .error-wrapper .error {
      display: flex;
    }
  }
}

.cardan-datepicker-container.custom-error .dp--input {
  border-color: var(--color-red-graphic);
  outline: 1px solid var(--color-red-graphic);
}

/* Sizes */
.datepicker-size--sm .dp--input {
  min-height: 2rem;
}
.datepicker-size--md .dp--input {
  min-height: 2.5rem;
}
.datepicker-size--lg .dp--input {
  min-height: 2.75rem;
}
</style>
