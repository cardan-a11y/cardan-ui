import { describe, it, expect, onTestFinished, vi } from 'vitest';
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime';
import { MarkdownPreview } from '#components';
import { useAppConfig } from '#imports';
import { renderMarkdown } from '../../app/components/Markdown/renderer';
import { accessibleName, expectNoViolations } from '../a11y';

// Counts every use of highlight.js (the component reads `hljs` once per
// load), so a text without a code block provably does not load it
const { useHighlight } = vi.hoisted(() => ({ useHighlight: vi.fn() }));
vi.mock('../../app/components/Markdown/highlight', async (importOriginal) => {
  const original = await importOriginal<{ hljs: unknown }>();

  return {
    get hljs() {
      useHighlight();
      return original.hljs;
    },
  };
});

describe('MarkdownPreview', () => {
  it('loads highlight.js only once a text has a code block', async () => {
    useHighlight.mockClear();

    const wrapper = await mountSuspended(MarkdownPreview, {
      props: { content: 'No code here.' },
      attachTo: document.body,
    });

    expect(wrapper.find('pre').exists()).toBe(false);
    expect(useHighlight).not.toHaveBeenCalled();

    await wrapper.setProps({ content: '```js\nconst a = 1;\n```' });

    await vi.waitFor(() =>
      expect(wrapper.find('code.hljs .hljs-keyword').exists()).toBe(true),
    );
    expect(useHighlight).toHaveBeenCalledTimes(1);
    await expectNoViolations();
  });

  it('colours a code block after mount and keeps its text', async () => {
    const wrapper = await mountSuspended(MarkdownPreview, {
      props: { content: '```css\n.a { color: red; }\n```' },
      attachTo: document.body,
    });

    const code = wrapper.get('pre code.hljs');
    expect(code.attributes('data-lang')).toBe('css');

    // highlight.js loads after mount, on demand
    await vi.waitFor(() =>
      expect(code.find('.hljs-selector-class').exists()).toBe(true),
    );
    expect(code.text()).toContain('.a { color: red; }');
    await expectNoViolations();
  });

  it('gives the header cells of a table a scope', async () => {
    const wrapper = await mountSuspended(MarkdownPreview, {
      props: { content: '| Fence | Grammar |\n| --- | --- |\n| css | css |' },
      attachTo: document.body,
    });

    const headers = wrapper.findAll('th');
    expect(headers).toHaveLength(2);
    expect(headers.map((th) => th.attributes('scope'))).toEqual(['col', 'col']);
    await expectNoViolations();
  });

  it('says in hidden text that a link opens in a new window', async () => {
    const wrapper = await mountSuspended(MarkdownPreview, {
      props: {
        content:
          'The [guide](https://example.com/guide "The guide") and the [docs](https://example.com/docs).',
      },
      attachTo: document.body,
    });

    const [guide, docs] = wrapper.findAll('a');
    expect(guide?.attributes('target')).toBe('_blank');
    expect(guide?.attributes('title')).toBe('The guide');
    expect(docs?.attributes('title')).toBeUndefined();
    expect(guide?.get('.visuallyhidden').text()).toBe('(open in new window)');
    expect(docs?.get('.visuallyhidden').text()).toBe('(open in new window)');
    await expectNoViolations();
  });

  it('renders a bare video link as a player, or as a link with videos-as-links', async () => {
    // VideoPlayer asks YouTube's oEmbed for the title: answered here, not
    // over the network. The test environment's fetch serves a registered
    // endpoint; a stubbed global `$fetch` does not reach the component.
    const oembed = vi.fn(() => ({
      title: 'Never Gonna Give You Up',
      width: 480,
      height: 270,
    }));
    onTestFinished(registerEndpoint('https://youtube.com/oembed', oembed));

    const content =
      'Watch this:\n\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const player = await mountSuspended(MarkdownPreview, {
      props: { content },
      attachTo: document.body,
    });
    const link = await mountSuspended(MarkdownPreview, {
      props: { content, videosAsLinks: true },
    });

    expect(player.find('a[href*="youtube.com"]').exists()).toBe(false);
    await vi.waitFor(() =>
      expect(accessibleName(player.get('button'))).toBe(
        'Play video: Never Gonna Give You Up',
      ),
    );
    expect(oembed).toHaveBeenCalledOnce();
    expect(link.get('a[href*="youtube.com"]').attributes('target')).toBe(
      '_blank',
    );
    expect(link.find('button').exists()).toBe(false);
    expect(link.text()).toContain('Watch this:');
  });

  it('gives a new video in the same place a fresh player, with its own title', async () => {
    const titles: Record<string, string> = {
      dQw4w9WgXcQ: 'Never Gonna Give You Up',
      '9bZkp7q19f0': 'Gangnam Style',
    };
    onTestFinished(
      registerEndpoint('https://youtube.com/oembed', (event) => {
        const url = new URL(event.node.req.url ?? '', 'https://youtube.com');
        const id = new URL(url.searchParams.get('url')!).searchParams.get('v')!;
        return { title: titles[id], width: 480, height: 270 };
      }),
    );
    const wrapper = await mountSuspended(MarkdownPreview, {
      props: { content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      attachTo: document.body,
    });
    await vi.waitFor(() =>
      expect(accessibleName(wrapper.get('button'))).toBe(
        'Play video: Never Gonna Give You Up',
      ),
    );

    await wrapper.get('button').trigger('click');
    await wrapper.setProps({
      content: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
    });

    await vi.waitFor(() =>
      expect(accessibleName(wrapper.get('button'))).toBe(
        'Play video: Gangnam Style',
      ),
    );
    expect(wrapper.find('iframe').exists()).toBe(false);
  });

  it('keeps a link to the site itself in the window', async () => {
    const { origin } = window.location;
    const wrapper = await mountSuspended(MarkdownPreview, {
      props: {
        content: `The [course](${origin}/courses/1), the [route](/courses/2) and the [guide](https://example.com/guide).`,
      },
      attachTo: document.body,
    });

    const [course, route, guide] = wrapper.findAll('a');
    for (const link of [course, route]) {
      expect(link?.attributes('target')).toBeUndefined();
      expect(link?.attributes('title')).toBeUndefined();
      expect(link?.find('.visuallyhidden').exists()).toBe(false);
    }
    expect(guide?.attributes('target')).toBe('_blank');
    expect(guide?.get('.visuallyhidden').text()).toBe('(open in new window)');
    await expectNoViolations();
  });

  it('judges a link by the origin it is given, as on the server', () => {
    const html = renderMarkdown(
      'The [course](https://cardan.academy/courses/1) and the [guide](https://example.com/guide).',
      { origin: 'https://cardan.academy' },
    );
    const page = document.createElement('div');
    page.innerHTML = html;

    const [course, guide] = page.querySelectorAll('a');
    expect(course?.hasAttribute('target')).toBe(false);
    expect(course?.querySelector('.visuallyhidden')).toBeNull();
    expect(guide?.getAttribute('target')).toBe('_blank');
  });

  it('leaves a code block in an unknown language plain and escaped', async () => {
    useHighlight.mockClear();

    const wrapper = await mountSuspended(MarkdownPreview, {
      props: { content: '```brainfuck\n<b>+[-]</b>\n```' },
      attachTo: document.body,
    });

    const code = wrapper.get('pre code.hljs');
    expect(code.attributes('data-lang')).toBe('brainfuck');
    expect(code.find('b').exists()).toBe(false);
    expect(code.text()).toContain('<b>+[-]</b>');

    // highlight.js loaded, found no grammar: the block keeps its escaped text
    await vi.waitFor(() => expect(useHighlight).toHaveBeenCalled());
    expect(code.find('span').exists()).toBe(false);
    await expectNoViolations();
  });

  it('keeps hostile input inert on its default path, between videos too', async () => {
    onTestFinished(
      registerEndpoint('https://youtube.com/oembed', () => ({
        title: 'Never Gonna Give You Up',
        width: 480,
        height: 270,
      })),
    );
    const hostile = [
      '<script>alert(1)</script>',
      '<img src="x" onerror="alert(1)">',
      '<style>body { display: none }</style>',
      'A [link](javascript:alert(1)) and *text*{onclick="alert(1)" style="display:none"}.',
      '![Pixel](https://evil.example/track.png)',
    ].join('\n\n');

    const wrapper = await mountSuspended(MarkdownPreview, {
      props: {
        content: `${hostile}\n\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ\n\n${hostile}`,
      },
      attachTo: document.body,
    });

    // Rendered in chunks around the player, not as one string
    expect(wrapper.findAll('.markdown-chunk')).toHaveLength(2);
    expect(
      wrapper
        .find('script, style, [onerror], [onclick], [style*="display"]')
        .exists(),
    ).toBe(false);
    expect(wrapper.find('.markdown-chunk img').exists()).toBe(false);
    expect(wrapper.find('a[href^="javascript"]').exists()).toBe(false);
    for (const chunk of wrapper.findAll('.markdown-chunk')) {
      expect(chunk.text()).toContain('<script>alert(1)</script>');
      expect(
        chunk.get('a[href="https://evil.example/track.png"]').text(),
      ).toContain('Pixel');
    }
  });

  it("shows an image from the page's origin and a host from the app config", async () => {
    const { cardan } = useAppConfig();
    const before = [...cardan.markdownImageHosts];
    cardan.markdownImageHosts.push('cdn.cardan.academy');
    onTestFinished(() => {
      cardan.markdownImageHosts.splice(0, Infinity, ...before);
    });

    const wrapper = await mountSuspended(MarkdownPreview, {
      props: {
        content: [
          '![Own](/media/own.png)',
          '![Listed](https://cdn.cardan.academy/listed.png)',
          '![Other](https://evil.example/other.png)',
        ].join('\n\n'),
      },
      attachTo: document.body,
    });

    expect(wrapper.findAll('img').map((img) => img.attributes('alt'))).toEqual([
      'Own',
      'Listed',
    ]);
    expect(
      wrapper.get('a[href="https://evil.example/other.png"]').text(),
    ).toContain('Other');
  });

  it('shows an image from any host with trusted', async () => {
    const wrapper = await mountSuspended(MarkdownPreview, {
      props: {
        content: '![Chart](https://example.com/chart.png)',
        trusted: true,
      },
    });

    expect(wrapper.get('img').attributes('src')).toBe(
      'https://example.com/chart.png',
    );
  });

  it('keeps markup in a highlighted code block as text', async () => {
    const wrapper = await mountSuspended(MarkdownPreview, {
      props: {
        content:
          '```html\n</code></pre><img src="x" onerror="alert(1)"><script>alert(1)</script>\n```',
      },
      attachTo: document.body,
    });

    const code = wrapper.get('pre code.hljs');
    // highlight.js has coloured it: the markup is in its spans, as text
    await vi.waitFor(() => expect(code.find('.hljs-tag').exists()).toBe(true));
    expect(wrapper.find('img, script, [onerror]').exists()).toBe(false);
    expect(code.text()).toContain('<img src="x" onerror="alert(1)">');
    expect(wrapper.findAll('pre')).toHaveLength(1);
  });

  it('keeps a hostile language name in data-lang only', async () => {
    const lang = '"><img/src=x/onerror=alert(1)>';
    const wrapper = await mountSuspended(MarkdownPreview, {
      props: { content: `\`\`\`${lang}\nplain\n\`\`\`` },
      attachTo: document.body,
    });

    expect(wrapper.find('img, [onerror]').exists()).toBe(false);
    expect(wrapper.get('pre code.hljs').attributes('data-lang')).toBe(lang);
    expect(wrapper.get('pre code').text()).toBe('plain');
  });
});
