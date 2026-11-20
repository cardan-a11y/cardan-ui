import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  numberLocale,
} from '../../app/utils/number';

/** The no-break space Dutch puts after the currency sign */
const nbsp = '\u00a0';

describe('numberLocale', () => {
  it('formats English as British and Dutch as the Netherlands', () => {
    expect(numberLocale('en')).toBe('en-GB');
    expect(numberLocale('nl')).toBe('nl-NL');
  });

  it('passes any other locale as it is', () => {
    expect(numberLocale('de-DE')).toBe('de-DE');
  });
});

describe('formatNumber', () => {
  it('groups thousands', () => {
    expect(formatNumber(1234567, 'en')).toBe('1,234,567');
    expect(formatNumber(1234567, 'nl')).toBe('1.234.567');
  });

  it('keeps up to three decimals by default', () => {
    expect(formatNumber(1234.5678, 'en')).toBe('1,234.568');
    expect(formatNumber(1234.5678, 'nl')).toBe('1.234,568');
  });

  it('gives exactly the decimals asked for', () => {
    expect(formatNumber(8.2, 'en', { decimals: 1 })).toBe('8.2');
    expect(formatNumber(8.2, 'nl', { decimals: 1 })).toBe('8,2');
    expect(formatNumber(8, 'nl', { decimals: 1 })).toBe('8,0');
    expect(formatNumber(8.25, 'nl', { decimals: 0 })).toBe('8');
  });

  it('takes Intl options for the digits', () => {
    expect(formatNumber(2, 'nl', { maximumFractionDigits: 1 })).toBe('2');
    expect(formatNumber(2.44, 'nl', { maximumFractionDigits: 1 })).toBe('2,4');
  });
});

describe('formatPercent', () => {
  it('takes a fraction and gives a whole percentage', () => {
    expect(formatPercent(0.21, 'en')).toBe('21%');
    expect(formatPercent(0.21, 'nl')).toBe('21%');
    expect(formatPercent(0.215, 'nl')).toBe('22%');
  });

  it('gives the decimals asked for', () => {
    expect(formatPercent(0.215, 'en', { decimals: 1 })).toBe('21.5%');
    expect(formatPercent(0.215, 'nl', { decimals: 1 })).toBe('21,5%');
  });
});

describe('formatCurrency', () => {
  it('shows a whole price without decimals', () => {
    expect(formatCurrency(495, 'en')).toBe('€495');
    expect(formatCurrency(495, 'nl')).toBe(`€${nbsp}495`);
    expect(formatCurrency(1500, 'nl')).toBe(`€${nbsp}1.500`);
  });

  it('shows a price with cents with two decimals', () => {
    expect(formatCurrency(12.5, 'en')).toBe('€12.50');
    expect(formatCurrency(1234.5, 'nl')).toBe(`€${nbsp}1.234,50`);
  });

  it('reads an amount in cents', () => {
    expect(formatCurrency(49500, 'en', { cents: true })).toBe('€495');
    expect(formatCurrency(1999, 'en', { cents: true })).toBe('€19.99');
    expect(formatCurrency(1999, 'nl', { cents: true })).toBe(`€${nbsp}19,99`);
  });

  it('never shows decimals with decimals: 0', () => {
    expect(formatCurrency(76.6, 'en', { decimals: 0 })).toBe('€77');
    expect(formatCurrency(76.6, 'nl', { decimals: 0 })).toBe(`€${nbsp}77`);
    expect(formatCurrency(1999, 'nl', { cents: true, decimals: 0 })).toBe(
      `€${nbsp}20`,
    );
  });

  it('formats another currency', () => {
    expect(formatCurrency(1234.5, 'en', { currency: 'USD' })).toBe(
      'US$1,234.50',
    );
    expect(formatCurrency(1234.5, 'nl', { currency: 'USD' })).toBe(
      `US$${nbsp}1.234,50`,
    );
  });
});
