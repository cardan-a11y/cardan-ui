<script setup lang="ts">
/**
 * Markdown as HTML. Safe by default: the text may come from anyone (an import,
 * a colleague, an AI), so raw HTML is shown as text and `{…}` sets only
 * `lang`, `dir` and `class`. `trusted` allows both, for text the team wrote.
 *
 * A bare YouTube or Vimeo link in a paragraph of its own renders as a
 * VideoPlayer, also without `trusted`: the link only ever becomes a video id.
 * A link with its own text stays a link.
 *
 * `inline` is for a title or label: inline markup only, in a `<span>`, so it
 * fits inside a button, link or label and adds no block margins.
 */
import { computed, onMounted, useTemplateRef, watch } from 'vue';
import { renderMarkdown, renderMarkdownSegments } from './renderer';
import type { MarkdownSegment } from './renderer';
// The theme of a code block, with the component: a block is a dark block
// from the first paint, also without a language, before highlight.js loads
import 'highlight.js/styles/stackoverflow-dark.css';

const {
  content = '',
  fontSize = undefined,
  ellipsisLines = undefined,
  inline = false,
  trusted = false,
  headingOffset = 0,
} = defineProps<{
  content?: string;
  /** `md` by default; an inline text takes the size around it. */
  fontSize?: FontSize;
  ellipsisLines?: number;
  /** Inline markup only (emphasis, code, links), in a `<span>`. */
  inline?: boolean;
  /** Allow raw HTML and every `{…}` attribute: only for text the team wrote. */
  trusted?: boolean;
  /** Levels to move the text's own headings down: 1 turns `##` into `<h3>`. */
  headingOffset?: number;
}>();

const size = computed(() => fontSize ?? (inline ? undefined : 'md'));

const computedStyle = computed(() => ({
  '--markdown-preview-font-size':
    size.value && `var(--font-size-${size.value})`,
  '--line-clamp': ellipsisLines && ellipsisLines,
}));

const { t } = useI18n();

const options = computed(() => ({
  trusted,
  headingOffset,
  tableLabel: t('aria.table'),
}));

/**
 * The HTML between the videos and each video on its own; one HTML segment
 * without videos. An inline text has no paragraphs, and a clamped text has
 * no room for a player: both are one string, with a video as a link.
 */
const segments = computed<MarkdownSegment[]>(() =>
  inline || ellipsisLines
    ? [
        {
          type: 'html',
          html: renderMarkdown(content, { ...options.value, inline }),
        },
      ]
    : renderMarkdownSegments(content, options.value),
);

/** The whole text as one string of HTML, unless it has videos. */
const html = computed(() => {
  const [segment, ...rest] = segments.value;

  return segment?.type === 'html' && rest.length === 0
    ? segment.html
    : undefined;
});

const classes = computed(() => [
  'cardan-markdown-preview',
  ellipsisLines && 'ellipsis',
]);

const root = useTemplateRef<HTMLElement>('root');

/**
 * Colour the code blocks once the HTML is in the DOM. highlight.js and its
 * grammars load here, not with the renderer, so a text without a code block
 * never loads them, and a block shows plain first and coloured a moment
 * later. A language highlight.js does not know stays plain, as before.
 */
async function highlightCode() {
  if (!root.value?.querySelector('code.hljs[data-lang]')) return;

  const { hljs } = await import('./highlight');

  // Queried again: the text may have changed while highlight.js loaded
  const blocks = root.value?.querySelectorAll<HTMLElement>(
    'code.hljs[data-lang]',
  );

  for (const block of blocks ?? []) {
    const language = block.dataset.lang;

    if (language && hljs.getLanguage(language)) {
      block.innerHTML = hljs.highlight(block.textContent ?? '', {
        language,
        ignoreIllegals: true,
      }).value;
    }
  }
}

onMounted(highlightCode);
watch(segments, highlightCode, { flush: 'post' });
</script>

<template>
  <span
    v-if="inline"
    ref="root"
    :class="classes"
    :style="computedStyle"
    v-html="html"
  />
  <div
    v-else-if="html !== undefined"
    ref="root"
    :class="classes"
    :style="computedStyle"
    v-html="html"
  />
  <div v-else ref="root" :class="classes" :style="computedStyle">
    <!-- A player is keyed by its URL too, so a new video in the same place
         gets a fresh player instead of the title and state of the old one -->
    <template
      v-for="(segment, index) in segments"
      :key="segment.type === 'video' ? `${index}:${segment.url}` : index"
    >
      <VideoPlayer
        v-if="segment.type === 'video'"
        :url="segment.url"
        loading="lazy"
      />
      <div v-else class="markdown-chunk" v-html="segment.html" />
    </template>
  </div>
</template>

<style>
.dark-mode {
  .cardan-markdown-preview {
    pre code {
      border-color: var(--color-grey-bg);
    }
  }
}

.cardan-markdown-preview {
  &.ellipsis {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    line-clamp: var(--line-clamp);
    -webkit-line-clamp: var(--line-clamp);
    hyphens: none;
  }

  font-size: var(--markdown-preview-font-size, inherit);

  code {
    font-size: smaller;

    &[data-color]::before {
      display: inline-block;
      content: '';
      width: 1em;
      height: 1em;
      border: 1px solid var(--color-card-bg);
      border-radius: var(--radius-full);
      vertical-align: middle;
      margin-inline-end: 0.25rem;
      margin-block-start: -2px;
      background-color: var(--color);
    }
  }

  pre code {
    border: 1px solid transparent;

    &.hljs {
      display: inline-block;
    }
  }

  /* A text with videos is in chunks around the players, with the same space
     between blocks inside a chunk. `:where`, so the specificity stays that
     of the rules on the preview itself. */
  &,
  > :where(.markdown-chunk) {
    > * + * {
      margin-block-start: 1em;
    }
    > * + :is(h1, h2, h3, h4, h5, h6) {
      margin-block-start: 1.5em;
    }

    /* The element around the text sets the space outside it. */
    > :first-child {
      margin-block-start: 0;
    }

    > :last-child {
      margin-block-end: 0;
    }
  }

  /* A wide table scrolls in its own region instead of the page (reflow at
     320px). The region takes focus, so the keyboard can scroll it. */
  .markdown-table {
    max-width: 100%;
    overflow-x: auto;

    &:focus-visible {
      outline: 2px solid var(--focus-color);
      outline-offset: 2px;
    }
  }

  table {
    border-collapse: collapse;
  }

  th,
  td {
    padding: 0.5rem;
    border: 1px solid var(--color-grey-light);
    text-align: start;
  }

  a {
    overflow-wrap: anywhere;

    &[target='_blank']::after {
      content: '' / '(open in nieuw venster)';
      display: inline-block;
      vertical-align: middle;
      width: 1em;
      height: 1em;
      margin-inline: 0.25em 0.1em;
      background-color: var(--color-grey-text);
      mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h6q.425 0 .713.288T12 4t-.288.713T11 5H5v14h14v-6q0-.425.288-.712T20 12t.713.288T21 13v6q0 .825-.587 1.413T19 21zM19 6.4L10.4 15q-.275.275-.7.275T9 15t-.275-.7t.275-.7L17.6 5H15q-.425 0-.712-.288T14 4t.288-.712T15 3h5q.425 0 .713.288T21 4v5q0 .425-.288.713T20 10t-.712-.288T19 9z"/></svg>');
      mask-size: contain;
      mask-repeat: no-repeat;
    }

    &:hover {
      color: var(--color-accent-text);

      &::after {
        background-color: var(--color-accent-graphic);
      }
    }
  }
}
</style>
