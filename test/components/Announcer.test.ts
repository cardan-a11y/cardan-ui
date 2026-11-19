import { describe, it, expect, afterEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { nextTick } from 'vue';
import { Announcer } from '#components';
import { useAnnounce } from '#imports';
import { checkA11y } from '../a11y';

// ACI-151: the contract is the DOM addition, not what a screen reader speaks
function region(urgency: 'polite' | 'assertive') {
  const found = document.querySelector(`#teleports [aria-live="${urgency}"]`);
  if (!found) throw new Error(`No ${urgency} region`);
  return found;
}

function messages(urgency: 'polite' | 'assertive') {
  return Array.from(region(urgency).children, (child) => child.textContent);
}

/** The attributes of both regions, which must never change */
function attributes() {
  return (['polite', 'assertive'] as const).map((urgency) =>
    Array.from(region(urgency).attributes, (a) => `${a.name}=${a.value}`),
  );
}

/** Records the elements added to the region while `act` runs */
async function additions(
  urgency: 'polite' | 'assertive',
  act: () => void,
): Promise<string[]> {
  const records: MutationRecord[] = [];
  const observer = new MutationObserver((delivered) =>
    records.push(...delivered),
  );
  observer.observe(region(urgency), { childList: true });
  act();
  await nextTick();
  records.push(...observer.takeRecords());
  observer.disconnect();
  return records.flatMap((record) =>
    Array.from(record.addedNodes, (node) => node.textContent ?? ''),
  );
}

afterEach(() => {
  useAnnounce().announcements.value = { polite: [], assertive: [] };
});

describe('Announcer', () => {
  it('has an empty polite and an empty assertive region before any message', async () => {
    await mountSuspended(Announcer, { attachTo: document.body });

    for (const urgency of ['polite', 'assertive'] as const) {
      expect(region(urgency).getAttribute('role')).toBe('log');
      expect(region(urgency).getAttribute('aria-relevant')).toBe('additions');
      expect(messages(urgency)).toEqual([]);
    }
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('adds a repeated, equal message again, so it is read out again', async () => {
    await mountSuspended(Announcer, { attachTo: document.body });
    const { assertive } = useAnnounce();

    expect(
      await additions('assertive', () => assertive('Email is required')),
    ).toEqual(['Email is required']);
    expect(
      await additions('assertive', () => assertive('Email is required')),
    ).toEqual(['Email is required']);
  });

  it('puts each urgency in its own region, which never changes role or urgency', async () => {
    await mountSuspended(Announcer, { attachTo: document.body });
    const { polite, assertive } = useAnnounce();
    const before = attributes();

    polite('3 results');
    assertive('Email is required');
    polite('2 results');
    await nextTick();

    expect(messages('polite')).toEqual(['3 results', '2 results']);
    expect(messages('assertive')).toEqual(['Email is required']);
    expect(attributes()).toEqual(before);
  });

  it('leaves its messages in place, keeping the three latest', async () => {
    await mountSuspended(Announcer, { attachTo: document.body });
    const { polite } = useAnnounce();

    for (const text of ['One', 'Two', 'Three', 'Four']) polite(text);
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(messages('polite')).toEqual(['Two', 'Three', 'Four']);
  });

  it('ignores an empty message', async () => {
    await mountSuspended(Announcer, { attachTo: document.body });

    expect(await additions('polite', () => useAnnounce().polite(' '))).toEqual(
      [],
    );
  });
});
