<script setup lang="ts">
/** The APG accordion: a button in a heading (`h-tag`) that opens its panel */
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
  /** The heading around the trigger, at the section title's level; without it, no heading */
  hTag?: string;
  /**
   * Makes the panel a `region` named by its trigger: for a panel with headings
   * of its own, not for many accordions on a page, where landmarks pile up.
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
  emit('update:open', isExpanded.value);
}

const emit = defineEmits<{
  'update:open': [open: boolean];
}>();

function updateOverflow() {
  const moving = !!panelWrapperRef.value?.getAnimations?.().length;

  panelRef.value?.style.setProperty(
    '--accordion-overflow',
    isExpanded.value && !moving ? 'visible' : 'hidden',
  );
}

watch(isExpanded, async () => {
  panelRef.value?.style.setProperty('--accordion-overflow', 'hidden');
  await nextTick();
  requestAnimationFrame(updateOverflow);
});

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
        :style="`--accordion-min-height: ${minHeight}px`"
      >
        <slot name="content" />
      </div>
    </div>
  </div>
</template>

<style>
/* The heading is for the outline only: the trigger sets the look */
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
  overflow: var(--accordion-overflow, hidden);
  min-width: 0;
  min-height: var(--accordion-min-height);
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
