import { describe, it, expect, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { MarkdownPreview } from '#components';
import { checkA11y } from '../a11y';

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

  it('leaves a code block in an unknown language plain and escaped', async () => {
    const wrapper = await mountSuspended(MarkdownPreview, {
      props: { content: '```brainfuck\n<b>+[-]</b>\n```' },
      attachTo: document.body,
    });

    const code = wrapper.get('pre code.hljs');
    expect(code.attributes('data-lang')).toBe('brainfuck');
    expect(code.find('b').exists()).toBe(false);
    expect(code.text()).toContain('<b>+[-]</b>');

    // Nothing to colour: the block keeps its escaped text
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(code.find('span').exists()).toBe(false);
    expect(await checkA11y()).toHaveNoViolations();
  });
});
