<script setup lang="ts">
// The attributes go to the dialog, not to the wrapper too
defineOptions({ inheritAttrs: false });

const { isLargeScreen } = useScreenSize();

const {
  width = 360,
  position = 'inline-start',
  buttonVariant = 'ghost',
  buttonSize = 'md',
  buttonIconSize = 'lg',
  menuButtonSize = 'xl',
  icon = 'material-symbols:dehaze-rounded',
  hideButtonLabel = true,
  clickOutside = true,
  id = useId(),
  buttonFontSize = undefined,
  buttonIconPos = undefined,
  buttonLabel = undefined,
  label = undefined,
  navLabel = undefined,
  list = undefined,
  closeIcon = 'material-symbols:close-rounded',
  closeButtonVariant = 'ghost',
  closeButtonRadius = 'full',
  closeButtonSize = 'md',
  closeButtonIconSize = undefined,
  hideCloseButton = false,
  closeOnDesktop = true,
} = defineProps<{
  width?: number;
  position?: MobileMenuPosition;
  buttonVariant?: ButtonVariant;
  buttonSize?: ButtonSize;
  buttonFontSize?: FontSize;
  buttonIconSize?: FontSize;
  buttonIconPos?: 'start' | 'end';
  menuButtonSize?: ButtonSize;
  icon?: string;
  hideButtonLabel?: boolean;
  buttonLabel?: string;
  clickOutside?: boolean;
  label?: string;
  navLabel?: string;
  list?: MenuItem[];
  id?: string;
  closeIcon?: string;
  closeButtonVariant?: ButtonVariant;
  closeButtonRadius?: BorderRadius;
  closeButtonSize?: ButtonSize;
  closeButtonIconSize?: FontSize;
  hideCloseButton?: boolean;
  closeOnDesktop?: boolean;
}>();

const dialogTriggerRef = useTemplateRef<ButtonComponent>('dialogTrigger');
const dialogElementRef = useTemplateRef<HTMLDialogElement>('dialogElement');
const isVisible = ref(false);

function handleDialogClick(event: MouseEvent) {
  if (!clickOutside) return;

  const target = event.target as HTMLDialogElement;

  if (target.nodeName === 'DIALOG') {
    closeDialog();
  }
}

function closeDialog() {
  const dialog = dialogElementRef.value;

  // As in Dialog: the DOM is the state, and the exit animation is awaited
  // through the Web Animations API, which also settles when the animation is
  // cancelled, where a single `animationend` listener never fires and leaves
  // the menu open and the page behind it inert.
  if (!dialog?.open || dialog.hasAttribute('closing')) return;

  dialog.setAttribute('closing', '');

  Promise.allSettled(dialog.getAnimations().map((a) => a.finished)).then(
    async () => {
      dialog.removeAttribute('closing');
      // The loop first, and its render, so the page is not inert when the
      // browser gives focus back to the element that opened the menu: also
      // one in the `trigger` slot, which focusDialogTrigger does not know
      isVisible.value = false;
      await nextTick();
      dialog.close();
    },
  );
}

function openDialog() {
  if (isVisible.value) return;

  dialogElementRef.value?.showModal();
  isVisible.value = true;
}

/**
 * On the native close event, after the exit animation. The tick lets the
 * closed state reach FocusLoop, which lifts the `inert` on the page first.
 */
async function focusDialogTrigger() {
  await nextTick();
  dialogTriggerRef.value?.focusElement();
}

/**
 * Escape closes the dialog right after this event: the loop closes first.
 * Only the dialog's own cancel: a file input fires one that bubbles here.
 */
function handleCancel(event: Event) {
  if (event.target !== event.currentTarget) return;

  isVisible.value = false;
}

defineExpose({
  openDialog,
  closeDialog,
  isVisible,
});

watch(
  () => isLargeScreen.value,
  (value) => {
    if (closeOnDesktop && value && isVisible.value) {
      closeDialog();
    }
  },
);

const emit = defineEmits<{
  click: [item: MenuItem];
}>();
</script>

