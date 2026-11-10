<script setup lang="ts">
/**
 * The trail to the current page: a navigation landmark with an ordered
 * list of links, as the APG breadcrumb pattern. The last item is the
 * current page and is text, not a link. The project decides what the trail
 * is, a home link included; the component only renders it.
 */
const { items, label = undefined } = defineProps<{
  /** The trail in order; the last item is the current page. */
  items: BreadcrumbItem[];
  /** The name of the landmark; "Breadcrumb" in the page's language by default. */
  label?: string;
}>();
</script>

<template>
  <nav
    v-if="items.length"
    :aria-label="label ?? $t('aria.breadcrumb')"
    class="breadcrumbs"
  >
    <ol role="list">
      <li v-for="(item, index) in items" :key="index" :lang="item.lang">
        <NuxtLink v-if="item.to && index < items.length - 1" :to="item.to">
          {{ item.label }}
        </NuxtLink>

        <span
          v-else
          :aria-current="index === items.length - 1 ? 'page' : undefined"
        >
          {{ item.label }}
        </span>
      </li>
    </ol>
  </nav>
</template>

<style>
.breadcrumbs {
  font-size: var(--font-size-sm);

  ol {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 0.5rem;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    display: flex;
    /* The slash stays on the first line of a title that wraps */
    align-items: baseline;
    gap: 0.5rem;
    /* Rows of links stay 24px apart, also where the trail wraps */
    min-height: 1.5rem;
    overflow-wrap: anywhere;

    + li::before {
      /*
       * The slash is decoration. The empty string after the second slash is
       * its alternative text, which keeps it out of the accessibility tree,
       * so a screen reader does not read "slash" between the links. A
       * browser that does not know that syntax drops the second declaration
       * and keeps the first.
       */
      content: '/';
      content: '/' / '';
      color: var(--color-grey-graphic);
    }
  }

  a {
    color: var(--color-grey-text);
    /* Set here: a project may take the underline off its links, and the
       color alone does not tell a link from the current page */
    text-decoration: underline;

    &:hover {
      color: var(--color-text);
    }
  }

  [aria-current='page'] {
    color: var(--color-text);
  }
}
</style>
