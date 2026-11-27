// Forgets the previous user's address on a sign-out, for the next person on a
// shared machine: the login form's and the MFA setup reminder's
export default defineNuxtPlugin({
  name: 'cardan-auth:sign-out',

  setup(nuxtApp) {
    nuxtApp.hook('sanctum:logout', () => {
      nuxtApp.runWithContext(() => {
        useLoginEmail().value = '';
        useMfaSetupReminder().dismissMfaSetup();
      });
    });
  },
});
