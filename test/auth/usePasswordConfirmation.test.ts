import { describe, it, expect, vi } from 'vitest';
import { usePasswordConfirmation } from '#imports';

describe('usePasswordConfirmation', () => {
  it('rejects a request when no dialog is mounted', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const { requestPasswordConfirmation, passwordConfirmationDialogRef } =
      usePasswordConfirmation();

    passwordConfirmationDialogRef.value = null;

    // A caller that would otherwise wait forever, on a loading button
    await expect(requestPasswordConfirmation()).rejects.toThrow(
      'PasswordConfirmationDialog',
    );
    expect(consoleError).toHaveBeenCalledOnce();

    consoleError.mockRestore();
  });
});
