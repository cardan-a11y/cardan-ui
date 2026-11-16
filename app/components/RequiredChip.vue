<script setup lang="ts">
const { size = 'xs', color = 'grey' } = defineProps<{
  size?: ChipSize;
  color?: BaseColor;
}>();
</script>

<template>
  <!-- The space keeps the chip's text apart from the label's in a name read
       from the DOM ("Password required", not "Passwordrequired"); at the
       start of the inline-flex chip it is not rendered -->
  <Chip :size="size" :label="$t('form.required')" :color="color">
    <template #inline-start>{{ ' ' }}</template>
  </Chip>
</template>
