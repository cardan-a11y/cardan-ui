export default defineEventHandler(async (event) => {
  const { password } = await readBody<{ password?: string }>(event);

  if (password === 'wrong') {
    // The body Laravel sends for a failed validation, not H3's error format
    setResponseStatus(event, 422);
    return {
      message: 'These credentials do not match our records.',
      errors: {
        email: ['These credentials do not match our records.'],
      },
    };
  }

  return { two_factor: true };
});
