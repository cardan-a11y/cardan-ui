<script setup lang="ts">
/**
 * A page in two columns: the main content and a side panel, which follows
 * the main content in the document unless `side="start"`.
 *
 * `beside` says from where the panel sits beside the main column: `md`
 * (768px), `lg` (1024px, the default) or `xl` (1280px) of viewport width, in
 * CSS, so it is right in the server's HTML too. An app with a breakpoint of
 * its own passes a boolean it works out itself. Below it the two are stacked.
 *
 * With `sticky` the panel stays in view under the header while the page
 * scrolls. It runs from there to the bottom of the viewport and scrolls on
 * its own when it is taller, so all of it stays within reach. For that, the
 * page's spacing above and below is each column's own, never the padding of
 * a wrapper: a sticky panel cannot enter its container's padding, and would
 * be cut off above it.
 *
 * The app's sizes are custom properties on the layout or an ancestor:
 * `--sidebar-layout-side-width`, `--sidebar-layout-gap` (between the columns,
 * stacked too), `--sidebar-layout-padding-start` and
 * `--sidebar-layout-padding-end` (also on one column alone), and
 * `--sidebar-layout-top`, where the panel sticks: under the header and what
 * the app keeps sticky below it (`--app-header-sticky-below`, AppHeader) by
 * default. `--sidebar-layout-scrollbar-gutter`
 * is the panel's `scrollbar-gutter`, and `--sidebar-layout-outline-room`
 * (0.25rem) the room around its content for focus outlines while it scrolls.
 *
 * A sticky panel that scrolls is reached with the keyboard through what is
 * focusable in it: scrolling follows focus. That holds for a list of links
 * or a form, not for text alone, such as an order summary: Chromium and
 * Firefox focus a scroll container themselves, unnamed, Safari does not, and
 * what lies below the fold is out of reach. Such a panel takes `side-label`.
 * The panel is then an `aside` with that name, the complementary landmark of
 * the page, and while it scrolls (sticky, beside the main column and taller
 * than its room) it is in the tab order itself, so the arrow keys, Page Down
 * and End scroll it in every browser. A panel that fits adds no tab stop.
 *
 * Exactly one element is named: the one that scrolls and takes focus. With
 * `side-label` the content brings no landmark or name of its own (a `div`,
 * not a second `aside`); without it the panel is a `div` and its content
 * brings the landmark (`aside`, `nav`) and its label.
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

/** Whether the panel scrolls on its own: sticky, beside, and too tall */
const scrolls = ref(false);
/** Whether the panel itself has focus, which it keeps once it stops scrolling */
const focused = ref(false);

function measure(panel: HTMLElement) {
  scrolls.value =
    getComputedStyle(panel).overflowY !== 'visible' &&
    // Rounding can put the two a pixel apart in a panel that fits
    panel.scrollHeight > panel.clientHeight + 1;
}

// The panel's box follows the viewport (its room, beside or stacked), its
// children follow the content
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
    const observeAll = () => {
      resizes.disconnect();
      resizes.observe(panel);
      for (const child of panel.children) resizes.observe(child);
    };
    const mutations = new MutationObserver(observeAll);
    observeAll();
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

/** In the tab order while it scrolls */
function sideTabindex() {
  if (!sideLabel) return undefined;
  if (scrolls.value) return 0;
  // Focused as it stops scrolling (a resize, zoom): still focusable, out of
  // the tab order; without a tabindex focus would drop to <body>
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
  /* Where the sticky panel starts: under the header, its line and what
     sticks below it */
  --sidebar-layout-sticky-top: var(
    --sidebar-layout-top,
    calc(var(--app-header-height) + 1px + var(--app-header-sticky-below, 0px))
  );

  /* Whether the panel sits beside the main column, as a switch: a
     declaration that starts with it applies while it is on (an empty value)
     and is invalid while it is off (`initial`), which leaves that property
     at its initial value. So the stacked state needs no rules of its own. */
  --sidebar-layout-beside: initial;

  display: grid;
  grid-template-columns:
    var(--sidebar-layout-beside)
    var(--sidebar-layout-tracks);
  /* Between the columns, beside each other or stacked */
  gap: var(--sidebar-layout-gap, 1.5rem);

  &.has-side {
    --sidebar-layout-tracks: minmax(0, 1fr)
      var(--sidebar-layout-side-width, 20rem);

    &.sidebar-layout--side-start {
      --sidebar-layout-tracks: var(--sidebar-layout-side-width, 20rem)
        minmax(0, 1fr);
    }

    /* The app says so, or the viewport is wide enough */
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
  /* The page's spacing, inside each column */
  padding-block: var(--sidebar-layout-padding-start, 0)
    var(--sidebar-layout-padding-end, 2.5rem);
}

/* Stacked, the page's spacing is above the first column and below the
   second, with the gap between them */
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
  /* Wide content (a table, a code block) scrolls in the column instead of
     widening it */
  min-width: 0;
}

.sidebar-layout-side {
  /* As tall as its content, so it has room to stick in its area */
  align-self: start;
}

/* While the header sticks (AppHeader). Stacked, the panel's area is as tall
   as the panel: it has nowhere to stick to and stays in the flow, and the
   declarations behind the switch do not apply. */
.sidebar-layout.is-sticky > .sidebar-layout-side {
  @media (min-width: 360px) and (min-height: 480px) {
    position: sticky;
    top: var(--sidebar-layout-sticky-top);
    max-height: var(--sidebar-layout-beside)
      calc(100dvh - var(--sidebar-layout-sticky-top));
    overflow-y: var(--sidebar-layout-beside) auto;
    overscroll-behavior: contain;
    /* `stable` keeps the scrollbar's room from the start, for a panel whose
       content grows and shrinks past the viewport (filters that fold open) */
    scrollbar-gutter: var(--sidebar-layout-scrollbar-gutter, auto);
    /* Room for the focus outlines of its content inside the box that clips
       them, without moving the content */
    margin-inline: var(--sidebar-layout-beside)
      calc(-1 * var(--sidebar-layout-outline-room, 0.25rem));
    padding-inline: var(--sidebar-layout-beside)
      var(--sidebar-layout-outline-room, 0.25rem);
  }
}

/* The panel in the tab order while it scrolls (`side-label`): its outline
   inside its box, where nothing clips it. Inline it lies in the outline room
   around the content; at the top, without `--sidebar-layout-padding-start`,
   on the content's first line. */
.sidebar-layout-side[tabindex]:focus-visible {
  outline: 2px solid var(--focus-color);
  outline-offset: -2px;
}
</style>
