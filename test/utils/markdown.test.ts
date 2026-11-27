import { describe, it, expect } from 'vitest';
import {
  renderMarkdown,
  renderMarkdownSegments,
  type MarkdownRenderOptions,
} from '../../app/components/Markdown/renderer';

/**
 * The safe mode of MarkdownPreview's renderer, the default for any text a
 * user or an API wrote: nothing in the text runs a script, styles the page or
 * links to a script, and it loads a resource only from a first-party host
 * (the site's origin or a listed image host), so no third party learns who
 * reads it.
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

describe('renderMarkdown, images in safe mode', () => {
  const site = 'https://cardan.academy';
  const bucket = 'cdn.cardan.academy';

  it.each([
    ['an absolute address', '![Chart](https://evil.example/track.png)'],
    ['a protocol-relative address', '![Chart](//evil.example/track.png)'],
    [
      'a reference',
      '![Chart][pixel]\n\n[pixel]: https://evil.example/track.png',
    ],
    ['an http address', '![Chart](http://cardan.academy/track.png)'],
    [
      'a host that ends like the site',
      '![Chart](https://evilcardan.academy/x.png)',
    ],
  ])('makes a link to an image from %s on another origin', (_, content) => {
    const page = render(content, { origin: site, imageHosts: [bucket] });
    const link = page.querySelector('a')!;

    expect(page.querySelector('img')).toBeNull();
    expect(link.firstChild?.textContent).toBe('Chart');
    expect(link.getAttribute('href')).toMatch(/track\.png$|x\.png$/);
  });

  it('opens that link in a new window when it leaves the site, without access to it', () => {
    const link = render('![Chart](https://evil.example/track.png "Sales")', {
      origin: site,
      newWindowLabel: 'opens in a new window',
    }).querySelector('a')!;

    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener');
    expect(link.getAttribute('title')).toBe('Sales');
    expect(link.textContent).toBe('Chart (opens in a new window)');
  });

  it('names a link to an image without alt text by its address', () => {
    const link = render('![](https://evil.example/track.png)', {
      origin: site,
    }).querySelector('a')!;

    expect(link.firstChild?.textContent).toBe('https://evil.example/track.png');
  });

  it('keeps the alt text, and no link in a link, for an image inside a link', () => {
    const page = render(
      '[![Logo](https://evil.example/logo.png)](https://cardan.academy/about)',
      { origin: site },
    );

    expect(page.querySelector('img')).toBeNull();
    expect(page.querySelectorAll('a')).toHaveLength(1);
    expect(page.querySelector('a')!.textContent).toBe('Logo');
  });

  it.each([
    [
      'an image in the alt text',
      '![![i](https://evil.example/p.png)](https://evil.example/x.png)',
      1,
    ],
    [
      'an image in the alt text inside a link',
      '[![![i](https://evil.example/p.png)](https://evil.example/x)](https://cardan.academy/y)',
      1,
    ],
    [
      'a link in the alt text',
      '![*a* [l](https://cardan.academy/l)](https://evil.example/p.png)',
      1,
    ],
  ])('keeps %s as plain text', (_, content, links) => {
    const page = render(content, { origin: site });

    expect(page.querySelector('img, a a, a em')).toBeNull();
    expect(page.querySelectorAll('a')).toHaveLength(links);
  });

  it('keeps the new-window text on a link made of an image with a link in its alt text', () => {
    const link = render(
      '![*a* [l](https://cardan.academy/l)](https://evil.example/p.png)',
      { origin: site, newWindowLabel: 'new window' },
    ).querySelector('a')!;

    expect(link.textContent).toBe('a l (new window)');
  });

  it.each([
    ['a path', '![Chart](/media/chart.png)'],
    ['a relative path', '![Chart](media/chart.png)'],
    ['the site itself', '![Chart](https://cardan.academy/media/chart.png)'],
    ['a listed host', '![Chart](https://cdn.cardan.academy/chart.png)'],
    [
      'a listed origin',
      '![Chart](https://files.cardan.academy:8443/chart.png)',
    ],
  ])('shows an image from %s', (_, content) => {
    const image = render(content, {
      origin: site,
      imageHosts: [bucket, 'https://files.cardan.academy:8443/any/path'],
    }).querySelector('img')!;

    expect(image.getAttribute('alt')).toBe('Chart');
  });

  it('lists a bare host for https only', () => {
    const page = render('![Chart](http://cdn.cardan.academy/chart.png)', {
      origin: site,
      imageHosts: [bucket],
    });

    expect(page.querySelector('img')).toBeNull();
  });

  it('keeps the address of an image that {…} tries to change', () => {
    const page = render(
      '![Chart](/media/chart.png){src="https://evil.example/track.png"}',
      { origin: site },
    );

    expect(page.querySelector('img')?.getAttribute('src')).toBe(
      '/media/chart.png',
    );
  });

  it('shows an image from any host in a trusted text', () => {
    const page = render('![Chart](https://example.com/chart.png)', {
      origin: site,
      trusted: true,
    });

    expect(page.querySelector('img')?.getAttribute('src')).toBe(
      'https://example.com/chart.png',
    );
  });

  it('makes a link of the image in an inline text and in segments too', () => {
    const content = '![Chart](https://evil.example/track.png)';

    expect(
      render(content, { origin: site, inline: true }).innerHTML,
    ).not.toContain('<img');
    expect(
      renderMarkdownSegments(content, { origin: site })
        .map((segment) => (segment.type === 'html' ? segment.html : ''))
        .join(''),
    ).not.toContain('<img');
  });
});

describe('renderMarkdown, links', () => {
  it('opens a protocol-relative link to another site in a new window, without access to this one', () => {
    const link = render('[guide](//evil.example/guide)', {
      origin: 'https://cardan.academy',
    }).querySelector('a')!;

    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener');
    expect(link.querySelector('.visuallyhidden')).not.toBeNull();
  });

  it('keeps a protocol-relative link to the site itself in the window', () => {
    const link = render('[course](//cardan.academy/courses/1)', {
      origin: 'https://cardan.academy',
    }).querySelector('a')!;

    expect(link.hasAttribute('target')).toBe(false);
    expect(link.hasAttribute('rel')).toBe(false);
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
