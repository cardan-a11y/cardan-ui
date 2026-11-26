<script setup lang="ts">
/**
 * The error page of every app that extends the layer without an `error.vue` of
 * its own: ErrorPageContent in the route's layout, which holds the app's frame
 * (AppShell, the header, `<main>`). It reads nothing but the error. A page's
 * own text: `createError({ status: 404, data: { text: t('audit.not-found') } })`.
 *
 * Head tags that differ between the error page and the pages go in `app.head`
 * or a plugin that reads `useError()`, not a layout's `useHead()`: Nuxt keeps
 * a layout's tags while a page transition is pending.
 */
import type { NuxtError } from '#app';

// Declared: a layout with an `<Html>` root would pass it on to `<html>`, which
// breaks the server render
const { error } = defineProps<{ error: NuxtError }>();

// A server route's error arrives with `data` as JSON text
const text = computed(() => {
  let data = error.data;

  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return undefined;
    }
  }

  const value = (data as { text?: unknown } | null | undefined)?.text;

  return typeof value === 'string' ? value : undefined;
});
</script>

<template>
  <NuxtLayout>
    <ErrorPageContent
      :status="error.status"
      :text="text"
      :error="error"
      class="error-page"
    />
  </NuxtLayout>
</template>

<style>
.error-page {
  padding-block: var(--error-page-padding-block, 2.5rem 4rem);
  padding-inline: var(--error-page-padding-inline, 0px);
}
</style>
