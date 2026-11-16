<script setup lang="ts">
const {
  avatar = undefined,
  initials = undefined,
  icon = undefined,
  size = undefined,
  fontSize = undefined,
  ariaLabel = undefined,
} = defineProps<{
  avatar?: string;
  initials?: string;
  icon?: string;
  size?: string;
  fontSize?: FontSize;
  ariaLabel?: string;
}>();

const { t } = useI18n();

/**
 * The hidden text that names the button: the label, or, when the button
 * shows an image or an icon, the initials or "profile picture". Initials
 * without an image are visible and name the button themselves, after the
 * label when there is one ("User menu AL"), so the name holds what a speech
 * user sees (WCAG 2.5.3).
 */
const hiddenLabel = computed(() => {
  if (ariaLabel) return ariaLabel;
  if (initials && !avatar && !icon) return undefined;

  return initials ?? t('general.avatar');
});

const avatarButtonRef = useTemplateRef<HTMLButtonElement>('avatarButton');

function focusElement() {
  avatarButtonRef.value?.focus();
}

defineExpose({
  focusElement,
});
</script>

<template>
  <button ref="avatarButton" type="button" class="avatar-button">
    <span v-if="hiddenLabel" class="visuallyhidden">{{ hiddenLabel }}</span>

    <Icon v-if="icon" :name="icon" />

    <Avatar
      v-else
      :src="avatar"
      :initials="initials"
      :size="size"
      :font-size="fontSize"
    />
  </button>
</template>

<style>
.avatar-button {
  display: grid;
  place-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  font-weight: var(--font-weight-semibold);
  background-color: var(--color-grey-light);
  border-radius: var(--radius-full);
  transition:
    color var(--duration-sm),
    background-color var(--duration-sm);

  &:hover,
  &:hover .avatar-wrapper {
    color: var(--color-text);
    background-color: color-mix(
      in srgb,
      var(--color-grey-light) 95%,
      var(--color-black)
    );
  }

  .iconify {
    font-size: var(--font-size-lg);
  }
}
</style>
