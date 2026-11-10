<script setup lang="ts">
const colorMode = useColorMode();

// Per instance: a menu and a settings page may both show the select
const id = useId();
</script>

<template>
  <div class="theme-select-wrapper">
    <fieldset class="color-theme-fieldset">
      <legend>
        {{ $t('theme.heading') }}
      </legend>

      <ul role="list" class="theme-options-list">
        <li class="color-theme-option">
          <input
            :id="`${id}-light`"
            v-model="colorMode.preference"
            :name="id"
            value="light"
            type="radio"
          />

          <label :for="`${id}-light`">
            <Icon name="material-symbols:light-mode-outline-rounded" />

            <span>
              {{ $t('theme.light') }}
            </span>
          </label>
        </li>

        <li class="color-theme-option">
          <input
            :id="`${id}-dark`"
            v-model="colorMode.preference"
            :name="id"
            value="dark"
            type="radio"
          />

          <label :for="`${id}-dark`">
            <Icon name="material-symbols:dark-mode-outline-rounded" />

            <span>
              {{ $t('theme.dark') }}
            </span>
          </label>
        </li>

        <li class="color-theme-option">
          <input
            :id="`${id}-system`"
            v-model="colorMode.preference"
            :name="id"
            value="system"
            type="radio"
          />

          <label :for="`${id}-system`">
            <Icon name="material-symbols:computer-outline-rounded" />

            <span>
              {{ $t('theme.system') }}
            </span>
          </label>
        </li>
      </ul>
    </fieldset>
  </div>
</template>

<style>
/* Its own base styles for the form elements, so it looks the same with or
   without a form field on the page */
.theme-select-wrapper {
  label,
  legend {
    font-weight: var(--font-weight-medium);
    -webkit-user-select: none;
    user-select: none;
  }

  legend {
    padding: 0;
  }

  fieldset {
    border: none;
    padding: 0;
    margin-inline: 0;
  }
}

.color-theme-fieldset {
  legend {
    width: 100%;
    font-size: var(--font-size-xs);
    color: var(--color-grey-text);
    margin-block-end: 0.5rem;
  }
}

.theme-options-list {
  display: inline-flex;
  gap: 0.5rem;
  justify-content: space-between;
}

.color-theme-option {
  flex-grow: 1;

  input[type='radio'] {
    position: absolute;
    z-index: -1;
    opacity: 0;

    + label {
      font-size: var(--font-size-xs);
      display: flex;
      gap: 0.35rem;
      align-items: center;
      padding-block: 0.35rem;
      padding-inline: 0.5rem;
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
      }
    }
  }
}
</style>
