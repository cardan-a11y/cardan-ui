import markdownit from 'markdown-it';
import type { Token } from 'markdown-it';
import { attrs } from '@mdit/plugin-attrs';
import { mark } from '@mdit/plugin-mark';
import {
  headingOffsetExtension,
  swatchExtension,
  italicExtension,
  tableScrollExtension,
  targetBlankExtension,
  videoExtension,
} from './extensions';

import { escapeHTML } from '../../utils/markdown';

/**
 * The attributes a text may set with `{…}` when it is not trusted: a language
 * for a phrase (`{lang=en}`), its direction and a class. Never an event
 * handler, a style, a link or an id, which could clash with the page's own.
 * A class runs no script, but it can apply any class of the page, such as one
 * that hides text visually.
 */
const SAFE_ATTRIBUTES = ['lang', 'dir', 'class'];

/**
 * A fenced block, escaped, with its language on the element: markdown-it's
 * `highlight` is synchronous, so MarkdownPreview colours the block after
 * mount, and only then loads highlight.js. A fence without a language has
 * no `data-lang` and stays plain.
 */
function highlight(str: string, lang: string) {
  const language = lang ? ` data-lang="${escapeHTML(lang)}"` : '';

  return `<pre><code class="hljs"${language}>${escapeHTML(str)}</code></pre>`;
}

function createRenderer(trusted: boolean) {
  const md = markdownit({ html: trusted, linkify: true, highlight });

  md.use(swatchExtension);
  md.use(targetBlankExtension);
  md.use(italicExtension);
  md.use(headingOffsetExtension);
  md.use(tableScrollExtension);
  md.use(videoExtension);
  md.use(attrs, trusted ? {} : { allowed: SAFE_ATTRIBUTES });
  md.use(mark);

  return md;
}

/** Made once, shared by every MarkdownPreview. */
const renderers = {
  safe: createRenderer(false),
  trusted: createRenderer(true),
};

export type MarkdownRenderOptions = {
  /** Allow raw HTML and every `{…}` attribute: only for text the team wrote. */
  trusted?: boolean;
  /** Inline content only (emphasis, code, links), without `<p>` or blocks. */
  inline?: boolean;
  /** Levels to move the text's own headings down: 1 turns `##` into `<h3>`. */
  headingOffset?: number;
  /** Accessible name of the scroll region around a table. */
  tableLabel?: string;
  /** Hidden text and title of a link, which opens in a new window. */
  newWindowLabel?: string;
};

/** A piece of the text as HTML, or a video to render with VideoPlayer. */
export type MarkdownSegment =
  { type: 'html'; html: string } | { type: 'video'; url: string };

function select({
  trusted = false,
  headingOffset = 0,
  tableLabel = 'Table',
  newWindowLabel = 'open in new window',
}: MarkdownRenderOptions) {
  return {
    md: trusted ? renderers.trusted : renderers.safe,
    env: { headingOffset, tableLabel, newWindowLabel },
  };
}

export function renderMarkdown(
  content: string,
  options: MarkdownRenderOptions = {},
) {
  const { md, env } = select(options);

  return options.inline
    ? md.renderInline(content, env)
    : md.render(content, env);
}

/**
 * The text as HTML in segments: the HTML between the videos, and each video
 * (a bare YouTube or Vimeo link in a paragraph of its own) on its own, for
 * MarkdownPreview to render with the VideoPlayer component. A text without
 * videos is one HTML segment.
 */
export function renderMarkdownSegments(
  content: string,
  options: Omit<MarkdownRenderOptions, 'inline'> = {},
): MarkdownSegment[] {
  const { md, env } = select(options);
  const segments: MarkdownSegment[] = [];
  let run: Token[] = [];
  let skip = 0;

  const flush = () => {
    if (run.length) {
      segments.push({
        type: 'html',
        html: md.renderer.render(run, md.options, env),
      });
      run = [];
    }
  };

  for (const token of md.parse(content, env)) {
    if (skip) {
      skip -= 1;
    } else if (typeof token.meta?.video === 'string') {
      // A video paragraph; its `inline` and `paragraph_close` tokens follow
      flush();
      segments.push({ type: 'video', url: token.meta.video });
      skip = 2;
    } else {
      run.push(token);
    }
  }

  flush();

  return segments.length ? segments : [{ type: 'html', html: '' }];
}
