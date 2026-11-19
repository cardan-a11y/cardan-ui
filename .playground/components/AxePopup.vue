<script setup lang="ts">
// In development only, as the plugin that it reads (plugins/axe.client.ts)
const VueAxePopup = import.meta.dev
  ? defineAsyncComponent(() => import('vue-axe').then((m) => m.VueAxePopup))
  : undefined;
</script>

<template>
  <ClientOnly v-if="VueAxePopup">
    <VueAxePopup />
  </ClientOnly>
</template>

<style>
.va-popup-btn {
  box-shadow: none !important;
}
</style>
