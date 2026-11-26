/**
 * The status element of ComboBox: `say()` puts a text in
 * it, after `delay`, and takes it out again after 3 seconds, so the same
 * text said twice is read twice.
 */
export function useComboBoxStatus() {
  const status = ref('');
  let statusTimer: ReturnType<typeof setTimeout> | undefined;

  function say(statusText: () => string, delay = 0) {
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      status.value = statusText();
      statusTimer = setTimeout(() => (status.value = ''), 3000);
    }, delay);
  }

  onBeforeUnmount(() => clearTimeout(statusTimer));

  return { status, say };
}
