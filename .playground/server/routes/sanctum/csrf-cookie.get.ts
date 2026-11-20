export default defineEventHandler((event) => {
  setCookie(event, 'XSRF-TOKEN', 'demo');
  setResponseStatus(event, 204);
});
