import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { FileInput } from '#components';
import { checkA11y } from '../a11y';

/** Chooses a file the way the picker does: the input's files, then change */
async function choose(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
  await nextTick();
}

describe('FileInput with a circle', () => {
  it('shows the current picture in the zone, with the hint', async () => {
    const wrapper = await mountSuspended(FileInput, {
      props: {
        label: 'Profile picture',
        shape: 'circle',
        accept: 'image/*',
        placeholderUrl: '/favicon.svg',
      },
      attachTo: document.body,
    });

    const input = wrapper.get('input');
    expect(wrapper.classes()).toContain('file-input-shape--circle');
    expect(wrapper.get('.file-input-icon-wrapper .iconify').classes()).toContain(
      'i-material-symbols:add-photo-alternate-outline-rounded',
    );
    expect(wrapper.get('.preview-image').attributes('src')).toBe(
      '/favicon.svg',
    );
    expect(
      wrapper.get(`#${input.attributes('aria-describedby')}`).text(),
    ).toContain('max.');
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
    expect(wrapper.find('.preview-image').exists()).toBe(false);

    await wrapper.setProps({ placeholderUrl: '/current.png' });
    expect(wrapper.get('.preview-image').attributes('src')).toBe(
      '/current.png',
    );

    // A chosen file takes the picture's place until the parent clears it
    const input = wrapper.get('input').element;
    await choose(input, new File(['x'], 'cv.pdf', { type: 'application/pdf' }));
    await nextTick();
    expect(wrapper.find('.preview-image').exists()).toBe(false);

    await wrapper.setProps({ modelValue: undefined });
    expect(wrapper.get('.preview-image').attributes('src')).toBe(
      '/current.png',
    );
    expect(input.value).toBe('');
  });
});

describe('FileInput in document mode', () => {
  it('lists the accepted types in the instruction of the field', async () => {
    const wrapper = await mountSuspended(FileInput, {
      props: { label: 'Document', mode: 'document', accept: 'pdf, .DOCX' },
      attachTo: document.body,
    });

    const input = wrapper.get('input');
    const instruction = wrapper.get(
      `#${input.attributes('aria-describedby')}`,
    );
    expect(input.attributes('accept')).toBe('.pdf,.docx');
    expect(wrapper.get('.file-input-icon-wrapper .iconify').classes()).toContain(
      'i-material-symbols:upload-file-outline',
    );
    expect(instruction.text()).toContain('PDF or DOCX');
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
    expect(input.getAttribute('aria-describedby')).toContain(
      wrapper.get('.error-wrapper').attributes('id'),
    );
    expect(wrapper.get('.error-wrapper').text()).toContain('PDF');

    const pdf = new File(['x'], 'essay.pdf', { type: 'application/pdf' });
    await choose(input, pdf);
    expect(wrapper.emitted('select')).toEqual([[pdf]]);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(await checkA11y()).toHaveNoViolations();
  });
});
