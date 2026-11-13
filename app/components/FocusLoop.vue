<script setup lang="ts">
// After https://github.com/vue-a11y/vue-focus-loop/tree/next

/**
 * Keeps keyboard focus in its content while it is visible: Tab past the last
 * element goes to the first, Shift+Tab before the first to the last. A modal
 * loop (the default) also marks the rest of the page `inert`, so a screen
 * reader's swipe and virtual cursor stay in the content too, and releases it
 * the moment the loop closes or unmounts.
 */
const {
  disabled,
  isVisible = false,
  autoFocus = true,
  modal = true,
  is = 'div',
} = defineProps<{
  is?: string;
  disabled?: boolean;
  isVisible?: boolean;
  /** Focus the first element, or the one with `autofocus`, when the loop opens */
  autoFocus?: boolean;
  /** Mark the rest of the page `inert` while the loop is open */
  modal?: boolean;
}>();

const containerRef = useTemplateRef<HTMLElement>('container');
const contentRef = useTemplateRef<HTMLElement>('content');

/** The elements this loop made inert, to release those and no others */
let inertElements: Element[] = [];

const active = computed(() => isVisible && !disabled);
const sentinelTabindex = computed(() => (disabled ? '-1' : '0'));

// Synchronous, so the rest of the page is no longer inert the moment the
// loop closes: the browser's own focus restore when a dialog closes, and a
// component that focuses its trigger, then work at once
watch(active, init, { flush: 'sync' });

onMounted(init);

// Unmounted while still open, as when a link in a dialog leads to a page in
// another layout and the dialog goes with the old one before it has closed:
// the rest of the page would stay inert, and nothing on it could be clicked.
onBeforeUnmount(release);

function init() {
  if (!active.value) {
    release();
    return;
  }

  // The content renders in the next tick. The loop may have closed again by
  // then: locking the page for a loop that is gone would leave it inert.
  nextTick(() => {
    if (!active.value || !containerRef.value) return;
    focusFirst();
    lock(containerRef.value);
  });
}

/**
 * The elements to make inert: the siblings of the container and of each of
 * its ancestors, up to body, whole. Two exceptions, so a toast is still
 * announced and can still be closed: a live region next to them, and the
 * element that holds the toasts (Nuxt's `#teleports`), whose children are
 * taken instead.
 */
function elementsOutside(container: HTMLElement) {
  const elements: Element[] = [];

  function take(element: Element) {
    if (element.hasAttribute('aria-live')) return;

    if (element.querySelector('.toast-manager')) {
      for (const child of element.children) take(child);
      return;
    }

    elements.push(element);
  }

  let node: Element = container;

  while (node.parentElement && node !== document.body) {
    for (const sibling of node.parentElement.children) {
      if (sibling !== node) take(sibling);
    }
    node = node.parentElement;
  }

  return elements;
}

/**
 * Marks the page outside the container inert, except what is inert already
 * (another loop's, which keeps it)
 */
function lock(container: HTMLElement) {
  release();
  if (!modal) return;

  for (const element of elementsOutside(container)) {
    if (
      ['SCRIPT', 'STYLE'].includes(element.nodeName) ||
      element.hasAttribute('inert')
    ) {
      continue;
    }

    element.setAttribute('inert', '');
    inertElements.push(element);
  }
}

function release() {
  inertElements.forEach((element) => element.removeAttribute('inert'));
  inertElements = [];
}

/**
 * Runs from `init`, after the tick that renders the content, so the elements
 * are in the DOM; an opening animation does not keep an element from taking
 * focus.
 */
function focusFirst() {
  if (!autoFocus) return;

  const elements = getFocusableElements();
  const autofocusElement = elements.find((element) =>
    element.hasAttribute('autofocus'),
  );

  (autofocusElement ?? elements[0])?.focus();
}

/**
 * The elements in the content that can take focus now: not hidden (the items
 * of a closed popover, a panel behind `v-show`) and not in an inert part (a
 * closed accordion's panel). One of those at either end would leave focus on
 * a sentinel.
 */
function getFocusableElements() {
  return Array.from(
    contentRef.value?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
  ).filter(
    (element) =>
      !element.closest('[inert]') &&
      element.checkVisibility({ visibilityProperty: true }),
  );
}

/** Whether the element that had focus before is in the content */
function cameFromContent(event: FocusEvent) {
  const previous = event.relatedTarget;
  return previous instanceof Node && !!contentRef.value?.contains(previous);
}

/**
 * The sentinel before the content: Shift+Tab from the first element wraps to
 * the last; Tab in from before the loop, or a focus from a script, goes to
 * the first
 */
function handleFocusStart(event: FocusEvent) {
  const elements = getFocusableElements();
  const index = cameFromContent(event) ? elements.length - 1 : 0;
  elements[index]?.focus();
}

/**
 * The sentinel after the content: Tab from the last element wraps to the
 * first; Shift+Tab in from after the loop goes to the last
 */
function handleFocusEnd(event: FocusEvent) {
  const elements = getFocusableElements();
  const index = cameFromContent(event) ? 0 : elements.length - 1;
  elements[index]?.focus();
}
</script>

<template>
  <component :is="is" v-if="isVisible" ref="container" class="vue-focus-loop">
    <div :tabindex="sentinelTabindex" @focus="handleFocusStart" />
    <div ref="content">
      <slot />
    </div>
    <div :tabindex="sentinelTabindex" @focus="handleFocusEnd" />
  </component>
</template>
