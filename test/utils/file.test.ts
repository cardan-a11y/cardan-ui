import { describe, it, expect } from 'vitest';
import { getFileExtension } from '../../app/utils/file';

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
