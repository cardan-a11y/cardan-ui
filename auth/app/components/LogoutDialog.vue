<script setup lang="ts">
/**
 * Asks before signing out. Mount it once, in your layout, and open it from
 * anywhere with `useLogoutDialog().logoutDialogRef.value?.openDialog()`.
 */

const { logoutDialogRef, handleLogout } = useLogoutDialog();

const loading = ref(false);
const error = ref<ApiErrorData | null>(null);

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
  <ConfirmDialog
    ref="logoutDialogRef"
    class="logout-dialog"
    :label="$t('general.sign-out')"
    :description="$t('auth.confirm-logout')"
    :confirm-label="$t('general.sign-out')"
    confirm-icon="material-symbols:logout"
    confirm-variant="black"
    :loading="loading"
    :error="error"
    @confirm="signOut"
    @cancel="error = null"
  />
</template>
