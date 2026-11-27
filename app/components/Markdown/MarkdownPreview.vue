<script setup lang="ts">
/**
 * Markdown as HTML, safe by default: raw HTML shows as text, `{…}` sets only
 * `lang`, `dir` and `class`, and an image loads only from the page's origin
 * or a host in the app config's `cardan.markdownImageHosts`, else it is a
 * link; `trusted` allows all three, for text the team wrote. A bare YouTube or Vimeo link in a paragraph of its own renders as a
 * VideoPlayer, unless `videos-as-links`. `inline` is for a title or label.
 */
import { computed, onMounted, useTemplateRef, watch } from 'vue';
import { renderMarkdown, renderMarkdownSegments } from './renderer';
import type { MarkdownSegment } from './renderer';
import 'highlight.js/styles/stackoverflow-dark.css';

const {
  content = '',
  fontSize = undefined,
  inline = false,
  videosAsLinks = false,
  trusted = false,
  headingOffset = 0,
} = defineProps<{
  content?: string;
  /** `md` by default; an inline text takes the size around it. */
  fontSize?: FontSize;
  /** Inline markup only (emphasis, code, links), in a `<span>`. */
  inline?: boolean;
  /** A bare YouTube or Vimeo link stays a link instead of a VideoPlayer. */
  videosAsLinks?: boolean;
  /** Allow raw HTML, every `{…}` attribute and any image: only for text the team wrote. */
  trusted?: boolean;
  /** Levels to move the text's own headings down: 1 turns `##` into `<h3>`. */
  headingOffset?: number;
}>();

const size = computed(() => fontSize ?? (inline ? undefined : 'md'));

const computedStyle = computed(() => ({
  '--markdown-preview-font-size':
    size.value && `var(--font-size-${size.value})`,
}));

const { t } = useI18n();
const { origin } = useRequestURL();
const appConfig = useAppConfig();

const options = computed(() => ({
  trusted,
  headingOffset,
  tableLabel: t('aria.table'),
  newWindowLabel: t('aria.open-new-window'),
  origin,
  imageHosts: appConfig.cardan?.markdownImageHosts ?? [],
}));

const segments = computed<MarkdownSegment[]>(() =>
  inline || videosAsLinks
    ? [
        {
          type: 'html',
          html: renderMarkdown(content, { ...options.value, inline }),
        },
      ]
    : renderMarkdownSegments(content, options.value),
);

const html = computed(() => {
  const [segment, ...rest] = segments.value;

  return segment?.type === 'html' && rest.length === 0
    ? segment.html
    : undefined;
});

const root = useTemplateRef<HTMLElement>('root');

const codeBlocks = () =>
  Array.from(
    root.value?.querySelectorAll<HTMLElement>('code.hljs[data-lang]') ?? [],
  );

async function highlightCode() {
  if (!codeBlocks().length) return;

  const { hljs } = await import('./highlight');

  for (const block of codeBlocks()) {
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

// v-html is safe: the renderer escapes raw HTML unless `trusted`, and
// highlight.js escapes the code it colours
/* eslint-disable vue/no-v-html */
</script>

<template>
  <span
    v-if="inline"
    ref="root"
    class="cardan-markdown-preview"
    :style="computedStyle"
    v-html="html"
  />
  <div
    v-else-if="html !== undefined"
    ref="root"
    class="cardan-markdown-preview"
    :style="computedStyle"
    v-html="html"
  />
  <div v-else ref="root" class="cardan-markdown-preview" :style="computedStyle">
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
  font-size: var(--markdown-preview-font-size, inherit);

  blockquote {
    border-inline-start: 3px solid var(--color-secondary);
    margin-inline-start: 0;
    padding-inline-start: 1.5rem;
    font-style: italic;
  }

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
      background-color: var(--markdown-swatch-color);
    }
  }

  pre code {
    border: 1px solid transparent;

    &.hljs {
      display: inline-block;
    }
  }

  /* `:where`: the chunks between videos add no specificity */
  &,
  > :where(.markdown-chunk) {
    > * + * {
      margin-block-start: 1em;
    }
    > * + :is(h1, h2, h3, h4, h5, h6) {
      margin-block-start: 2em;
    }

    > :first-child {
      margin-block-start: 0;
    }

    > :last-child {
      margin-block-end: 0;
    }
  }

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
      content: '' / '';
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
