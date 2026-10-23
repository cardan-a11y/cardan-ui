<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';

const {
  label = undefined,
  ariaLabel = undefined,
  fontSize = undefined,
  iconSize = undefined,
  radius = undefined,
  href = undefined,
  to = undefined,
  title = undefined,
  target = undefined,
  icon = undefined,
  download = undefined,
  hideExternalIcon = false,
  iconPos = 'start',
  variant = 'secondary',
  size = 'md',
  type = 'button',
} = defineProps<{
  label?: string;
  ariaLabel?: string;
  icon?: string;
  iconPos?: 'start' | 'end';
  to?: RouteLocationRaw;
  href?: string;
  target?: string;
  title?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fontSize?: FontSize;
  iconSize?: FontSize;
  radius?: BorderRadius;
  hideLabel?: boolean;
  disabled?: boolean;
  loading?: boolean;
  download?: boolean;
  external?: boolean;
  hideExternalIcon?: boolean;
  type?: 'button' | 'submit' | 'reset';
}>();

const computedStyle = computed(() => ({
  '--radius': radius && `var(--radius-${radius})`,
  '--font-size': fontSize && `var(--font-size-${fontSize})`,
  '--icon-size': iconSize && `var(--font-size-${iconSize})`,
}));

const showExternalIcon = computed(() => {
  return !hideExternalIcon && target === '_blank';
});

function handleClick() {
  emit('click');
}
const buttonRef = useTemplateRef<HTMLButtonElement | HTMLAnchorElement>(
  'button',
);

function focusElement() {
  buttonRef.value?.focus();
}

defineExpose({ focusElement });

const emit = defineEmits<{
  click: [];
}>();
</script>

<template>
  <NuxtLink
    v-if="to || href"
    ref="button"
    :to="disabled ? undefined : to || href"
    :role="disabled ? 'link' : undefined"
    :aria-disabled="disabled || undefined"
    :target="target"
    :external="external"
    :download="download"
    :aria-label="ariaLabel"
    :class="[
      'button',
      `button-size--${size}`,
      `button-variant--${variant}`,
      `icon-position--${iconPos}`,
      hideLabel && 'button--icon-only',
      loading && 'button--loading',
      (loading || disabled) && 'disabled',
    ]"
    :style="computedStyle"
    :title="
      !download && target === '_blank' ? $t('aria.open-new-window') : undefined
    "
    aria-live="polite"
    @click="handleClick"
  >
    <slot v-if="!showExternalIcon" name="icon" />

    <template v-if="loading">
      <Icon name="svg-spinners:90-ring-with-bg" />
      <span class="visuallyhidden">
        {{ $t('general.loading') }}
      </span>
    </template>

    <Icon v-else-if="icon" :name="icon" />

    <span v-if="label" :class="['button-text', hideLabel && 'visuallyhidden']">
      {{ label }}
    </span>

    <template v-if="showExternalIcon">
      <Icon name="material-symbols:open-in-new-rounded" class="external-link" />
    </template>

    <slot name="default" />
  </NuxtLink>

  <button
    v-else
    ref="button"
    :type="type"
    :disabled="loading || disabled"
    :aria-label="ariaLabel"
    :class="[
      'button',
      `button-size--${size}`,
      `button-variant--${variant}`,
      `icon-position--${iconPos}`,
      hideLabel && 'button--icon-only',
      loading && 'button--loading',
    ]"
    :style="computedStyle"
    :title="disabled ? undefined : title"
    aria-live="polite"
    @click="handleClick"
  >
    <slot name="icon" />

    <template v-if="loading">
      <Icon name="svg-spinners:90-ring-with-bg" />
      <span class="visuallyhidden">
        {{ $t('general.loading') }}
      </span>
    </template>

    <Icon v-else-if="icon" :name="icon" />

    <span v-if="label" :class="['button-text', hideLabel && 'visuallyhidden']">
      {{ label }}
    </span>

    <slot name="default" />
  </button>
</template>

