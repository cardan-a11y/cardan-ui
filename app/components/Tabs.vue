<script setup lang="ts">
/**
 * The APG tabs pattern with automatic activation: a tab that gets focus by
 * an arrow key, Home or End is selected and shows its panel. Left and Right
 * wrap around the ends and pass over a disabled tab; the list is one tab
 * stop, on the selected tab, or on the first enabled one while the selected
 * tab is disabled or nothing is selected. The open panel is the next stop.
 *
 * A panel is the slot named after its tab's value. The `tabpanel` slot
 * instead renders one panel for every tab, such as a list the tab filters,
 * labelled by the selected tab.
 */

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

const id = useId();
const tablistRef = useTemplateRef<HTMLElement>('tablist');
const tabpanelRef = useTemplateRef('tabpanel');

function enabledTabElements() {
  return Array.from(
    tablistRef.value?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]:not(:disabled)',
    ) ?? [],
  );
}

function activate(tab?: HTMLButtonElement) {
  tab?.focus();
  tab?.click();
}

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

const focusableTab = computed(() => {
  const selected = tabs.find(
    (tab) => tab.value === activeTab.value && !tab.disabled,
  );
  return (selected ?? tabs.find((tab) => !tab.disabled))?.value;
});

function focusTabpanel() {
  tabpanelRef.value?.focus();
}

const slots = useSlots();

const tabId = (index: number) => `${id}-tab-${index}`;
const panelId = (index: number) =>
  slots.tabpanel ? `${id}-tabpanel` : `${id}-tabpanel-${index}`;

const selectedIndex = computed(() =>
  tabs.findIndex((tab) => tab.value === activeTab.value),
);

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
      <template v-for="(tab, index) in tabs" :key="'tab-' + tab.value">
        <button
          :id="tabId(index)"
          type="button"
          class="tab"
          role="tab"
          :aria-selected="tab.value === activeTab"
          :tabindex="tab.value === focusableTab ? '0' : '-1'"
          :aria-controls="panelId(index)"
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

    <div ref="tabpanel" class="tabpanel-wrapper" tabindex="-1">
      <div
        v-if="$slots.tabpanel"
        :id="panelId(0)"
        :aria-labelledby="selectedIndex >= 0 ? tabId(selectedIndex) : undefined"
        role="tabpanel"
        class="tabpanel"
        tabindex="0"
      >
        <slot name="tabpanel" />
      </div>

      <template v-else>
        <template v-for="(tab, index) in tabs" :key="tab.value">
          <div
            v-show="tab.value === activeTab"
            :id="panelId(index)"
            :aria-labelledby="tabId(index)"
            role="tabpanel"
            class="tabpanel"
            :tabindex="tab.value === activeTab ? '0' : '-1'"
          >
            <slot :name="tab.value" />
          </div>
        </template>
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

  &:has(:focus-visible) {
    outline-offset: 2px;
    outline: 2px solid var(--focus-color);
    border-radius: var(--radius-xs);
  }
}

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
