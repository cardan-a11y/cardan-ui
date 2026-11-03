import { afterEach, expect } from 'vitest';
import { enableAutoUnmount } from '@vue/test-utils';
import * as matchers from 'vitest-axe/matchers';

expect.extend(matchers);

// A failed test must not leave its component in the document for the next
// test's axe run.
enableAutoUnmount(afterEach);
