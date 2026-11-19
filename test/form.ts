import { defineComponent, h, type VNode } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Form } from '#components';

/**
 * Mounts `children` in the layer's Form, attached to the document, with
 * `formProps` on the Form; returns the wrapper. happy-dom does not submit on
 * Enter or show the browser's validation bubble.
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
