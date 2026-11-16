import { describe, it, expect, onTestFinished, vi } from 'vitest';
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime';
import { MarkdownPreview } from '#components';
import { renderMarkdown } from '../../app/components/Markdown/renderer';
import { accessibleName, checkA11y } from '../a11y';

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
    expect(await checkA11y()).toHaveNoViolations();
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
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('gives the header cells of a table a scope', async () => {
    const wrapper = await mountSuspended(MarkdownPreview, {
      props: { content: '| Fence | Grammar |\n| --- | --- |\n| css | css |' },
      attachTo: document.body,
    });

    const headers = wrapper.findAll('th');
    expect(headers).toHaveLength(2);
    expect(headers.map((th) => th.attributes('scope'))).toEqual(['col', 'col']);
    expect(await checkA11y()).toHaveNoViolations();
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
    expect(await checkA11y()).toHaveNoViolations();
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
    expect(await checkA11y()).toHaveNoViolations();
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
    expect(await checkA11y()).toHaveNoViolations();
  });
});
