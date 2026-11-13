<script setup lang="ts">
/**
 * Shows the toasts of `useToast()` at the bottom of the page. A toast fired
 * while a modal dialog is open (Dialog, MobileMenu) shows under its backdrop:
 * the browser makes everything outside the dialog inert, so it cannot be
 * clicked and is not announced, also in the top layer above the dialog. Show
 * a message about what happens in the dialog, such as a form's error, inside
 * the dialog instead, with ErrorMessage.
 */
const { toasts, hideToast } = useToast();

const managerRef = useTemplateRef<HTMLElement>('manager');

/** The element focus came from when it entered the toasts */
let focusOrigin: HTMLElement | null = null;

function rememberFocusOrigin(event: FocusEvent) {
  const previous = event.relatedTarget;

  if (previous instanceof HTMLElement && !managerRef.value?.contains(previous)) {
    focusOrigin = previous;
  }
}

/**
 * Closing a toast with its button takes the focused element away. Focus
 * moves on to the close button of the next toast, or the one before, and
 * after the last back to where it came from.
 */
function hide(id: string) {
  // In the order of the list: leaving toasts are not counted
  const current = Array.from(
    managerRef.value?.querySelectorAll<HTMLElement>(
      '.toast:not(.toast-leave-active)',
    ) ?? [],
  );
  const index = toasts.value.findIndex((toast) => toast.id === id);
  const hadFocus = !!current[index]?.contains(document.activeElement);

  hideToast(id);
  if (!hadFocus) return;

  const next = current[index + 1] ?? current[index - 1];
  const closeButton = next?.querySelector<HTMLElement>(':scope > button');

  if (closeButton) closeButton.focus();
  else if (focusOrigin?.isConnected) focusOrigin.focus();
}

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
    <div
      ref="manager"
      class="toast-manager"
      aria-live="polite"
      @focusin="rememberFocusOrigin"
    >
      <TransitionGroup name="toast" @before-leave="lockHeight">
        <Toast
          v-for="toast in toasts"
          :key="toast.id"
          v-bind="toast"
          @hide="hide(toast.id)"
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
