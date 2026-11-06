<script setup lang="ts">
import { VueDatePicker } from '@vuepic/vue-datepicker';
import type { ModelValue, FormatsConfig } from '@vuepic/vue-datepicker';
import { nl, enGB } from 'date-fns/locale';
import type { Locale as DateFnsLocale } from 'date-fns';
import '@vuepic/vue-datepicker/dist/main.css';

const model = defineModel<ModelValue>();

const { t, locale } = useI18n();

// The date-fns locale of each i18n locale; a new language adds its pair here
const dateFnsLocales: Record<string, DateFnsLocale> = { nl, en: enGB };

const computedLocale = computed(
  () => dateFnsLocales[locale.value] ?? enGB,
);

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
} = defineProps<{
  label: string;
  formats?: Partial<FormatsConfig>;
  disabled?: boolean;
  required?: boolean;
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

const computedInputAttrs = computed(() => {
  return {
    // The label points to this id
    id: `dp-input-${id}`,
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

onMounted(() => {
  isMounted.value = true;
  document.addEventListener('keydown', preventEscape);
});

onUnmounted(() => document.removeEventListener('keydown', preventEscape));

const computedAriaLabels = computed(() => {
  return {
    input: t('datepicker.input'),
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
    :class="['cardan-datepicker-container', `datepicker-size--${size}`]"
    :label="label"
    :label-for="`dp-input-${id}`"
    :required="required"
    :disabled="disabled"
    :error-text="required ? $t('form.missing-value', { item: label }) : undefined"
  >
    <VueDatePicker
      :id="id"
      ref="datepicker"
      v-model="model"
      v-bind="$attrs"
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
      aria-live="polite"
      :aria-describedby="id && required ? `error-${id}` : ''"
      :aria-labels="computedAriaLabels"
      class="cardan-datepicker"
      @open="handleOpen"
      @closed="handleClose"
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
  --dp-font-family: var(--font-family-input, system-ui, sans-serif);
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
