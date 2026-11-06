<script setup lang="ts">
// https://github.com/vue-a11y/vue-focus-loop/tree/next

const focusableElementsSelector = [
  ...['input', 'select', 'button', 'textarea'].map(
    (field) => `${field}:not([disabled])`,
  ),
  'a[href]',
  'video[controls]',
  'audio[controls]',
  '[tabindex]:not([tabindex^="-"])',
  '[contenteditable]:not([contenteditable="false"])',
].join(',');

let ariaHiddenElements: Element[] = [];

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
  autoFocus?: boolean;
  modal?: boolean;
}>();

const focusLoopContainerRef = ref<InstanceType<any>>(null);
const focusLoopContentRef = ref<InstanceType<any>>(null);
const alreadyFocused = ref(false);
const getTabindex = computed(() => (disabled ? '-1' : '0'));

// Synchronous, so the rest of the page is no longer inert the moment the
// loop closes: the browser's own focus restore when a dialog closes, and a
// component that focuses its trigger, then work at once
watch([() => disabled, () => isVisible], init, { flush: 'sync' });

onMounted(init);

// Unmounted while still open, as when a link in a dialog leads to a page in
// another layout and the dialog goes with the old one before it has closed:
// the rest of the page would stay inert, and nothing on it could be clicked.
onBeforeUnmount(() => {
  if (isVisible && !disabled) {
    lockForSwipeScreenReader(false);
    ariaHiddenElements = [];
  }
});

function init() {
  const active = isVisible && !disabled;

  if (!active) {
    lockForSwipeScreenReader(false);
    ariaHiddenElements = [];
    return;
  }

  // The content renders in the next tick
  nextTick(() => {
    focusFirst(autoFocus);
    lockForSwipeScreenReader(true);
  });
}

function getElementsToAriaHidden(focusLoopContainer: HTMLElement) {
  function getElements(element: Element) {
    const children: Element[] = Array.from(element.children);
    children.forEach((el: Element) => {
      if (el === focusLoopContainer) return;
      if (!el.contains(focusLoopContainer)) {
        ariaHiddenElements.push(el);
        return;
      }
      getElements(el);
    });
  }
  getElements(document.body);
}

function lockForSwipeScreenReader(active: boolean = true) {
  if (active) getElementsToAriaHidden(focusLoopContainerRef.value);
  ariaHiddenElements.forEach((el) => {
    if (
      ['SCRIPT', 'STYLE'].includes(el.nodeName) ||
      el.hasAttribute('aria-live')
    ) {
      return;
    }

    if (!modal) return;

    if (active) el.setAttribute('inert', '');
    else el.removeAttribute('inert');
  });
}

/**
 * Runs from `init`, after the tick that renders the content, so the elements
 * are in the DOM; an opening animation does not keep an element from taking
 * focus.
 */
function focusFirst(isAutoFocus: boolean) {
  if (!isAutoFocus) return;

  const elements = Array.from(getFocusableElements());
  const autofocusElement = elements.find((x) => x?.autofocus === true);

  if (autofocusElement) autofocusElement.focus();
  else elements[0]?.focus();
}

function getFocusableElements(): HTMLElement[] {
  return (
    focusLoopContentRef.value?.querySelectorAll(focusableElementsSelector) ?? []
  );
}

function handleFocusStart() {
  const elements: HTMLElement[] = getFocusableElements();
  if (elements.length) {
    const index = alreadyFocused.value ? elements.length - 1 : 0;
    alreadyFocused.value = true;
    elements[index]?.focus();
  }
}

function handleFocusEnd() {
  const elements: HTMLElement[] = getFocusableElements();
  if (elements.length) {
    elements[0]?.focus();
  }
}
</script>

<template>
  <component
    :is="is"
    v-if="isVisible"
    ref="focusLoopContainerRef"
    class="vue-focus-loop"
  >
    <div :tabindex="getTabindex" @focus="handleFocusStart" />
    <div ref="focusLoopContentRef">
      <slot />
    </div>
    <div :tabindex="getTabindex" @focus="handleFocusEnd" />
  </component>
</template>
