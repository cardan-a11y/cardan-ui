<script setup lang="ts">
const activeTab = defineModel<string>();

const {
  tabs,
  size = 'sm',
  fontSize = 'sm',
  iconSize = undefined,
  variant = 'default',
  color = 'text',
  ariaLabel = undefined,
} = defineProps<{
  tabs: TabOption[];
  size?: TabsSize;
  fontSize?: FontSize;
  iconSize?: FontSize;
  variant?: TabsVariant;
  color?: 'text' | 'green' | 'accent';
  ariaLabel?: string;
}>();

// Two Tabs on a page may share tab values: the ids are per instance
const id = useId();
const tablistRef = useTemplateRef<HTMLElement>('tablist');
const tabpanelRef = useTemplateRef('tabpanel');

/** The enabled tabs in the order they are on the page */
function enabledTabElements() {
  return Array.from(
    tablistRef.value?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]:not(:disabled)',
    ) ?? [],
  );
}

/** Focus and select: the tabs activate automatically */
function activate(tab?: HTMLButtonElement) {
  tab?.focus();
  tab?.click();
}

/** The tab before or after the one with focus, around the ends */
function handleStep(event: KeyboardEvent, step: 1 | -1) {
  const tabs = enabledTabElements();
  const index = tabs.indexOf(event.currentTarget as HTMLButtonElement);
  activate(tabs.at((index + step) % tabs.length));
}

function handleFirstTab() {
  activate(enabledTabElements()[0]);
}

function handleLastTab() {
  activate(enabledTabElements().at(-1));
}

function setActiveTab(tab: TabOption) {
  activeTab.value = tab.value;
}

/**
 * The tab that is in the tab order: the selected one, or the first enabled
 * one while nothing is selected, so the tab list can be reached
 */
const focusableTab = computed(() => {
  const selected = tabs.find(
    (tab) => tab.value === activeTab.value && !tab.disabled,
  );
  return (selected ?? tabs.find((tab) => !tab.disabled))?.value;
});

/**
 * A panel without focusable content is in the tab order itself, so Tab from
 * the tab list reaches it (APG)
 */
const panelHasFocusable = ref(true);

function updatePanelTabindex() {
  const panel = document.getElementById(`${id}-tabpanel-${activeTab.value}`);
  panelHasFocusable.value = !panel || !!panel.querySelector(focusableSelector);
}

onMounted(updatePanelTabindex);
watch(activeTab, updatePanelTabindex, { flush: 'post' });
// Also content that arrives after the tab was selected
onUpdated(updatePanelTabindex);

function focusTabpanel() {
  tabpanelRef.value?.focus();
}

defineExpose({
  setActiveTab,
  focusTabpanel,
});
</script>

<template>
  <div
    :class="[
      'tabs-wrapper',
      `tabs-variant--${variant}`,
      `tabs-color--${color}`,
      `tabs-size--${size}`,
    ]"
    :style="{
      '--tabs-font-size': `var(--font-size-${fontSize})`,
      '--tabs-icon-size': iconSize && `var(--font-size-${iconSize})`,
    }"
  >
    <div ref="tablist" class="tablist" role="tablist" :aria-label="ariaLabel">
      <template v-for="tab in tabs" :key="'tab-' + tab.value">
        <button
          :id="`${id}-tab-${tab.value}`"
          type="button"
          class="tab"
          role="tab"
          :aria-selected="tab.value === activeTab"
          :tabindex="tab.value === focusableTab ? '0' : '-1'"
          :aria-controls="`${id}-tabpanel-${tab.value}`"
          :disabled="tab.disabled"
          @keydown.left.prevent="handleStep($event, -1)"
          @keydown.right.prevent="handleStep($event, 1)"
          @keydown.home.prevent="handleFirstTab()"
          @keydown.end.prevent="handleLastTab()"
          @click="setActiveTab(tab)"
        >
          <Icon v-if="tab.icon" :name="tab.icon" />
          <span class="tab-text">{{ tab.label }}</span>
        </button>
      </template>
    </div>

    <slot name="top" />

    <slot name="tabpanel" />

    <div
      v-if="!$slots.tabpanel"
      ref="tabpanel"
      class="tabpanel-wrapper"
      tabindex="-1"
    >
      <template v-for="tab in tabs" :key="tab.value">
        <div
          v-show="tab.value === activeTab"
          :id="`${id}-tabpanel-${tab.value}`"
          :aria-labelledby="`${id}-tab-${tab.value}`"
          role="tabpanel"
          class="tabpanel"
          :tabindex="tab.value === activeTab && !panelHasFocusable ? '0' : '-1'"
        >
          <slot :name="tab.value" />
        </div>
      </template>
    </div>

    <slot name="bottom" />
  </div>
</template>

<style>
.tabs-wrapper {
  .tabpanel-wrapper {
    outline: 1px solid transparent;
  }

  .tabpanel {
    display: grid;
    padding-block-start: 1rem;
  }
}

.tablist {
  font-size: var(--tabs-font-size, var(--font-size-sm));
  flex-wrap: wrap;
  align-items: center;

  .tab {
    position: relative;
    -webkit-user-select: none;
    user-select: none;
    font-weight: var(--font-weight-medium);
    background: transparent;
    border: none;
    display: flex;
    gap: 0.25rem;
    text-align: center;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    padding-inline: 0;
    padding-block-end: 0.65rem;
    border-block-end: 1px solid var(--color-grey-bg);
    transition-property:
      color, background-color, box-shadow, outline-color, outline-offset;
    transition-duration: var(--duration-sm);
    transition-timing-function: ease-in-out;

    /* disable focus outline on tab */
    outline-color: transparent;

    .iconify {
      color: var(--color-grey-text);
      font-size: var(--tabs-icon-size, larger);
      margin-inline-end: 0.125rem;
    }

    &:hover:not(:disabled, [aria-selected='true']) {
      color: var(--color-text);
      border-color: var(--color-grey-graphic);

      .iconify {
        color: var(--color-text);
      }
    }

    &[aria-selected='true'] {
      .iconify {
        color: inherit;
      }
    }

    &:disabled {
      opacity: 0.35;
      border-color: transparent;
    }
  }

  /* show focus outline on tab list */
  &:has(:focus-visible) {
    outline-offset: 2px;
    outline: 2px solid var(--focus-color);
    border-radius: var(--radius-xs);
  }
}

/* Tabs variants */
.tabs-variant--default {
  > .tablist {
    display: flex;
    border-block-end: 1px solid var(--color-grey-bg);

    .tab {
      margin-block-end: -0.0625rem;
    }
  }
}

.tabs-variant--minimal {
  > .tablist {
    display: inline-flex;

    .tab {
      border-width: 2px;
    }
  }
}

.tabs-color--text {
  .tab {
    color: var(--color-grey-text);
  }
  .tablist .tab[aria-selected='true'] {
    color: var(--color-text);
    border-color: var(--color-text);
  }
}

.tabs-color--green {
  .tablist .tab[aria-selected='true'] {
    color: var(--color-green-text);
    border-color: var(--color-green-graphic);
  }
}

.tabs-color--accent {
  .tablist .tab[aria-selected='true'] {
    color: var(--color-accent-text);
    border-color: var(--color-accent-graphic);
  }
}

/* Tabs sizes */
.tabs-size--xs {
  .tablist {
    gap: 1.5rem;
  }
}

.tabs-size--sm {
  .tablist {
    gap: 2rem;
  }
}

.tabs-size--md {
  .tablist {
    gap: 2.5rem;
  }
}
</style>
