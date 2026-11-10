<script setup lang="ts">
const { mfaError } = useMfa();
</script>

<template>
  <div class="mfa-content">
    <ErrorMessage v-if="mfaError" :data="mfaError" />

    <p v-else>{{ $t('mfa.disable-success') }}</p>
  </div>
</template>
