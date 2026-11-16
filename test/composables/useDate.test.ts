import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { defineComponent, h } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';

const now = new Date('2026-11-12T12:00:00Z').getTime();

/** The date `seconds` from now (negative: in the past), as an ISO string */
const from = (seconds: number) => new Date(now + seconds * 1000).toISOString();

/** formatDate, from a component in the current locale */
async function useFormatDate() {
  const wrapper = await mountSuspended(
    defineComponent({
      setup(_, { expose }) {
        expose(useDate());
        return () => h('div');
      },
    }),
  );
  return (wrapper.vm as unknown as ReturnType<typeof useDate>).formatDate;
}

beforeEach(() => {
  vi.useFakeTimers({ now, toFake: ['Date'] });
});

afterEach(async () => {
  vi.useRealTimers();
  await useNuxtApp().$i18n.setLocale('en');
});

describe('useDate', () => {
  it('says "just now" within a minute, either way', async () => {
    const formatDate = await useFormatDate();

    expect(formatDate(from(0))).toBe('just now');
    expect(formatDate(from(-59))).toBe('just now');
    expect(formatDate(from(59))).toBe('just now');
  });

  it('counts whole minutes up to an hour and whole hours up to a day', async () => {
    const formatDate = await useFormatDate();

    expect(formatDate(from(-60))).toBe('1 minute ago');
    expect(formatDate(from(-3599))).toBe('59 minutes ago');
    expect(formatDate(from(20 * 60))).toBe('in 20 minutes');
    expect(formatDate(from(-3600))).toBe('1 hour ago');
    expect(formatDate(from(-86399))).toBe('23 hours ago');
    expect(formatDate(from(2 * 3600))).toBe('in 2 hours');
  });

  it('gives the date in full from a day away', async () => {
    const formatDate = await useFormatDate();

    expect(formatDate(from(-86400))).toMatch(/November 11, 2026/);
    expect(formatDate(from(3 * 86400))).toMatch(/November 15, 2026/);
  });

  it('speaks Dutch in the Dutch locale', async () => {
    await useNuxtApp().$i18n.setLocale('nl');
    const formatDate = await useFormatDate();

    expect(formatDate(from(-10))).toBe('zojuist');
    expect(formatDate(from(-3 * 60))).toBe('3 minuten geleden');
    expect(formatDate(from(3600))).toBe('over 1 uur');
    expect(formatDate(from(-2 * 86400))).toMatch(/10 november 2026/);
  });

  it('is undefined for a string that is not a date', async () => {
    const formatDate = await useFormatDate();

    expect(formatDate('not a date')).toBeUndefined();
    expect(formatDate('')).toBeUndefined();
  });
});
