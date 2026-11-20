import type { InjectionKey, Ref } from 'vue';

export function fixBoldText(text?: string) {
  return text?.replaceAll('<strong>', '<b>')?.replaceAll('</strong>', '</b>');
}

export function fixItalicText(text?: string) {
  return text?.replaceAll('<em>', '<i>')?.replaceAll('</em>', '</i>');
}

export function fixBoldAndItalicText(text?: string) {
  const fixedBoldText = fixBoldText(text);
  return fixItalicText(fixedBoldText);
}

export async function copyText(text?: string) {
  if (!text) return;
  return await navigator?.clipboard?.writeText(text);
}

export function isValidUrl(url?: string): boolean {
  try {
    return !!url && Boolean(new URL(url));
  } catch (error) {
    console.info(error);
    return false;
  }
}

export function removeHttp(url?: string) {
  return url?.replace(/^https?:\/\//, '')?.replace(/^www\./, '');
}

export function trimUrl(url: string) {
  return url.replace(/[.,]+$/, '')?.replace(/\/$/, '');
}

export function stripUrl(url?: string) {
  return url
    ?.replace(/^https?:\/\//, '')
    ?.replace(/^www\./, '')
    ?.replace(/[.,]+$/, '')
    ?.replace(/\/$/, '');
}

export function stripTrailingSlash(str?: string) {
  if (!str) return '';
  if (str === '/') return '/';
  return str.endsWith('/') ? str.slice(0, -1) : str;
}

export function addTrailingSlash(str?: string) {
  if (!str) return;
  if (str === '/') return '/';
  return str.endsWith('/') ? str : str + '/';
}

export function getRandomInt(max = 1) {
  return Math.ceil(Math.random() * max);
}

/**
 * The `--duration-<size>` token in milliseconds, for a timeout that keeps pace
 * with a CSS transition: 0 under reduced motion, on the server, or without it.
 */
export function transitionDuration(
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl',
) {
  if (import.meta.server) return 0;

  const duration = getComputedStyle(document.documentElement)
    .getPropertyValue(`--duration-${size}`)
    .trim();
  const [, number, unit] = duration.match(/^(\d*\.?\d+)(m?s)$/) ?? [];
  if (!number) return 0;

  return Math.round(Number(number) * (unit === 's' ? 1000 : 1));
}

/** Provided by Form: whether its fields show their errors. */
export const formShowInvalidKey: InjectionKey<Readonly<Ref<boolean>>> =
  Symbol('formShowInvalid');

/** Provided by Form: registers a field's `useAutofillSync()` sync; returns its unregister. */
export const formSyncKey: InjectionKey<(sync: () => boolean) => () => void> =
  Symbol('formSync');

/** The elements that take keyboard focus, for FocusLoop */
export const focusableSelector = [
  ...['input', 'select', 'button', 'textarea'].map(
    (field) => `${field}:not([disabled])`,
  ),
  'a[href]',
  'video[controls]',
  'audio[controls]',
  '[tabindex]:not([tabindex^="-"])',
  '[contenteditable]:not([contenteditable="false"])',
].join(',');

/** The element Tab would reach first in `container`, for a radio group its checked radio. */
export function firstFocusable(container?: HTMLElement | null) {
  const first = container?.querySelector<HTMLElement>(focusableSelector);
  if (!(first instanceof HTMLInputElement) || first.type !== 'radio') {
    return first ?? undefined;
  }
  const checked = container?.querySelector<HTMLElement>(
    `input[type='radio'][name="${CSS.escape(first.name)}"]:checked:not([disabled])`,
  );
  return checked ?? first;
}

/** Provided by MenuList to the lists in it, which are then no landmarks of their own */
export const menuListNestedKey: InjectionKey<boolean> =
  Symbol('menuListNested');
