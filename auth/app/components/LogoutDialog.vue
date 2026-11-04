<script setup lang="ts">
/**
 * Asks before signing out. Mount it once, in your layout, and open it from
 * anywhere with `useLogoutDialog().logoutDialogRef.value?.openDialog()`.
 */

const { logoutDialogRef, handleLogout } = useLogoutDialog();
</script>

<template>
  <Dialog
    ref="logoutDialogRef"
    class="logout-dialog"
    :label="$t('general.sign-out')"
  >
    <p>{{ $t('auth.confirm-logout') }}</p>

    <template #buttons>
      <Button
        variant="black"
        icon="material-symbols:logout"
        :label="$t('general.sign-out')"
        @click="handleLogout"
      />
    </template>
  </Dialog>
</template>

<style>
.logout-dialog {
  --dialog-max-width: 440px;
}
</style>