<style>
.button {
  border-radius: var(--radius, var(--radius-md));
  -webkit-tap-highlight-color: transparent;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25em;
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size, var(--font-size-sm));
  border: 1px solid transparent;
  transition-property: color, border-color, background-color, opacity;
  transition-duration: var(--duration-sm);
  text-decoration: none;
  outline: 2px solid transparent;
  outline-offset: 2px;

  &:focus-visible {
    outline-color: var(--focus-color);
    text-decoration: none;
  }

  &[disabled],
  &.disabled {
    pointer-events: none;
    cursor: default;
    opacity: 35%;
  }

  .iconify {
    font-size: var(--icon-size, larger);
    flex-shrink: 0;
    transition-duration: var(--duration-xs);
  }
}

.icon-position--start {
  flex-direction: row;
}

.icon-position--end {
  flex-direction: row-reverse;
}

.button-size--xs {
  font-size: var(--font-size, var(--font-size-xs));
  min-height: 1.5rem;
  padding-inline: 0.5rem;

  .iconify {
    font-size: var(--font-size, var(--font-size-sm));
  }
}

.button-size--xxs {
  font-size: var(--font-size, var(--font-size-xs));
  min-height: 1.25rem;
  padding-inline: 0.25rem;

  /* Enlarge the click target to at least 24×24px (WCAG 2.5.8) */
  &::after {
    content: '';
    position: absolute;
    inset: -50%;
    margin: auto;
    min-width: 1.5rem;
    min-height: 1.5rem;
    max-width: 100%;
    max-height: 100%;
  }

  .iconify {
    font-size: var(--icon-size, larger);
  }
}

.button-size--sm {
  font-size: var(--font-size, var(--font-size-sm));
  min-height: 2rem;
  padding-inline: 0.65rem;

  .button-text {
    padding-inline: 0.1rem;
  }

  .iconify {
    font-size: var(--icon-size, larger);
  }
}

.button-size--md {
  font-size: var(--font-size, var(--font-size-sm));
  min-height: 2.5rem;
  padding-inline: 0.75rem;

  .button-text {
    padding-inline: 0.2rem;
  }

  .iconify {
    font-size: var(--icon-size, larger);
  }
}

.button-size--lg {
  font-size: var(--font-size, var(--font-size-md));
  min-height: 2.75rem;
  padding-inline: 1rem;

  .button-text {
    padding-inline: 0.2rem;
  }

  .iconify {
    font-size: var(--icon-size, larger);
  }
}

.button-size--xl {
  font-size: var(--font-size, var(--font-size-lg));
  min-height: 3rem;
  padding-inline: 1.25rem;

  .button-text {
    padding-inline: 0.25rem;
  }

  .iconify {
    font-size: var(--icon-size, larger);
  }
}

.button-size--xxl {
  font-size: var(--font-size, var(--font-size-md));
  min-height: 3.5rem;
  padding-inline: 1.5rem;

  .button-text {
    padding-inline: 0.5rem;
  }

  .iconify {
    font-size: var(--icon-size, larger);
  }
}

.button-variant--primary {
  color: var(--color-on-accent);
  background-color: var(--color-accent);

  &:not(:disabled, .disabled):hover {
    background-color: var(--color-accent-hover);
  }
}

.button-variant--danger {
  color: var(--color-red-text);
  background-color: var(--color-red-bg);

  &:not(:disabled, .disabled):hover {
    background-color: color-mix(in srgb, var(--color-red) 20%, white);
  }
}

.button-variant--green {
  color: var(--color-white);
  background-color: var(--color-green);

  &:not(:disabled, .disabled):hover {
    background-color: color-mix(
      in srgb,
      var(--color-green) 85%,
      var(--color-black)
    );
  }
}

.button-variant--black {
  color: var(--color-white);
  background-color: var(--color-text);

  &:not(:disabled, .disabled):hover {
    background-color: var(--color-grey-text);
  }
}

