<script setup lang="ts">
const { label = 'Components' } = defineProps<{
  /** The name of the navigation landmark */
  label?: string;
}>();

const id = useId();
const route = useRoute();

function current(to: string) {
  if (route.path === to) return 'page';

  return to !== '/' && route.path.startsWith(`${to}/`) ? 'true' : undefined;
}
</script>

<template>
  <nav class="playground-nav" :aria-label="label">
    <div v-for="group in navGroups" :key="group.id">
      <h2 :id="`${id}-${group.id}`">{{ group.label }}</h2>

      <ul role="list" :aria-labelledby="`${id}-${group.id}`">
        <li v-for="item in group.items" :key="item.id">
          <NuxtLink
            :to="item.to"
            :aria-current="current(item.to)"
          >
            {{ item.label }}
          </NuxtLink>
        </li>
      </ul>
    </div>
  </nav>
</template>

<style>
.playground-nav {
  display: grid;
  gap: 1.5rem;
  min-inline-size: 12.5rem;
  padding-inline-end: 0.75rem;

  h2 {
    margin-block: 0 0.375rem;
    padding-inline: 0.75rem;
    color: var(--color-grey-text);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  ul {
    display: grid;
    gap: 0.125rem;
  }

  a {
    display: block;
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-md);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-ui);
    text-decoration: none;
    outline-offset: -2px;

    &:hover,
    &[aria-current] {
      background-color: var(--color-accent-bg);
    }

    &[aria-current] {
      color: var(--color-accent-text);
      font-weight: var(--font-weight-semibold);
    }
  }
}
</style>
