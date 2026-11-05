<script setup lang="ts">
/**
 * A section that opens and closes, after the APG accordion pattern: a button
 * with `aria-expanded` and `aria-controls`, in a heading (`h-tag`), and the
 * panel it controls, inert while closed. The height animates in CSS; the
 * panel clips its content while closed or moving, and lets it out once open
 * and at rest.
 */
const {
  id = useId(),
  minHeight = 0,
  arrow = true,
  icon = 'material-symbols:chevron-right-rounded',
  iconPos = 'end',
  iconSize = undefined,
  ariaLabel = undefined,
  tabindex = undefined,
  open = undefined,
  hTag = undefined,
  region = false,
} = defineProps<{
  minHeight?: number;
  id?: string;
  icon?: string;
  iconPos?: 'start' | 'end';
  iconSize?: FontSize;
  ariaLabel?: string;
  tabindex?: string;
  arrow?: boolean;
  open?: boolean;
  /**
   * The heading around the trigger (`h2`, `h3`, …), at the level the
   * section's title has in the page. Without it the trigger is in a plain
   * wrapper and is no heading.
   */
  hTag?: string;
  /**
   * Makes the panel a `region` landmark named by its trigger: for a panel
   * with headings or nested accordions of its own, not for a page with many
   * accordions, where the landmarks would pile up.
   */
  region?: boolean;
}>();

const isExpanded = ref(open ?? false);
const panelWrapperRef = useTemplateRef<HTMLElement>('panelWrapper');
const panelRef = useTemplateRef<HTMLElement>('panel');

watch(
  () => open,
  (value) => {
    isExpanded.value = value ?? false;
  },
);

function toggleAccordion() {
  isExpanded.value = !isExpanded.value;
}

/**
 * Hidden while the panel is closed or still moving, so it never paints over
 * what follows; visible once it is open and at rest, so a focus outline or a
 * popover in it is not cut off.
 */
function updateOverflow() {
  const moving = !!panelWrapperRef.value?.getAnimations?.().length;

  panelRef.value?.style.setProperty(
    '--overflow',
    isExpanded.value && !moving ? 'visible' : 'hidden',
  );
}

// Hidden at once, then checked again once the transition, if there is one,
// has started: without one (reduced motion makes the durations 0s) no
// transitionend ever comes.
watch(isExpanded, async () => {
  panelRef.value?.style.setProperty('--overflow', 'hidden');
  await nextTick();
  requestAnimationFrame(updateOverflow);
});

// Also on a cancelled transition (the wrapper hidden halfway, as in a dialog
// that closes), after which the panel is at rest without a transitionend.
function handleTransitionDone(event: TransitionEvent) {
  if (event.propertyName === 'grid-template-rows') {
    updateOverflow();
  }
}

onMounted(updateOverflow);

defineExpose({ toggleAccordion });
</script>

<template>
  <div :class="['accordion-wrapper', isExpanded && 'accordion-wrapper--open']">
    <component :is="hTag ?? 'div'" class="accordion-header">
      <button
        :id="`accordion-trigger-${id}`"
        :aria-controls="`accordion-panel-${id}`"
        :aria-expanded="isExpanded"
        :aria-label="ariaLabel"
        :tabindex="tabindex"
        type="button"
        :class="['accordion-trigger', `accordion-icon-position--${iconPos}`]"
        :style="{
          '--accordion-icon-size': iconSize && `var(--font-size-${iconSize})`,
        }"
        @click.stop="toggleAccordion"
      >
        <Icon
          v-if="arrow && iconPos === 'start'"
          :name="icon"
          class="accordion-arrow"
        />

        <slot v-if="$slots.trigger" name="trigger" mdc-unwrap="p" />

        <span v-else class="visuallyhidden">{{ $t('general.expand') }}</span>

        <Icon
          v-if="arrow && iconPos === 'end'"
          :name="icon"
          class="accordion-arrow"
        />

        <slot />
      </button>
    </component>

    <div
      :id="`accordion-panel-${id}`"
      ref="panelWrapper"
      :role="region ? 'region' : undefined"
      :aria-labelledby="region ? `accordion-trigger-${id}` : undefined"
      :inert="!isExpanded"
      class="accordion-panel-wrapper"
      @transitionend="handleTransitionDone"
      @transitioncancel="handleTransitionDone"
    >
      <div
        ref="panel"
        class="accordion-panel"
        :style="`--min-height: ${minHeight}px`"
      >
        <slot name="content" />
      </div>
    </div>
  </div>
</template>

<style>
/* The heading is only there for the outline: the trigger sets the look, so
   the heading's font, margin, balancing and hyphenation do not reach it. */
.accordion-header {
  margin: 0;
  font: inherit;
  text-wrap: inherit;
  -webkit-hyphens: inherit;
  hyphens: inherit;
}

.accordion-panel-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--duration-md) var(--cubic-bezier);
}

.accordion-panel {
  overflow: var(--overflow, hidden);
  min-height: var(--min-height);
}

.accordion-wrapper--open > .accordion-panel-wrapper {
  grid-template-rows: 1fr;
}

.accordion-trigger[aria-expanded='true'] .accordion-arrow {
  rotate: 0.25turn;
}

.accordion-trigger {
  position: relative;
  padding-inline: 0;
  background: transparent;
  border: none;
  text-align: left;
  border-radius: var(--radius-xs);
  width: 100%;
  display: flex;
  align-items: center;
  outline-offset: 2px;

  transition-property: color, border-color, outline-offset, outline-color;
  transition-duration: var(--duration-sm);

  &:hover {
    .accordion-arrow {
      color: var(--color-accent-graphic);
    }
  }

  &:focus-visible {
    outline: 2px dotted var(--focus-color);
    border-color: transparent;
  }

  .accordion-arrow {
    font-size: var(--accordion-icon-size, inherit);
    transition:
      rotate var(--duration-md),
      color var(--duration-sm);
  }
}

.accordion-icon-position--start .accordion-arrow {
  margin-inline-end: 0.125em;
}

.accordion-icon-position--end .accordion-arrow {
  margin-inline-start: 0.125em;
}
</style>
