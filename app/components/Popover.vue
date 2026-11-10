<script setup lang="ts">
const {
  fontSize = undefined,
  iconSize = undefined,
  label = undefined,
  hideLabel = true,
  list = undefined,
  borderRadius = 'md',
  icon = 'material-symbols:more-horiz',
  iconPos = 'start',
  buttonVariant = 'outline',
  size = 'md',
  placement = 'bottom',
  span = undefined,
  maxWidth = undefined,
  ariaDescribedby = undefined,
  id = useId(),
} = defineProps<{
  fontSize?: FontSize;
  iconSize?: FontSize;
  borderRadius?: string;
  label?: string;
  hideLabel?: boolean;
  list?: MenuItem[];
  icon?: string;
  iconPos?: 'start' | 'end';
  buttonVariant?: ButtonVariant;
  size?: ButtonSize;
  placement?: 'bottom' | 'top' | 'left' | 'right';
  span?: 'bottom' | 'top' | 'left' | 'right';
  maxWidth?: number | 'none';
  disabled?: boolean;
  loading?: boolean;
  showArrowIcon?: boolean;
  ariaDescribedby?: string;
  id?: string;
}>();

// The smallest triggers have the small radius
const computedStyle = computed(() => ({
  '--popover-font-size': fontSize && `var(--font-size-${fontSize})`,
  '--popover-icon-size': iconSize && `var(--font-size-${iconSize})`,
  '--popover-radius': `var(--radius-${['xxs', 'xs'].includes(size) ? 'sm' : borderRadius})`,
}));

const contentStyle = computed(() => ({
  '--popover-max-width':
    maxWidth === undefined
      ? undefined
      : maxWidth === 'none'
        ? 'none'
        : `${maxWidth}px`,
}));

const popoverContentRef = useTemplateRef<HTMLDivElement | null>(
  'popoverContent',
);
const triggerRef = useTemplateRef<HTMLButtonElement>('popoverTrigger');

/**
 * After the popover is shown or hidden. The content is a list of links or
 * buttons, a disclosure in APG terms, not a menu with its roles and arrow
 * keys. It is always rendered: closed, the native popover is `display: none`,
 * so it is out of the accessibility tree and the tab order. When it opens,
 * focus moves to its first element; on Escape, or a choice, the browser
 * gives focus back to the trigger.
 */
function onToggle(event: Event) {
  if ((event as ToggleEvent).newState === 'open') {
    nextTick(() => {
      popoverContentRef.value
        ?.querySelector<HTMLElement>(focusableSelector)
        ?.focus();
    });
  }
}

/**
 * Focus that leaves the content or the trigger for the page closes the
 * popover: Tab past the last element, or Shift+Tab from the trigger. A move
 * between the two keeps it open.
 */
function handleFocusOut(event: FocusEvent) {
  const next = event.relatedTarget;
  if (!(next instanceof Node)) return;

  if (
    popoverContentRef.value?.contains(next) ||
    triggerRef.value?.contains(next)
  ) {
    return;
  }

  hidePopover();
}

function handleMenuClick(item: MenuItem) {
  emit('click', item);
  hidePopover();
}

function hidePopover() {
  popoverContentRef.value?.hidePopover();
}

function focusElement() {
  triggerRef.value?.focus();
}

defineExpose({ triggerRef, focusElement, hidePopover });

const emit = defineEmits<{
  click: [event: MenuItem];
}>();
</script>

