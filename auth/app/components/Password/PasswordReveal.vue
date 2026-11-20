<script setup lang="ts">
/**
 * A toggle button (`aria-pressed`) that reveals password fields: bind their
 * type to its model. Place it beside the Input in a `.password-input-wrapper`.
 */
const revealed = defineModel<boolean>({ default: false });

const { size = 'lg' } = defineProps<{
  /** The size of the Input it sits beside. */
  size?: InputSize;
}>();
</script>

<template>
  <Button
    :label="$t('password.show')"
    :aria-pressed="revealed"
    :icon="
      revealed
        ? 'material-symbols:visibility'
        : 'material-symbols:visibility-off'
    "
    hide-label
    class="show-password"
    :size="size"
    variant="ghost"
    @click="revealed = !revealed"
  />
</template>

<style>
.password-input-wrapper {
  display: flex;
  gap: 0.25rem;
  align-items: end;

  .form-field-wrapper {
    flex-grow: 1;
  }
}
</style>
