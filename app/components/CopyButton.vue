<script setup lang="ts">
// The attributes, such as a project's own label, go to the button, not the status
defineOptions({ inheritAttrs: false });

const {
  hideLabel = true,
  iconSize = 'lg',
  text = undefined,
  variant = undefined,
  size = undefined,
  iconPos = undefined,
  title = undefined,
} = defineProps<{
  text?: string | number;
  hideLabel?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconSize?: FontSize;
  iconPos?: 'start' | 'end';
  title?: string;
  disabled?: boolean;
}>();

const copied = ref(false);

async function handleClick() {
  if (!text) return;
  await navigator.clipboard.writeText(String(text));
  copied.value = true;
}
</script>

<template>
  <Button
    :label="copied ? $t('general.copied') : $t('general.copy')"
    :icon="
      copied
        ? 'material-symbols:inventory-rounded'
        : 'material-symbols:content-copy-outline-rounded'
    "
    :hide-label="hideLabel"
    :variant="variant"
    :size="size"
    :icon-size="iconSize"
    :icon-pos="iconPos"
    :title="disabled ? undefined : title"
    :disabled="disabled"
    class="copy-button"
    v-bind="$attrs"
    @click="handleClick"
  />

  <!-- A screen reader announces a change in a live region that is already on
       the page, not in the focused button's own name -->
  <span role="status" class="visuallyhidden">
    {{ copied ? $t('general.copied') : '' }}
  </span>
</template>