.button-variant--3d {
  --radius: var(--radius-xl);
  --button-shadow-offset: 4px 4px 0 0 var(--color-accent);
  --button-shadow-offset-hover: 6px 6px 0 0 var(--color-accent);

  color: var(--color-white);
  background-color: var(--color-text);
  transition-property: background-color, box-shadow;
  box-shadow: var(--button-shadow-offset);

  .icon svg {
    width: 1.25em;
    height: 1.25em;
  }

  &:not(:focus-visible, :disabled, .disabled):hover {
    box-shadow: var(--button-shadow-offset-hover);
    background-color: var(--color-black);
  }
  &:focus-visible {
    box-shadow: -4px -4px 0px 0 transparent;
    background-color: color-mix(
      in srgb,
      var(--color-black) 90%,
      var(--color-white)
    );
  }
}

.button-variant--white {
  color: var(--color-text);
  background-color: var(--color-white);

  .icon svg {
    width: 1.25em;
    height: 1.25em;
  }

  &:not(:disabled, .disabled):hover {
    color: var(--color-white);
    background-color: var(--color-text);
  }
}

.button-variant--cta {
  --radius: var(--radius-xl);
  --focus-color: var(--color-accent-text);
  color: var(--color-on-accent);
  background-color: var(--color-accent);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);

  .icon svg {
    width: 1.25em;
    height: 1.25em;
  }

  &:not(:disabled, .disabled):hover {
    background-color: var(--color-accent-hover);
  }
}

.button-variant--secondary {
  color: var(--color-text);
  background-color: var(--color-grey-bg);

  &:not(:disabled, .disabled):hover {
    background-color: var(--color-grey-light);
  }
}

.button-variant--ghost {
  color: var(--color-text);
  background-color: transparent;

  &:not(:disabled, .disabled):hover {
    background-color: var(--color-ghost-hover-bg);
  }

  &.router-link-active {
    text-decoration: underline;
    color: var(--color-accent-text);
  }
}

.button-variant--ghost-green {
  padding-inline: 0;
  color: var(--color-green-text);
  background-color: transparent;
  text-underline-offset: 0.25em;

  &:not(:disabled, .disabled):hover {
    text-decoration: underline;
  }

  &.router-link-active {
    text-decoration: underline;
  }
}

.button-variant--ghost-red {
  color: var(--color-red-text);
  background-color: transparent;

  &:not(:disabled, .disabled):hover {
    background-color: var(--color-red-bg);
  }

  &.router-link-active {
    text-decoration: underline;
  }
}

.button-variant--tab {
  color: var(--color-text);
  background-color: transparent;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  padding-block: 0.5rem 0.65rem;

  &:not(:disabled, .disabled, .router-link-active):hover {
    background-color: var(--color-grey-bg);
  }

  &.router-link-exact-active {
    background-color: var(--color-card-bg);
    border-color: var(--color-accent-bg);
    border-block-end-color: transparent;
    color: var(--color-accent-text);
    font-weight: var(--font-weight-semibold);
  }
}

.button-variant--outline {
  color: var(--color-text);
  background-color: var(--color-input-bg);
  border-color: var(--color-grey-bg);

  &:not(:disabled, .disabled):hover {
    background-color: var(--color-grey-bg);
  }

  &.router-link-active {
    text-decoration: underline;
    color: var(--color-accent-text);
  }
}

.button-variant--outline-green {
  color: var(--color-green-text);
  background-color: transparent;
  border-color: var(--color-green-graphic);

  &:not(:disabled, .disabled):hover {
    background-color: var(--color-green-bg);
  }
}

.button-variant--outline-red {
  color: var(--color-red-text);
  background-color: transparent;
  border-color: var(--color-red-graphic);

  &:not(:disabled, .disabled):hover {
    background-color: var(--color-red-bg);
  }
}

