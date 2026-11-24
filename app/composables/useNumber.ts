/**
 * `formatNumber`, `formatPercent` and `formatCurrency` from `utils/number`,
 * in the app's i18n locale: each call reads the locale, so a template or
 * computed that uses one follows a change of language.
 */
export function useNumber() {
  const { locale } = useI18n();

  return {
    formatNumber: (value: number, options?: FormatNumberOptions) =>
      formatNumber(value, locale.value, options),
    formatPercent: (fraction: number, options?: FormatNumberOptions) =>
      formatPercent(fraction, locale.value, options),
    formatCurrency: (amount: number, options?: FormatCurrencyOptions) =>
      formatCurrency(amount, locale.value, options),
  };
}
