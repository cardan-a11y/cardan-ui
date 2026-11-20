/** Fixed decimals, or any Intl.NumberFormat options for grouping and digits. */
export interface FormatNumberOptions extends Omit<
  Intl.NumberFormatOptions,
  'style' | 'currency' | 'unit'
> {
  /** Exactly this many decimals: `{ decimals: 1 }` gives "8,2" in Dutch. */
  decimals?: number;
}

export interface FormatCurrencyOptions {
  /** ISO 4217 code, `EUR` by default. */
  currency?: string;
  /** The amount is in cents (hundredths), as the Academy's API gives it. */
  cents?: boolean;
  /** `auto` (default): none for a whole amount, otherwise the currency's own (two for the euro); `0`: never. */
  decimals?: 'auto' | 0;
}

const formattingLocales: Record<string, string> = {
  en: 'en-GB',
  nl: 'nl-NL',
};

/**
 * The locale numbers are formatted in for an i18n locale: `en` is British
 * English ("€1,234.50"), `nl` Dutch ("€ 1.234,50"); any other passes as it is.
 */
export function numberLocale(locale: string) {
  return formattingLocales[locale] ?? locale;
}

function digits(options?: FormatNumberOptions): Intl.NumberFormatOptions {
  const { decimals, ...intl } = options ?? {};
  return decimals === undefined
    ? intl
    : {
        ...intl,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      };
}

/**
 * A number with the locale's grouping and decimal separator: "1.234,5" in
 * Dutch. Up to three decimals unless `decimals` or Intl options say otherwise.
 */
export function formatNumber(
  value: number,
  locale: string,
  options?: FormatNumberOptions,
) {
  return new Intl.NumberFormat(numberLocale(locale), digits(options)).format(
    value,
  );
}

/**
 * A fraction as a percentage, as Intl.NumberFormat takes it: `0.21` gives
 * "21%", whole by default. Divide a whole percentage by 100 and a per mille by
 * 1000 at the call.
 */
export function formatPercent(
  fraction: number,
  locale: string,
  options?: FormatNumberOptions,
) {
  return new Intl.NumberFormat(numberLocale(locale), {
    ...digits(options),
    style: 'percent',
  }).format(fraction);
}

/**
 * An amount of money, in euros unless `currency` says otherwise: "€ 495" and
 * "€ 12,50" in Dutch (a no-break space after the sign), "€495" and "€12.50"
 * in English. `cents` takes the amount in hundredths; `decimals: 0` rounds to
 * whole amounts.
 */
export function formatCurrency(
  amount: number,
  locale: string,
  {
    currency = 'EUR',
    cents = false,
    decimals = 'auto',
  }: FormatCurrencyOptions = {},
) {
  const value = cents ? amount / 100 : amount;
  const whole = decimals === 0 || Math.round(value * 100) % 100 === 0;

  return new Intl.NumberFormat(numberLocale(locale), {
    style: 'currency',
    currency,
    ...(whole && { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  }).format(value);
}
