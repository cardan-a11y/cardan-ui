<script setup lang="ts">
/**
 * The error box of a form or a page. `text` is a text in the page's own
 * language, such as a summary; `data` the error an API answered with
 * (`extractApiError()`, `useErrorMessage()`), whose messages follow the text
 * and are marked with the language the API wrote them in. An error without a
 * message and without a `text` says, in the page's language, that the browser
 * is offline (`data.offline`) or that something went wrong, such as an HTML
 * error page or a server that did not answer.
 *
 * The alert region is always in the page, so the box is announced when it
 * appears; the box itself shows only with `data` or a `text`. It takes no
 * outer margin: the form or page places it.
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

      <p v-else-if="!text">
        {{ data?.offline ? $t('error.offline') : $t('error.general') }}
      </p>
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

  /* On the text itself, so a page's own rules for paragraphs do not apply */
  p,
  ul {
    margin-block: 0;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
  }
}
</style>
