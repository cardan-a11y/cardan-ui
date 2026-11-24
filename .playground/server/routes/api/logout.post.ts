export default defineEventHandler((event) => {
  deleteCookie(event, DEMO_SESSION_COOKIE, { path: '/' });
  setResponseStatus(event, 204);
  return null;
});
