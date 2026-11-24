<script setup lang="ts">
// No ref to the dialog here: the key is enough
const { open, isOpen } = useDialog('demo-shortcuts');
</script>

<template>
  <div class="flex-wrapper">
    <Button label="Show keyboard shortcuts" @click="open()" />
    <p>The dialog is {{ isOpen ? 'open' : 'closed' }}.</p>
  </div>
</template>
