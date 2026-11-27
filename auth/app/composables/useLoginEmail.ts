/**
 * The address typed into the sign-in form, shared so the forgot-password page
 * starts from whatever was already entered.
 */
export function useLoginEmail() {
  return useState('cardan-auth:login-email', () => '');
}
