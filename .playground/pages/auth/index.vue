<script setup lang="ts">
useHead({ title: 'Auth UI' });

const { open: openLogoutDialog } = useLogoutDialog();
</script>

<template>
  <div class="demo-page auth-demo">
    <p class="demo-eyebrow">Auth</p>
    <h1>Auth UI</h1>
    <p class="demo-lead">
      Cardan Auth UI is a separate layer in the <code>auth/</code> directory,
      with the sign-in and MFA forms for apps backed by Laravel Fortify.
      Projects extend it next to Cardan UI; see <code>auth/README.md</code>.
    </p>

    <section class="demo-section" aria-labelledby="auth-mfa">
      <h2 id="auth-mfa">MFA dialogs</h2>
      <p class="demo-hint">
        Enabling and disabling MFA and new recovery codes, each in a dialog
        that <code>useMfaDialog()</code> opens.
      </p>

      <Card>
        <MfaDemo />
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="auth-pages">
      <h2 id="auth-pages">Pages</h2>
      <p class="demo-hint">
        The layer’s own pages, as an app gets them, on mock Fortify endpoints
        of this playground. Any password signs in and continues to the sign-in
        challenge, except <code>wrong</code>, which shows the error; the reset
        token <code>wrong</code> does the same.
      </p>

      <Card>
        <ul class="a11y-list">
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
    </section>

    <section class="demo-section" aria-labelledby="auth-password">
      <h2 id="auth-password">Password update form</h2>
      <p class="demo-hint">
        Changes the password while signed in, for an account settings page.
        Its requirements box stands out on a card or in a dialog as well as on
        the page.
      </p>

      <Card class="auth-demo-form">
        <PasswordUpdateForm />
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="auth-logout">
      <h2 id="auth-logout">Logout dialog</h2>
      <p class="demo-hint">
        Asks before signing out, in a ConfirmDialog. An app mounts it once, in
        its layout, as this playground does, and opens it with
        <code>useLogoutDialog().open()</code>.
      </p>

      <Card>
        <ul class="a11y-list">
          <li>
            Open it from a button like this one or from a menu item, as the
            user menu in the header does.
          </li>
          <li>
            From a menu, <code>open()</code> waits until the closing menu has
            handed focus back to its trigger, so focus returns there when the
            dialog closes.
          </li>
          <li>
            Sign out ends the session, or only closes the dialog without one.
          </li>
        </ul>

        <Button
          variant="outline"
          size="lg"
          icon="material-symbols:logout"
          :label="$t('general.sign-out')"
          @click="openLogoutDialog()"
        />
      </Card>
    </section>
  </div>
</template>

<style>
.auth-demo {
  .card {
    margin-block-end: 0;
  }

  .a11y-list {
    margin-block: 0;

    &:has(+ .button) {
      margin-block-end: 1.5rem;
    }
  }

  .auth-demo-form {
    max-inline-size: 36rem;
  }
}
</style>
