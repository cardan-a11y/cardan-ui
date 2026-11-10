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
 * Keeps only the elements and attributes a QR code consists of, so the SVG
 * the API answers can be inlined with `v-html`: a script, a handler
 * attribute, a link or a style in it is dropped, whatever the API was made
 * to return. The `rect` and `path` stay, so the recolouring in `MfaQr`
 * keeps working. Empty when it is no SVG at all, or without a DOM to parse it
 * in (the code is read on the client, after mount).
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
        // A comment, text or an element that is not part of a code
        child.remove();
      } else {
        clean(child as Element);
      }
    }
  };

  clean(root);

  return new XMLSerializer().serializeToString(root);
}
