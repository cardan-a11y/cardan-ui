/** Runs `read` once the page has painted, and again after every switch of the color mode */
export function useModeColors(read: () => void) {
  const colorMode = useColorMode();
  const afterPaint = () => requestAnimationFrame(read);

  onMounted(afterPaint);
  watch(() => colorMode.value, afterPaint, { flush: 'post' });
}
