<script lang="ts">
import { MdEditor, config } from 'md-editor-v3';
import type { ToolbarNames, Footers } from 'md-editor-v3';
import type { MarkdownIt } from 'markdown-it';
import { attrs } from '@mdit/plugin-attrs';
import { mark } from '@mdit/plugin-mark';
import {
  swatchExtension,
  italicExtension,
  targetBlankExtension,
} from './extensions';
import { hljs } from './highlight';
// The attributes the preview lets `{…}` set: the renderer's list, so the
// editor shows what MarkdownPreview will show
import { SAFE_ATTRIBUTES } from './renderer';
import 'md-editor-v3/lib/style.css';
// md-editor-v3 adds no <link> for a theme when it is given an instance
import 'highlight.js/styles/stackoverflow-dark.css';

/** md-editor-v3's config is global: set once, not again by every editor. */
let configured = false;

/** The translator of the editor set up last, so the label follows the app at hand */
let translate = (key: string) => key;
</script>

<script setup lang="ts">
const {
  id = useId(),
  preview = false,
  autofocus,
  disabled,
  label = undefined,
  placeholder = undefined,
  errorMessage = undefined,
  instruction = undefined,
  required,
} = defineProps<{
  label?: string;
  placeholder?: string;
  id?: string;
  preview?: boolean;
  required?: boolean;
  hideLabel?: boolean;
  autofocus?: boolean;
  disabled?: boolean;
  errorMessage?: string;
  instruction?: string;
}>();

const footers: Footers[] = [
  // 'markdownTotal',
  // '=',
  // 'scrollSwitch',
];

const toolbars: ToolbarNames[] = [
  'bold',
  // 'underline',
  'italic',
  // 'strikeThrough',
  '-',
  // 'title',
  // 'sub',
  // 'sup',
  'unorderedList',
  'orderedList',
  'quote',
  // 'task',
  '-',
  'codeRow',
  'code',
  // 'link',
  // 'image',
  // 'table',
  // 'mermaid',
  // 'katex',
  '-',
  'revoke',
  'next',
  // 'save',
  '=',
  // 'prettier',
  'pageFullscreen',
  // 'fullscreen',
  'preview',
  // 'previewOnly',
  // 'htmlPreview',
  // 'catalog',
  // 'github',
];

const { t, locale } = useI18n();

translate = t;

if (!configured) {
  configured = true;

  config({
    markdownItConfig(mdit) {
      // md-editor-v3 types its instance with markdown-it 14, the plugins expect the
      // types of markdown-it 15; both run on the same API
      const md = mdit as unknown as MarkdownIt;

      md.use(swatchExtension);
      md.use(targetBlankExtension, {
        label: () => translate('aria.open-new-window'),
      });
      md.use(italicExtension);
      md.use(attrs, { allowed: SAFE_ATTRIBUTES });
      md.use(mark);
    },
    editorExtensions: {
      // Bundled instead of loaded from a CDN, so no third-party requests or CSP exceptions
      highlight: {
        instance: hljs,
      },
    },
  });
}

onMounted(async () => {
  if (!autofocus) return;

  // The editor is in a ClientOnly, which renders it in the tick after mount
  await nextTick();
  focusEditor();
});

const colorMode = useColorMode();

const content = defineModel<string>();
const markdownEditorRef = useTemplateRef<HTMLDivElement>('markdownEditor');

function focusEditor() {
  markdownEditorRef.value?.focus();
}

defineExpose({
  focusEditor,
});

const computedErrorMessage = computed(() => {
  if (errorMessage) return errorMessage;
  if (required && !content.value) {
    return t('form.missing-value', { item: label });
  }
  return t('form.invalid-value');
});

const emit = defineEmits<{
  blur: [value: Event];
}>();

/** Trimmed when the editor is left, not at every keystroke, which would eat a space being typed */
function handleBlur(event: Event) {
  content.value = content.value?.trim();
  emit('blur', event);
}
</script>

