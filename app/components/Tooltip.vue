<script setup lang="ts">
const {
  label = undefined,
  fontSize = undefined,
  iconSize = undefined,
  iconColor = undefined,
  tabindex = undefined,
  maxWidth = 400,
  placement = 'top',
  span = undefined,
  hideLabel = true,
  icon = 'material-symbols:help-outline-rounded',
  id = useId(),
} = defineProps<{
  label?: string;
  fontSize?: FontSize;
  iconSize?: FontSize;
  iconColor?: string;
  placement?: 'bottom' | 'top' | 'left' | 'right';
  span?: 'bottom' | 'top' | 'left' | 'right';
  icon?: string;
  hideLabel?: boolean;
  tabindex?: string;
  maxWidth?: number | 'none';
  id?: string;
}>();

const computedStyle = computed(() => ({
  '--tooltip-font-size': fontSize && `var(--font-size-${fontSize})`,
  '--tooltip-icon-size': iconSize && `var(--font-size-${iconSize})`,
  '--tooltip-icon-color': iconColor && `var(--color-${iconColor})`,
}));

const contentStyle = computed(() => ({
  '--tooltip-max-width':
    maxWidth === undefined
      ? undefined
      : maxWidth === 'none'
        ? 'none'
        : `${maxWidth}px`,
}));

const tooltipContentRef = useTemplateRef<HTMLDivElement | null>(
  'tooltipContent',
);

// Mirror the native popover's open state into a reactive ref. `@toggle` fires
// *after* the popover is shown, so gating the content with `v-if="isOpen"` adds
// the text into the (already visible) aria-live region on open — which is what
// makes a screen reader announce the toggletip. Focus stays on the trigger.
const isOpen = ref(false);

function onToggle(event: Event) {
  isOpen.value = (event as ToggleEvent).newState === 'open';
  if (!isOpen.value) unpark();
}

const triggerRef = useTemplateRef<HTMLButtonElement>('trigger');

/**
 * Whether a mousedown in the tooltip is moving focus: its default action
 * moves focus, from the tooltip's text to the nearest focusable element
 * around it, such as a `<main tabindex="-1">`. Until the next task.
 */
let pressedInside = false;

function onContentMousedown() {
  pressedInside = true;
  setTimeout(() => {
    pressedInside = false;
  });
}

/** The element around the tooltip that a press in it gave focus to */
let parked: Element | null = null;

function unpark() {
  parked?.removeEventListener('focusout', onFocusOut);
  parked = null;
}

/**
 * Native `popover=auto` dismisses on Escape and an outside press but not on
 * focus leaving the trigger, so close it when focus moves on to an element
 * outside the trigger and the tooltip, as Popover does. Not when it moves
 * nowhere, or because of a press in the tooltip, to select its text or
 * follow a link in it: it then closes on Escape, an outside press, or when
 * focus leaves the element the press gave it to for the page (the next Tab).
 */
function onFocusOut(event: Event) {
  const next = (event as FocusEvent).relatedTarget;
  const content = tooltipContentRef.value;
  if (!content?.matches(':popover-open') || !(next instanceof Element)) return;

  if (content.contains(next) || triggerRef.value?.contains(next)) {
    unpark();
    return;
  }

  if (pressedInside) {
    unpark();
    parked = next;
    next.addEventListener('focusout', onFocusOut);
    return;
  }

  content.hidePopover();
}

onBeforeUnmount(unpark);
</script>

<template>
  <div class="tooltip-wrapper" aria-live="polite">
    <button
      ref="trigger"
      type="button"
      class="tooltip-trigger-button"
      :popovertarget="id"
      :style="computedStyle"
      :tabindex="tabindex"
      @focusout="onFocusOut"
    >
      <span
        v-if="label && hideLabel"
        :id="'tooltip-label-' + id"
        class="icon-only visuallyhidden"
      >
        {{ $t('aria.more-info-about', { label }) }}
      </span>

      <span v-else-if="label && !hideLabel" :id="'tooltip-label-' + id">
        {{ label }}
        <span class="visuallyhidden">({{ $t('aria.more-info') }})</span>
      </span>

      <span v-else class="visuallyhidden">{{ $t('aria.more-info') }}</span>

      <Icon :name="icon" />
    </button>

    <div
      :id="id"
      ref="tooltipContent"
      popover
      class="tooltip-content-wrapper"
      :data-placement="placement"
      :data-span="span"
      :style="contentStyle"
      @toggle="onToggle"
      @mousedown="onContentMousedown"
      @focusout="onFocusOut"
    >
      <div v-if="isOpen" class="tooltip-content">
        <slot />
      </div>
    </div>
  </div>