<template>
  <div class="popover-wrapper">
    <button
      ref="popoverTrigger"
      type="button"
      :popovertarget="id"
      :disabled="loading || disabled"
      :class="[
        'popover-trigger',
        `popover-trigger-variant--${buttonVariant}`,
        `popover-trigger-size--${size}`,
        `popover-icon-position--${iconPos}`,
      ]"
      :style="computedStyle"
      :aria-describedby="ariaDescribedby"
      @focusout="handleFocusOut"
    >
      <Icon v-if="loading" name="svg-spinners:90-ring-with-bg" />
      <Icon v-else :name="icon" />

      <template v-if="label">
        <span
          :id="'popover-label-' + id"
          :class="hideLabel ? 'visuallyhidden' : undefined"
          class="popover-label"
        >
          {{ label }}
        </span>

        <Icon
          v-if="!hideLabel && showArrowIcon"
          name="material-symbols:keyboard-arrow-down-rounded"
        />
      </template>

      <span v-else :id="'popover-label-' + id" class="visuallyhidden">
        {{ $t('aria.popover') }}
      </span>
    </button>

    <div
      :id="id"
      ref="popoverContent"
      popover
      class="popover-content-wrapper"
      :data-placement="placement"
      :data-span="span"
      :style="contentStyle"
      @toggle="onToggle"
      @focusout="handleFocusOut"
    >
      <div class="popover-content">
        <slot name="default" />

        <MenuList
          v-if="list?.length"
          :list="list"
          button-size="lg"
          font-size="sm"
          icon-size="lg"
          :aria-labelledby="'popover-label-' + id"
          @click="handleMenuClick($event)"
        >
          <template #menu-list-item="{ item }">
            <slot name="menu-list-item" :item="item" />
          </template>
        </MenuList>

        <slot name="content" />
      </div>
    </div>
  </div>
</template>

<style>
.popover-trigger {
  flex-grow: 1;
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  border: 1px solid transparent;
  border-radius: var(--popover-radius);
  transition-property: color, background-color, opacity;
  transition-duration: var(--duration-sm);
  font-size: var(--popover-font-size);
  outline: 2px solid transparent;
  outline-offset: 2px;

  &:focus-visible {
    outline-color: var(--focus-color);
  }

  &:disabled {
    opacity: 35%;
  }

  &:not(:disabled):hover {
    background-color: color-mix(
      in srgb,
      var(--color-grey-bg) 95%,
      var(--color-black)
    );
  }
}

.popover-content-wrapper {
  position-area: var(--popover-placement, block-end);
  position-try-fallbacks:
    flip-block,
    flip-inline,
    flip-block flip-inline;
  position-try-order: most-block-size;
  margin: 0;
  inset: auto;
  max-inline-size: var(--popover-max-width, none);
  border: 1px solid var(--popover-border-color);
  border-radius: var(--radius-md);
  background-color: var(--color-card-bg);
  transition-property: display, overlay, opacity, translate;
  transition-duration: 0s;
  transition-behavior: allow-discrete;

  &:popover-open {
    opacity: 1;
    translate: 0 0;
    transition-duration: var(--duration-sm);

    @starting-style {
      opacity: 0;
    }
  }

  p {
    &:first-child {
      margin-block-start: 0;
    }
    &:last-child {
      margin-block-end: 0;
    }
  }

  .menu-list-nav {
    padding: 0.25rem;

    .menu-list {
      min-width: 240px;
    }

    .menu-list-item {
      > .button {
        border-radius: var(--radius-md);
      }

      + .menu-list-item {
        margin-block-start: 0.25rem;
      }

      hr {
        margin-block: 0.5rem;
      }
    }
  }
}

.popover-content-wrapper[data-placement='top'] {
  --popover-placement: block-start;
  margin-block: 0.5rem;

  &:popover-open {
    @starting-style {
      translate: 0 0.5rem;
    }
  }

  &[data-span='left'] {
    position-area: var(--popover-placement) span-inline-start;
  }
  &[data-span='right'] {
    position-area: var(--popover-placement) span-inline-end;
  }
}

.popover-content-wrapper[data-placement='bottom'] {
  --popover-placement: block-end;
  margin-block: 0.5rem;

  &:popover-open {
    @starting-style {
      translate: 0 -0.5rem;
    }
  }

  &[data-span='left'] {
    position-area: var(--popover-placement) span-inline-start;
  }
  &[data-span='right'] {
    position-area: var(--popover-placement) span-inline-end;
  }
}

