<script setup lang="ts">
/**
 * Shows the toasts of `useToast()`. Not for a message from an open modal
 * Dialog or MobileMenu: under its backdrop a toast is out of reach and
 * unannounced, so that message shows in the dialog, with ErrorMessage.
 */
const { toasts, hideToast } = useToast();

const managerRef = useTemplateRef<HTMLElement>('manager');

let focusOrigin: HTMLElement | null = null;

function rememberFocusOrigin(event: FocusEvent) {
  const previous = event.relatedTarget;

  if (
    previous instanceof HTMLElement &&
    !managerRef.value?.contains(previous)
  ) {
    focusOrigin = previous;
  }
}

function hide(id: string) {
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

// `auto` cannot be animated without `interpolate-size`; can go once every
// target browser has it
function lockHeight(element: Element) {
  if (element instanceof HTMLElement) {
    element.style.blockSize = `${element.offsetHeight}px`;
  }
}
</script>

<template>
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
