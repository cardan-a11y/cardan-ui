<script setup lang="ts">
const route = useRoute();
const mobileMenuRef = useTemplateRef<DialogComponent>('mobileMenu');

watch(
  () => route.path,
  () => {
    if (mobileMenuRef.value?.isVisible) {
      mobileMenuRef.value?.closeDialog();
    }
  },
);
</script>

<template>
  <AppHeader class="the-header">
    <template #start>
      <MobileMenu ref="mobileMenu" class="left-menu" position="inline-start">
        <MenuList :list="navList" button-variant="sidebar" label="Menu" />
      </MobileMenu>

      <NuxtLink to="/" class="home-link">
        <CardanLogo product="UI" />
      </NuxtLink>
    </template>

    <template #end>
      <!-- <ClientOnly>
        <CookiesButton />
      </ClientOnly> -->
      <ThemeSwitch />
    </template>
  </AppHeader>
</template>

<style>
.the-header {
  --app-header-gap: 0.75rem;

  /* From here the sidebar holds the navigation (app.vue) */
  .mobile-menu-wrapper {
    @media (min-width: 1024px) {
      display: none;
    }
  }

  .home-link {
    display: grid;
  }
}

.mobile-dialog {
  .dialog-content {
    padding-inline: var(--app-padding-inline);
  }
}
</style>
