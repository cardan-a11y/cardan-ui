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

const tabElements = ref<HTMLButtonElement[]>([]);
const tabpanelRef = useTemplateRef('tabpanel');

function handlePrevTab(tab: TabOption) {
  tabElements.value = tabElements.value.filter((x) => !x.disabled);
  const enabledTabs = tabs.filter((x) => !x.disabled);
  const currentIndex: number = enabledTabs.findIndex((x) => x === tab);
  let prevIndex: number;

  if (currentIndex === 0) {
    prevIndex = enabledTabs.length - 1;
  } else {
    prevIndex = currentIndex - 1;
  }

  const prevTab = tabElements.value[prevIndex];
  prevTab?.focus();
  prevTab?.click();
}

function handleNextTab(tab: TabOption) {
  tabElements.value = tabElements.value.filter((x) => !x.disabled);
  const enabledTabs = tabs.filter((x) => !x.disabled);
  const currentIndex: number = enabledTabs.findIndex((x) => x === tab);
  let nextIndex: number;

  if (currentIndex === enabledTabs.length - 1) {
    nextIndex = 0;
  } else {
    nextIndex = currentIndex + 1;
  }

  const nextTab = tabElements.value[nextIndex];
  nextTab?.focus();
  nextTab?.click();
}

/** The enabled tabs in their order, for Home and End */
function enabledTabElements() {
  return tabElements.value.filter((x) => !x.disabled);
}

function handleFirstTab() {
  const first = enabledTabElements()[0];
  first?.focus();
  first?.click();
}

function handleLastTab() {
  const last = enabledTabElements().at(-1);
  last?.focus();
  last?.click();
}

function setActiveTab(tab: TabOption) {
  activeTab.value = tab.value;
}

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
    <div class="tablist" role="tablist" :aria-label="ariaLabel">
      <template v-for="tab in tabs" :key="'tab-' + tab.value">
        <button
          :id="`tab-${tab.value}`"
          ref="tabElements"
          type="button"
          class="tab"
          role="tab"
          :aria-selected="tab.value === activeTab"
          :tabindex="tab.value === activeTab ? '0' : '-1'"
          :aria-controls="`tabpanel-${tab.value}`"
          :disabled="tab.disabled"
          @keydown.left.prevent="handlePrevTab(tab)"
          @keydown.right.prevent="handleNextTab(tab)"
          @keydown.home.prevent="handleFirstTab()"
          @keydown.end.prevent="handleLastTab()"
          @click="setActiveTab(tab)"
        >
          <span
            v-if="tab.icon?.startsWith('<svg')"
            class="html-icon"
            aria-hidden="true"
            v-html="tab.icon"
          />
          <Icon v-else-if="tab.icon" :name="tab.icon" />
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
          :id="`tabpanel-${tab.value}`"
          :aria-labelledby="`tab-${tab.value}`"
          role="tabpanel"
          class="tabpanel"
          tabindex="-1"
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

    .html-icon {
      display: grid;
      margin-inline-end: 0.5rem;

      svg {
        width: 1.25rem;
        height: 1.25rem;
      }
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
