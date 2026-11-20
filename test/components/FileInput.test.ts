import { describe, it, expect, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { FileInput } from '#components';
import { accessibleName, checkA11y, description, expectFocused } from '../a11y';
import { addToPage } from '../dom';
import { mountInForm } from '../form';

/** compressorjs, finished when a test calls `finish` */
const compressions = vi.hoisted(
  () => [] as { file: File; finish: (result: File) => void }[],
);
vi.mock('compressorjs', () => ({
  default: vi.fn(function (
    file: File,
    options: { success: (result: File) => void },
  ) {
    compressions.push({ file, finish: options.success });
  }),
}));

/**
 * Chooses a file the way the picker does: the input's files, then change. The
 * files stay settable, as in a browser, for the field to put a value back.
 */
async function choose(input: HTMLInputElement, file: File) {
  let files: ArrayLike<File> = [file];
  Object.defineProperty(input, 'files', {
    get: () => files,
    set: (value: ArrayLike<File>) => {
      files = value;
    },
    configurable: true,
  });
  input.dispatchEvent(new Event('change'));
  await nextTick();
}

describe('FileInput', () => {
  it('is a file field named by its label and described by the size it takes', async () => {
    const wrapper = await mountSuspended(FileInput, {
      props: { label: 'Profile picture', maxFileSize: 2000 },
      attachTo: document.body,
    });

    const input = wrapper.get('input');
    expect(input.attributes('type')).toBe('file');
    expect(accessibleName(input)).toBe('Profile picture');
    expect(description(input)).toBe('(max. 2 MB)');
    expect(input.attributes('aria-invalid')).toBeUndefined();
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('shows that a required file is missing after a failed submit of its form', async () => {
    const wrapper = await mountInForm(() => [
      h(FileInput, { label: 'Picture', required: true, maxFileSize: 1000 }),
    ]);
    const input = wrapper.get('input');
    expect(description(input)).toBe('(max. 1 MB)');

    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(input.attributes('aria-invalid')).toBe('true');
    expect(description(input)).toBe('(max. 1 MB) Picture is missing');
    expectFocused(input);
  });

  it('keeps its label and texts to itself next to another FileInput', async () => {
    await mountSuspended(
      defineComponent({
        setup: () => () => [
          h(FileInput, { label: 'Photo', maxFileSize: 1000 }),
          h(FileInput, { label: 'Document', mode: 'document', accept: '.pdf' }),
        ],
      }),
      { attachTo: document.body },
    );

    const inputs = Array.from(document.querySelectorAll('input'));
    expect(inputs.map((input) => accessibleName(input))).toEqual([
      'Photo',
      'Document',
    ]);
    expect(inputs.map((input) => description(input))).toEqual([
      '(max. 1 MB)',
      'PDF (max. 5 MB)',
    ]);
    expect(await checkA11y()).toHaveNoViolations();
  });
});

describe('FileInput with a circle', () => {
  it('shows the current picture, with the hint, and no accessibility violations', async () => {
    const wrapper = await mountSuspended(FileInput, {
      props: {
        label: 'Profile picture',
        shape: 'circle',
        accept: 'image/*',
        placeholderUrl: '/favicon.svg',
      },
      attachTo: document.body,
    });

    expect(wrapper.get('img').attributes('src')).toBe('/favicon.svg');
    expect(description(wrapper.get('input'))).toContain('max.');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('shows a picture the parent loads later, and again once cleared', async () => {
    const wrapper = await mountSuspended(FileInput, {
      props: {
        label: 'Profile picture',
        shape: 'circle' as const,
        modelValue: undefined,
        'onUpdate:modelValue': (file?: File) =>
          wrapper.setProps({ modelValue: file }),
      },
    });
    expect(wrapper.find('img').exists()).toBe(false);

    await wrapper.setProps({ placeholderUrl: '/current.png' });
    expect(wrapper.get('img').attributes('src')).toBe('/current.png');

    // A chosen file takes the picture's place until the parent clears it
    const input = wrapper.get('input').element;
    await choose(input, new File(['x'], 'cv.pdf', { type: 'application/pdf' }));
    await nextTick();
    expect(wrapper.find('img').exists()).toBe(false);

    await wrapper.setProps({ modelValue: undefined });
    expect(wrapper.get('img').attributes('src')).toBe('/current.png');
    expect(input.value).toBe('');
  });
});

describe('FileInput in document mode', () => {
  it('lists the accepted types in the description of the field', async () => {
    const wrapper = await mountSuspended(FileInput, {
      props: { label: 'Document', mode: 'document', accept: 'pdf, .DOCX' },
      attachTo: document.body,
    });

    const input = wrapper.get('input');
    expect(input.attributes('accept')).toBe('.pdf,.docx');
    expect(description(input)).toBe('PDF or DOCX (max. 5 MB)');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('hands on a file of an accepted type and turns down another', async () => {
    const wrapper = await mountSuspended(FileInput, {
      props: { label: 'Document', mode: 'document', accept: '.pdf' },
      attachTo: document.body,
    });
    const input = wrapper.get('input').element;

    await choose(input, new File(['x'], 'photo.png', { type: 'image/png' }));
    expect(wrapper.emitted('select')).toBeUndefined();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(description(input)).toBe(
      'PDF (max. 5 MB) This file type is not supported. Choose a file of type PDF.',
    );

    const pdf = new File(['x'], 'essay.pdf', { type: 'application/pdf' });
    await choose(input, pdf);
    expect(wrapper.emitted('select')).toEqual([[pdf]]);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(description(input)).toBe('PDF (max. 5 MB)');
    expect(await checkA11y()).toHaveNoViolations();
  });
});

describe('FileInput in image mode', () => {
  it('keeps a rejected file out of the value and shows the error', async () => {
    let value: File | undefined;
    const wrapper = await mountSuspended(FileInput, {
      props: {
        label: 'Picture',
        maxFileSize: 1,
        'onUpdate:modelValue': (file?: File) => (value = file),
      },
      attachTo: document.body,
    });
    const input = wrapper.get('input').element;

    const big = new File([new Uint8Array(2000)], 'big.pdf', {
      type: 'application/pdf',
    });
    await choose(input, big);

    expect(value).toBeUndefined();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(description(input)).toContain('This file is larger than');
    expect(input.value).toBe('');

    const small = new File(['x'], 'small.pdf', { type: 'application/pdf' });
    await choose(input, small);

    expect(value).toBe(small);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(description(input)).not.toContain('This file is larger than');

    // Another rejected file: the field, and the input a form posts, keep it
    await choose(input, big);
    expect(value).toBe(small);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.files?.[0]).toBe(small);
  });

  it('leaves a paste into a text field to that field', async () => {
    const textarea = addToPage('<textarea></textarea>');
    const wrapper = await mountSuspended(FileInput, {
      props: { label: 'Picture' },
      attachTo: document.body,
    });

    const paste = new Event('paste', { bubbles: true });
    Object.defineProperty(paste, 'clipboardData', {
      value: { files: [new File(['x'], 'shot.png', { type: 'image/png' })] },
    });
    textarea.focus();
    textarea.dispatchEvent(paste);
    await nextTick();

    expect(wrapper.emitted('paste')).toBeUndefined();
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
});

describe('FileInput and a paste of text', () => {
  it('leaves the field and the input as they are', async () => {
    const wrapper = await mountSuspended(FileInput, {
      props: { label: 'Picture' },
      attachTo: document.body,
    });
    const input = wrapper.get('input').element;
    // Not an image: the test runtime has no object URL for the preview
    const picture = new File(['x'], 'cv.pdf', { type: 'application/pdf' });
    await choose(input, picture);

    const paste = new Event('paste', { bubbles: true });
    Object.defineProperty(paste, 'clipboardData', { value: { files: [] } });
    document.body.dispatchEvent(paste);
    await nextTick();

    expect(input.files?.[0]).toBe(picture);
    expect(wrapper.emitted('paste')).toBeUndefined();
  });
});

describe('FileInput and a pasted file', () => {
  function pasteFile(file: File, target: EventTarget = document.body) {
    const paste = new Event('paste', { bubbles: true });
    Object.defineProperty(paste, 'clipboardData', { value: { files: [file] } });
    target.dispatchEvent(paste);
  }

  /** The input's files settable, as in a browser */
  function settableFiles(input: HTMLInputElement) {
    let files: ArrayLike<File> = [];
    Object.defineProperty(input, 'files', {
      get: () => files,
      set: (value: ArrayLike<File>) => (files = value),
      configurable: true,
    });
  }

  async function mountPicture(props: Record<string, unknown> = {}) {
    const wrapper = await mountSuspended(FileInput, {
      props: { label: 'Picture', ...props },
      attachTo: document.body,
    });
    const input = wrapper.get('input').element;
    settableFiles(input);
    return { wrapper, input };
  }

  const pdf = () => new File(['x'], 'cv.pdf', { type: 'application/pdf' });

  it('takes a file pasted anywhere on the page, as its value and in the input', async () => {
    let value: File | undefined;
    const { wrapper, input } = await mountPicture({
      'onUpdate:modelValue': (file?: File) => (value = file),
    });
    const file = pdf();

    pasteFile(file);
    await vi.waitFor(() => expect(wrapper.emitted('paste')).toEqual([[file]]));

    expect(value).toBe(file);
    expect(input.files?.[0]).toBe(file);
  });

  it('has checked a pasted file by the time it emits paste', async () => {
    let validAtPaste: boolean | undefined;
    const { wrapper } = await mountPicture({
      maxFileSize: 1,
      onPaste: () => {
        validAtPaste = (wrapper.vm as unknown as { validity: boolean })
          .validity;
      },
    });

    pasteFile(new File([new Uint8Array(2000)], 'big.pdf'));
    await vi.waitFor(() => expect(wrapper.emitted('paste')).toHaveLength(1));

    expect(validAtPaste).toBe(false);
  });

  it('gives a paste to one field: the one with focus, else the first one mounted', async () => {
    const first = await mountPicture();
    const second = await mountPicture();

    pasteFile(pdf());
    await vi.waitFor(() =>
      expect(first.wrapper.emitted('paste')).toHaveLength(1),
    );
    expect(second.wrapper.emitted('paste')).toBeUndefined();

    second.input.focus();
    pasteFile(pdf());
    await vi.waitFor(() =>
      expect(second.wrapper.emitted('paste')).toHaveLength(1),
    );
    expect(first.wrapper.emitted('paste')).toHaveLength(1);
  });

  it('leaves a paste to a field out of sight, such as one in a closed dialog', async () => {
    const hidden = addToPage('<div style="display: none"></div>');
    const outOfSight = await mountSuspended(FileInput, {
      props: { label: 'Hidden picture' },
      attachTo: hidden,
    });
    const visible = await mountPicture();

    pasteFile(pdf());
    await vi.waitFor(() =>
      expect(visible.wrapper.emitted('paste')).toHaveLength(1),
    );
    expect(outOfSight.emitted('paste')).toBeUndefined();
  });
});

describe('FileInput and image compression', () => {
  it('has the chosen image as its value at once, then the compressed one, dropping a result for a file chosen before', async () => {
    const objectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:preview');
    const values: (File | undefined)[] = [];
    const wrapper = await mountSuspended(FileInput, {
      props: {
        label: 'Picture',
        'onUpdate:modelValue': (file?: File) => values.push(file),
      },
      attachTo: document.body,
    });
    const input = wrapper.get('input').element;
    compressions.length = 0;

    const first = new File(['x'], 'first.png', { type: 'image/png' });
    await choose(input, first);
    await nextTick();
    const second = new File(['y'], 'second.png', { type: 'image/png' });
    await choose(input, second);
    await nextTick();
    expect(values).toEqual([first, second]);

    compressions[0]!.finish(
      new File(['a'], 'first.jpg', { type: 'image/jpeg' }),
    );
    expect(values).toHaveLength(2);

    compressions[1]!.finish(
      new File(['b'], 'second.jpg', { type: 'image/jpeg' }),
    );
    expect(values.at(-1)?.name).toBe('second.jpg');
    objectUrl.mockRestore();
  });
});
