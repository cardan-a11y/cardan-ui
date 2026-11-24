import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The tripwire runner, for the layer's test/tripwires.test.ts and a project's:
 *
 * ```ts
 * import { tripwires } from '#layer-test/tripwires';
 * tripwires(resolve(__dirname, '..'), [ ...entries ]);
 * ```
 *
 * A workaround that holds for one major.minor of a dependency, or its
 * internals, or until a Cardan UI release: its entry fails once the installed
 * version leaves `checked`, or once the checkout reaches `release`; then remove
 * the workaround, or confirm it and update the entry. Its comment points to
 * the project's tripwire test.
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

/** A workaround until a Cardan UI release ("until 2.6.1 is on `main`") */
export interface ReleaseTripwire {
  name: string;
  /** The full version of Cardan UI that makes the workaround needless */
  release: string;
  where: string;
  check: string;
}

type Manifest = { version: string; dependencies?: Record<string, string> };

function manifest(dir: string, pkg?: string): Manifest {
  return JSON.parse(
    readFileSync(
      pkg
        ? resolve(dir, 'node_modules', pkg, 'package.json')
        : resolve(dir, 'package.json'),
      'utf8',
    ),
  );
}

/** The checkout of Cardan UI this file is in */
const layerRoot = resolve(__dirname, '..');

/** -1, 0 or 1; versions as `2.6.0`, without a prerelease */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return Math.sign(d);
  }
  return 0;
}

/** What the entry finds, and the message when it fails; exported for its test */
export function readTripwire(
  root: string,
  entry: Tripwire | ReleaseTripwire,
  layer = layerRoot,
): { found: string; expected: string; message: string } {
  if ('release' in entry) {
    const version = manifest(layer).version;
    return {
      found: compareVersions(version, entry.release) < 0 ? 'before' : 'reached',
      expected: 'before',
      message: `Cardan UI is now ${version}, which reaches ${entry.release}: re-check ${entry.where} (${entry.check}), then remove the workaround or update this entry.`,
    };
  }

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
 * the installed versions; a release entry reads the checkout's package.json.
 */
export function tripwires(
  root: string,
  entries: (Tripwire | ReleaseTripwire)[],
) {
  describe('tripwires', () => {
    it.each(entries)('$name', (entry) => {
      const { found, expected, message } = readTripwire(root, entry);
      expect(found, message).toBe(expected);
    });
  });
}
