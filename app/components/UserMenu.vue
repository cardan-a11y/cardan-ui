<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';

const props = defineProps<{
  initials?: string;
  icon?: string;
  logout?: CallableFunction;
  avatar?: string;
}>();

const triggerRef = useTemplateRef<ButtonComponent>('menuTrigger');
const contentRef = useTemplateRef<HTMLElement>('menuContent');
const dialogRef = useTemplateRef<DialogComponent>('logoutDialog');

const showMenu = defineModel<boolean>({ default: false });
const menuId = useId();

onClickOutside(contentRef, () => (showMenu.value = false));

function toggleMenu() {
  showMenu.value = !showMenu.value;
}

function handleLogout() {
  if (props.logout) {
    props.logout();
    closeLogoutDialog();
  }
}

/** The menu closes first: its loop makes the rest of the page inert, the dialog included */
async function openLogoutDialog() {
  showMenu.value = false;
  await nextTick();
  dialogRef.value?.openDialog();
}

function closeLogoutDialog() {
  dialogRef.value?.closeDialog();
}

/** After the tick that removes the menu, so focus lands on the trigger */
async function focusMenu() {
  await nextTick();
  triggerRef.value?.focusElement();
}

function hideMenu() {
  showMenu.value = false;
  focusMenu();
}

defineExpose({
  hideMenu,
  focusMenu,
  openLogoutDialog,
  closeLogoutDialog,
});
</script>

<template>
  <div class="user-menu-wrapper" @keydown.esc="hideMenu">
    <AvatarButton
      ref="menuTrigger"
      :aria-controls="menuId"
      :aria-expanded="showMenu"
      :aria-label="$t('aria.open-user-menu')"
      :icon="icon"
      :avatar="avatar"
      :initials="initials"
      @click="toggleMenu"
    />

    <Transition name="stretch-fade">
      <FocusLoop :id="menuId" :is-visible="showMenu" class="user-menu-popover">
        <div v-if="showMenu" ref="menuContent">
          <div class="user-menu-content">
            <slot name="default" v-bind="{ hideMenu }" />
          </div>
        </div>
      </FocusLoop>
    </Transition>

    <Dialog
      ref="logoutDialog"
      class="logout-dialog"
      :label="$t('general.sign-out')"
      @close="focusMenu"
    >
      <p>{{ $t('general.sign-out-confirm') }}</p>
      <template #buttons>
        <Button
          :label="$t('general.sign-out')"
          icon="material-symbols:logout"
          variant="danger"
          @click="handleLogout"
        />
      </template>
    </Dialog>
  </div>
</template>

<style>
.user-menu-wrapper {
  height: var(--app-header-height);
  display: grid;
  place-content: center;
  position: relative;
}

.user-menu-popover {
  z-index: 9;
  position: absolute;
  top: calc(1px + var(--app-header-height));
  right: 0;
  transform-origin: center 0;

  .user-menu-content {
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    border: 1px solid var(--card-border-color);
    border-block-start: none;
    background-color: var(--color-dialog-bg);
  }

  .user-info-wrapper {
    padding-block: 1rem 0.75rem;
    padding-inline: 1rem;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .user-name {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-heading);
  }

  .user-email {
    color: var(--color-grey-text);
    font-size: var(--font-size-sm);
  }

  .theme-select-wrapper {
    padding: 1rem;
  }

  .language-select-wrapper {
    padding: 1rem;

    .language-options-list {
      width: 100%;
    }
  }
}

.logout-dialog {
  .dialog-content {
    p {
      margin-block-start: 0;
      margin-block-end: 1.5rem;
    }
  }
}

.stretch-fade-enter-active,
.stretch-fade-leave-active {
  transition: all var(--duration-sm) ease-in-out;
}
.stretch-fade-enter-from,
.stretch-fade-leave-to {
  transform: scaleY(95%);
  opacity: 0;
}
</style>
