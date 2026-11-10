// Fortify's sign-out: the Logout dialog posts here once the demo has a session
export default defineEventHandler((event) => {
  setResponseStatus(event, 204);
  return null;
});