.button-variant--link {
  --radius: 0 !important;
  overflow-wrap: anywhere;
  min-height: 0;
  height: auto;
  font-size: var(--font-size, inherit);
  display: inline-flex;
  justify-content: start;
  align-items: center;
  text-decoration: underline;
  text-underline-offset: 0.25em;
  background-color: transparent;
  padding-inline: 0;

  &:has(.external-link) {
    display: inline;

    .iconify {
      font-size: var(--icon-size, inherit);
      width: 1em;
      height: 1em;
      vertical-align: middle;
      margin-inline-start: 0.25em;
    }
  }

  .button-text {
    padding-inline: 0;
  }

  &:hover {
    color: var(--color-accent-text);
  }

  &.router-link-active {
    color: var(--color-accent-text);
  }
}

.button-variant--menu {
  width: 100%;
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
  justify-content: space-between;
  background-color: transparent;
  white-space: nowrap;
  gap: 1.5rem;

  &:has(> .iconify) {
    flex-direction: row-reverse;
  }

  .iconify {
    font-size: var(--icon-size, inherit);
    color: var(--color-grey-graphic);
  }

  &:disabled {
    opacity: 1;
    color: var(--color-grey-bg);

    .iconify {
      opacity: 0.35;
    }
  }

  &:not(:disabled, .disabled, .router-link-active):hover {
    background-color: var(--color-grey-bg);

    .iconify {
      color: var(--color-grey-text);
    }
  }

  &.router-link-active {
    font-weight: var(--font-weight-semibold);
    background-color: var(--color-accent-bg);
    color: var(--color-accent-text);

    .iconify {
      color: var(--color-accent-graphic);
    }
  }
}

.button-variant--sidebar {
  display: flex;
  gap: 0.5rem;
  padding-inline: 0;
  font-weight: var(--font-weight-medium);
  justify-content: start;
  background-color: transparent;
  transition-duration: 0s;

  .iconify {
    color: inherit;
  }

  &:not(:disabled, .disabled):hover {
    text-decoration: underline;
    color: var(--color-accent-text-hover);
  }

  &.router-link-exact-active {
    text-decoration: underline;
    color: var(--color-accent-text);
  }
}

.button-variant--topbar {
  --button-color: var(--color-text);
  --button-hover-color: var(--color-text);
  --button-active-color: var(--color-text);
  --button-underline-color: var(--color-text);
  --button-underline-thickness: 1.5px;

  display: flex;
  max-width: max-content;
  padding-inline: 0;
  font-weight: var(--font-weight-medium);
  color: var(--button-color);
  justify-content: start;
  background-color: transparent;
  transition-duration: 0s;

  .iconify {
    color: var(--color-text);
  }

  &:hover {
    color: var(--button-hover-color);

    .iconify {
      color: var(--button-hover-color);
    }
  }

  @media (prefers-reduced-motion: no-preference) {
    @media (pointer: coarse) {
      text-decoration: underline;
      text-underline-offset: 0.25em;
    }

    @media (pointer: fine) {
      border-radius: 0;
      background-image: linear-gradient(var(--button-underline-color));
      background-repeat: no-repeat;
      background-size: 0% var(--button-underline-thickness);
      background-position: calc(100% - 0.25rem) bottom;

      transition-timing-function: ease-in-out;
      transition:
        color var(--duration-sm),
        background-size var(--duration-sm),
        border-color var(--duration-sm) var(--duration-sm);

      &:hover {
        background-position: 0.25rem bottom;
        background-size: calc(100% - 0.5rem) var(--button-underline-thickness);
        transition:
          color var(--duration-sm),
          background-size var(--duration-sm),
          border-color var(--duration-sm);
      }

      &.router-link-exact-active {
        --button-underline-color: var(--button-active-color);
        color: var(--button-active-color);
        background-size: calc(100% - 0.5rem) var(--button-underline-thickness);

        .iconify {
          color: var(--button-active-color);
        }
      }

      &:focus-visible {
        border-radius: var(--radius-xs);
      }
    }
  }
}

.button--icon-only {
  aspect-ratio: 1;
  padding: 0;
}
</style>
