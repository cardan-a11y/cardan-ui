export default defineEventHandler(async (event) => {
  const { current_password } = await readBody<{ current_password?: string }>(
    event,
  );

  if (current_password === 'wrong') {
    setResponseStatus(event, 422);
    return {
      errors: [
        {
          status: '422',
          title: 'Unprocessable Entity',
          detail: 'The provided password does not match your current password.',
          source: { parameter: 'current_password' },
        },
      ],
    };
  }

  return { data: { updated: true } };
});
