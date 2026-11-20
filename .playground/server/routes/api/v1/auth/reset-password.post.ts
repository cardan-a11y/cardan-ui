export default defineEventHandler(async (event) => {
  const { token } = await readBody<{ token?: string }>(event);

  if (token === 'wrong') {
    setResponseStatus(event, 422);
    return {
      errors: [
        {
          status: '422',
          title: 'Unprocessable Entity',
          detail: 'This password reset link is invalid or has expired.',
          source: { parameter: 'email' },
        },
      ],
    };
  }

  return { status: 'Your password has been reset.' };
});
