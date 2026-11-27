/** "2,4 MB" or "480 KB", in the app's locale (Dutch outside a Nuxt app) or `locale`. */
export function formatFileSize(
  bytes: number,
  locale = tryUseNuxtApp()?.$i18n.locale.value ?? 'nl',
) {
  const kilobytes = Math.max(1, Math.round(bytes / 1000));
  if (kilobytes < 1000) return `${formatNumber(kilobytes, locale)} KB`;

  const megabytes = bytes / 1_000_000;
  return `${formatNumber(megabytes, locale, { maximumFractionDigits: 1 })} MB`;
}

/**
 * The part after the last dot, `undefined` for a name without one; a leading
 * dot (`.env`) starts the name, not an extension.
 */
export function getFileExtension(filename?: string) {
  const dot = filename?.lastIndexOf('.') ?? -1;
  return filename && dot > 0 ? filename.slice(dot + 1) : undefined;
}
