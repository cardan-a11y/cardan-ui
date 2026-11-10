import { describe, it, expect, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { ErrorMessage } from '#components';
import { extractApiError } from '#imports';
import { checkA11y } from '../a11y';

/** A failed request as ofetch throws it: the body and the response headers */
function fetchError(body: unknown, headers: Record<string, string> = {}) {
  return Object.assign(new Error('Request failed'), {
    response: { _data: body, headers: new Headers(headers) },
  });
}

describe('extractApiError', () => {
  it("reads Laravel's shape, in English without a Content-Language", () => {
    const data = extractApiError(
      fetchError({
        message: 'The name field is required. (and 1 more error)',
        errors: {
          name: ['The name field is required.'],
          email: ['The email field must be a valid email address.'],
        },
      }),
    );

    expect(data.errors?.email).toEqual([
      'The email field must be a valid email address.',
    ]);
    expect(data.language).toBe('en');
  });

  it('folds a JSON:API envelope, with the language the API answered in', () => {
    const data = extractApiError(
      fetchError(
        {
          errors: [
            { status: '422', detail: 'Naam is verplicht.', source: { parameter: 'name' } },
            { status: '422', detail: 'De offerte is verlopen.' },
          ],
        },
        { 'Content-Language': 'nl' },
      ),
    );

    expect(data).toEqual({
      errors: { '': ['De offerte is verlopen.'], name: ['Naam is verplicht.'] },
      language: 'nl',
    });
  });

  it('takes the request error from the cause of a useAsyncData error', () => {
    const cause = fetchError({ errors: [{ status: '403', detail: 'Forbidden.' }] });
    const data = extractApiError(Object.assign(new Error('Wrapped'), { cause }));

    expect(data.message).toBe('Forbidden.');
  });

  it('is empty without a usable body', () => {
    expect(extractApiError(new TypeError('Failed to fetch'))).toEqual({});
    expect(extractApiError(fetchError('<html>Bad Gateway</html>'))).toEqual({});
  });

  it('says the browser was offline when the request failed', () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    expect(extractApiError(new TypeError('Failed to fetch'))).toEqual({
      offline: true,
    });
    onLine.mockRestore();
  });
});

describe('ErrorMessage', () => {
  it('lists every field message, not the summary, in the API language', async () => {
    const wrapper = await mountSuspended(ErrorMessage, {
      props: {
        data: {
          message: 'The name field is required. (and 1 more error)',
          errors: {
            name: ['The name field is required.'],
            email: ['The email field must be a valid email address.'],
          },
          language: 'en',
        },
      },
      attachTo: document.body,
    });

    const items = wrapper.findAll('li');
    expect(items.map((item) => item.text())).toEqual([
      'The name field is required.',
      'The email field must be a valid email address.',
    ]);
    expect(wrapper.get('ul').attributes('lang')).toBe('en');
    expect(wrapper.text()).not.toContain('and 1 more error');
    expect(await checkA11y()).toHaveNoViolations();
    wrapper.unmount();
  });

  it('tells offline from a server error without a message', async () => {
    const wrapper = await mountSuspended(ErrorMessage, {
      props: { data: {} },
    });
    expect(wrapper.get('[role="alert"]').text()).toBe(
      'Something went wrong. Please try again later.',
    );

    await wrapper.setProps({ data: { offline: true } });
    expect(wrapper.get('[role="alert"]').text()).toBe(
      'You are offline. Check your connection and try again.',
    );
  });

  it('puts the page text before the API messages', async () => {
    const wrapper = await mountSuspended(ErrorMessage, {
      props: {
        text: 'Check your order.',
        data: { message: 'The quote expired.', language: 'en' },
      },
    });

    const paragraphs = wrapper.findAll('.error-message p');
    expect(paragraphs.map((p) => p.text())).toEqual([
      'Check your order.',
      'The quote expired.',
    ]);
    // Only the API's message carries its language
    expect(paragraphs[0]!.attributes('lang')).toBeUndefined();
    expect(paragraphs[1]!.attributes('lang')).toBe('en');
  });

  it('shows a page text alone, and its own text without one', async () => {
    const wrapper = await mountSuspended(ErrorMessage, {
      props: { text: 'Too many requests.' },
    });
    expect(wrapper.get('.error-message').text()).toBe('Too many requests.');

    // An empty text next to an offline error, as a form passes them
    await wrapper.setProps({ text: undefined, data: { offline: true } });
    expect(wrapper.get('.error-message').text()).toBe(
      'You are offline. Check your connection and try again.',
    );
  });

  it('keeps an empty alert region until there is an error', async () => {
    const wrapper = await mountSuspended(ErrorMessage);

    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.find('.error-message').exists()).toBe(false);
  });
});
