import { describe, it, expect } from 'vitest';
import { resolveLocale } from '../../auth/app/utils/locale';
import { academy, auditor } from './scenarios';

const locales = ['en', 'nl'];

type Case = {
  path?: string;
  query?: Record<string, unknown>;
  meta?: { locale?: string };
  user?: Record<string, unknown> | null;
  localeFields?: string[];
};

function resolve({
  path = '/',
  query = {},
  meta = {},
  user = null,
  localeFields = auditor.cardanAuth.localeFields,
}: Case) {
  return resolveLocale({
    route: { path, query, meta },
    user,
    localeFields,
    locales,
  });
}

describe('resolveLocale()', () => {
  it.each<[string, Case, ReturnType<typeof resolveLocale>]>([
    // The route's own language
    [
      'a route with its own language, for a visitor',
      { path: '/en/catalog', meta: { locale: 'en' } },
      { locale: 'en', source: 'address' },
    ],
    [
      'a route with its own language, for a signed-in user',
      { path: '/catalog', meta: { locale: 'nl' }, user: { language: 'en' } },
      { locale: 'nl', source: 'address' },
    ],
    [
      'a route with its own language over ?locale=',
      { path: '/login', query: { locale: 'nl' }, meta: { locale: 'en' } },
      { locale: 'en', source: 'address' },
    ],
    [
      'a route language the app does not offer, then the profile',
      { meta: { locale: 'de' }, user: { language: 'nl' } },
      { locale: 'nl', source: 'profile' },
    ],

    // ?locale=
    ...[
      '/login',
      '/forgot-password',
      '/reset-password',
      '/two-factor-authentication',
    ].map((path): [string, Case, ReturnType<typeof resolveLocale>] => [
      `?locale= on ${path} for a visitor`,
      { path, query: { locale: 'nl' } },
      { locale: 'nl', source: 'address' },
    ]),
    [
      '?locale= on a signed-out page with a trailing slash',
      { path: '/login/', query: { locale: 'nl' } },
      { locale: 'nl', source: 'address' },
    ],
    [
      '?locale= on a signed-out page for a signed-in user: the profile',
      {
        path: '/reset-password',
        query: { locale: 'nl' },
        user: { language: 'en' },
      },
      { locale: 'en', source: 'profile' },
    ],
    [
      '?locale= on a signed-out page for a signed-in user without a profile language',
      { path: '/reset-password', query: { locale: 'nl' }, user: {} },
      null,
    ],
    [
      '?locale= on /mfa-setup',
      { path: '/mfa-setup', query: { locale: 'nl' } },
      null,
    ],
    [
      '?locale= on a page an app added to authPages',
      { path: '/invitations/abc', query: { locale: 'nl' } },
      null,
    ],
    [
      '?locale= on another page',
      { path: '/accessibility', query: { locale: 'nl' } },
      null,
    ],
    [
      '?locale= the app does not offer',
      { path: '/login', query: { locale: 'de' } },
      null,
    ],
    [
      '?locale= twice',
      { path: '/login', query: { locale: ['nl', 'en'] } },
      null,
    ],

    // The profile
    [
      'the first field',
      { user: { language: 'nl', team: { language: 'en' } } },
      { locale: 'nl', source: 'profile' },
    ],
    [
      'the next field when the first is empty',
      { user: { language: null, team: { language: 'nl' } } },
      { locale: 'nl', source: 'profile' },
    ],
    [
      'the next field when the first holds a language the app does not offer',
      { user: { language: 'de', team: { language: 'nl' } } },
      { locale: 'nl', source: 'profile' },
    ],
    ['a profile without a language', { user: { team: null } }, null],
    [
      'only the fields the app names',
      {
        user: { preferred_locale: 'nl' },
        localeFields: auditor.cardanAuth.localeFields,
      },
      null,
    ],
    [
      'the Academy field',
      {
        user: { preferred_locale: 'nl' },
        localeFields: academy.cardanAuth.localeFields,
      },
      { locale: 'nl', source: 'profile' },
    ],
    ['no fields named', { user: { language: 'nl' }, localeFields: [] }, null],

    // Neither
    [
      'a visitor on a page without a language in its address',
      { path: '/cart' },
      null,
    ],
  ])('%s', (_, input, expected) => {
    expect(resolve(input)).toEqual(expected);
  });
});
