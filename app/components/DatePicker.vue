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

/**
 * A date field on @vuepic/vue-datepicker, with our own input in its `dp-input`
 * slot so it follows FormField. An attribute goes to the date picker,
 * `aria-describedby` and `placeholder` to the input, `class` and `style` to the
 * wrapper; `ariaLabels.input`, the classes of `ui.input` and the `invalid`
 * event do not reach the input. Tripwire: test/tripwires.test.ts.
 */
defineOptions({ inheritAttrs: false });

const model = defineModel<ModelValue>();

const { t, locale } = useI18n();

const dateFnsLocales: Record<string, DateFnsLocale> = { nl, en: enGB };

const computedLocale = computed(() => dateFnsLocales[locale.value] ?? enGB);

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
  disabled = false,
  textInput = false,
  label,
} = defineProps<{
  label: string;
  formats?: Partial<FormatsConfig>;
  disabled?: boolean;
  required?: boolean;
  /** Shows the error now; a Form shows it after a failed submit */
  showInvalid?: boolean;
  instruction?: string;
  /** An error the browser cannot find, such as the server's: shown until the value changes */
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
const menuId = `dp-menu-${id}`;

const libraryIconAndClearAttrs = computed(() => ({
  clearable,
  alwaysClearable,
  hideInputIcon,
}));

const datepickerRef = useTemplateRef('datepicker');
const colorMode = useColorMode();
const isMounted = ref(false);
const isDark = computed(() => isMounted.value && colorMode.value === 'dark');

const { customErrorActive, clearCustomError, errorShown } = useCustomError(
  () => customError,
  { invalid: () => required && !model.value, showInvalid: () => showInvalid },
);

const { attrs, controlAttrs: datePickerAttrs } = useControlAttrs([
  'aria-describedby',
  'ariaDescribedby',
  'placeholder',
]);

// Not a computed: `attrs` is not reactive, the template that calls it is
function describedBy() {
  return (
    [
      attrs['aria-describedby'] ?? attrs.ariaDescribedby,
      instruction && `instruction-${id}`,
      errorShown.value && `error-${id}`,
    ]
      .filter(Boolean)
      .join(' ') || undefined
  );
}

function placeholder() {
  return attrs.placeholder as string | undefined;
}

function isReadonly() {
  const value = attrs.readonly;
  return value !== undefined && value !== false && value !== 'false';
}

const isExpanded = ref(false);
const isFocused = ref(false);

function libraryInputClasses(isMenuOpen: boolean) {
  return {
    'dp--input': true,
    'dp--pointer': !disabled && !isReadonly() && !textInput,
    'dp--disabled': disabled,
    'dp--input-readonly': !textInput,
    'dp--input-reg': !textInput,
    'dp--input-not-clearable': !clearable,
    'dp--input-icon-pad': !hideInputIcon,
    'dp--input-focus': isFocused.value || isMenuOpen,
  };
}

// The library's key handler cancels Escape too: skipped while the calendar is
// closed, so a Dialog around it closes. Tripwire: test/tripwires.test.ts.
function handleKeydown(
  event: KeyboardEvent,
  isMenuOpen: boolean,
  libraryHandler: (event: KeyboardEvent) => void,
) {
  if (event.key === 'Escape' && !isMenuOpen) return;
  libraryHandler(event);
}

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

onMounted(() => {
  isMounted.value = true;
  document.addEventListener('keydown', preventEscape);
});

onUnmounted(() => document.removeEventListener('keydown', preventEscape));

const weekStart = computed(() => {
  const given = attrs['week-start'] ?? attrs.weekStart;
  if (given !== undefined) return Number(given);
  return computedLocale.value.options?.weekStartsOn ?? 0;
});

const computedAriaLabels = computed(() => {
  return {
    day: (day: CalendarDay) =>
      format(day.value, 'EEEE d MMMM yyyy', { locale: computedLocale.value }),
    weekDay: (day: number) =>
      computedLocale.value.localize.day(((day + weekStart.value) % 7) as Day, {
        width: 'wide',
      }),
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
  >
    <VueDatePicker
      :id="id"
      ref="datepicker"
      v-model="model"
      v-bind="datePickerAttrs()"
      auto-apply
      :esc-close="escClose"
      :text-input="textInput"
      :timezone="utc ? 'utc' : undefined"
      :time-config="{ enableTimePicker: enableTimePicker }"
      :formats="formats"
      :input-attrs="libraryIconAndClearAttrs"
      :menu-id="menuId"
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
      @update:model-value="clearCustomError"
    >
      <template
        #dp-input="{
          value,
          isMenuOpen,
          onInput,
          onKeypress,
          onBlur,
          onFocus,
          onPaste,
        }"
      >
        <input
          :id="inputId"
          :class="libraryInputClasses(isMenuOpen)"
          :name="name"
          :value="value"
          :placeholder="placeholder()"
          :autocomplete="autocomplete"
          :required="required"
          :disabled="disabled"
          :readonly="isReadonly()"
          role="combobox"
          aria-haspopup="dialog"
          :aria-expanded="isMenuOpen"
          :aria-controls="isMenuOpen ? menuId : undefined"
          :aria-describedby="describedBy()"
          :aria-invalid="errorShown || undefined"
          @input="onInput"
          @keydown="handleKeydown($event, isMenuOpen, onKeypress)"
          @paste="onPaste"
          @focus="
            isFocused = true;
            onFocus();
          "
          @blur="
            isFocused = false;
            onBlur();
          "
        />
      </template>
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
