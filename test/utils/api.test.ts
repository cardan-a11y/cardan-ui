import { describe, it, expect, vi } from 'vitest';
import { apiErrorMessages, extractApiError } from '#imports';
import { fetchError } from '../fetch';
import academyCheckout from '../fixtures/api-errors/academy-checkout-validation.json';
import academyQuote from '../fixtures/api-errors/academy-quote-refused.json';
import academyLogin from '../fixtures/api-errors/academy-fortify-login.json';
import auditorAudit from '../fixtures/api-errors/auditor-audit-validation.json';
import statamicForm from '../fixtures/api-errors/statamic-form-failure.json';

type Fixture = {
  status: number;
  headers: Record<string, string>;
  body: unknown;
};

/** What `$fetch` throws for a failed request the backend really answered so */
function failed({ status, body, headers }: Fixture) {
  return extractApiError(fetchError(status, body, headers));
}

describe('extractApiError', () => {
  it("reads Laravel's shape, in English without a Content-Language", () => {
    const data = extractApiError(
      fetchError(422, {
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
        422,
        {
          errors: [
            {
              status: '422',
              detail: 'Naam is verplicht.',
              source: { parameter: 'name' },
            },
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

  it('takes the title of a JSON:API error that has no detail', () => {
    const data = extractApiError(
      fetchError(503, {
        errors: [{ status: '503', title: 'Service Unavailable' }],
      }),
    );

    expect(data).toEqual({ message: 'Service Unavailable', language: 'en' });
  });

  it('joins JSON:API errors that name no field into the message', () => {
    const data = extractApiError(
      fetchError(422, {
        errors: [
          { status: '422', detail: 'De winkelmand is leeg.' },
          // Nothing to read: neither a detail nor a title
          { status: '422' },
          { status: '422', detail: 'Kies eerst een training.' },
        ],
      }),
    );

    expect(data).toEqual({
      message: 'De winkelmand is leeg. Kies eerst een training.',
      language: 'en',
    });
    expect(
      extractApiError(fetchError(422, { errors: [{ status: '422' }] })),
    ).toEqual({});
  });

  it('takes the request error from the cause of a useAsyncData error', () => {
    const cause = fetchError(403, {
      errors: [{ status: '403', detail: 'Forbidden.' }],
    });
    const data = extractApiError(
      Object.assign(new Error('Wrapped'), { cause }),
    );

    expect(data.message).toBe('Forbidden.');
  });

  it('is empty without a usable body', () => {
    expect(extractApiError(new TypeError('Failed to fetch'))).toEqual({});
    expect(
      extractApiError(fetchError(502, '<html>Bad Gateway</html>')),
    ).toEqual({});
  });

  it('says the browser was offline when the request failed', () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    expect(extractApiError(new TypeError('Failed to fetch'))).toEqual({
      offline: true,
    });
    onLine.mockRestore();
  });
});

describe('apiErrorMessages', () => {
  it('lists a message that several fields share once', () => {
    expect(
      apiErrorMessages({
        message: 'The password is too weak. (and 1 more error)',
        errors: {
          password: ['The password is too weak.'],
          password_confirmation: ['The password is too weak.'],
        },
      }),
    ).toEqual(['The password is too weak.']);
  });
});

/** Bodies the Cardan backends send, in test/fixtures/api-errors */
describe('extractApiError on what the backends send', () => {
  it("the Academy's checkout: JSON:API field errors under nested keys, in Dutch", () => {
    expect(failed(academyCheckout)).toEqual({
      errors: {
        'participants.0.email': [
          'Het veld e-mailadres van de deelnemer is verplicht.',
        ],
        'billing.city': ['Het veld plaats is verplicht.'],
        'billing.email': [
          'Het veld e-mailadres voor de factuur moet een geldig e-mailadres zijn.',
        ],
      },
      language: 'nl',
    });
  });

  it("the Academy's refused quote: a line's error under it, the basket's as general", () => {
    const data = failed(academyQuote);

    expect(data).toEqual({
      errors: {
        '': [
          'De winkelmand bevat prijzen in meer dan één munteenheid. Bestel ze apart.',
        ],
        'lines.1': [
          'Er zijn niet genoeg plaatsen meer vrij op deze datum van Toegankelijk ontwerpen. Kies een andere datum of minder deelnemers.',
        ],
      },
      language: 'nl',
    });
    // The basket's error comes first, then the line's
    expect(apiErrorMessages(data)).toEqual(
      academyQuote.body.errors.map((error) => error.detail),
    );
  });

  it("the Academy's Fortify sign-in: Laravel's shape, shown once, in Dutch", () => {
    const data = failed(academyLogin);

    expect(data).toEqual({
      message: 'Deze inloggegevens kloppen niet.',
      errors: { email: ['Deze inloggegevens kloppen niet.'] },
      language: 'nl',
    });
    expect(apiErrorMessages(data)).toEqual([
      'Deze inloggegevens kloppen niet.',
    ]);
  });

  it("the Auditor: Laravel's shape with an array key, without the summary", () => {
    const data = failed(auditorAudit);

    expect(data.language).toBe('en');
    expect(data.errors?.['tool_ids.0']).toEqual([
      'The selected tool ids.0 is invalid.',
    ]);
    expect(apiErrorMessages(data)).toEqual([
      'The title field is required.',
      'The project id field is required.',
      'The selected tool ids.0 is invalid.',
    ]);
  });

  it("Statamic's failed form post: each field's message under it, each shown once", () => {
    const data = failed(statamicForm);

    expect(data).toEqual({
      errors: {
        message: ['The Bericht field is required.'],
        first_name: ['The Voornaam field is required.'],
        last_name: ['The Achternaam field is required.'],
        email: ['The E-mailadres field is required.'],
      },
      language: 'en',
    });
    expect(apiErrorMessages(data)).toEqual(statamicForm.body.errors);
  });

  it('keeps a Statamic message that no field holds as a general one', () => {
    const data = extractApiError(
      fetchError(400, {
        errors: ['The E-mailadres field is required.', 'Too many submissions.'],
        error: { email: 'The E-mailadres field is required.' },
      }),
    );

    expect(data.errors).toEqual({
      '': ['Too many submissions.'],
      email: ['The E-mailadres field is required.'],
    });
  });
});
