import type { MarkdownIt } from 'markdown-it';
import { parseVideoUrl } from '../../utils/video';

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
    const token = tokens[idx];

    if (token && COLOR_VALUE.test(token.content)) {
      token.attrPush(['data-color', token.content]);
      token.attrPush(['style', '--markdown-swatch-color:' + token.content]);
    }

    return defaultRender(tokens, idx, options, env, self);
  };
}

export type TargetBlankOptions = {
  /** Hidden text of the link; a function follows a locale switch */
  label?: string | (() => string);
};

function isExternal(href: string, origin?: unknown) {
  if (!/^https?:\/\//i.test(href)) return false;
  const site =
    typeof origin === 'string'
      ? origin
      : typeof window === 'undefined'
        ? undefined
        : window.location.origin;
  if (!site) return true;

  try {
    return new URL(href).origin !== site;
  } catch {
    return true;
  }
}

/**
 * A link to another site opens in a new window, with hidden text that says so
 * from `env.newWindowLabel`, else the `label` option.
 */
export function targetBlankExtension(
  md: MarkdownIt,
  { label = 'open in new window' }: TargetBlankOptions = {},
) {
  const defaultOpen =
    md.renderer.rules.link_open ||
    function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };
  const defaultClose =
    md.renderer.rules.link_close ||
    function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  const text = (env: unknown) => {
    const fromEnv = (env as { newWindowLabel?: unknown } | undefined)
      ?.newWindowLabel;

    if (typeof fromEnv === 'string') return fromEnv;

    return typeof label === 'function' ? label() : label;
  };

  md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    const href = token?.attrGet('href');

    if (
      token &&
      typeof href === 'string' &&
      isExternal(href, (env as { origin?: unknown } | undefined)?.origin)
    ) {
      token.attrSet('target', '_blank');
    }

    return defaultOpen(tokens, idx, options, env, self);
  };

  md.renderer.rules.link_close = function (tokens, idx, options, env, self) {
    const open = tokens
      .slice(0, idx)
      .reverse()
      .find((token) => token.type === 'link_open');
    const closed = defaultClose(tokens, idx, options, env, self);

    if (open?.attrGet('target') !== '_blank') return closed;

    return (
      `<span class="visuallyhidden"> (${md.utils.escapeHtml(text(env))})</span>` +
      closed
    );
  };
}

/** Moves every heading down by `env.headingOffset` levels, to `<h6>` at most */
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

/** A table in a focusable scroll region named by `env.tableLabel` */
export function tableScrollExtension(md: MarkdownIt) {
  md.renderer.rules.th_open = function (tokens, idx, options, env, self) {
    tokens[idx]!.attrSet('scope', 'col');

    return self.renderToken(tokens, idx, options);
  };

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
 * Puts the URL of a top-level paragraph of only a bare YouTube or Vimeo link
 * in `meta.video`, for MarkdownPreview's VideoPlayer
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
