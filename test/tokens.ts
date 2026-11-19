import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

/**
 * The token contract with a project's `main.css`: every `var(--x)` the layer
 * reads without a fallback is declared there or set by the layer itself.
 * Plain Node, so a project runs it on its own `main.css`.
 */
export type TokenCheckOptions = {
  /** The `main.css` that declares the tokens: the template, or a project's */
  mainCss: string;
  /** Folders whose `.vue`, `.ts`, `.js` and `.css` files read the tokens */
  sources: string[];
  /** Tokens the `main.css` lacks on purpose, a name or a `--prefix-*`; still fails where `reachable` reads it */
  allow?: string[];
  /** The files the project can reach (`reachableFiles()`); without it none count for the allow list */
  reachable?: Set<string>;
};

export type TokenCheckResult = {
  /** Tokens read without a fallback that nothing declares, with the files */
  missing: { token: string; files: string[] }[];
  /** Allow-list entries the `main.css` declares after all, so no longer lacks */
  needlessAllow: string[];
};

const SOURCE_EXTENSIONS = new Set(['.vue', '.ts', '.js', '.mjs', '.css']);

/** The source files under the folders, without tests, declarations and the template `assets/main.css` */
export function sourceFiles(folders: string[]): string[] {
  const files: string[] = [];
  const walk = (folder: string) => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const path = join(folder, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (
        SOURCE_EXTENSIONS.has(extname(entry.name)) &&
        !/\.(test|spec|d)\.[mc]?[jt]s$/.test(entry.name) &&
        !path.endsWith(join('assets', 'main.css'))
      ) {
        files.push(path);
      }
    }
  };
  folders.forEach(walk);
  return files.sort();
}

/** The text without block, HTML and whole-line comments */
function withoutComments(text: string) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

/** Custom properties a text sets: `--x:` in CSS or a style, `'--x':` in an object, `setProperty('--x'` */
function setProperties(text: string): string[] {
  return [
    ...text.matchAll(/(?<![\w-])(--[a-zA-Z][\w-]*)['"]?\s*:/g),
    ...text.matchAll(/setProperty\(\s*['"`](--[a-zA-Z][\w-]*)/g),
  ].map((match) => match[1]!);
}

/** `var(--x)` without a fallback, and the prefix of `var(--x-${…})` */
function reads(text: string) {
  return {
    plain: [...text.matchAll(/var\(\s*(--[a-zA-Z][\w-]*)\s*\)/g)].map(
      (match) => match[1]!,
    ),
    dynamic: [...text.matchAll(/var\(\s*(--[a-zA-Z][\w-]*-)\$\{/g)].map(
      (match) => match[1]!,
    ),
  };
}

function allows(entry: string, token: string) {
  return entry.endsWith('*')
    ? token.startsWith(entry.slice(0, -1))
    : entry === token;
}

export function checkTokens({
  mainCss,
  sources,
  allow = [],
  reachable = new Set(),
}: TokenCheckOptions): TokenCheckResult {
  const declared = new Set(
    setProperties(withoutComments(readFileSync(mainCss, 'utf8'))),
  );
  const texts = new Map(
    sourceFiles(sources).map((file) => [
      file,
      withoutComments(readFileSync(file, 'utf8')),
    ]),
  );

  const known = new Set(declared);
  for (const text of texts.values())
    setProperties(text).forEach((token) => known.add(token));

  const missing = new Map<string, Set<string>>();

  for (const [file, text] of texts) {
    const { plain, dynamic } = reads(text);
    const undeclared = [
      ...plain.filter((token) => !known.has(token)),
      ...dynamic
        .filter(
          (prefix) => ![...known].some((token) => token.startsWith(prefix)),
        )
        .map((prefix) => `${prefix}*`),
    ];

    for (const token of undeclared) {
      const entry = allow.find((entry) => allows(entry, token));
      if (entry && !reachable.has(file)) continue;
      if (!missing.has(token)) missing.set(token, new Set());
      missing.get(token)!.add(file);
    }
  }

  return {
    missing: [...missing].map(([token, files]) => ({
      token,
      files: [...files],
    })),
    needlessAllow: allow.filter((entry) =>
      [...declared].some((token) => allows(entry, token)),
    ),
  };
}

/** The name Nuxt registers a component under: `Markdown/MarkdownPreview.vue` is `MarkdownPreview` */
function componentName(file: string, componentsDir: string) {
  const parts = relative(componentsDir, file)
    .replace(/\.vue$/, '')
    .split(sep);
  const name = parts.pop()!;
  const prefix = parts.join('');
  return name.startsWith(prefix) ? name : prefix + name;
}

/** The ways a template names a component: `<MarkdownPreview` or `<markdown-preview` */
function usedIn(name: string, text: string) {
  const kebab = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  return new RegExp(`<(${name}|${kebab})[\\s/>]|Lazy${name}\\b`).test(text);
}

/** The layer files a project can reach: all but components, and the components it uses, transitively */
export function reachableFiles(project: string, layers: string[]): Set<string> {
  const files = sourceFiles(layers);
  const components = new Map<string, string>();
  for (const file of files) {
    const dir = file.split(`${sep}components${sep}`)[0];
    if (file.endsWith('.vue') && dir !== file) {
      components.set(componentName(file, join(dir!, 'components')), file);
    }
  }

  const reachable = new Set(
    files.filter((file) => ![...components.values()].includes(file)),
  );
  const queue = sourceFiles([project]).map((file) =>
    readFileSync(file, 'utf8'),
  );
  queue.push(...[...reachable].map((file) => readFileSync(file, 'utf8')));

  while (queue.length) {
    const text = queue.pop()!;
    for (const [name, file] of components) {
      if (!reachable.has(file) && usedIn(name, text)) {
        reachable.add(file);
        queue.push(readFileSync(file, 'utf8'));
      }
    }
  }

  return reachable;
}

/** For a test's failure message: the files relative to the folder */
export function describeMissing(result: TokenCheckResult, root: string) {
  return result.missing
    .map(
      ({ token, files }) =>
        `${token}: ${files.map((file) => relative(root, file)).join(', ')}`,
    )
    .join('\n');
}
