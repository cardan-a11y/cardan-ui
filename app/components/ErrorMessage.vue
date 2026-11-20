<script setup lang="ts">
/**
 * The error box of a form or a page: `text` in the page's language, then the
 * messages of `data` (`useErrorMessage()`) in theirs. Without a message it
 * says the browser was offline or that something went wrong. It takes no
 * outer margin.
 */
const { data = undefined, text = undefined } = defineProps<{
  data?: ApiErrorData | null;
  text?: string;
}>();

const messages = computed(() => apiErrorMessages(data));
</script>

<template>
  <div role="alert">
    <div v-if="data || text" class="error-message">
      <p v-if="text">{{ text }}</p>

      <ul v-if="messages.length > 1" role="list" :lang="data?.language">
        <li v-for="(message, index) in messages" :key="index">
          {{ message }}
        </li>
      </ul>

      <p v-else-if="messages.length" :lang="data?.language">
        {{ messages[0] }}
      </p>

      <p v-else-if="data?.offline">{{ $t('error.offline') }}</p>

      <p v-else-if="!text">{{ $t('error.general') }}</p>
    </div>
  </div>
</template>

<style>
.error-message {
  display: grid;
  gap: 0.5rem;
  max-width: fit-content;
  padding-block: 0.75rem;
  padding-inline: 1rem;
  border: 1px solid var(--color-red-bg);
  border-radius: var(--radius-md);
  background-color: var(--color-card-bg);
  color: var(--color-red-text);
  overflow-wrap: anywhere;

  p,
  ul {
    margin-block: 0;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
  }
}
</style>
