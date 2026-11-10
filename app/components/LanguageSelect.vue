<script setup lang="ts">
import type { Locale } from '#i18n';

// The locales of the i18n config, with their names: a language is added there
const { locale, locales, setLocale } = useI18n();

// Per instance, as the component can be in a footer and a dialog at once
const id = useId();

const userLang = computed({
  get: () => locale.value,
  set: (value: Locale) => {
    setLocale(value);
    emit('change', value);
  },
});

const emit = defineEmits<{
  change: [string];
}>();
</script>

<template>
  <div class="language-select-wrapper">
    <fieldset class="language-fieldset">
      <legend>{{ $t('general.language') }}</legend>

      <ul role="list" class="language-options-list">
        <li
          v-for="option in locales"
          :key="option.code"
          class="language-option"
        >
          <input
            :id="`${id}-${option.code}`"
            v-model="userLang"
            :name="id"
            :value="option.code"
            type="radio"
          />
          <label
            :for="`${id}-${option.code}`"
            :lang="option.language ?? option.code"
          >
            {{ option.name ?? option.code }}
          </label>
        </li>
      </ul>
    </fieldset>
  </div>
</template>

<style>
:where(label) {
  font-weight: var(--font-weight-medium);
  -webkit-user-select: none;
  user-select: none;
}

:where(fieldset) {
  border: none;
  padding: 0;
  margin-inline: 0;
}

:where(legend) {
  padding: 0;
  -webkit-user-select: none;
  user-select: none;
}

.language-fieldset {
  legend {
    width: 100%;
    font-size: var(--font-size-xs);
    color: var(--color-grey-text);
    margin-block-end: 0.5rem;
  }
}

.language-options-list {
  display: inline-flex;
  gap: 0.5rem;
  justify-content: space-between;
}

.language-option {
  flex-grow: 1;

  input[type='radio'] {
    position: absolute;
    z-index: -1;
    opacity: 0;

    + label {
      font-size: var(--font-size-xs);
      display: flex;
      align-items: center;
      padding-block: 0.35rem;
      padding-inline: 0.5rem 0.65rem;
      min-width: 75px;
      justify-content: center;
      border: 1px solid var(--color-grey-light);
      border-radius: var(--radius-md);
      color: var(--color-grey-text);

      &:hover {
        color: var(--color-text);
        border-color: var(--color-grey-graphic);
      }
    }

    &:focus-visible {
      + label {
        outline: 2px solid var(--focus-color);
        outline-offset: 2px;
      }
    }

    &:checked {
      + label {
        color: var(--color-accent-text);
        border-color: var(--color-accent-graphic);
        background-color: var(--color-accent-bg);

        .iconify {
          color: var(--color-accent-graphic);
        }
      }
    }
  }
}
</style>
