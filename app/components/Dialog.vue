<script setup lang="ts">
const {
  id = useId(),
  disableEscape = false,
  clickOutside = true,
  position = 'center',
  closeButtonVariant = 'ghost',
  closeButtonRadius = 'full',
  closeButtonIconSize = undefined,
  label = undefined,
  ariaLabel = undefined,
  role = undefined,
  headerIcon = undefined,
  focusCancel = false,
} = defineProps<{
  label?: string;
  ariaLabel?: string;
  id?: string;
  /**
   * Keeps Escape from closing it, best effort: Chrome closes it on a second
   * Escape without a click or key between, so a required step handles `close`.
   */
  disableEscape?: boolean;
  clickOutside?: boolean;
  position?: DialogPosition;
  closeButtonVariant?: ButtonVariant;
  closeButtonRadius?: BorderRadius;
  closeButtonIconSize?: FontSize;
  role?: 'dialog' | 'alertdialog';
  headerIcon?: string;
  /** Focus starts on Cancel, the least destructive action of an alertdialog */
  focusCancel?: boolean;
}>();

const dialogTemplateRef = useTemplateRef<HTMLDialogElement>('dialog');
const isVisible = ref(false);

function handleDialogClick(event: MouseEvent) {
  if (!clickOutside) return;

  const target = event.target as HTMLDialogElement;

  if (target.nodeName === 'DIALOG') {
    closeDialog();
  }
}

function openDialog() {
  const dialog = dialogTemplateRef.value;
  if (!dialog || dialog.open) return;

  dialog.showModal();
  isVisible.value = true;
}

let closing: Promise<void> | undefined;

/** Closes after the exit animation; resolves once the dialog has closed */
function closeDialog(): Promise<void> {
  const dialog = dialogTemplateRef.value;

  if (closing && dialog?.hasAttribute('closing')) return closing;

  if (!dialog?.open) return Promise.resolve();

  dialog.setAttribute('closing', '');

  // Not `animationend`: it never fires for a cancelled animation, and a
  // child's bubbles up early
  closing = Promise.allSettled(
    dialog.getAnimations().map((a) => a.finished),
  ).then(() => {
    dialog.removeAttribute('closing');
    isVisible.value = false;
    dialog.close();
  });

  return closing;
}

function handleClose() {
  if (!dialogTemplateRef.value?.open) {
    isVisible.value = false;
  }
}

function preventEscape(event: Event) {
  if (event.target !== event.currentTarget) return;

  if (disableEscape) {
    event.preventDefault();
    return;
  }

  isVisible.value = false;
}

defineExpose({
  openDialog,
  closeDialog,
  isVisible,
});
</script>

<template>
  <dialog
    ref="dialog"
    :aria-label="ariaLabel"
    :aria-labelledby="label ? id : undefined"
    :class="['dialog', `dialog-position--${position}`]"
    :role="role"
    @cancel="preventEscape"
    @click="handleDialogClick"
    @close="handleClose"
  >
    <FocusLoop :is-visible="isVisible" :modal="false">
      <div class="dialog-header-wrapper">
        <div class="dialog-header">
          <h1 v-if="label" :id="id" class="dialog-title-wrapper">
            <Icon v-if="headerIcon" :name="headerIcon" />
            <span class="dialog-title">{{ label }}</span>
          </h1>

          <Button
            icon="material-symbols:close-rounded"
            :variant="closeButtonVariant"
            :radius="closeButtonRadius"
            :icon-size="closeButtonIconSize"
            size="md"
            :label="$t('general.close')"
            hide-label
            class="close-button"
            @click="closeDialog"
          />
        </div>

        <slot name="header" v-bind="{ closeDialog }" />
      </div>

      <div v-if="$slots.default" class="dialog-content">
        <slot name="default" v-bind="{ closeDialog }" />
      </div>

      <div v-if="$slots.buttons" class="dialog-buttons">
        <Button
          :label="$t('general.cancel')"
          variant="outline"
          :autofocus="focusCancel || undefined"
          @click="closeDialog"
        />

        <slot name="buttons" v-bind="{ closeDialog }" />
      </div>
    </FocusLoop>
  </dialog>
</template>

<style>
html:has(.dialog[open]) {
  overflow: hidden;
}

.light-mode {
  .dialog {
    --color-dialog-border: transparent;
    --color-select-bg: var(--color-bg);
  }
}

.dialog {
  --color-dialog-border: var(--card-border-color);
  --dialog-padding-inline: 1.5rem;
  --dialog-padding-block: 1.5rem;
  --color-input-bg: transparent;

  border-radius: 0;
  padding: 0;

  color: var(--color-text);
  background-color: var(--color-dialog-bg);
  border: none;
  outline: 1px solid transparent;

  &::backdrop {
    background-color: var(--color-backdrop);
  }

  h1 {
    margin-block: 0;
    font-size: var(--font-size-lg);
  }

  .dialog-header-wrapper {
    padding-block-start: var(--dialog-padding-block);
    padding-block-end: 1.5rem;
    padding-inline: var(--dialog-padding-inline);
    padding-inline-end: calc(2.75rem + var(--dialog-padding-inline));

    .dialog-header {
      display: flex;
      align-items: center;
    }
  }

  .dialog-title-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    > .iconify {
      font-size: larger;
      flex-shrink: 0;
    }
  }

  .close-button {
    z-index: 9;
    position: absolute;
    right: 1rem;
    top: 1rem;
  }

  .dialog-content {
    padding-inline: var(--dialog-padding-inline);
  }

  .dialog-buttons {
    padding-inline: var(--dialog-padding-inline);
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;

    > .button {
      flex: 1;
      min-width: fit-content;
    }
  }
}

