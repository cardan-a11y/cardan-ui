/** What a QR code from Fortify (BaconQrCode's SVG back end) is made of */
const QR_ELEMENTS = ['svg', 'rect', 'path', 'g'];

const QR_ATTRIBUTES = [
  'xmlns',
  'version',
  'width',
  'height',
  'viewBox',
  'x',
  'y',
  'd',
  'fill',
  'fill-rule',
  'transform',
];

/**
 * Keeps only the elements and attributes of a QR code, so the API's SVG can be
 * inlined with `v-html`. Empty for anything but an SVG, or without a DOM.
 */
export function sanitizeQrSvg(svg: string): string {
  if (typeof DOMParser === 'undefined') return '';

  const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = document.documentElement;

  if (root.localName !== 'svg' || root.querySelector('parsererror')) return '';

  const clean = (element: Element) => {
    for (const attribute of [...element.attributes]) {
      if (!QR_ATTRIBUTES.includes(attribute.name)) {
        element.removeAttribute(attribute.name);
      }
    }

    for (const child of [...element.childNodes]) {
      if (
        child.nodeType !== Node.ELEMENT_NODE ||
        !QR_ELEMENTS.includes((child as Element).localName)
      ) {
        child.remove();
      } else {
        clean(child as Element);
      }
    }
  };

  clean(root);

  return new XMLSerializer().serializeToString(root);
}
