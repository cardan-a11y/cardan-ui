<script setup lang="ts">
/**
 * Asks before signing out. Mount it once, in your layout, and open it from
 * anywhere with `useLogoutDialog().logoutDialogRef.value?.openDialog()`.
 */

const { logoutDialogRef, handleLogout } = useLogoutDialog();

const loading = ref(false);
const error = ref<ApiErrorData | null>(null);

/** The dialog closes on success; a refusal shows here, with the button at rest. */
async function signOut() {
  error.value = null;
  loading.value = true;

  try {
    await handleLogout();
  } catch (e) {
    error.value = extractApiError(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Dialog
    ref="logoutDialogRef"
    class="logout-dialog"
    :label="$t('general.sign-out')"
    @close="error = null"
  >
    <p>{{ $t('auth.confirm-logout') }}</p>

    <ErrorMessage :data="error" />

    <template #buttons>
      <Button
        variant="black"
        icon="material-symbols:logout"
        :label="$t('general.sign-out')"
        :loading="loading"
        @click="signOut"
      />
    </template>
  </Dialog>
</template>

<style>
.logout-dialog {
  --dialog-max-width: 440px;

  .dialog-buttons {
    margin-block-start: 2.5rem;
  }
}
</style>
