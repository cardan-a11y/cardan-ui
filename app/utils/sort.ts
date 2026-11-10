/**
 * Sorts the items in place by the value at a dotted path
 * (`'criterion.number_int'`) and returns them; an item that lacks a key on
 * the path sorts as undefined instead of throwing.
 */
export function sort<T>(arr: T[] | undefined, prop: string, order = 'asc') {
  const keys = prop.split('.');

  arr?.sort(function (itemA, itemB) {
    // `<` and `>` order whatever the path holds; the cast is for TypeScript only
    const a = valueAt(itemA, keys) as number | string;
    const b = valueAt(itemB, keys) as number | string;
    if (a < b) {
      return order === 'asc' ? -1 : 1;
    } else if (a > b) {
      return order === 'asc' ? 1 : -1;
    } else {
      return 0;
    }
  });
  return arr;
}

function valueAt(item: unknown, keys: string[]) {
  let value = item;
  for (const key of keys) {
    value = (value as Record<string, unknown> | undefined)?.[key];
  }
  return value;
}
