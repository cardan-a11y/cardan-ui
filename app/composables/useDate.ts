export function useDate() {
  const { t, locale } = useI18n();

  /**
   * How long ago a date was, or how far off it is: "3 hours ago", "in 20
   * minutes", "just now" within a minute; further than a day, the date and
   * time in full. Undefined for a string that is not a date.
   */
  function formatDate(dateString: string): string | undefined {
    const date = new Date(dateString);
    const seconds = (date.getTime() - Date.now()) / 1000;
    const distance = Math.abs(seconds);
    const ago = seconds < 0;

    if (distance < 60) return t('date.just-now');
    if (distance < 3600) {
      const minutes = Math.floor(distance / 60);
      return t(ago ? 'date.minutes-ago' : 'date.in-minutes', minutes);
    }
    if (distance < 86400) {
      const hours = Math.floor(distance / 3600);
      return t(ago ? 'date.hours-ago' : 'date.in-hours', hours);
    }

    return formatDateTime(date, 'datetimeLong', locale.value);
  }

  return {
    formatDate,
  };
}
