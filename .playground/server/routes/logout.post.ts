// Ends the demo session that the login form starts
export default defineEventHandler((event) => {
  setResponseStatus(event, 204);
  return null;
});
