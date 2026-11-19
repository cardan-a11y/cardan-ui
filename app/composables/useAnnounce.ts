export type Announcement = { id: number; text: string };

/** Older messages stay readable in browse mode; the region never clears on a timer */
const KEPT = 3;

/**
 * Status messages for screen readers (WCAG 4.1.3), read out by the Announcer
 * in AppShell: `polite()` waits until the screen reader is done, `assertive()`
 * interrupts it. A message equal to the previous one is read out again.
 * Not from an open modal Dialog: the page outside it is inert, so the dialog
 * shows that message itself, with ErrorMessage.
 */
export function useAnnounce() {
  const announcements = useState<
    Record<'polite' | 'assertive', Announcement[]>
  >('cardan-ui:announcements', () => ({ polite: [], assertive: [] }));
  const count = useState('cardan-ui:announcement-count', () => 0);

  function announce(text: string, urgency: 'polite' | 'assertive') {
    if (!text.trim()) return;
    const list = announcements.value[urgency];
    list.push({ id: ++count.value, text });
    if (list.length > KEPT) list.splice(0, list.length - KEPT);
  }

  return {
    announcements,
    polite: (text: string) => announce(text, 'polite'),
    assertive: (text: string) => announce(text, 'assertive'),
  };
}