.popover-content-wrapper[data-placement='left'] {
  --popover-placement: inline-start;
  margin-inline-end: 0.5rem;

  &:popover-open {
    @starting-style {
      translate: 0.5rem 0;
    }
  }

  &[data-span='top'] {
    position-area: var(--popover-placement) span-block-start;
  }
  &[data-span='bottom'] {
    position-area: var(--popover-placement) span-block-end;
  }
}

.popover-content-wrapper[data-placement='right'] {
  --popover-placement: inline-end;
  margin-inline-start: 0.5rem;

  &:popover-open {
    @starting-style {
      translate: -0.5rem 0;
    }
  }

  &[data-span='top'] {
    position-area: var(--popover-placement) span-block-start;
  }
  &[data-span='bottom'] {
    position-area: var(--popover-placement) span-block-end;
  }
}

.popover-icon-position--start {
  flex-direction: row;
}

.popover-icon-position--end {
  flex-direction: row-reverse;
}

.popover-trigger-variant--outline {
  background-color: var(--color-input-bg);
  border-color: var(--popover-border-color);

  &:not(:disabled):hover {
    background-color: var(--color-grey-bg);
  }
}

.popover-trigger-variant--primary {
  --focus-color: var(--color-accent-text);
  /* Always white on purple, also in dark mode */
  color: var(--color-on-accent);
  background-color: var(--color-accent);

  &:not(:disabled, .disabled):hover {
    background-color: var(--color-accent-hover);
  }
}

.popover-trigger-variant--secondary {
  color: var(--color-text);
  background-color: var(--color-grey-bg);

  &:not(:disabled):hover {
    background-color: color-mix(
      in srgb,
      var(--color-grey-bg) 95%,
      var(--color-black)
    );
  }
}

.popover-trigger-variant--ghost {
  color: var(--color-text);
  background-color: transparent;

  &:not(:disabled):hover {
    background-color: var(--color-ghost-hover-bg);
  }
}

.popover-trigger-size--xxs {
  position: relative;
  height: 1.25rem;
  min-width: 1.25rem;
  font-size: var(--popover-font-size, var(--font-size-xs));
  padding-inline: 0.125rem;

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

  .popover-label {
    padding-inline: 0.1rem;
  }

  .iconify {
    font-size: var(--popover-icon-size, var(--font-size-sm));
  }
}

.popover-trigger-size--xs {
  height: 1.5rem;
  min-width: 1.5rem;
  font-size: var(--popover-font-size, var(--font-size-sm));
  padding-inline: 0.25rem;

  .popover-label {
    padding-inline: 0.75rem;
  }

  .iconify {
    font-size: var(--popover-icon-size, var(--font-size-md));
  }
}

.popover-trigger-size--sm {
  height: 2rem;
  min-width: 2rem;
  font-size: var(--popover-font-size, var(--font-size-sm));
  padding-inline: 0.35rem;

  .popover-label {
    padding-inline: 0.1rem;
  }

  .iconify {
    font-size: var(--popover-icon-size, var(--font-size-md));
  }
}

.popover-trigger-size--md {
  height: 2.5rem;
  min-width: 2.5rem;
  font-size: var(--popover-font-size, var(--font-size-md));
  padding-inline: 0.5rem;

  .popover-label {
    padding-inline: 0.2rem;
  }

  .iconify {
    font-size: var(--popover-icon-size, var(--font-size-lg));
  }
}

.popover-trigger-size--lg {
  height: 2.75rem;
  min-width: 2.75rem;
  font-size: var(--popover-font-size, var(--font-size-md));
  padding-inline: 0.5rem;

  .popover-label {
    padding-inline: 0.2rem;
  }

  .iconify {
    font-size: var(--popover-icon-size, var(--font-size-lg));
  }
}

.popover-trigger-size--xl {
  height: 3rem;
  min-width: 3rem;
  font-size: var(--popover-font-size, var(--font-size-lg));
  padding-inline: 0.75rem;

  .popover-label {
    padding-inline: 0.25rem;
  }

  .iconify {
    font-size: var(--popover-icon-size, var(--font-size-xl));
  }
}
</style>
