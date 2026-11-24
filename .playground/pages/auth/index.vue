<script setup lang="ts">
useHead({ title: 'Auth UI' });

const { open: openLogoutDialog } = useLogoutDialog();
</script>

<template>
  <div class="demo-page auth-demo">
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

    <div class="two-cols">
      <Card>
        <h2>Password update form</h2>

        <p>
          Changes the password while signed in, for an account settings page.
          Its requirements box stands out on a card or in a dialog as well as on
          the page.
        </p>

        <PasswordUpdateForm />
      </Card>

      <Card>
        <h2>Logout dialog</h2>

        <p>
          Asks before signing out, in a ConfirmDialog. An app mounts it once, in
          its layout, as this playground does, and opens it with
          <code>useLogoutDialog().open()</code>, from a button like this one or
          from a menu item, as the user menu in the header does. From a menu,
          <code>open()</code> waits until the closing menu has handed focus back
          to its trigger, so focus returns there when the dialog closes. Sign
          out ends the session, or only closes the dialog without one.
        </p>

        <Button
          variant="outline"
          size="lg"
          icon="material-symbols:logout"
          :label="$t('general.sign-out')"
          @click="openLogoutDialog()"
        />
      </Card>
    </div>
  </div>
</template>

<style>
.auth-demo {
  .two-cols {
    @container (min-width: 720px) {
      display: grid;
      gap: 1.5rem;
      grid-template-columns: auto auto;
    }
  }
}
</style>
