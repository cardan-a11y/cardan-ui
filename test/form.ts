import { defineComponent, h, type VNode } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Form } from '#components';

/**
 * Mounts fields inside the layer's Form, attached to the document, as a
 * page would: `children` renders the form's content (fields, a submit
 * button), `formProps` go to the Form (`onSubmit`, `onInvalid` …). Returns
 * the wrapper; `wrapper.get('form')` is the form element.
 *
 * Proves what Form and its fields do together: constraint validation
 * (`requestSubmit` fires `invalid`, custom validity), errors shown after a
 * failed submit, focus on the first invalid field. happy-dom does not
 * submit on Enter in a field and does not show the browser's own
 * validation bubble.
 */
export function mountInForm(
  children: () => VNode[],
  formProps: Record<string, unknown> = {},
) {
  return mountSuspended(
    defineComponent({
      setup: () => () => h(Form, formProps, { default: children }),
    }),
    { attachTo: document.body },
  );
}
