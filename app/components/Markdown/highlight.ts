// One bundled highlight.js instance for MarkdownPreview and MarkdownEditor, so
// md-editor-v3 does not load highlight.js and its theme from a CDN at runtime.
import hljs from 'highlight.js/lib/core';
// Registers the common languages (including css, javascript and typescript) on the core instance
import 'highlight.js/lib/common';
// md-editor-v3 adds no <link> for a theme when it is given an instance
import 'highlight.js/styles/stackoverflow-dark.css';

export { hljs };
