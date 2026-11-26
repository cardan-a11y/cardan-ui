import { existsSync, readFileSync } from 'node:fs';
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

function manifest(dir: string, pkg: string): Manifest | undefined {
  const path = resolve(dir, 'node_modules', pkg, 'package.json');
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : undefined;
}

/** What the entry finds, and the message when it fails; exported for its test */
export function readTripwire(
  root: string,
  entry: Tripwire,
): { found: string; expected: string; message: string } {
  let found: string | undefined;
  let now: string;
  if (entry.parent) {
    const parent = manifest(root, entry.parent);
    found = parent?.dependencies?.[entry.package];
    now = !parent
      ? `${entry.parent} is not installed`
      : found
        ? `${entry.package} is now ${found} in ${entry.parent}`
        : `${entry.package} is no longer a dependency of ${entry.parent}`;
  } else {
    const version = manifest(root, entry.package)?.version;
    found = version?.split('.').slice(0, 2).join('.');
    now = version
      ? `${entry.package} is now ${version}`
      : `${entry.package} is not installed`;
  }

  return {
    found: found ?? 'nothing',
    expected: entry.checked,
    message: `${now}: re-check ${entry.where} (${entry.check}), then remove the workaround or update this entry.`,
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
