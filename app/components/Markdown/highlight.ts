// One bundled highlight.js instance for MarkdownPreview and MarkdownEditor, so
// md-editor-v3 does not load highlight.js from a CDN at runtime. MarkdownEditor
// always needs it; MarkdownPreview imports this module only when a text has a
// code block, so keep it out of the renderer. The theme is imported by the
// components themselves: a block is styled before, and without, this module.
import hljs from 'highlight.js/lib/core';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';

// The grammars Cardan content uses. `highlight.js/lib/common` registered 38,
// about two thirds of the chunk. A fence in another language stays plain;
// a grammar the content needs is added here, for every project at once.
hljs.registerLanguage('xml', xml); // also `html`, `svg`
hljs.registerLanguage('css', css);
hljs.registerLanguage('javascript', javascript); // also `js`, `jsx`
hljs.registerLanguage('typescript', typescript); // also `ts`, `tsx`
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash); // also `sh`

export { hljs };
