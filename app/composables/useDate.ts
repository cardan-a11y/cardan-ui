export function useDate() {
  const { t, locale } = useI18n();

  function formatDate(dateString: string): string | undefined {
    // Format as e.g. '3 hours ago' or fallback to ISO date
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000; // seconds

    if (diff < 60) return t('date.just-now');
    if (diff < 3600) return t('date.minutes-ago', Math.floor(diff / 60));
    if (diff < 86400) return t('date.hours-ago', Math.floor(diff / 3600));

    return d(date, 'datetimeLong', locale.value);
  }

  return {
    formatDate,
  };
}
