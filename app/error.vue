<script setup lang="ts">
/**
 * The error page of every app that extends the layer and has no `error.vue`
 * of its own. It replaces `app.vue`, so it renders in the route's layout
 * (`<NuxtLayout>`: the page's `layout`, a route rule's `appLayout`, or
 * `default`), which must hold the app's frame: AppShell, the header and
 * `<main>`, which is the skip link's target here (`id="main"`,
 * `tabindex="-1"`) when the pages put it on their own content. Page
 * middleware has not necessarily run, and a plugin may have failed: it reads
 * nothing but the error. It declares its `error` prop: a layout whose root
 * is `<Html>` would pass an undeclared one on to `<html>`, which breaks the
 * server render.
 *
 * Head tags that differ between the error page and the pages belong in
 * `app.head` or a plugin that reads `useError()`, not in a layout's
 * `useHead()`: Nuxt removes an unmounted component's head entries only once
 * a running page transition has finished, and a page that fails while
 * pending behind one leaves it unfinished, so its entries stay.
 *
 * A page says more in the page's language with `data: { text }`:
 * `createError({ status: 404, data: { text: t('audit.not-found') } })`.
 */
import type { NuxtError } from '#app';

const { error } = defineProps<{ error: NuxtError }>();

/** `data.text`; an error of a server route arrives with `data` as JSON text */
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
/* The page's own spacing, which a project sets as on its pages */
.error-page {
  padding-block: var(--error-page-padding-block, 2.5rem 4rem);
  padding-inline: var(--error-page-padding-inline, 0px);
}
</style>
