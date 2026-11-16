<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <AxePopup />

  <ClientOnly>
    <ToastManager />
  </ClientOnly>
</template>
