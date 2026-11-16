<script setup lang="ts">
import type AvatarButton from './AvatarButton.vue';

/**
 * The avatar button in the header and what it shows: a non-modal disclosure
 * in APG terms, on the native Popover API like Popover, with the slot's
 * links, buttons and fields (no menu roles or arrow keys). The panel is in
 * the top layer, above the sticky header and never clipped by it, anchored
 * under the button; the rest of the page stays as it is, nothing `inert`.
 *
 * - The button is named "User menu" and the initials it shows (WCAG 2.5.3),
 *   toggles the panel and says whether it is open with `aria-expanded`,
 *   which follows the browser's toggle event, as `v-model` does.
 * - When it opens, focus moves to the first focusable element. Escape
 *   closes it and gives focus back to the button; Tab past the last element,
 *   Shift+Tab from the button, a click outside it and a route change close
 *   it.
 * - It leaves the APG pattern in one place, as Popover does: focus moves
 *   into the panel when it opens, where the pattern leaves it on the button,
 *   so a keyboard user lands on what they opened it for; the button is one
 *   Shift+Tab away and still toggles it.
 * - The slot's `hideMenu` closes it and gives focus back to the button;
 *   `openLogoutDialog()` closes it and opens the sign-out dialog, which
 *   gives focus back to the button when it closes.
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

/** The model to the popover: a project opens or closes it through `v-model` */
function syncPopover() {
  const content = contentRef.value;
  if (!content || showMenu.value === isOpen()) return;

  if (showMenu.value) {
    // The trigger is the anchor also when the menu is not opened by it
    content.showPopover({ source: triggerElement() } as ShowPopoverOptions);
  } else {
    content.hidePopover();
  }
}

watch(showMenu, syncPopover);
onMounted(() => showMenu.value && syncPopover());

/**
 * The popover to the model, after the browser opened or closed it: through
 * the trigger, Escape or a click outside. When it opens, focus moves to its
 * first focusable element.
 */
function onToggle(event: Event) {
  const open = (event as ToggleEvent).newState === 'open';
  showMenu.value = open;

  if (open) {
    nextTick(() => {
      contentRef.value?.querySelector<HTMLElement>(focusableSelector)?.focus();
    });
  } else {
    unpark();
  }
}

/**
 * Whether a mousedown in the panel or on the trigger is moving focus: on the
 * panel's text, or on the trigger in Safari, where a click does not focus a
 * button, it moves focus to the nearest focusable element around the menu,
 * such as the AppShell. Until the next task.
 */
let pressedInside = false;

function onPress() {
  pressedInside = true;
  setTimeout(() => {
    pressedInside = false;
  });
}

/** The element around the menu that a press in it gave focus to */
let parked: Element | null = null;

function unpark() {
  parked?.removeEventListener('focusout', handleFocusOut);
  parked = null;
}

/**
 * Focus that leaves the panel or the trigger for the page closes the menu,
 * as in Popover: a move between the two keeps it open, and so does the move
 * a press in the panel or on the trigger makes, until focus leaves that
 * element for the page. A press on the trigger then closes it with the
 * click, instead of closing it on mousedown for the click to open it again.
 */
function handleFocusOut(event: Event) {
  const next = (event as FocusEvent).relatedTarget;
  if (!(next instanceof Element)) return;

  if (contentRef.value?.contains(next) || triggerElement()?.contains(next)) {
    unpark();
    return;
  }

  if (pressedInside) {
    unpark();
    parked = next;
    next.addEventListener('focusout', handleFocusOut);
    return;
  }

  showMenu.value = false;
}

// The menu does not stay open over the next page, also when focus did not move
const route = useRoute();
watch(
  () => route.path,
  () => (showMenu.value = false),
);

onBeforeUnmount(unpark);

function handleLogout() {
  if (props.logout) {
    props.logout();
    closeLogoutDialog();
  }
}

/** The menu closes first, so it is not left open behind the dialog */
async function openLogoutDialog() {
  showMenu.value = false;
  await nextTick();
  dialogRef.value?.openDialog();
}

function closeLogoutDialog() {
  dialogRef.value?.closeDialog();
}

/** After the tick that closes the menu, so focus lands on the trigger */
async function focusMenu() {
  await nextTick();
  triggerRef.value?.focusElement();
}

/**
 * Closes the menu and gives focus to the trigger: the browser gives it back
 * to what had focus before the menu opened, which in Safari, where a click
 * does not focus a button, is not the trigger
 */
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
      @focusout="handleFocusOut"
    />

    <div
      :id="menuId"
      ref="menuContent"
      popover
      class="user-menu-popover"
      @toggle="onToggle"
      @mousedown="onPress"
      @focusout="handleFocusOut"
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

/*
 * Under the header's 1px line, its end edge on the trigger's: anchored to
 * the wrapper of the header's height, as wide as the trigger, so no size of
 * the trigger is needed. Flipped where there is no room. A browser without
 * anchor positioning shows it at its static position (README).
 */
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
