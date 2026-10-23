<script setup lang="ts">
/**
 * The reveal-password toggle beside a password field: a real toggle button
 * carrying `aria-pressed`, not an icon that silently swaps meaning. Bind the
 * field's type to its model: `:type="showPassword ? 'text' : 'password'"`.
 * One button can reveal every password field of a form, as the reset and
 * update forms do with the button beside their last field.
 *
 * Render it next to the Input inside a `.password-input-wrapper`, so the
 * button lines up with the field.
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