/* Zero specificity: `--dialog-max-width` on a dialog's class always wins */
:where(.dialog-position--center) {
  --dialog-max-width: fit-content;
}

:where(.dialog-position--inline-start, .dialog-position--inline-end) {
  --dialog-max-width: 800px;
}

.dialog-position--center {
  --dialog-padding-inline: 1.25rem;
  --dialog-padding-block: 1.5rem 1.25rem;
  width: var(--dialog-max-width);
  border: 2px solid var(--color-dialog-border);
  border-radius: var(--radius-lg);
  padding-block: var(--dialog-padding-block);

  &[open] {
    animation: fadeIn var(--duration-md) forwards;

    &::backdrop {
      animation: fadeIn var(--duration-md) forwards;
    }
  }

  &[closing] {
    display: block;
    animation: fadeOut var(--duration-md) forwards;

    &::backdrop {
      animation: fadeOut var(--duration-md) forwards;
    }
  }
}

.dialog-position--inline-start,
.dialog-position--inline-end {
  border: none;
  width: 100%;
  min-height: 100dvh;
  max-width: min(100vw, var(--dialog-max-width));
  padding-block-end: var(--dialog-padding-block);

  &[open] {
    &::backdrop {
      animation: fadeIn var(--duration-md) forwards;
    }
  }

  &[closing] {
    display: block;

    &::backdrop {
      animation: fadeOut var(--duration-md) forwards;
    }
  }
}

.dialog-position--inline-start {
  margin: 0 auto 0 0;
  border-inline-end: 1px solid var(--color-dialog-border);

  &[open] {
    animation: slideFadeInLeft var(--duration-md) forwards;
  }

  &[closing] {
    animation: slideFadeOutLeft var(--duration-md) forwards;
  }
}

.dialog-position--inline-end {
  margin: 0 0 0 auto;
  border-inline-start: 1px solid var(--color-dialog-border);

  &[open] {
    animation: slideFadeInRight var(--duration-md) forwards;
  }

  &[closing] {
    animation: slideFadeOutRight var(--duration-md) forwards;
  }
}

.dialog-position--block-start {
  inset: 0 0 0 auto;
  margin: 0;

  max-width: 100%;
  border: none;
  border-block-end: 1px solid var(--color-dialog-border);
  width: 100%;

  &[open] {
    animation: slideInTop var(--duration-md) forwards;

    &::backdrop {
      animation: fadeIn var(--duration-md) forwards;
    }
  }

  &[closing] {
    display: block;
    animation: slideOutTop var(--duration-md) forwards;

    &::backdrop {
      animation: fadeOut var(--duration-md) forwards;
    }
  }
}

.dialog-position--block-end {
  inset: auto 0 0 0;
  margin: 0;
  max-width: 100%;
  border: none;
  border-block-start: 1px solid var(--color-dialog-border);
  width: 100%;
  padding-block-end: calc(
    var(--dialog-padding-block-end, 1.5rem) + env(safe-area-inset-bottom, 0px)
  );

  &[open] {
    animation: slideInBottom var(--duration-sm) forwards;

    &::backdrop {
      animation: fadeIn var(--duration-sm) forwards;
    }
  }

  &[closing] {
    display: block;
    animation: slideOutBottom var(--duration-md) forwards;

    &::backdrop {
      animation: fadeOut var(--duration-md) forwards;
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@keyframes slideFadeInLeft {
  from {
    transform: translateX(-4rem);
    opacity: 0;
  }
  to {
    transform: translateX(0rem);
    opacity: 1;
  }
}

@keyframes slideFadeOutLeft {
  from {
    transform: translateX(0rem);
    opacity: 1;
  }
  to {
    transform: translateX(-4rem);
    opacity: 0;
  }
}

@keyframes slideFadeInRight {
  from {
    transform: translateX(4rem);
    opacity: 0;
  }
  to {
    transform: translateX(0rem);
    opacity: 1;
  }
}

@keyframes slideFadeOutRight {
  from {
    transform: translateX(0rem);
    opacity: 1;
  }
  to {
    transform: translateX(4rem);
    opacity: 0;
  }
}

@keyframes slideInLeft {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

@keyframes slideOutLeft {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-100%);
  }
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0%);
  }
}

@keyframes slideOutRight {
  from {
    transform: translateX(0%);
  }
  to {
    transform: translateX(100%);
  }
}

@keyframes slideInBottom {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes slideOutTop {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-100%);
  }
}

@keyframes slideInTop {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes slideOutBottom {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(100%);
  }
}
</style>
