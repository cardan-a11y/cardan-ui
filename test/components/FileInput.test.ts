import { readFileSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { flushPromises, type DOMWrapper } from '@vue/test-utils';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { FileInput } from '#components';
import {
  fileTypeIcon,
  fileTypeIcons,
} from '../../app/components/FileInput.vue';
import {
  accessibleName,
  description,
  expectFocused,
  expectNoViolations,
} from '../a11y';
import { addToPage } from '../dom';
import { mountInForm } from '../form';

/** compressorjs, finished when a test calls `finish` or `fail` */
const compressions = vi.hoisted(
  () =>
    [] as {
      file: File;
      finish: (result: File) => void;
      fail: (error: Error) => void;
    }[],
);
const compressorMock = vi.hoisted(() => () => ({
  default: vi.fn(function (
    file: File,
    options: {
      success: (result: File) => void;
      error: (error: Error) => void;
    },
  ) {
    compressions.push({ file, finish: options.success, fail: options.error });
  }),
}));
vi.mock('compressorjs', compressorMock);

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
  await flushPromises();
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
    await expectNoViolations();
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
    await expectNoViolations();
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
    await expectNoViolations();
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
    await expectNoViolations();
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
    await expectNoViolations();
  });

  it.each([
    ['CV.PDF', true],
    ['x.exe.pdf', true],
    ['cv.pdf.exe', false],
    ['cv', false],
    ['.pdf', false],
  ])(
    'judges %s by its last extension, in any case: accepted %s',
    async (name, accepted) => {
      const wrapper = await mountSuspended(FileInput, {
        props: { label: 'Document', mode: 'document', accept: '.pdf' },
        attachTo: document.body,
      });
      const input = wrapper.get('input').element;

      await choose(input, new File(['x'], name));
      expect(wrapper.emitted('select')?.length ?? 0).toBe(accepted ? 1 : 0);
      expect(input.getAttribute('aria-invalid')).toBe(accepted ? null : 'true');
    },
  );

  it('judges a file by its extension, not its MIME type, which the server checks', async () => {
    const wrapper = await mountSuspended(FileInput, {
      props: { label: 'Document', mode: 'document', accept: '.pdf' },
      attachTo: document.body,
    });
    const input = wrapper.get('input').element;

    await choose(input, new File(['x'], 'cv.pdf', { type: 'image/png' }));
    expect(wrapper.emitted('select')).toHaveLength(1);
    await choose(input, new File(['x'], 'cv.png', { type: 'application/pdf' }));
    expect(wrapper.emitted('select')).toHaveLength(1);
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('without accept, hands on a file of any type, an empty one too', async () => {
    const wrapper = await mountSuspended(FileInput, {
      props: { label: 'Document', mode: 'document' },
      attachTo: document.body,
    });
    const input = wrapper.get('input').element;
    expect(description(input)).toBe('(max. 5 MB)');

    const files = [new File(['x'], 'run.exe'), new File([], 'empty.txt')];
    for (const file of files) await choose(input, file);
    expect(wrapper.emitted('select')).toEqual(files.map((file) => [file]));
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('takes a file of exactly the size limit and turns down a larger one', async () => {
    const wrapper = await mountSuspended(FileInput, {
      props: { label: 'Document', mode: 'document', maxFileSize: 1 },
      attachTo: document.body,
    });
    const input = wrapper.get('input').element;

    await choose(input, new File([new Uint8Array(1000)], 'limit.pdf'));
    expect(wrapper.emitted('select')).toHaveLength(1);

    await choose(input, new File([new Uint8Array(1001)], 'over.pdf'));
    expect(wrapper.emitted('select')).toHaveLength(1);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(description(input)).toBe(
      '(max. 1 KB) This file is larger than 1 KB. Choose a smaller file.',
    );
  });
});

describe('FileInput in document mode in a form', () => {
  /**
   * Chooses a file through the input's own file list, which FormData reads;
   * happy-dom's DataTransfer copies the file, so the tests compare names
   */
  async function pick(input: HTMLInputElement, file: File) {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    await flushPromises();
  }

  /** The file a submit of the form posts under `name`, `undefined` for none */
  function posted(form: HTMLFormElement, name: string) {
    const file = new FormData(form).get(name) as File | null;
    return file?.name ? file : undefined;
  }

  async function mountDocument(props: Record<string, unknown> = {}) {
    const value = ref<File>();
    const select = vi.fn();
    const updates = vi.fn();
    const wrapper = await mountInForm(() => [
      h(FileInput, {
        label: 'CV',
        mode: 'document',
        accept: '.pdf',
        modelValue: value.value,
        'onUpdate:modelValue': (file?: File) => {
          updates(file);
          value.value = file;
        },
        onSelect: select,
        ...props,
      }),
    ]);
    return {
      wrapper,
      value,
      select,
      updates,
      form: wrapper.get('form').element as HTMLFormElement,
      input: wrapper.get('input').element as HTMLInputElement,
    };
  }

  /** The button named Delete, the file row's */
  const deleteButton = (wrapper: {
    findAll: (s: 'button') => DOMWrapper<HTMLButtonElement>[];
  }) =>
    wrapper
      .findAll('button')
      .find((button) => accessibleName(button) === 'Delete');

  const pdf = (name = 'cv.pdf') =>
    new File(['x'], name, { type: 'application/pdf' });
  const png = () => new File(['x'], 'photo.png', { type: 'image/png' });

  it('with a name, keeps a chosen file as its value and in what the form posts', async () => {
    const { wrapper, value, select, form, input } = await mountDocument({
      name: 'cv',
    });

    await pick(input, pdf());
    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'cv.pdf' }),
    );
    expect(value.value?.name).toBe('cv.pdf');
    expect(posted(form, 'cv')?.name).toBe('cv.pdf');
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(wrapper.text()).toContain('cv.pdf');
  });

  it('with a name, posts nothing after a rejected file with none before', async () => {
    const { value, form, input } = await mountDocument({ name: 'cv' });

    await pick(input, png());
    expect(posted(form, 'cv')).toBeUndefined();
    expect(value.value).toBeUndefined();
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('with a name, keeps the file before as its value and in the post after a rejected one', async () => {
    const { value, select, form, input } = await mountDocument({ name: 'cv' });

    await pick(input, pdf());
    await pick(input, png());
    expect(value.value?.name).toBe('cv.pdf');
    expect(posted(form, 'cv')?.name).toBe('cv.pdf');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(select).toHaveBeenCalledTimes(1);
  });

  it('with a name, empties the value and the post with its delete button, focus back on the field', async () => {
    const { wrapper, value, form, input } = await mountDocument({
      name: 'cv',
    });

    await pick(input, pdf());
    await deleteButton(wrapper)!.trigger('click');
    expect(value.value).toBeUndefined();
    expect(posted(form, 'cv')).toBeUndefined();
    expectFocused(input);
  });

  it('with a name and required, holds back a submit without a file and says it is missing', async () => {
    const { wrapper, form, input } = await mountDocument({
      name: 'cv',
      required: true,
    });
    expect(input.required).toBe(true);
    expect(form.checkValidity()).toBe(false);

    await wrapper.get('form').trigger('submit');
    await nextTick();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(description(input)).toBe('PDF (max. 5 MB) CV is missing');
    expectFocused(input);

    await pick(input, pdf());
    expect(form.checkValidity()).toBe(true);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('without a name, hands the file to select and is empty again, with no value, and required only shows the chip', async () => {
    const { wrapper, select, updates, form, input } = await mountDocument({
      required: true,
    });
    expect(input.required).toBe(false);

    await pick(input, pdf());
    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'cv.pdf' }),
    );
    expect(updates).not.toHaveBeenCalled();
    expect(input.files).toHaveLength(0);
    expect(wrapper.text()).not.toContain('cv.pdf');
    expect(deleteButton(wrapper)).toBeUndefined();
    expect(form.checkValidity()).toBe(true);
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

  it('with accept, turns down a file of another type, chosen or dropped, and keeps the one before', async () => {
    let value: File | undefined;
    const wrapper = await mountSuspended(FileInput, {
      props: {
        label: 'Picture',
        accept: 'image/*',
        'onUpdate:modelValue': (file?: File) => (value = file),
      },
      attachTo: document.body,
    });
    const input = wrapper.get('input').element;
    const gif = new File(['x'], 'cat.gif', { type: 'image/gif' });
    const objectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:preview');

    await choose(input, gif);
    expect(value).toBe(gif);

    // A drop sets the input's files and fires change, as the picker does
    await choose(input, new File(['x'], 'cv.pdf', { type: 'application/pdf' }));
    expect(value).toBe(gif);
    expect(input.files?.[0]).toBe(gif);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(description(input)).toBe(
      '(max. 5 MB) This file type is not supported. Choose a file of type image.',
    );
    objectUrl.mockRestore();
  });

  it('with accept, judges by the MIME type and by an extension it names', async () => {
    const wrapper = await mountSuspended(FileInput, {
      props: { label: 'Picture', accept: 'image/png, .WEBP' },
      attachTo: document.body,
    });
    const input = wrapper.get('input').element;
    const objectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:preview');

    await choose(
      input,
      new File(['x'], 'shot.png', { type: 'application/pdf' }),
    );
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(description(input)).toBe(
      'PNG or WEBP (max. 5 MB) This file type is not supported. Choose a file of type PNG or WEBP.',
    );

    await choose(input, new File(['x'], 'shot.webp', { type: '' }));
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1);
    objectUrl.mockRestore();
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

  async function mountWithRealFiles(props: Record<string, unknown> = {}) {
    const wrapper = await mountSuspended(FileInput, {
      props: { label: 'Picture', ...props },
      attachTo: document.body,
    });
    return { wrapper, input: wrapper.get('input').element };
  }

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

  it('keeps a pasted file over the size limit out of the value and the input, and shows the error', async () => {
    let value: File | undefined;
    const { wrapper, input } = await mountWithRealFiles({
      maxFileSize: 1,
      'onUpdate:modelValue': (file?: File) => (value = file),
    });

    pasteFile(new File([new Uint8Array(2000)], 'big.pdf'));
    await vi.waitFor(() => expect(wrapper.emitted('paste')).toHaveLength(1));

    expect(value).toBeUndefined();
    expect(input.files).toHaveLength(0);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(description(input)).toBe(
      '(max. 1 KB) This file is larger than 1 KB. Choose a smaller file.',
    );
  });

  it('with accept, turns down a pasted file of another type', async () => {
    let value: File | undefined;
    const { wrapper, input } = await mountWithRealFiles({
      accept: 'image/*',
      'onUpdate:modelValue': (file?: File) => (value = file),
    });

    pasteFile(pdf());
    await vi.waitFor(() => expect(wrapper.emitted('paste')).toHaveLength(1));

    expect(value).toBeUndefined();
    expect(input.files).toHaveLength(0);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(description(input)).toContain('Choose a file of type image.');
  });

  it('takes no paste while disabled', async () => {
    const { wrapper, input } = await mountPicture({ disabled: true });

    pasteFile(pdf());
    await flushPromises();

    expect(wrapper.emitted('paste')).toBeUndefined();
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(input.files).toHaveLength(0);
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
    await vi.waitFor(() => expect(compressions).toHaveLength(1));
    const second = new File(['y'], 'second.png', { type: 'image/png' });
    await choose(input, second);
    await vi.waitFor(() => expect(compressions).toHaveLength(2));
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

  /** A FileInput in a Form, its updates and `compressed` in one log */
  async function mountInFormWithLog(props: Record<string, unknown> = {}) {
    const value = ref<File>();
    const log: string[] = [];
    const wrapper = await mountInForm(() => [
      h(FileInput, {
        label: 'Avatar',
        name: 'avatar',
        modelValue: value.value,
        'onUpdate:modelValue': (file?: File) => {
          log.push(`update ${file?.name}`);
          value.value = file;
        },
        onReady: (file: File) => log.push(`ready ${file.name}`),
        ...props,
      }),
    ]);
    return {
      wrapper,
      value,
      log,
      form: wrapper.get('form').element as HTMLFormElement,
      input: wrapper.get('input').element as HTMLInputElement,
    };
  }

  /** Chooses through the input's own file list, which FormData reads */
  async function pick(input: HTMLInputElement, file: File) {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(compressions).toHaveLength(1));
  }

  /** Chooses a file that is not compressed, so nothing waits for compressorjs */
  async function pickUncompressed(input: HTMLInputElement, file: File) {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    await flushPromises();
  }

  const posted = (form: HTMLFormElement) =>
    (new FormData(form).get('avatar') as File | null)?.name || undefined;

  it('with a name, posts the original while compressing and the compressed image after, then emits ready once', async () => {
    const objectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:preview');
    const { form, input, log } = await mountInFormWithLog();
    compressions.length = 0;

    await pick(input, new File(['x'], 'second.png', { type: 'image/png' }));
    expect(posted(form)).toBe('second.png');
    expect(log).toEqual(['update second.png']);

    compressions[0]!.finish(
      new File(['b'], 'second.jpg', { type: 'image/jpeg' }),
    );
    await nextTick();
    expect(posted(form)).toBe('second.jpg');
    expect(log).toEqual([
      'update second.png',
      'update second.jpg',
      'ready second.jpg',
    ]);
    objectUrl.mockRestore();
  });

  it('with a name, posts only the first of several pasted files', async () => {
    const objectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:preview');
    const { form } = await mountInFormWithLog();

    // GIFs are not compressed: the input keeps what the paste put in it
    const transfer = new DataTransfer();
    transfer.items.add(new File(['a'], 'one.gif', { type: 'image/gif' }));
    transfer.items.add(new File(['b'], 'two.gif', { type: 'image/gif' }));
    const paste = new Event('paste', { bubbles: true });
    Object.defineProperty(paste, 'clipboardData', { value: transfer });
    document.body.dispatchEvent(paste);
    await vi.waitFor(() => expect(posted(form)).toBe('one.gif'));

    expect(new FormData(form).getAll('avatar')).toHaveLength(1);
    objectUrl.mockRestore();
  });

  it('reset() empties the value, the input and the preview, and drops a compression still running', async () => {
    const objectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:preview');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue();
    const { wrapper, form, input, value, log } = await mountInFormWithLog();
    compressions.length = 0;

    await pick(input, new File(['x'], 'photo.png', { type: 'image/png' }));
    expect(wrapper.find('img').exists()).toBe(true);

    const field = wrapper.findComponent(FileInput);
    (field.vm as unknown as { reset: () => void }).reset();
    await nextTick();
    expect(value.value).toBeUndefined();
    expect(input.files).toHaveLength(0);
    expect(posted(form)).toBeUndefined();
    expect(wrapper.find('img').exists()).toBe(false);
    expect(revoke).toHaveBeenCalledWith('blob:preview');

    compressions[0]!.finish(
      new File(['b'], 'photo.jpg', { type: 'image/jpeg' }),
    );
    await nextTick();
    expect(value.value).toBeUndefined();
    expect(log).toEqual(['update photo.png', 'update undefined']);
    objectUrl.mockRestore();
    revoke.mockRestore();
  });

  it('revokes the preview of a chosen image when it unmounts', async () => {
    const objectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:preview');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue();
    const { wrapper, input } = await mountInFormWithLog();
    compressions.length = 0;

    await pick(input, new File(['x'], 'photo.png', { type: 'image/png' }));
    expect(revoke).not.toHaveBeenCalled();
    wrapper.unmount();
    expect(revoke).toHaveBeenCalledWith('blob:preview');
    objectUrl.mockRestore();
    revoke.mockRestore();
  });

  it('emits ready with the original for a GIF, which it does not compress', async () => {
    const objectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:preview');
    const { form, input, log } = await mountInFormWithLog();
    compressions.length = 0;

    await pickUncompressed(
      input,
      new File(['x'], 'moving.gif', { type: 'image/gif' }),
    );
    await vi.waitFor(() =>
      expect(log).toEqual(['update moving.gif', 'ready moving.gif']),
    );
    expect(compressions).toHaveLength(0);
    expect(posted(form)).toBe('moving.gif');
    objectUrl.mockRestore();
  });

  it('keeps the original and emits ready with it when compressorjs fails', async () => {
    const objectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:preview');
    const { form, input, log, value } = await mountInFormWithLog();
    compressions.length = 0;

    await pick(input, new File(['x'], 'broken.png', { type: 'image/png' }));
    compressions[0]!.fail(new Error('Failed to load the image.'));
    await nextTick();
    expect(log).toEqual(['update broken.png', 'ready broken.png']);
    expect(value.value?.name).toBe('broken.png');
    expect(posted(form)).toBe('broken.png');
    objectUrl.mockRestore();
  });

  it('keeps the original and emits ready with it when compressorjs does not load', async () => {
    const objectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:preview');
    vi.doMock('compressorjs', () => {
      throw new Error('Failed to fetch dynamically imported module');
    });
    try {
      const { form, input, log } = await mountInFormWithLog();
      await pickUncompressed(
        input,
        new File(['x'], 'offline.png', { type: 'image/png' }),
      );
      await vi.waitFor(() =>
        expect(log).toEqual(['update offline.png', 'ready offline.png']),
      );
      expect(posted(form)).toBe('offline.png');
    } finally {
      vi.doMock('compressorjs', compressorMock);
      objectUrl.mockRestore();
    }
  });

  it('revokes only the preview it made, never the placeholder its parent passed', async () => {
    const objectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:preview');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue();
    const { wrapper, input } = await mountInFormWithLog({
      placeholderUrl: 'blob:parent',
    });
    compressions.length = 0;
    const field = wrapper.findComponent(FileInput);
    const reset = () => (field.vm as unknown as { reset: () => void }).reset();

    reset();
    await nextTick();
    expect(wrapper.get('img').attributes('src')).toBe('blob:parent');

    await pick(input, new File(['x'], 'photo.png', { type: 'image/png' }));
    expect(wrapper.get('img').attributes('src')).toBe('blob:preview');
    reset();
    await nextTick();
    expect(wrapper.get('img').attributes('src')).toBe('blob:parent');
    wrapper.unmount();
    expect(revoke.mock.calls).toEqual([['blob:preview']]);
    objectUrl.mockRestore();
    revoke.mockRestore();
  });
});

describe('FileInput: disabled', () => {
  it('and required, is not invalid after a failed submit', async () => {
    const wrapper = await mountInForm(() => [
      h(FileInput, {
        label: 'Picture',
        required: true,
        disabled: true,
        maxFileSize: 1000,
      }),
      // Another field fails, so the Form shows errors
      h('input', { required: true, 'aria-label': 'Other' }),
    ]);
    const input = wrapper.get('input');

    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(input.attributes('aria-invalid')).toBeUndefined();
    expect(description(input)).not.toContain('Picture is missing');
  });
});

describe('FileInput: hide-zone', () => {
  it('opens the picker from open() and still shows its error', async () => {
    const wrapper = await mountSuspended(FileInput, {
      props: { label: 'Logo', hideZone: true, maxFileSize: 1 },
      attachTo: document.body,
    });
    const input = wrapper.get('input').element;
    const opened = vi.fn();
    input.addEventListener('click', opened);

    (wrapper.vm as unknown as { open: () => void }).open();
    expect(opened).toHaveBeenCalledTimes(1);

    await choose(input, new File([new Uint8Array(2000)], 'big.pdf'));
    expect(wrapper.text()).toContain('This file is larger than 1 KB.');
  });
});

/** The installed Material Symbols, icons and aliases, as `prefix:name` */
function materialSymbols() {
  const { prefix, icons, aliases } = JSON.parse(
    readFileSync(
      'node_modules/@iconify-json/material-symbols/icons.json',
      'utf8',
    ),
  );
  return new Set(
    [...Object.keys(icons), ...Object.keys(aliases ?? {})].map(
      (name) => `${prefix}:${name}`,
    ),
  );
}

describe('fileTypeIcon', () => {
  // Any other collection is fetched from Iconify's API at runtime, which a
  // project's CSP blocks
  it('returns only icons from the installed Material Symbols', () => {
    const installed = materialSymbols();
    const icons = [
      ...fileTypeIcons.map(([, icon]) => icon),
      fileTypeIcon(),
      fileTypeIcon(new File([''], 'onbekend.xyz')),
    ];
    expect(icons.filter((icon) => !installed.has(icon))).toEqual([]);
  });

  it('picks the icon by extension or MIME type', () => {
    const icon = (name: string, type = '') =>
      fileTypeIcon(new File([''], name, { type }));
    expect(icon('App.VUE')).toBe(
      'material-symbols:code-blocks-outline-rounded',
    );
    expect(icon('README.md')).toBe('material-symbols:markdown-outline-rounded');
    expect(icon('werkblad.pdf', 'application/pdf')).toBe(
      'material-symbols:picture-as-pdf-outline-rounded',
    );
    expect(
      icon(
        'cijfers.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ),
    ).toBe('material-symbols:table-outline-rounded');
    expect(icon('foto.jpg', 'image/jpeg')).toBe(
      'material-symbols:image-outline-rounded',
    );
    expect(icon('archief.zip', 'application/zip')).toBe(
      'material-symbols:unknown-document-outline-rounded',
    );
  });
});
