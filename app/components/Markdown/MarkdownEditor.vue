<script lang="ts">
import { MdEditor, config } from 'md-editor-v3';
import type { ToolbarNames, Footers, ExposeParam } from 'md-editor-v3';
import type { MarkdownIt } from 'markdown-it';
import { attrs } from '@mdit/plugin-attrs';
import { mark } from '@mdit/plugin-mark';
import {
  swatchExtension,
  imageHostsExtension,
  italicExtension,
  targetBlankExtension,
} from './extensions';
import { hljs } from './highlight';
import { SAFE_ATTRIBUTES } from './renderer';
import 'md-editor-v3/lib/style.css';
// md-editor-v3 adds no <link> for a theme when it is given an instance
import 'highlight.js/styles/stackoverflow-dark.css';

// md-editor-v3's config is global: set once, not by every editor
let configured = false;

let translateOfLatestEditor = (key: string) => key;
let imageHostsOfLatestEditor: () => readonly string[] = () => [];
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
  customError = undefined,
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
  /** An error the browser cannot find, such as the server's: shown until the value changes */
  customError?: string;
}>();

const footers: Footers[] = [];

const toolbars: ToolbarNames[] = [
  'bold',
  'italic',
  '-',
  'unorderedList',
  'orderedList',
  'quote',
  '-',
  'codeRow',
  'code',
  '-',
  'revoke',
  'next',
  '=',
  'pageFullscreen',
  'preview',
];

const { t, locale } = useI18n();

translateOfLatestEditor = t;

const appConfig = useAppConfig();
imageHostsOfLatestEditor = () => appConfig.cardan?.markdownImageHosts ?? [];

if (!configured) {
  configured = true;

  config({
    markdownItConfig(mdit) {
      // md-editor-v3 types markdown-it 14, the plugins 15: same API. The
      // typecheck fails once md-editor-v3 is on 15; then this line can go.
      // @ts-expect-error -- markdown-it 14 is not assignable to 15
      const md: MarkdownIt = mdit;

      // md-editor-v3's default, set here so that no update turns it on: the
      // preview shows raw HTML as text, as MarkdownPreview's safe mode does
      md.set({ html: false });
      md.use(swatchExtension);
      md.use(targetBlankExtension, {
        label: () => translateOfLatestEditor('aria.open-new-window'),
      });
      md.use(italicExtension);
      md.use(attrs, { allowed: SAFE_ATTRIBUTES });
      md.use(imageHostsExtension, { hosts: () => imageHostsOfLatestEditor() });
      md.use(mark);
    },
    codeMirrorExtensions: (extensions) =>
      extensions.filter(({ type }) => type !== 'linkShortener'),
    editorExtensions: {
      highlight: {
        instance: hljs,
      },
    },
  });
}

onMounted(async () => {
  if (!autofocus) return;

  // In a ClientOnly, the editor renders the tick after mount
  await nextTick();
  focusEditor();
});

const colorMode = useColorMode();

const content = defineModel<string>();
const markdownEditorRef = useTemplateRef<ExposeParam>('markdownEditor');

function focusEditor() {
  markdownEditorRef.value?.focus();
}

const { customErrorActive, clearCustomError, errorShown } = useCustomError(
  () => customError,
  { invalid: () => !!required && !content.value?.trim() },
);

// md-editor-v3 passes no attributes to CodeMirror's textbox, and a <label>
// cannot point to it: set on the element itself
const editorAttributes = computed<Record<string, string | undefined>>(() => ({
  'aria-labelledby': label ? `label-${id}` : undefined,
  'aria-describedby':
    [instruction && `instruction-${id}`, errorShown.value && `error-${id}`]
      .filter(Boolean)
      .join(' ') || undefined,
  'aria-required': required ? 'true' : undefined,
  'aria-invalid': errorShown.value ? 'true' : undefined,
}));

function describeEditor(retry = true) {
  const editor = markdownEditorRef.value;
  const textbox = editor?.getEditorView()?.contentDOM;

  if (!textbox) {
    if (editor && retry) nextTick(() => describeEditor(false));
    return;
  }

  for (const [name, value] of Object.entries(editorAttributes.value)) {
    if (value) textbox.setAttribute(name, value);
    else textbox.removeAttribute(name);
  }
}

watch([markdownEditorRef, editorAttributes], () => describeEditor(), {
  flush: 'post',
});

defineExpose({
  focusEditor,
});

const computedErrorMessage = computed(() => {
  if (errorMessage) return errorMessage;
  if (required && !content.value?.trim()) {
    return t('form.missing-value', { item: label });
  }
  return t('form.invalid-value');
});

const emit = defineEmits<{
  blur: [value: Event];
}>();
</script>

<template>
  <ClientOnly>
    <div :class="['markdown-editor', customErrorActive && 'custom-error']">
      <div
        :id="`label-${id}`"
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
        no-mermaid
        no-katex
        no-echarts
        no-prettier
        @change="clearCustomError"
        @blur="emit('blur', $event)"
      />

      <p v-if="instruction" :id="`instruction-${id}`" class="instruction">
        {{ instruction }}
      </p>

      <textarea
        v-if="required"
        :value="content?.trim()"
        :required="required"
        class="visuallyhidden"
        aria-hidden="true"
        tabindex="-1"
        @focus="focusEditor()"
      />

      <InputError
        v-if="required || customError"
        :id="id"
        :error-text="customErrorActive ? customError : computedErrorMessage"
      />
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
      background-color: var(--markdown-swatch-color);
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

.show-invalid .markdown-editor:has(:invalid),
.markdown-editor.custom-error {
  .error-wrapper .error {
    display: flex;
  }
}
</style>
