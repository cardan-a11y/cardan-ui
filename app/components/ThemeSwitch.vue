<script setup lang="ts">
const colorMode = useColorMode();

defineProps<{
  fontSize?: FontSize;
  disabled?: boolean;
}>();

function handleClick() {
  const newColorMode = colorMode.value == 'light' ? 'dark' : 'light';
  colorMode.preference = newColorMode;
  emit('click', newColorMode);
}

const emit = defineEmits<{
  click: [colorMode: string];
}>();
</script>

<template>
  <ClientOnly>
    <button
      type="button"
      class="theme-switch-button"
      :aria-pressed="colorMode.value === 'dark'"
      :style="[
        fontSize && `--theme-switch-font-size: var(--font-size-${fontSize})`,
      ]"
      :disabled="disabled"
      @click.stop="handleClick"
    >
      <Icon name="material-symbols:light-mode-outline-rounded" />
      <Icon name="material-symbols:dark-mode-outline-rounded" />

      <span class="visuallyhidden">{{ $t('theme.sr.dark') }}</span>
    </button>

    <!-- The color mode is only known in the browser: on the server an empty
         box of the switch's size keeps the header from moving. It takes the
         attributes the switch gets, such as a class that hides it. -->
    <template #fallback>
      <span v-bind="$attrs" class="theme-switch-placeholder" />
    </template>
  </ClientOnly>
</template>

<style>
.theme-switch-button,
.theme-switch-placeholder {
  width: 4rem;
  height: 2rem;
}

.theme-switch-placeholder {
  display: block;
}

.theme-switch-button {
  --theme-switch-shape-color: var(--color-grey-text);
  position: relative;
  background-color: transparent;
  display: flex;
  justify-content: center;
  gap: 0.8rem;
  align-items: center;
  border: 1px solid var(--color-grey-text);
  border-radius: var(--radius-lg);
  outline: 2px solid transparent;
  outline-offset: 2px;
  transition-property: opacity, color, background-color;
  transition-duration: var(--duration-sm);

  &::after {
    z-index: -1;
    content: '';
    position: absolute;
    left: -1px;
    z-index: 0;
    margin: auto;
    width: 2rem;
    height: 2rem;
    transform: translateX(0);
    border-radius: var(--radius-lg);
    background-color: var(--color-black);
    transition: transform var(--duration-sm);
  }

  .iconify {
    z-index: 1;
    color: var(--theme-switch-shape-color);
    font-size: var(--theme-switch-font-size, var(--font-size-lg));

    &[class*='material-symbols:light-mode-outline-rounded'] {
      color: var(--color-white);
    }
  }

  &:disabled {
    opacity: 0.5;
  }

  &:not(:disabled) {
    cursor: pointer;

    &:hover {
      border-color: var(--color-text);

      .iconify {
        filter: contrast(2);
      }
    }
  }

  &:focus-visible {
    outline-color: var(--focus-color);
  }
}

.dark-mode {
  .theme-switch-button {
    &::after {
      transform: translateX(100%);
    }

    .iconify[class*='material-symbols:light-mode-outline-rounded'] {
      color: var(--color-black);
    }

    .iconify[class*='material-symbols:dark-mode-outline-rounded'] {
      color: var(--color-white);
    }
  }
}
</style>
