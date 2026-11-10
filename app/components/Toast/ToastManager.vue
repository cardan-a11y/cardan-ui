<script setup lang="ts">
const { toasts, hideToast } = useToast();

/**
 * A leaving toast collapses so the others slide into its place. Its height is
 * fixed first, because a height of `auto` cannot be animated.
 */
function lockHeight(element: Element) {
  if (element instanceof HTMLElement) {
    element.style.blockSize = `${element.offsetHeight}px`;
  }
}
</script>

<template>
  <!-- Nuxt renders a teleport to #teleports on the server too. One polite
       live region for every toast: the manager, so none is announced twice -->
  <Teleport to="#teleports">
    <div class="toast-manager" aria-live="polite">
      <TransitionGroup name="toast" @before-leave="lockHeight">
        <Toast
          v-for="toast in toasts"
          :key="toast.id"
          v-bind="toast"
          @hide="hideToast(toast.id)"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style>
.toast-manager {
  pointer-events: none;
  z-index: 99999;
  position: fixed;
  inset-inline: 0;
  inset-block: auto 0;
  width: 100vw;
  display: inline-flex;
  align-items: center;
  flex-direction: column;
  padding-inline: 0.75rem;

  @media (min-width: 768px) {
    inset-inline: auto 0;
    width: auto;
    padding-block-end: 1rem;
    align-items: flex-end;
  }
}
</style>
