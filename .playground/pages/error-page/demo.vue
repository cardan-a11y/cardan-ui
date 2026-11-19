<script setup lang="ts">
/**
 * `?status=403` answers with that error page, as a page whose item is missing;
 * `?text` adds the page's own text, `?refuse` (`=fatal`) has middleware refuse it.
 */
definePageMeta({
  middleware: (to) => {
    if (to.query.refuse === 'fatal') {
      throw createError({ status: 403, fatal: true });
    }
    if ('refuse' in to.query) throw showError({ status: 403 });
  },
});

const route = useRoute();

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
