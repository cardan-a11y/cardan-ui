<script setup lang="ts">
/**
 * The main content and a side panel, after it unless `side="start"`. `beside`
 * is the viewport width from which the panel sits beside the main column
 * (`md` 768px, `lg` 1024px, `xl` 1280px), or a boolean; below it they stack.
 * `sticky` keeps the panel under the header, scrolling on its own when taller.
 * A panel of text alone, without focusable content, takes `side-label`: it is
 * then a named `aside` and a tab stop while it scrolls. Without it, the
 * content brings its own landmark and name.
 *
 * Custom properties: `--sidebar-layout-side-width`, `--sidebar-layout-gap`,
 * `--sidebar-layout-padding-start`, `--sidebar-layout-padding-end`,
 * `--sidebar-layout-top` (under AppHeader and `--app-header-sticky-below` by
 * default), `--sidebar-layout-scrollbar-gutter` and
 * `--sidebar-layout-outline-room` (0.25rem, room for focus outlines).
 */
const {
  side = 'end',
  beside = 'lg',
  sticky = false,
  sideLabel = undefined,
} = defineProps<{
  side?: 'start' | 'end';
  beside?: 'md' | 'lg' | 'xl' | boolean;
  sticky?: boolean;
  /** Names the panel, as its `aside`, and lets it take focus while it scrolls */
  sideLabel?: string;
}>();

const sideRef = useTemplateRef<HTMLElement>('side');

const scrolls = ref(false);
const focused = ref(false);

const ROUNDING_TOLERANCE_PX = 1;

function measure(panel: HTMLElement) {
  scrolls.value =
    getComputedStyle(panel).overflowY !== 'visible' &&
    panel.scrollHeight > panel.clientHeight + ROUNDING_TOLERANCE_PX;
}

watch(
  [sideRef, () => sticky && !!sideLabel],
  ([panel, watched], _, onCleanup) => {
    scrolls.value = false;
    focused.value = false;
    if (!panel || !watched) return;

    focused.value = document.activeElement === panel;
    const onFocus = () => (focused.value = true);
    const onBlur = () => (focused.value = false);
    panel.addEventListener('focus', onFocus);
    panel.addEventListener('blur', onBlur);

    const resizes = new ResizeObserver(() => measure(panel));
    const observePanelAndContent = () => {
      resizes.disconnect();
      resizes.observe(panel);
      for (const child of panel.children) resizes.observe(child);
    };
    const mutations = new MutationObserver(observePanelAndContent);
    observePanelAndContent();
    mutations.observe(panel, { childList: true });

    onCleanup(() => {
      resizes.disconnect();
      mutations.disconnect();
      panel.removeEventListener('focus', onFocus);
      panel.removeEventListener('blur', onBlur);
    });
  },
  { flush: 'post' },
);

// A tab stop while it scrolls: WebKit does not focus a scroll container
// itself, as Chromium and Firefox do. Can go once WebKit does.
function sideTabindex() {
  if (!sideLabel) return undefined;
  if (scrolls.value) return 0;
  return focused.value ? -1 : undefined;
}

const sideAttrs = computed(() => ({
  'aria-label': sideLabel,
  tabindex: sideTabindex(),
}));
</script>

<template>
  <div
    :class="[
      'sidebar-layout',
      `sidebar-layout--side-${side}`,
      $slots.side && 'has-side',
      typeof beside === 'string' && `beside-${beside}`,
      beside === true && 'is-beside',
      sticky && 'is-sticky',
    ]"
  >
    <component
      :is="sideLabel ? 'aside' : 'div'"
      v-if="$slots.side && side === 'start'"
      ref="side"
      class="sidebar-layout-side"
      v-bind="sideAttrs"
    >
      <slot name="side" />
    </component>

    <div class="sidebar-layout-main">
      <slot />
    </div>

    <component
      :is="sideLabel ? 'aside' : 'div'"
      v-if="$slots.side && side === 'end'"
      ref="side"
      class="sidebar-layout-side"
      v-bind="sideAttrs"
    >
      <slot name="side" />
    </component>
  </div>
</template>

<style>
.sidebar-layout {
  --sidebar-layout-sticky-top: var(
    --sidebar-layout-top,
    calc(var(--app-header-height) + 1px + var(--app-header-sticky-below, 0px))
  );

  /* Space toggle: empty while beside; `initial` while stacked, which makes
     every declaration that starts with it invalid */
  --sidebar-layout-beside: initial;

  display: grid;
  grid-template-columns:
    var(--sidebar-layout-beside)
    var(--sidebar-layout-tracks);
  gap: var(--sidebar-layout-gap, 1.5rem);

  &.has-side {
    --sidebar-layout-tracks: minmax(0, 1fr)
      var(--sidebar-layout-side-width, 20rem);

    &.sidebar-layout--side-start {
      --sidebar-layout-tracks: var(--sidebar-layout-side-width, 20rem)
        minmax(0, 1fr);
    }

    &.is-beside {
      --sidebar-layout-beside: ;
    }

    &.beside-md {
      @media (min-width: 768px) {
        --sidebar-layout-beside: ;
      }
    }

    &.beside-lg {
      @media (min-width: 1024px) {
        --sidebar-layout-beside: ;
      }
    }

    &.beside-xl {
      @media (min-width: 1280px) {
        --sidebar-layout-beside: ;
      }
    }
  }
}

.sidebar-layout-main,
.sidebar-layout-side {
  padding-block: var(--sidebar-layout-padding-start, 0)
    var(--sidebar-layout-padding-end, 2.5rem);
}

.sidebar-layout.has-side {
  > :first-child {
    padding-block-end: var(--sidebar-layout-beside)
      var(--sidebar-layout-padding-end, 2.5rem);
  }

  > :last-child {
    padding-block-start: var(--sidebar-layout-beside)
      var(--sidebar-layout-padding-start, 0);
  }
}

.sidebar-layout-main {
  min-width: 0;
}

.sidebar-layout-side {
  align-self: start;
}

.sidebar-layout.is-sticky > .sidebar-layout-side {
  @media (min-width: 360px) and (min-height: 480px) {
    position: sticky;
    top: var(--sidebar-layout-sticky-top);
    max-height: var(--sidebar-layout-beside)
      calc(100dvh - var(--sidebar-layout-sticky-top));
    overflow-y: var(--sidebar-layout-beside) auto;
    overscroll-behavior: contain;
    scrollbar-gutter: var(--sidebar-layout-scrollbar-gutter, auto);
    margin-inline: var(--sidebar-layout-beside)
      calc(-1 * var(--sidebar-layout-outline-room, 0.25rem));
    padding-inline: var(--sidebar-layout-beside)
      var(--sidebar-layout-outline-room, 0.25rem);
  }
}

.sidebar-layout-side[tabindex]:focus-visible {
  outline: 2px solid var(--focus-color);
  outline-offset: -2px;
}
</style>
