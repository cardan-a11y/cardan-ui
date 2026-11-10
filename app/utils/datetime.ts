/**
 * A date in a named format ('long': "9 november 2026"; 'short', 'numeric',
 * 'datetime' and 'datetimeLong') or in the given Intl options, in the given
 * locale; undefined for no date.
 */
export function formatDateTime(
  date: number | string | Date,
  format: string | Intl.DateTimeFormatOptions,
  locale: string,
) {
  if (!date) return;

  return new Date(date).toLocaleDateString(
    locale,
    typeof format === 'string' ? formats[format] : format,
  );
}

const formats: { [key: string]: Intl.DateTimeFormatOptions } = {
  long: {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  },
  short: {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  },
  numeric: {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  },
  datetime: {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  },
  datetimeLong: {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  },
};
