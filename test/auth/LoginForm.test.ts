import { describe, it, expect, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { LoginForm } from '#components';
import { checkA11y } from '../a11y';

// The Fortify client, so a test decides what the login endpoint answers
const { client } = vi.hoisted(() => ({ client: vi.fn() }));
mockNuxtImport('useSanctumClient', () => () => client);

describe('LoginForm', () => {
  it('shows the API error in the alert, not on the fields', async () => {
    const message = 'These credentials do not match our records.';

    // Laravel's 422 for the email field, as ofetch throws it
    client.mockRejectedValue(
      Object.assign(new Error('Unprocessable Content'), {
        response: {
          status: 422,
          _data: { message, errors: { email: [message] } },
        },
      }),
    );

    const wrapper = await mountSuspended(LoginForm, {
      props: { autofocus: false },
      attachTo: document.body,
    });

    const email = wrapper.get('input[name="email"]');
    const password = wrapper.get<HTMLInputElement>('input[name="password"]');
    await email.setValue('ada@example.com');
    await password.setValue('secret');

    await wrapper.get('form').trigger('submit');
    await flushPromises();

    const alert = wrapper.get('[role="alert"]');
    expect(alert.text()).toContain(message);

    // The fields the browser found valid stay valid
    expect(email.attributes('aria-invalid')).toBeUndefined();
    expect(await checkA11y()).toHaveNoViolations();
  });
});
