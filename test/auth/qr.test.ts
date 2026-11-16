import { describe, it, expect } from 'vitest';
import { sanitizeQrSvg } from '../../auth/app/utils/qr';

/** The parsed result, to look at what survived */
function parse(svg: string) {
  return new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
}

const wrap = (content: string, attributes = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21"${attributes}>${content}</svg>`;

/**
 * `sanitizeQrSvg()` decides what of the API's SVG is inlined with `v-html`:
 * a security contract. Only the elements and attributes of a QR code pass,
 * whatever the API was made to return.
 */
describe('sanitizeQrSvg', () => {
  it('keeps a QR code as Fortify draws it', () => {
    // BaconQrCode's SVG back end: a background rect and the modules as a path
    const svg = wrap(
      '<rect x="0" y="0" width="21" height="21" fill="#ffffff"/>' +
        '<g transform="scale(1)"><path fill="#000000" fill-rule="evenodd" d="M0 0h7v7H0z"/></g>',
      ' version="1.1" width="200" height="200"',
    );

    const clean = parse(sanitizeQrSvg(svg));

    expect(clean.getAttribute('viewBox')).toBe('0 0 21 21');
    expect(clean.getAttribute('width')).toBe('200');
    const rect = clean.querySelector('rect')!;
    expect(rect.getAttribute('fill')).toBe('#ffffff');
    const path = clean.querySelector('g > path')!;
    expect(path.getAttribute('d')).toBe('M0 0h7v7H0z');
    expect(path.getAttribute('fill-rule')).toBe('evenodd');
    expect(clean.querySelector('g')!.getAttribute('transform')).toBe(
      'scale(1)',
    );
  });

  it.each([
    ['a script', '<script>alert(1)</script>', 'script'],
    [
      'a link',
      '<a href="javascript:alert(1)"><rect width="1" height="1"/></a>',
      'a',
    ],
    [
      'a style',
      '<style>rect { fill: url(https://evil.example/x) }</style>',
      'style',
    ],
    [
      'a foreignObject',
      '<foreignObject><div xmlns="http://www.w3.org/1999/xhtml"><img src="x" onerror="alert(1)"/></div></foreignObject>',
      'foreignObject',
    ],
    ['an image', '<image href="https://evil.example/track.png"/>', 'image'],
    ['a use', '<use href="#x"/>', 'use'],
    ['an animation', '<set attributeName="onmouseover" to="alert(1)"/>', 'set'],
  ])('drops %s', (_, content, element) => {
    const clean = sanitizeQrSvg(
      wrap(`${content}<rect width="21" height="21"/>`),
    );

    expect(parse(clean).querySelector(element)).toBeNull();
    expect(clean).not.toMatch(/alert|evil/);
    // The code itself stays
    expect(parse(clean).querySelector('rect')).not.toBeNull();
  });

  it('drops handler, style and link attributes, on the root as well', () => {
    const clean = sanitizeQrSvg(
      wrap(
        '<rect width="21" height="21" onclick="alert(1)" style="fill:url(https://evil.example)" href="https://evil.example"/>',
        ' onload="alert(1)" style="background:red"',
      ),
    );

    expect(clean).not.toMatch(/onload|onclick|style|href|alert|evil/);
    expect(parse(clean).querySelector('rect')!.getAttribute('width')).toBe(
      '21',
    );
  });

  it('keeps markup in a kept attribute inside it once inlined', () => {
    const clean = sanitizeQrSvg(
      wrap('<path d="&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"/>'),
    );

    // As MfaQr inlines it, with v-html in an HTML element
    const host = document.createElement('div');
    host.innerHTML = clean;
    expect(host.querySelector('img')).toBeNull();
    expect(host.querySelectorAll('svg > *')).toHaveLength(1);
  });

  it('drops comments and text', () => {
    const clean = sanitizeQrSvg(
      wrap(
        '<!-- <script>alert(1)</script> -->text<rect width="21" height="21"/>',
      ),
    );

    expect(clean).not.toMatch(/<!--|alert|text/);
  });

  it.each([
    ['HTML', '<div><script>alert(1)</script></div>'],
    [
      'an SVG that does not parse',
      '<svg xmlns="http://www.w3.org/2000/svg"><rect></svg>',
    ],
    [
      'another XML root',
      '<html xmlns="http://www.w3.org/1999/xhtml"><svg/></html>',
    ],
    ['nothing', ''],
  ])('returns nothing for %s', (_, input) => {
    expect(sanitizeQrSvg(input)).toBe('');
  });
});
