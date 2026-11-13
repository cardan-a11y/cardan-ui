import { describe, it, expect, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { MarkdownEditor } from '#components';
import { accessibleName, description, expectFocused, roleOf } from '../a11y';
import { mountInForm } from '../form';

/**
 * What the layer adds to md-editor-v3, not the library itself: the textbox
 * is CodeMirror's content element, which the component names, describes and
 * marks invalid, and a hidden textarea that carries `required` to the form.
 */

/** The editor renders in a ClientOnly, and CodeMirror after it */
async function rendered() {
  await nextTick();
  await nextTick();
}

/** CodeMirror's content element, the textbox a screen reader meets */
function textbox() {
  const found = document.querySelector<HTMLElement>('[role="textbox"]');
  if (!found) throw new Error('No textbox');
  return found;
}

/**
 * Types as the browser does into a contenteditable: the text changes in the
 * DOM, and CodeMirror reads it from there and updates the model
 */
async function type(
  wrapper: { emitted: (name: string) => unknown[][] | undefined },
  text: string,
) {
  textbox().querySelector('.cm-line')!.textContent = text;
  await vi.waitFor(() =>
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([text]),
  );
  await nextTick();
}

describe('MarkdownEditor', () => {
  it('names its textbox by the label and describes it by the instruction', async () => {
    await mountSuspended(MarkdownEditor, {
      props: { label: 'Answer', instruction: 'Markdown works', modelValue: '' },
      attachTo: document.body,
    });
    await rendered();

    expect(roleOf(textbox())).toBe('textbox');
    expect(accessibleName(textbox())).toBe('Answer');
    expect(description(textbox())).toBe('Markdown works');
    expect(textbox().hasAttribute('aria-required')).toBe(false);
    expect(textbox().hasAttribute('aria-invalid')).toBe(false);
  });

  it('is required with aria-required, through a textarea that is no field of its own', async () => {
    const wrapper = await mountSuspended(MarkdownEditor, {
      props: { label: 'Answer', required: true, modelValue: '' },
      attachTo: document.body,
    });
    await rendered();

    expect(textbox().getAttribute('aria-required')).toBe('true');

    const carrier = wrapper.get('textarea');
    expect((carrier.element as HTMLTextAreaElement).required).toBe(true);
    expect(carrier.attributes('aria-hidden')).toBe('true');
    expect(carrier.attributes('tabindex')).toBe('-1');
  });

  it('shows its error after a failed submit of its form, on the textbox only, and moves focus into the editor', async () => {
    const wrapper = await mountInForm(() => [
      h(MarkdownEditor, {
        label: 'Answer',
        required: true,
        instruction: 'Markdown works',
        modelValue: '',
      }),
    ]);
    await rendered();
    expect(description(textbox())).toBe('Markdown works');

    await wrapper.get('form').trigger('submit');
    await rendered();

    expect(textbox().getAttribute('aria-invalid')).toBe('true');
    expect(description(textbox())).toBe('Markdown works Answer is missing');
    expect(Array.from(document.querySelectorAll('[aria-invalid]'))).toEqual([
      textbox(),
    ]);
    // The form focuses the hidden textarea, which passes focus on
    expectFocused(textbox());
  });

  it('shows a custom error, also from the start, and is described by it until the text changes', async () => {
    const wrapper = await mountSuspended(MarkdownEditor, {
      props: {
        label: 'Answer',
        modelValue: 'Buy now',
        customError: 'Looks like spam',
        'onUpdate:modelValue': (value?: string) => {
          void wrapper.setProps({ modelValue: value });
        },
      },
      attachTo: document.body,
    });
    await rendered();

    expect(accessibleName(textbox())).toBe('Answer');
    expect(description(textbox())).toBe('Looks like spam');
    expect(textbox().getAttribute('aria-invalid')).toBe('true');

    await type(wrapper, 'A question about the course');

    expect(description(textbox())).toBe('');
    expect(textbox().hasAttribute('aria-invalid')).toBe(false);

    await wrapper.setProps({ customError: 'Still spam' });
    expect(description(textbox())).toBe('Still spam');
    expect(textbox().getAttribute('aria-invalid')).toBe('true');
  });

  it('keeps its label and texts to itself next to another editor', async () => {
    await mountSuspended(
      defineComponent({
        setup: () => () => [
          h(MarkdownEditor, {
            label: 'Question',
            instruction: 'One at a time',
            modelValue: '',
          }),
          h(MarkdownEditor, {
            label: 'Answer',
            instruction: 'Markdown works',
            modelValue: '',
          }),
        ],
      }),
      { attachTo: document.body },
    );
    await rendered();

    const textboxes = Array.from(document.querySelectorAll('[role="textbox"]'));
    expect(textboxes.map((element) => accessibleName(element))).toEqual([
      'Question',
      'Answer',
    ]);
    expect(textboxes.map((element) => description(element))).toEqual([
      'One at a time',
      'Markdown works',
    ]);
  });
});
