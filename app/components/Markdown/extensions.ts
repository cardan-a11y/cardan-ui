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

/** The site's origin: `env.origin`, else the browser's; none on a server without one */
function siteOrigin(env: unknown) {
  const origin = (env as { origin?: unknown } | undefined)?.origin;

  if (typeof origin === 'string') return origin;

  return typeof window === 'undefined' ? undefined : window.location.origin;
}

/** An `http(s)` address, protocol-relative too, on another origin than the site */
function isExternal(href: string, site?: string) {
  if (!/^(https?:)?\/\//i.test(href)) return false;
  if (!site) return true;

  try {
    return new URL(href, site).origin !== site;
  } catch {
    return true;
  }
}

/**
 * A link to another site opens in a new window, without access to this one,
 * with hidden text that says so from `env.newWindowLabel`, else the `label`
 * option.
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
      isExternal(href, siteOrigin(env))
    ) {
      token.attrSet('target', '_blank');
      token.attrSet('rel', 'noopener');
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

export type ImageHostsOptions = {
  /** Hosts besides the site's own, the `env.imageHosts` default; a function follows a config change */
  hosts?: readonly string[] | (() => readonly string[]);
};

/** The origin of a listed host: a bare host is `https`, a URL gives its own */
function hostOrigin(host: string) {
  try {
    return new URL(host.includes('://') ? host : `https://${host}`).origin;
  } catch {
    return undefined;
  }
}

/**
 * Lets an image load only from the site's origin (`env.origin`, else the
 * browser's), a host in `env.imageHosts`, else the `hosts` option, or a
 * `data:` address: none of them tells a third party who reads the text. Any other
 * image becomes a link to it with its alt text (its address when it has
 * none), as plain text, which loads only when the reader asks; inside a link,
 * its alt text.
 */
export function imageHostsExtension(
  md: MarkdownIt,
  { hosts = [] }: ImageHostsOptions = {},
) {
  md.core.ruler.push('image_hosts', (state) => {
    const site = siteOrigin(state.env);
    const fromEnv = (state.env as { imageHosts?: unknown } | undefined)
      ?.imageHosts;
    const listed = Array.isArray(fromEnv)
      ? fromEnv
      : typeof hosts === 'function'
        ? hosts()
        : hosts;
    const allowed = new Set(
      [site, ...listed.map((host) => hostOrigin(String(host)))].filter(Boolean),
    );
    // Without a site, a relative address resolves here: never allowed
    const base = site ?? 'https://no-site.invalid';

    const loads = (src: string) => {
      // markdown-it lets only raster images through as data: no request
      if (/^data:image\//i.test(src)) return true;

      try {
        return allowed.has(new URL(src, base).origin);
      } catch {
        return false;
      }
    };

    for (const block of state.tokens) {
      if (block.type !== 'inline' || !block.children) continue;

      let inLink = 0;

      block.children = block.children.flatMap((token) => {
        if (token.type === 'link_open') inLink += 1;
        if (token.type === 'link_close') inLink -= 1;

        const attr = token.attrGet('src');
        const src = attr === null ? null : String(attr);

        if (token.type !== 'image' || src === null || loads(src)) {
          return [token];
        }

        // Plain text: alt text is inline markdown, and may hold an image or a link
        const text = new state.Token('text', '', 0);
        text.content =
          md.renderer.renderInlineAsText(
            token.children ?? [],
            md.options,
            state.env,
          ) || src;
        const alt = [text];

        if (inLink) return alt;

        const open = new state.Token('link_open', 'a', 1);
        open.attrSet('href', src);
        const title = token.attrGet('title');
        if (title) open.attrSet('title', title);

        return [open, ...alt, new state.Token('link_close', 'a', -1)];
      });
    }
  });
}
