import markdownit from 'markdown-it';
import type { Token } from 'markdown-it';
import { attrs } from '@mdit/plugin-attrs';
import { mark } from '@mdit/plugin-mark';
import {
  headingOffsetExtension,
  imageHostsExtension,
  swatchExtension,
  italicExtension,
  tableScrollExtension,
  targetBlankExtension,
  videoExtension,
} from './extensions';

import { escapeHTML } from '../../utils/markdown';

/** What `{…}` may set in an untrusted text */
export const SAFE_ATTRIBUTES = ['lang', 'dir', 'class'];

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
  if (!trusted) md.use(imageHostsExtension);
  md.use(mark);

  return md;
}

const renderers = {
  safe: createRenderer(false),
  trusted: createRenderer(true),
};

export type MarkdownRenderOptions = {
  /**
   * Allow raw HTML, every `{…}` attribute and images from any host: only for
   * text the team wrote.
   */
  trusted?: boolean;
  /** Inline content only (emphasis, code, links), without `<p>` or blocks. */
  inline?: boolean;
  /** Levels to move the text's own headings down: 1 turns `##` into `<h3>`. */
  headingOffset?: number;
  /** Accessible name of the scroll region around a table. */
  tableLabel?: string;
  /** Hidden text of a link, which opens in a new window. */
  newWindowLabel?: string;
  /**
   * The site's origin, which a link must leave to open in a new window. The
   * browser's own by default; the server has none, so pass it there.
   */
  origin?: string;
  /**
   * First-party hosts an image may load from besides `origin`, as a host
   * (`https`) or an origin; any other image becomes a link. Not with `trusted`.
   */
  imageHosts?: readonly string[];
};

/** A piece of the text as HTML, or a video to render with VideoPlayer. */
export type MarkdownSegment =
  { type: 'html'; html: string } | { type: 'video'; url: string };

function select({
  trusted = false,
  headingOffset = 0,
  tableLabel = 'Table',
  newWindowLabel = 'open in new window',
  origin,
  imageHosts = [],
}: MarkdownRenderOptions) {
  return {
    md: trusted ? renderers.trusted : renderers.safe,
    env: { headingOffset, tableLabel, newWindowLabel, origin, imageHosts },
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

/** The text as HTML between its videos, and each video on its own */
const INLINE_AND_PARAGRAPH_CLOSE = 2;

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
      flush();
      segments.push({ type: 'video', url: token.meta.video });
      skip = INLINE_AND_PARAGRAPH_CLOSE;
    } else {
      run.push(token);
    }
  }

  flush();

  return segments.length ? segments : [{ type: 'html', html: '' }];
}
