import { describe, it, expect } from 'vitest';
import {
  renderMarkdown,
  renderMarkdownSegments,
  type MarkdownRenderOptions,
} from '../../app/components/Markdown/renderer';

/**
 * The safe mode of MarkdownPreview's renderer, the default for any text a
 * user or an API wrote: nothing in the text runs a script, loads a resource,
 * styles the page or links to a script.
 */

/** The rendered HTML as a tree, for asserting what elements it makes. */
function render(content: string, options: MarkdownRenderOptions = {}) {
  const page = document.createElement('div');
  page.innerHTML = renderMarkdown(content, options);
  return page;
}

describe('renderMarkdown, safe by default', () => {
  it.each([
    ['a script', '<script>alert(1)</script>', 'script'],
    ['an image with a handler', '<img src="x" onerror="alert(1)">', 'img'],
    [
      'a frame',
      '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
      'iframe',
    ],
    ['an inline handler', 'Click <b onclick="alert(1)">here</b>', 'b'],
    ['a style element', '<style>body { display: none }</style>', 'style'],
  ])('shows %s as text', (_, html, tag) => {
    const page = render(html);

    expect(page.querySelector(tag)).toBeNull();
    expect(page.textContent).toContain(html);
  });

  it('keeps lang, dir and class from {…} and drops every other attribute', () => {
    const page = render(
      'Een alinea {lang=nl dir=rtl .note onclick="alert(1)" style="display:none" id=main href="javascript:alert(1)"}',
    );
    const paragraph = page.querySelector('p')!;

    expect(paragraph.getAttribute('lang')).toBe('nl');
    expect(paragraph.getAttribute('dir')).toBe('rtl');
    expect(paragraph.getAttribute('class')).toBe('note');
    expect(paragraph.getAttributeNames().sort()).toEqual([
      'class',
      'dir',
      'lang',
    ]);
  });

  it('keeps the href of a link that {…} tries to change', () => {
    const link = render(
      '[docs](https://example.com/docs){href="javascript:alert(1)" onclick="x"}',
    ).querySelector('a')!;

    expect(link.getAttribute('href')).toBe('https://example.com/docs');
    expect(link.hasAttribute('onclick')).toBe(false);
  });

  it.each([
    ['a script link', '[click](javascript:alert(1))'],
    ['a script link in capitals', '[click](JAVASCRIPT:alert(1))'],
    ['an encoded script link', '[click](&#x6A;avascript:alert(1))'],
    ['a script autolink', '<javascript:alert(1)>'],
    [
      'a data link',
      '[click](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)',
    ],
    ['a vbscript link', '[click](vbscript:msgbox(1))'],
  ])('does not link %s', (_, content) => {
    expect(render(content).querySelector('a')).toBeNull();
  });

  it('writes the swatch colour into style only for a bare colour value', () => {
    const swatch = (value: string) =>
      render(`\`${value}\``).querySelector('code')!.getAttribute('style');

    expect(swatch('#5f2dd4')).toBe('--markdown-swatch-color:#5f2dd4');
    expect(swatch('rgb(95 45 212 / 50%)')).toBe(
      '--markdown-swatch-color:rgb(95 45 212 / 50%)',
    );
    expect(swatch('hsl(258, 66%, 50%)')).toBe(
      '--markdown-swatch-color:hsl(258, 66%, 50%)',
    );
    for (const value of [
      'url(https://evil.com/x.png)',
      '#fff; background: url(https://evil.com/x.png)',
      'rgb(0 0 0); background-image: url(x)',
      'rgb(var(--x))',
      'red',
      '#ff00000',
    ]) {
      expect(swatch(value), value).toBeNull();
    }
  });

  it('keeps HTML and every attribute in a trusted text', () => {
    const page = render(
      '<abbr title="World Wide Web">WWW</abbr>\n\nA paragraph {style="color: red" id=intro}',
      { trusted: true },
    );

    expect(page.querySelector('abbr')?.getAttribute('title')).toBe(
      'World Wide Web',
    );
    expect(page.querySelector('p#intro')?.getAttribute('style')).toBe(
      'color: red',
    );
  });

  it('moves headings down by the offset, to h6 at most', () => {
    const page = render('# One\n\n##### Five', { headingOffset: 2 });

    expect(
      [...page.querySelectorAll('h1, h2, h3, h4, h5, h6')].map(
        (h) => h.tagName,
      ),
    ).toEqual(['H3', 'H6']);
  });

  it('renders no blocks inline, only inline markup', () => {
    const page = render('# Title with *stress*\n\n- item\n\n> quote', {
      inline: true,
    });

    expect(
      page.querySelector('p, h1, ul, li, blockquote, pre, table'),
    ).toBeNull();
    expect(page.querySelector('i')?.textContent).toBe('stress');
  });

  it('puts a table in a focusable region named by the table label', () => {
    const page = render('| A | B |\n| --- | --- |\n| 1 | 2 |', {
      tableLabel: 'Prijzen "per jaar"',
    });
    const region = page.querySelector('[role="region"]')!;

    expect(region.getAttribute('aria-label')).toBe('Prijzen "per jaar"');
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(region.querySelector('table')).not.toBeNull();
  });

  it('escapes the table label and the new-window text', () => {
    const page = render(
      '| A |\n| --- |\n| 1 |\n\n[docs](https://example.com/docs)',
      {
        tableLabel: '"><img src=x onerror=alert(1)>',
        newWindowLabel: '<img src=x onerror=alert(1)>',
        origin: 'https://cardan.academy',
      },
    );

    expect(page.querySelector('img')).toBeNull();
    expect(
      page.querySelector('[role="region"]')?.getAttribute('aria-label'),
    ).toBe('"><img src=x onerror=alert(1)>');
  });
});

describe('renderMarkdownSegments, videos', () => {
  const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const types = (content: string) =>
    renderMarkdownSegments(content).map((segment) => segment.type);

  it('makes a video of a bare video link in a paragraph of its own', () => {
    expect(renderMarkdownSegments(`Watch this:\n\n${url}\n\nOr not.`)).toEqual([
      { type: 'html', html: '<p>Watch this:</p>\n' },
      { type: 'video', url },
      { type: 'html', html: '<p>Or not.</p>\n' },
    ]);
    expect(types(`<${url}>`)).toEqual(['video']);
  });

  it.each([
    ['in a sentence', `Watch ${url} now.`],
    ['with link text', `[Our video](${url})`],
    ['in a list', `- ${url}`],
    ['in a quote', `> ${url}`],
    ['two in one paragraph', `${url}\n${url}`],
    ['on another host', 'https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ'],
  ])('keeps a video link %s a link', (_, content) => {
    expect(types(content)).toEqual(['html']);
  });

  it('keeps a bare video link a link in the HTML string (inline and videos-as-links)', () => {
    for (const inline of [true, false]) {
      expect(
        render(url, { inline }).querySelector('a')?.getAttribute('href'),
      ).toBe(url);
    }
  });
});
