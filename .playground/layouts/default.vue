<script setup lang="ts">
const route = useRoute();

const authPages = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/two-factor-authentication',
  '/mfa-setup',
];

const isAuthSubpage = computed(() => authPages.includes(route.path));
</script>

<template>
  <AppShell>
    <TheHeader />

    <div class="app-layout">
      <AppSidebar>
        <MenuList
          :list="navList"
          button-size="md"
          button-variant="sidebar"
          aria-label="Components"
        />
      </AppSidebar>

      <main id="main" tabindex="-1">
        <Button
          v-if="isAuthSubpage"
          variant="link"
          to="/auth"
          icon="material-symbols:arrow-left-alt-rounded"
          label="Back to Auth UI"
          class="auth-back-link"
        />

        <slot />
      </main>
    </div>
  </AppShell>
</template>

<style>
:root {
  --app-header-height: 4rem;
  --app-padding-block: 2.5rem;
}

main {
  /* main has the spacing above already */
  --error-page-padding-block: 0 5rem;

  container-type: inline-size;
  padding-block: var(--app-padding-block);
}

.section-topbar {
  align-items: center;
}

h2 {
  font-size: var(--font-size-xl);
}

h3 {
  font-size: var(--font-size-lg);
}

.app-layout {
  --app-sidebar-display: none;
  --app-sidebar-top: calc(var(--app-header-height) + 1px);
  --app-sidebar-width: max-content;
  --app-sidebar-padding-inline: 0px;
  --app-sidebar-padding-block: var(--app-padding-block);
  --app-sidebar-border-color: transparent;

  padding-inline: var(--app-padding-inline);
  max-width: var(--app-max-width);
  margin-inline: auto;
  min-height: calc(100dvh - var(--app-header-height) - 1px);

  @media (min-width: 1024px) {
    --app-sidebar-display: grid;

    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    column-gap: 4rem;
  }
}

.auth-back-link {
  margin-block-end: 1.5rem;
}

.demo-description {
  margin-block-end: 4rem;
}

.demo-page {
  padding-block-end: 5rem;

  h1 {
    font-size: var(--font-size-xxl);
  }

  .section-topbar {
    flex-wrap: nowrap;

    &:has(h1) {
      margin-block-end: 1.5rem;
    }
  }

  ul > li > ul {
    margin-block: 0.25rem;
  }

  blockquote {
    p {
      font-style: normal;
    }
  }

  .card-cols {
    --gap: 1rem;
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;

    > * {
      flex-grow: 1;
      flex-basis: calc(50% - var(--gap));
      min-width: 240px;
    }
  }

  .c-grey-text {
    .button {
      color: var(--color-text);

      &:hover {
        color: var(--color-accent-text);
      }
    }
  }

  .a11y-list {
    > li {
      margin-block-end: 0.125rem;

      &::marker {
        color: var(--color-accent-graphic);
      }
    }
  }

  .card {
    margin-block-end: 1.5rem;
  }

  p {
    max-width: 78ch;

    a {
      &:hover {
        color: var(--color-accent-text);
      }
    }
  }

  .popover-settings-content {
    padding: 1.5rem;

    h2 {
      font-size: var(--font-size-md);
      margin-block-start: 0;
      margin-block-end: 0.5rem;
    }

    :has(+ h2) {
      margin-block-end: 1.5rem;
    }

    .props-wrapper {
      display: grid;
      gap: 1rem;
    }
  }

  .demo-divider {
    margin-block: 2rem;
  }
}
</style>
