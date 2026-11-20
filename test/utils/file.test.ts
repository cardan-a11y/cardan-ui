import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  fileTypeIcon,
  fileTypeIcons,
  getFileExtension,
} from '../../app/utils/file';

/** The installed Material Symbols, icons and aliases, as `prefix:name` */
function materialSymbols() {
  const { prefix, icons, aliases } = JSON.parse(
    readFileSync(
      'node_modules/@iconify-json/material-symbols/icons.json',
      'utf8',
    ),
  );
  return new Set(
    [...Object.keys(icons), ...Object.keys(aliases ?? {})].map(
      (name) => `${prefix}:${name}`,
    ),
  );
}

describe('getFileExtension', () => {
  it('returns the part after the last dot', () => {
    expect(getFileExtension('werkblad.pdf')).toBe('pdf');
    expect(getFileExtension('archief.tar.gz')).toBe('gz');
    expect(getFileExtension('Foto.JPG')).toBe('JPG');
  });

  it('has no extension for a name without a dot', () => {
    expect(getFileExtension('README')).toBeUndefined();
    expect(getFileExtension('')).toBeUndefined();
    expect(getFileExtension(undefined)).toBeUndefined();
  });

  it('reads a leading dot as part of the name', () => {
    expect(getFileExtension('.env')).toBeUndefined();
    expect(getFileExtension('.config.json')).toBe('json');
  });
});

describe('fileTypeIcon', () => {
  // Any other collection is fetched from Iconify's API at runtime, which a
  // project's CSP blocks
  it('returns only icons from the installed Material Symbols', () => {
    const installed = materialSymbols();
    const icons = [
      ...fileTypeIcons.map(([, icon]) => icon),
      fileTypeIcon(),
      fileTypeIcon(new File([''], 'onbekend.xyz')),
    ];
    expect(icons.filter((icon) => !installed.has(icon))).toEqual([]);
  });

  it('picks the icon by extension or MIME type', () => {
    const icon = (name: string, type = '') =>
      fileTypeIcon(new File([''], name, { type }));
    expect(icon('App.VUE')).toBe(
      'material-symbols:code-blocks-outline-rounded',
    );
    expect(icon('README.md')).toBe('material-symbols:markdown-outline-rounded');
    expect(icon('werkblad.pdf', 'application/pdf')).toBe(
      'material-symbols:picture-as-pdf-outline-rounded',
    );
    expect(
      icon(
        'cijfers.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ),
    ).toBe('material-symbols:table-outline-rounded');
    expect(icon('foto.jpg', 'image/jpeg')).toBe(
      'material-symbols:image-outline-rounded',
    );
    expect(icon('archief.zip', 'application/zip')).toBe(
      'material-symbols:unknown-document-outline-rounded',
    );
  });
});