</template>

<style>
.tooltip-content-wrapper {
  --tooltip-gap: 1rem;

  position-area: var(--tooltip-placement, block-start);
  position-try-fallbacks:
    flip-block,
    flip-inline,
    flip-block flip-inline;
  position-try-order: most-block-size;
  margin: 0;
  inset: auto;
  max-inline-size: var(--tooltip-max-width, none);
  border: 1px solid var(--popover-border-color);
  border-radius: var(--radius-md);
  color: var(--color-text);
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
}

.tooltip-content {
  font-size: var(--font-size-sm);
  padding-block: 1rem;
  padding-inline: 1.35rem;

  p {
    &:first-child {
      margin-block-start: 0;
    }
    &:last-child {
      margin-block-end: 0;
    }
  }
}

.tooltip-content-wrapper[data-placement='top'] {
  --tooltip-placement: block-start;
  margin-block-end: var(--tooltip-gap);

  &:popover-open {
    @starting-style {
      translate: 0 0.5rem;
    }
  }

  &[data-span='left'] {
    position-area: var(--tooltip-placement) span-inline-start;
  }
  &[data-span='right'] {
    position-area: var(--tooltip-placement) span-inline-end;
  }
}

.tooltip-content-wrapper[data-placement='bottom'] {
  --tooltip-placement: block-end;
  margin-block-start: var(--tooltip-gap);

  &:popover-open {
    @starting-style {
      translate: 0 -0.5rem;
    }
  }

  &[data-span='left'] {
    position-area: var(--tooltip-placement) span-inline-start;
  }
  &[data-span='right'] {
    position-area: var(--tooltip-placement) span-inline-end;
  }
}

.tooltip-content-wrapper[data-placement='left'] {
  --tooltip-placement: inline-start;
  margin-inline-end: var(--tooltip-gap);

  &:popover-open {
    @starting-style {
      translate: 0.5rem 0;
    }
  }

  &[data-span='top'] {
    position-area: var(--tooltip-placement) span-block-start;
  }
  &[data-span='bottom'] {
    position-area: var(--tooltip-placement) span-block-end;
  }
}

.tooltip-content-wrapper[data-placement='right'] {
  --tooltip-placement: inline-end;
  margin-inline-start: var(--tooltip-gap);

  &:popover-open {
    @starting-style {
      translate: -0.5rem 0;
    }
  }

  &[data-span='top'] {
    position-area: var(--tooltip-placement) span-block-start;
  }
  &[data-span='bottom'] {
    position-area: var(--tooltip-placement) span-block-end;
  }
}

.tooltip-trigger-button {
  position: relative;
  display: flex;
  gap: 0.35em;
  align-items: center;
  border: none;
  background: transparent;
  padding: 0;
  color: inherit;
  font-size: var(--tooltip-font-size, inherit);
  transition: color var(--duration-sm);

  &::after {
    /* increase click target */
    content: '';
    position: absolute;
    inset: -50%;
    margin: auto;
    min-width: 1.5rem;
    min-height: 1.5rem;
    max-width: 100%;
    max-height: 100%;
    z-index: 1;
  }

  &:focus-visible {
    border-radius: var(--radius-sm);

    &:has(.icon-only.visuallyhidden) {
      border-radius: var(--radius-full);
    }
    outline-offset: 2px;
  }

  .iconify {
    flex-shrink: 0;
    color: var(--tooltip-icon-color, var(--color-grey-text));
    font-size: var(--tooltip-icon-size, inherit);
    transition: color var(--duration-sm);
  }

  &:hover {
    cursor: help;

    .iconify {
      color: var(--color-text);
    }
  }
}
</style>
