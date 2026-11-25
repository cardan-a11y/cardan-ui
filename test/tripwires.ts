import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The tripwire runner, for a project's test/tripwires.test.ts:
 *
 * ```ts
 * import { tripwires } from '#layer-test/tripwires';
 * tripwires(resolve(__dirname, '..'), [ ...entries ]);
 * ```
 *
 * Only for a last resort: a workaround that reads a dependency's internals or
 * relies on behaviour it does not document, because no public way exists. Its
 * entry fails once the installed version leaves `checked`; then remove the
 * workaround, or confirm it and update the entry. Its comment points to the
 * project's tripwire test and names the public ways that were tried.
 */
export interface Tripwire {
  /** What the workaround does, the name of its test */
  name: string;
  package: string;
  /** major.minor of `package`, or the range `parent` declares for it */
  checked: string;
  /** Reads `checked` as the range this package lists in `dependencies` */
  parent?: string;
  where: string;
  check: string;
}

type Manifest = { version: string; dependencies?: Record<string, string> };

function manifest(dir: string, pkg: string): Manifest {
  return JSON.parse(
    readFileSync(resolve(dir, 'node_modules', pkg, 'package.json'), 'utf8'),
  );
}

/** What the entry finds, and the message when it fails; exported for its test */
export function readTripwire(
  root: string,
  entry: Tripwire,
): { found: string; expected: string; message: string } {
  const version = entry.parent
    ? `${manifest(root, entry.parent).dependencies?.[entry.package]} in ${entry.parent}`
    : manifest(root, entry.package).version;
  const found = entry.parent
    ? manifest(root, entry.parent).dependencies?.[entry.package]
    : version.split('.').slice(0, 2).join('.');

  return {
    found: String(found),
    expected: entry.checked,
    message: `${entry.package} is now ${version}: re-check ${entry.where} (${entry.check}), then remove the workaround or update this entry.`,
  };
}

/**
 * One test per entry. `root` is the project's root: its `node_modules` holds
 * the installed versions.
 */
export function tripwires(root: string, entries: Tripwire[]) {
  describe('tripwires', () => {
    it.each(entries)('$name', (entry) => {
      const { found, expected, message } = readTripwire(root, entry);
      expect(found, message).toBe(expected);
    });
  });
}
