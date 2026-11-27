/**
 * Which check a text control fails, in the order its error text names it: a
 * missing value (only spaces too, when required), a range, a length, the type
 * or pattern, else something else. `undefined` while it is valid.
 */
export type ValidityReason =
  | 'missing'
  | 'below-min'
  | 'above-max'
  | 'too-short'
  | 'too-long'
  | 'mismatch'
  | 'invalid';

export function validityReason(
  control: HTMLInputElement | HTMLTextAreaElement,
): ValidityReason | undefined {
  const { validity } = control;
  if (validity.valid) return undefined;
  if (validity.valueMissing || (control.required && !control.value.trim())) {
    return 'missing';
  }
  if (validity.rangeUnderflow) return 'below-min';
  if (validity.rangeOverflow) return 'above-max';
  if (validity.tooShort) return 'too-short';
  if (validity.tooLong) return 'too-long';
  if (validity.typeMismatch || validity.patternMismatch) return 'mismatch';
  return 'invalid';
}
