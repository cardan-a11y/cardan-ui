import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

type Messages = { [key: string]: string | Messages };

/** Read from disk: an import goes through @nuxtjs/i18n, which compiles it */
function locale(path: string): Messages {
  return JSON.parse(readFileSync(resolve(__dirname, '..', path), 'utf8'));
}

/** Every message by its dotted key */
function flatten(messages: Messages, prefix = ''): Record<string, string> {
  return Object.fromEntries(
    Object.entries(messages).flatMap(([key, value]) =>
      typeof value === 'string'
        ? [[prefix + key, value]]
        : Object.entries(flatten(value, `${prefix}${key}.`)),
    ),
  );
}

function mapValues(
  messages: Record<string, string>,
  read: (message: string) => string | number,
) {
  return Object.fromEntries(
    Object.entries(messages).map(([key, message]) => [key, read(message)]),
  );
}

/** The placeholders a message needs from the code: `{n}`, `{label}` */
const placeholders = (message: string) =>
  [...new Set(message.match(/\{[^}]*\}/g))].sort().join(' ');

/** How many plural forms it has: `item | items` has two */
const forms = (message: string) => message.split('|').length;

/**
 * A key that one language lacks shows as the raw key in the other, a
 * placeholder it lacks as a hole in the text, a plural form it lacks as the
 * wrong number.
 */
describe.each(['i18n/locales', 'auth/i18n/locales'])('%s', (folder) => {
  const en = () => flatten(locale(`${folder}/en.json`));
  const nl = () => flatten(locale(`${folder}/nl.json`));

  it('have the same keys and placeholders in English and Dutch', () => {
    expect(mapValues(nl(), placeholders)).toEqual(
      mapValues(en(), placeholders),
    );
  });

  it('have the same plural forms in English and Dutch', () => {
    expect(mapValues(nl(), forms)).toEqual(mapValues(en(), forms));
  });
});
