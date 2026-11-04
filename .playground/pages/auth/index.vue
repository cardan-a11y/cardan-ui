<script setup lang="ts">
useHead({ title: 'Auth UI' });

const { isAuthenticated } = useAuth();
const { logoutDialogRef } = useLogoutDialog();
</script>

<template>
  <div class="demo-page">
    <h1>Auth UI</h1>

    <p>
      Cardan Auth UI is a separate layer in the <code>auth/</code> directory,
      with the sign-in and MFA forms for apps backed by Laravel Fortify.
      Projects extend it next to Cardan UI; see <code>auth/README.md</code>. The
      pages below talk to mock Fortify endpoints of this playground.
    </p>

    <Card>
      <h2>MFA dialogs</h2>
      <MfaDemo />
    </Card>

    <Card>
      <h2>Logout dialog</h2>

      <p>
        Asks before signing out. An app mounts it once, in its layout. Sign in
        on the Login page below first: signing out ends that demo session and
        returns to the start page.
      </p>

      <Button
        variant="outline"
        size="lg"
        icon="material-symbols:logout"
        :label="$t('general.sign-out')"
        :disabled="!isAuthenticated"
        @click="logoutDialogRef?.openDialog()"
      />

      <LogoutDialog />
    </Card>

    <Card>
      <h2>Pages</h2>

      <p>
        The layer's own pages, as an app gets them. Any password signs in and
        continues to the sign-in challenge, except <code>wrong</code>, which
        shows the error; the reset token <code>wrong</code> does the same.
      </p>

      <ul>
        <li><NuxtLink to="/login">Login</NuxtLink></li>
        <li><NuxtLink to="/forgot-password">Forgot password</NuxtLink></li>
        <li>
          <NuxtLink
            :to="{
              path: '/reset-password',
              query: { token: 'demo', email: 'demo@example.com' },
            }"
          >
            Reset password
          </NuxtLink>
        </li>
        <li>
          <NuxtLink to="/two-factor-authentication">
            Sign-in challenge
          </NuxtLink>
        </li>
        <li><NuxtLink to="/mfa-setup">MFA setup</NuxtLink></li>
      </ul>
    </Card>
  </div>
</template>