<template>
  <ClientOnly>
    <div class="markdown-editor">
      <div
        :class="['label', hideLabel && 'visuallyhidden']"
        @click="focusEditor()"
      >
        <span>{{ label }}</span>

        <RequiredChip v-if="required" />

        <slot name="label" />
      </div>

      <MdEditor
        ref="markdownEditor"
        v-model="content"
        :language="locale"
        no-upload-img
        :preview="preview"
        :footers="footers"
        :toolbars="toolbars"
        :placeholder="placeholder"
        :disabled="disabled"
        :theme="colorMode.value === 'light' ? 'light' : 'dark'"
        :aria-describedby="`${instruction ? `instruction-${id}` : ''}`"
        no-mermaid
        no-katex
        no-echarts
        no-prettier
        @blur="handleBlur"
      />

      <p v-if="instruction" :id="`instruction-${id}`" class="instruction">
        {{ instruction }}
      </p>

      <!-- Only carries the required state to the form: never a tab stop -->
      <textarea
        v-if="required"
        v-model="content"
        :required="required"
        class="visuallyhidden"
        aria-hidden="true"
        tabindex="-1"
      />

      <InputError v-if="required" :id="id" :error-text="computedErrorMessage" />
    </div>
  </ClientOnly>
</template>

<style>
:where(.markdown-editor) {
  position: relative;
  display: inline-grid;
  align-items: center;
  align-content: start;
  transition-property: opacity;
  transition-duration: var(--duration-sm);

  label,
  .label {
    display: inline-flex;
    gap: 0.35rem;
    min-height: 1.25rem;
    align-items: center;
    font-size: var(--font-size-sm);
    margin-block-end: 0.125rem;
    color: var(--color-text);
  }

  .instruction {
    margin-block-start: 0.25rem;
    margin-block-end: 0;
    font-size: var(--font-size-xs);
    color: var(--color-grey-text);
  }
}

.md-editor-preview {
  font-size: inherit !important;
  word-break: break-word !important;

  p {
    white-space: normal;
  }
  ol {
    list-style-position: outside !important;
    padding-inline-start: 2rem !important;
  }
  ul {
    list-style-position: outside !important;
    padding-inline-start: 1.25rem !important;
  }

  &.default-theme {
    ol,
    ul {
      margin: 0 !important;
      > li {
        margin: 0 !important;
        > ul,
        > ol {
          margin-block-end: 0.5rem !important;
        }
      }
    }
  }
}

.md-editor {
  --md-color: var(--color-text) !important;
  --md-bk-color-outstand: var(--color-grey-bg) !important;
  --md-border-color: var(--color-grey-graphic) !important;
  --md-border-active-color: var(--focus-color) !important;

  a {
    --md-theme-link-color: var(--color-text);
    --md-theme-link-hover-color: var(--color-accent-text);
    text-decoration: underline;
    transition-duration: var(--duration-sm);
  }

  code {
    line-height: var(--line-height, 1.5);
    --md-theme-code-inline-color: var(--color-text);
    --md-theme-code-inline-bg-color: var(--color-grey-bg);

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

  blockquote {
    --md-theme-quote-color: var(--color-text);
    --md-theme-quote-bg-color: var(--color-accent-bg);
    --md-theme-quote-border: 5px solid var(--color-accent-graphic);
  }
}

.md-editor-toolbar-wrapper .md-editor-toolbar-item {
  cursor: default !important;
}

.md-editor-toolbar-item svg.md-editor-icon {
  width: 1.5rem;
  height: 1.5rem;
}

.md-editor-resize-operate {
  background-color: var(--color-grey-graphic);
}

.markdown-editor {
  display: grid;
  flex-grow: 1;

  .md-editor {
    --md-bk-color: var(--color-input-bg) !important;
  }
}

.md-editor {
  height: auto;
  border-radius: var(--radius-md);
}

.md-editor-content {
  min-height: 9rem;
}

.show-invalid .markdown-editor:has(:invalid) {
  .error-wrapper .error {
    display: flex;
  }
}
</style>
