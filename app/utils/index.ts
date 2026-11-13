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
 * The `--duration-<size>` token in milliseconds, for a timeout that keeps
 * pace with a CSS transition. It reads the token the page has, so it is 0
 * when the user prefers reduced motion (the tokens are 0s then), on the
 * server and when the project's main.css lacks the token.
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

/**
 * Provided by Form: whether its fields show their errors, after a failed
 * submit or with `show-invalid`. A field describes itself by its error text
 * only while that text shows.
 */
export const formShowInvalidKey: InjectionKey<Readonly<Ref<boolean>>> =
  Symbol('formShowInvalid');

/** The elements that take keyboard focus: a loop, a popover and a tab panel look for them */
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

/** Provided by MenuList to the lists in it, which are then no landmarks of their own */
export const menuListNestedKey: InjectionKey<boolean> =
  Symbol('menuListNested');
