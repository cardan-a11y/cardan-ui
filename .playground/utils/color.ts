export type Rgb = [number, number, number];

/** Reads a computed color: `rgb(…)`, or `color(srgb …)` for a color-mix */
export function parseComputedColor(value: string): Rgb | undefined {
  const channels = value
    .match(/[\d.]+(?:e-?\d+)?/g)
    ?.slice(0, 3)
    .map(Number);

  if (channels?.length !== 3) return undefined;

  const scale = value.startsWith('color(') ? 255 : 1;
  return channels.map((channel) => channel * scale) as Rgb;
}

export function toHex(rgb: Rgb): string {
  return `#${rgb
    .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')}`;
}

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as Rgb;

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The WCAG contrast ratio of two colors, from 1 to 21 */
export function contrastRatio(first: Rgb, second: Rgb): number {
  const [light, dark] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  ) as [number, number];

  return (light + 0.05) / (dark + 0.05);
}
