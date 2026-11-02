import type { MarkdownIt } from 'markdown-it';
import { parseVideoUrl } from '../../utils/video';

/**
 * A colour value on its own: `#abc`, `#aabbcc`, `rgb(…)` or `hsl(…)` with only
 * numbers inside. Anything more never reaches the `style` attribute, so a
 * text cannot add its own CSS (such as a background image that loads a URL).
 */
const COLOR_COMPONENT = String.raw`[\d.+-]+(%|deg|turn|rad|grad)?`;
const COLOR_VALUE = new RegExp(
  String.raw`^(#[0-9a-f]{3}|#[0-9a-f]{6}|(rgb|hsl)a?\(\s*${COLOR_COMPONENT}(\s*[\s,/]\s*${COLOR_COMPONENT})*\s*\))$`,
  'i',
);

export function swatchExtension(md: MarkdownIt) {
  const defaultRender =
    md.renderer.rules.code_inline ||
    function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  md.renderer.rules.code_inline = function (tokens, idx, options, env, self) {
    if (COLOR_VALUE.test(tokens[idx]?.content ?? '')) {
      tokens[idx].attrPush(['data-color', tokens[idx]?.content]);
      tokens[idx].attrPush(['style', '--color:' + tokens[idx]?.content]);
    }

    return defaultRender(tokens, idx, options, env, self);
  };
}

export function targetBlankExtension(md: MarkdownIt) {
  const defaultRender =
    md.renderer.rules.link_open ||
    function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    const token = tokens[idx];

    if (token?.attrIndex('target') === -1) {
      token.attrPush(['target', '_blank']);
      token.attrPush(['title', 'opent in nieuw venster']);
    } else {
      token?.attrSet('target', '_blank');
    }

    return defaultRender(tokens, idx, options, env, self);
  };
}

/**
 * Moves every heading down by `env.headingOffset` levels (at most `<h6>`), so
 * a text's own `##` fits under the heading of the section that shows it.
 */
export function headingOffsetExtension(md: MarkdownIt) {
  const shift: NonNullable<typeof md.renderer.rules.heading_open> = (
    tokens,
    idx,
    options,
    env,
    self,
  ) => {
    const token = tokens[idx];
    const offset = Number(env?.headingOffset ?? 0);

    if (token && offset > 0) {
      const level = Math.min(6, Number(token.tag.slice(1)) + offset);
      token.tag = `h${level}`;
    }

    return self.renderToken(tokens, idx, options);
  };

  md.renderer.rules.heading_open = shift;
  md.renderer.rules.heading_close = shift;
}

export function italicExtension(md: MarkdownIt) {
  md.renderer.rules.em_open = function (tokens, idx, options, env, self) {
    if (tokens[idx]?.type === 'em_open') {
      tokens[idx].tag = 'i';
    }
    return self.renderToken(tokens, idx, options);
  };

  md.renderer.rules.em_close = function (tokens, idx, options, env, self) {
    if (tokens[idx]?.type === 'em_close') {
      tokens[idx].tag = 'i';
    }
    return self.renderToken(tokens, idx, options);
  };
}

/**
 * A table in a region that scrolls on its own, so a wide table does not
 * widen the page (reflow at 320px). The region is focusable, so the keyboard
 * can scroll it too, and named by `env.tableLabel`. The table itself keeps
 * its display, and with it its table semantics.
 */
export function tableScrollExtension(md: MarkdownIt) {
  md.renderer.rules.table_open = function (tokens, idx, options, env, self) {
    const label = md.utils.escapeHtml(String(env?.tableLabel ?? 'Table'));

    return (
      `<div class="markdown-table" role="region" tabindex="0" aria-label="${label}">` +
      self.renderToken(tokens, idx, options)
    );
  };

  md.renderer.rules.table_close = function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options) + '</div>';
  };
}

/**
 * A paragraph that is only a bare YouTube or Vimeo link (pasted, or in `<…>`)
 * gets the link's URL as `meta.video`, so MarkdownPreview can show the video
 * with the VideoPlayer component instead. A link with its own text stays a
 * link, and so does a link in a list or quote: a video is a block of its own,
 * at the top level of the text. The paragraph itself still renders as a link
 * where there is no player, such as in the HTML string.
 */
export function videoExtension(md: MarkdownIt) {
  md.core.ruler.push('video', (state) => {
    state.tokens.forEach((token, index) => {
      const inline = state.tokens[index + 1];
      const [open, text, close, ...rest] = inline?.children ?? [];
      const url = open?.attrGet('href');

      if (
        token.type === 'paragraph_open' &&
        token.level === 0 &&
        inline?.type === 'inline' &&
        open?.type === 'link_open' &&
        open.info === 'auto' &&
        text?.type === 'text' &&
        close?.type === 'link_close' &&
        rest.length === 0 &&
        typeof url === 'string' &&
        parseVideoUrl(url)
      ) {
        token.meta = { ...token.meta, video: url };
      }
    });
  });
}
