<script setup lang="ts">
/**
 * The APG breadcrumb: a navigation with an ordered list of links, the last
 * item the current page, as text. The project decides the trail, home included.
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
    align-items: baseline;
    gap: 0.5rem;
    /* Target spacing (WCAG 2.5.8), also where the trail wraps */
    min-height: 1.5rem;
    overflow-wrap: anywhere;

    + li::before {
      content: '/' / '';
      color: var(--color-grey-graphic);
    }
  }

  a {
    color: var(--color-grey-text);
    /* Not left to the project: color alone does not tell a link (WCAG 1.4.1) */
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
