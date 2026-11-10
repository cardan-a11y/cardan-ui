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

const { t } = useI18n();

const copied = ref(false);
const failed = ref(false);
let reset: ReturnType<typeof setTimeout> | undefined;

async function handleClick() {
  if (!text) return;

  // Back to "copy" first, so the status is announced again on a second copy
  copied.value = false;
  failed.value = false;
  await nextTick();

  try {
    await navigator.clipboard.writeText(String(text));
    copied.value = true;
  } catch {
    // The page may not have the clipboard (no focus, no permission)
    failed.value = true;
  }

  clearTimeout(reset);
  reset = setTimeout(() => {
    copied.value = false;
    failed.value = false;
  }, 2000);
}

onUnmounted(() => clearTimeout(reset));

/** "Copied" or "Copy failed" for a moment after a click, "Copy" otherwise */
const label = computed(() => {
  if (copied.value) return t('general.copied');
  if (failed.value) return t('general.copy-failed');

  return t('general.copy');
});
</script>

<template>
  <Button
    :label="label"
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
    {{ copied || failed ? label : '' }}
  </span>
</template>
