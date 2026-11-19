<script setup lang="ts">
// After https://github.com/vue-a11y/vue-focus-loop/tree/next

/**
 * Keeps Tab and Shift+Tab in its content while it is visible. A modal loop
 * (the default) also makes the rest of the page `inert`, except live regions
 * and the toasts, until it closes or unmounts.
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

let inertElements: Element[] = [];

const active = computed(() => isVisible && !disabled);
const sentinelTabindex = computed(() => (disabled ? '-1' : '0'));

// Sync: the page must not be inert when the browser restores focus on close
watch(active, init, { flush: 'sync' });

onMounted(init);

onBeforeUnmount(release);

function init() {
  if (!active.value) {
    release();
    return;
  }

  nextTick(() => {
    if (!active.value || !containerRef.value) return;
    focusFirst();
    lock(containerRef.value);
  });
}

function elementsOutside(container: HTMLElement) {
  const elements: Element[] = [];

  function take(element: Element) {
    if (element.hasAttribute('aria-live')) return;

    if (element.querySelector('.toast-manager, .announcer')) {
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

function focusFirst() {
  if (!autoFocus) return;

  const elements = getFocusableElements();
  const autofocusElement = elements.find((element) =>
    element.hasAttribute('autofocus'),
  );

  (autofocusElement ?? elements[0])?.focus();
}

function getFocusableElements() {
  return Array.from(
    contentRef.value?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
  ).filter(
    (element) =>
      !element.closest('[inert]') &&
      element.checkVisibility({ visibilityProperty: true }),
  );
}

function cameFromContent(event: FocusEvent) {
  const previous = event.relatedTarget;
  return previous instanceof Node && !!contentRef.value?.contains(previous);
}

function handleFocusStart(event: FocusEvent) {
  const elements = getFocusableElements();
  const index = cameFromContent(event) ? elements.length - 1 : 0;
  elements[index]?.focus();
}

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
