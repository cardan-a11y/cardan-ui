// Any code is accepted, except 000000, which shows the validation error
export default defineEventHandler(async (event) => {
  const { code } = await readBody<{ code?: string }>(event);

  if (code === '000000') {
    // The body Laravel sends for a failed validation, not H3's error format
    setResponseStatus(event, 422);
    return {
      message: 'The provided code is invalid.',
      errors: {
        code: ['The provided code is invalid.'],
      },
    };
  }

  return {};
});
