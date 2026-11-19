<script setup lang="ts">
const { size = 'xs', color = undefined } = defineProps<{
  size?: ChipSize;
  color?: BaseColor;
}>();
</script>

<template>
  <Chip :size="size" :label="$t('form.required')" :color="color">
    <template #inline-start>{{ ' ' }}</template>
  </Chip>
</template>
