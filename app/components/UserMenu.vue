<script setup lang="ts">
import type AvatarButton from './AvatarButton.vue';

/**
 * The header's avatar button and its panel: an APG disclosure on the native
 * Popover API, like Popover, for the slot's links, buttons and fields (no menu
 * roles). Like Popover it leaves the pattern in one place: focus moves into
 * the panel when it opens. The slot's `hideMenu` closes it with focus back on
 * the button; `openLogoutDialog()` opens the sign-out dialog.
 */
const props = defineProps<{
  initials?: string;
  icon?: string;
  logout?: CallableFunction;
  avatar?: string;
}>();

const triggerRef =
  useTemplateRef<InstanceType<typeof AvatarButton>>('menuTrigger');
const contentRef = useTemplateRef<HTMLElement>('menuContent');
const dialogRef = useTemplateRef<DialogComponent>('logoutDialog');

const showMenu = defineModel<boolean>({ default: false });
const menuId = useId();

const triggerElement = () => triggerRef.value?.$el as HTMLElement | undefined;
const isOpen = () => !!contentRef.value?.matches(':popover-open');

function syncPopover() {
  const content = contentRef.value;
  if (!content || showMenu.value === isOpen()) return;

  if (showMenu.value) {
    content.showPopover({ source: triggerElement() } as ShowPopoverOptions);
  } else {
    content.hidePopover();
  }
}

watch(showMenu, syncPopover);
onMounted(() => showMenu.value && syncPopover());

function onToggle(event: Event) {
  const open = (event as ToggleEvent).newState === 'open';
  showMenu.value = open;

  if (open) {
    nextTick(() => {
      firstFocusable(contentRef.value)?.focus();
    });
  } else {
    unpark();
  }
}

const { onPress, onFocusOut, unpark } = useFocusLeave({
  elements: () => [contentRef.value, triggerElement()],
  close: () => (showMenu.value = false),
});

const route = useRoute();
watch(
  () => route.path,
  () => (showMenu.value = false),
);

function handleLogout() {
  if (props.logout) {
    props.logout();
    closeLogoutDialog();
  }
}

async function openLogoutDialog() {
  showMenu.value = false;
  await nextTick();
  dialogRef.value?.openDialog();
}

function closeLogoutDialog() {
  dialogRef.value?.closeDialog();
}

async function focusMenu() {
  await nextTick();
  triggerRef.value?.focusElement();
}

// Focus to the trigger ourselves: the browser returns it to what had focus
// before, which in Safari (a click does not focus a button) is not the trigger
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
  <div class="user-menu-wrapper">
    <AvatarButton
      ref="menuTrigger"
      :popovertarget="menuId"
      :aria-controls="menuId"
      :aria-expanded="showMenu"
      :aria-label="$t('aria.user-menu')"
      :icon="icon"
      :avatar="avatar"
      :initials="initials"
      @mousedown="onPress"
      @focusout="onFocusOut"
    />

    <div
      :id="menuId"
      ref="menuContent"
      popover
      class="user-menu-popover"
      @toggle="onToggle"
      @mousedown="onPress"
      @focusout="onFocusOut"
      @keydown.esc="hideMenu"
    >
      <div class="user-menu-content">
        <slot name="default" v-bind="{ hideMenu }" />
      </div>
    </div>

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
  anchor-name: --user-menu;
  anchor-scope: --user-menu;
}

.user-menu-popover {
  position-anchor: --user-menu;
  position-area: block-end span-inline-start;
  position-try-fallbacks:
    flip-block,
    flip-inline,
    flip-block flip-inline;
  inset: auto;
  margin: 0;
  margin-block-start: 1px;
  padding: 0;
  border: none;
  color: inherit;
  background: none;
  transition-property: display, overlay, opacity, translate;
  transition-duration: 0s;
  transition-behavior: allow-discrete;

  &:popover-open {
    opacity: 1;
    translate: 0 0;
    transition-duration: var(--duration-sm);

    @starting-style {
      opacity: 0;
      translate: 0 -0.5rem;
    }
  }

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
</style>
