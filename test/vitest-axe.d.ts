/* Module augmentation: the interfaces must stay empty and keep vitest's
   type parameter. */
/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars */
import type { AxeMatchers } from 'vitest-axe/matchers';

// vitest-axe 0.1 types the `Vi` namespace of old vitest versions; vitest 5
// reads the matchers from this module instead. Remove once a vitest-axe
// release augments `vitest` itself (0.1.0 is its latest).
declare module 'vitest' {
  interface Assertion<T = unknown> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
