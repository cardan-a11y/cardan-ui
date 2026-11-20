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

/** FileInput's icon per file type, by extension or MIME type; the first match wins. */
export const fileTypeIcons: [
  matches: (extension: string, type: string) => boolean,
  icon: string,
][] = [
  [
    (ext) => ext === 'vue' || ext === 'ts',
    'material-symbols:code-blocks-outline-rounded',
  ],
  [(ext) => ext === 'md', 'material-symbols:markdown-outline-rounded'],
  [
    (_, type) => type.includes('javascript'),
    'material-symbols:javascript-outline-rounded',
  ],
  [(_, type) => type.includes('css'), 'material-symbols:css-outline-rounded'],
  [(_, type) => type.includes('html'), 'material-symbols:html-outline-rounded'],
  [(_, type) => type.includes('php'), 'material-symbols:php-outline-rounded'],
  [
    (_, type) => type.includes('json'),
    'material-symbols:file-json-outline-rounded',
  ],
  [
    (_, type) => type.includes('pdf'),
    'material-symbols:picture-as-pdf-outline-rounded',
  ],
  [
    (_, type) => type.includes('text/plain'),
    'material-symbols:text-snippet-outline-rounded',
  ],
  [
    (_, type) => type.includes('word') || type.includes('opendocument.text'),
    'material-symbols:description-outline-rounded',
  ],
  [
    (_, type) => type.includes('excel') || type.includes('spreadsheet'),
    'material-symbols:table-outline-rounded',
  ],
  [
    (_, type) => type.includes('powerpoint') || type.includes('presentation'),
    'material-symbols:slideshow-outline-rounded',
  ],
  [
    (_, type) => type.includes('illustrator'),
    'material-symbols:draw-outline-rounded',
  ],
  [
    (_, type) => type.includes('photoshop'),
    'material-symbols:palette-outline-rounded',
  ],
  [
    (_, type) => type.includes('video'),
    'material-symbols:video-file-outline-rounded',
  ],
  [
    (_, type) => type.includes('image'),
    'material-symbols:image-outline-rounded',
  ],
];

export function fileTypeIcon(file?: File) {
  if (!file) return 'material-symbols:upload-file-outline';
  const extension = getFileExtension(file.name)?.toLowerCase() ?? '';
  return (
    fileTypeIcons.find(([matches]) => matches(extension, file.type))?.[1] ??
    'material-symbols:unknown-document-outline-rounded'
  );
}
