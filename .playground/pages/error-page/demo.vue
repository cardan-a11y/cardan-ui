<script setup lang="ts">
/**
 * Answers with the error page for the status in its address
 * (`?status=403`), as a page of an app does with `showError()` when the item
 * it loads is missing: on the server for a direct load, in the browser after
 * a link. `?text` adds a text of the page's own, as `data: { text }`,
 * `?refuse` lets the page's middleware refuse it.
 */
// `?refuse`: middleware that refuses the page, as a permission check does.
// A non-fatal error stops the navigation, so the address stays on the page
// with the link; `?refuse=fatal` is fatal, and Nuxt adds the refused address
// to the history
definePageMeta({
  middleware: (to) => {
    if (to.query.refuse === 'fatal') {
      throw createError({ status: 403, fatal: true });
    }
    if ('refuse' in to.query) throw showError({ status: 403 });
  },
});

const route = useRoute();

// As a page that loads its item and answers with an error without one: the
// error comes after an await, also when the page renders again in the browser
const { data: item } = await useAsyncData(
  `error-page-demo:${route.query.status}`,
  () =>
    new Promise<{ title: string } | null>((resolve) =>
      setTimeout(
        () => resolve(route.query.status ? null : { title: 'Error page demo' }),
        200,
      ),
    ),
);

if (!item.value) {
  throw showError({
    status: Number(route.query.status) || 404,
    data:
      'text' in route.query
        ? { text: 'The demo item you asked for does not exist.' }
        : undefined,
  });
}

useHead({ title: 'Error page demo' });
</script>

<template>
  <div class="demo-page">
    <h1>Error page demo</h1>

    <p>
      This page answers with the error page for the status in its address, such
      as <code>?status=403</code>. The
      <NuxtLink to="/error-page">error page documentation</NuxtLink> links to
      each one.
    </p>
  </div>
</template>
