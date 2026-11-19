/**
 * The attributes a field component, with `inheritAttrs: false`, passes to its
 * control: all but `class` and `style`, which stay on the wrapper, and
 * `exclude`. A function, called in the render: `attrs` is not reactive.
 */
export function useControlAttrs(exclude: string[] = []) {
  const attrs = useAttrs();
  const skipped = new Set(['class', 'style', ...exclude]);

  function controlAttrs() {
    return Object.fromEntries(
      Object.entries(attrs).filter(([key]) => !skipped.has(key)),
    );
  }

  return { attrs, controlAttrs };
}