<template>
  <div class="mobile-menu-wrapper">
    <slot
      v-if="$slots.trigger"
      name="trigger"
      v-bind="{ openDialog, closeDialog }"
    />

    <Button
      v-else
      ref="dialogTrigger"
      :icon="icon"
      class="mobile-nav-toggle"
      :size="buttonSize"
      :font-size="buttonFontSize"
      :icon-size="buttonIconSize"
      :icon-pos="buttonIconPos"
      :variant="buttonVariant"
      :label="buttonLabel || $t('general.menu')"
      :hide-label="hideButtonLabel"
      :aria-controls="id"
      :aria-expanded="isVisible"
      @click="openDialog"
    />

    <!-- Nuxt renders a teleport to #teleports on the server too -->
    <Teleport to="#teleports">
      <dialog
        :id="id"
        ref="dialogElement"
        :class="['mobile-dialog', `mobile-dialog-position--${position}`]"
        v-bind="$attrs"
        :aria-label="label || $t('aria.mobile-menu')"
        :style="`--mobile-menu-width: ${width}px`"
        @click="handleDialogClick"
        @cancel="handleCancel"
        @close="
          () => {
            isVisible = false;
            focusDialogTrigger();
          }
        "
      >
        <FocusLoop :is-visible="isVisible">
          <div class="dialog-content">
            <Button
              v-if="!hideCloseButton"
              :icon="closeIcon"
              :variant="closeButtonVariant"
              :radius="closeButtonRadius"
              :label="$t('aria.close-menu')"
              :size="closeButtonSize"
              :icon-size="closeButtonIconSize"
              hide-label
              class="close-button"
              @click="closeDialog"
            />

            <template v-if="list?.length">
              <h2 v-if="navLabel" class="nav-label">{{ navLabel }}</h2>

              <MenuList
                :list="list"
                :button-size="menuButtonSize"
                button-variant="sidebar"
                :aria-label="navLabel || $t('aria.mobile-menu')"
                @click="emit('click', $event)"
              />
            </template>

            <slot name="default" v-bind="{ closeDialog }" />
          </div>
        </FocusLoop>
      </dialog>
    </Teleport>
  </div>
</template>

<style>
/* disable background scrolling */
body:has(.mobile-dialog[open]) {
  overflow: hidden;
}

.mobile-dialog {
  --mobile-menu-padding-inline: var(--app-padding-inline);

  padding: 0;
  overscroll-behavior: contain;
  min-height: 100dvh;
  width: 100%;
  max-width: var(--mobile-menu-width, 360px);
  border: none;
  background-color: var(--color-dialog-bg);

  &::backdrop {
    background-color: var(--color-backdrop);
  }

  .close-button {
    background-color: transparent;
    z-index: 1;
    position: absolute;
    right: 1.25rem;
    top: 1.25rem;
  }

  .dialog-content {
    display: grid;
    min-height: 100svh;
    align-content: start;
  }

  .dialog-content {
    padding-block: 4rem;
  }

  .mobile-nav {
    padding-inline: var(--mobile-menu-padding-inline);
  }

  .nav-label {
    margin-inline-start: 2rem;
    margin-block-end: 1rem;
  }
}

.mobile-dialog-position--inline-start {
  margin-inline-start: 0;
  border-inline-end: 1px solid var(--card-border-color);

  &[open] {
    animation: slideInLeft var(--duration-md) forwards;

    &::backdrop {
      animation: fadeIn var(--duration-sm) forwards;
    }
  }

  &[closing] {
    display: block;
    animation: slideOutLeft var(--duration-md) forwards;

    &::backdrop {
      animation: fadeOut var(--duration-sm) forwards;
    }
  }

  .dialog-content {
    display: grid;
    padding-inline-start: calc(
      var(--mobile-menu-padding-inline) + env(safe-area-inset-left)
    );
  }
}

.mobile-dialog-position--inline-end {
  margin-inline-start: auto;
  margin-inline-end: 0;
  border-inline-start: 1px solid var(--card-border-color);

  &[open] {
    animation: slideInRight var(--duration-md) forwards;

    &::backdrop {
      animation: fadeIn var(--duration-sm) forwards;
    }
  }

  &[closing] {
    display: block;
    animation: slideOutRight var(--duration-md) forwards;

    &::backdrop {
      animation: fadeOut var(--duration-sm) forwards;
    }
  }

  .dialog-content {
    display: grid;
    padding-inline-end: calc(
      var(--mobile-menu-padding-inline) + env(safe-area-inset-right)
    );
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
</style>
