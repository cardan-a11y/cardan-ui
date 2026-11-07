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
    <span class="visuallyhidden">{{ ariaLabel }}</span>

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
