<script setup lang="ts">
const route = useRoute();
const appRef = useTemplateRef('app');

watch(
  () => route.path,
  () => {
    appRef.value?.focus();
  },
);

useHead({ titleTemplate: '%s | Cardan UI' });

// The Auth UI layer's own pages, demoed full page
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
  <div ref="app" tabindex="-1" class="app-focus-wrapper">
    <NuxtRouteAnnouncer />

    <SkipLink />

    <AppHeader />

    <div class="app-layout">
      <aside class="app-sidebar">
        <MenuList :list="navList" button-size="md" button-variant="sidebar" />
      </aside>

      <main id="main" tabindex="-1">
        <Button
          v-if="isAuthSubpage"
          variant="link"
          to="/auth"
          icon="material-symbols:arrow-left-alt-rounded"
          label="Back to Auth UI"
          class="auth-back-link"
        />

        <NuxtPage />
      </main>

      <!-- <CookiesDialog
        description="This cookies dialog is for demo purposes only."
      /> -->
    </div>
  </div>

  <AxePopup />

  <ClientOnly>
    <ToastManager />
  </ClientOnly>
</template>

<style>
:root {
  /* Layout design tokens */
  --app-max-width: 1280px;
  --app-header-height: 4rem;
  --app-padding-block: 2.5rem;
}

main {
  container-type: inline-size;
  scroll-margin-block: var(--app-header-height);
}

.section-topbar {
  align-items: center;
}

h2 {
  font-size: var(--font-size-lg);
}

h3 {
  font-size: var(--font-size-md);
}

.app-focus-wrapper {
  outline: 1px solid transparent;
}

.app-layout {
  padding-inline: var(--app-padding-inline);
  padding-block: var(--app-padding-block);
  max-width: var(--app-max-width);
  margin-inline: auto;
  min-height: calc(100dvh - 3.5rem - 1px);

  @media (min-width: 1024px) {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4rem;
  }
}

.app-sidebar {
  display: none;

  @media (min-width: 1024px) {
    display: block;
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
