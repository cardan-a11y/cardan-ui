import { describe, it, expect } from 'vitest';
import type { Component } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { ProgressCircle, ProgressMeter } from '#components';
import { accessibleName, checkA11y, roleOf } from '../a11y';

/**
 * A meter (https://www.w3.org/WAI/ARIA/apg/patterns/meter/) or, with
 * `role="progressbar"`, a progress bar: a name, the value with its range,
 * and the value in words in `aria-valuetext`, since a meter's children are
 * presentational. Both components follow the same contract.
 */
async function mount(component: Component, props: Record<string, unknown>) {
  const wrapper = await mountSuspended(component, {
    props,
    attachTo: document.body,
  });
  return wrapper.get('[aria-valuenow]').element;
}

describe('ProgressMeter', () => {
  it('is a meter named by its label, with its value, range and "7 of 10" as the value text', async () => {
    const meter = await mount(ProgressMeter, {
      label: 'Lessons done',
      value: 7,
      max: 10,
    });

    expect(roleOf(meter)).toBe('meter');
    expect(accessibleName(meter)).toBe('Lessons done');
    expect(meter.getAttribute('aria-valuenow')).toBe('7');
    expect(meter.getAttribute('aria-valuemin')).toBe('0');
    expect(meter.getAttribute('aria-valuemax')).toBe('10');
    expect(meter.getAttribute('aria-valuetext')).toBe('7 of 10');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('keeps its name with a hidden label', async () => {
    const meter = await mount(ProgressMeter, {
      label: 'Lessons done',
      hideLabel: true,
      value: 7,
      max: 10,
    });

    expect(accessibleName(meter)).toBe('Lessons done');
  });

  it('says the percentage from min to max with showPercentage, kept between 0% and 100%', async () => {
    const meter = await mount(ProgressMeter, {
      label: 'Score',
      showPercentage: true,
      value: 10,
      min: 5,
      max: 15,
    });
    expect(meter.getAttribute('aria-valuetext')).toBe('50%');

    const over = await mount(ProgressMeter, {
      label: 'Score',
      showPercentage: true,
      value: 20,
      max: 10,
    });
    expect(over.getAttribute('aria-valuetext')).toBe('100%');

    const under = await mount(ProgressMeter, {
      label: 'Score',
      showPercentage: true,
      value: -3,
      max: 10,
    });
    expect(under.getAttribute('aria-valuetext')).toBe('0%');
  });

  it('is busy as a progress bar only until it reaches max, and never as a meter', async () => {
    const bar = await mount(ProgressMeter, {
      label: 'Upload',
      role: 'progressbar',
      value: 40,
    });
    expect(roleOf(bar)).toBe('progressbar');
    expect(bar.getAttribute('aria-busy')).toBe('true');
    expect(await checkA11y()).toHaveNoViolations();

    const done = await mount(ProgressMeter, {
      label: 'Upload',
      role: 'progressbar',
      value: 100,
    });
    expect(done.getAttribute('aria-busy')).not.toBe('true');

    const meter = await mount(ProgressMeter, { label: 'Score', value: 40 });
    expect(meter.getAttribute('aria-busy')).not.toBe('true');
  });
});

describe('ProgressCircle', () => {
  it('is a meter named "Progress" by default, with the percentage as the value text', async () => {
    const meter = await mount(ProgressCircle, { value: 42 });

    expect(roleOf(meter)).toBe('meter');
    expect(accessibleName(meter)).toBe('Progress');
    expect(meter.getAttribute('aria-valuenow')).toBe('42');
    expect(meter.getAttribute('aria-valuemin')).toBe('0');
    expect(meter.getAttribute('aria-valuemax')).toBe('100');
    expect(meter.getAttribute('aria-valuetext')).toBe('42%');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('is named by its label, and says "7 of 10" with showValue', async () => {
    const meter = await mount(ProgressCircle, {
      label: 'Lessons done',
      showValue: true,
      value: 7,
      max: 10,
    });

    expect(accessibleName(meter)).toBe('Lessons done');
    expect(meter.getAttribute('aria-valuetext')).toBe('7 of 10');
  });

  it('is busy as a progress bar only until it reaches max', async () => {
    const bar = await mount(ProgressCircle, {
      role: 'progressbar',
      value: 99,
    });
    expect(roleOf(bar)).toBe('progressbar');
    expect(bar.getAttribute('aria-busy')).toBe('true');

    const done = await mount(ProgressCircle, {
      role: 'progressbar',
      value: 100,
    });
    expect(done.getAttribute('aria-busy')).not.toBe('true');
  });
});
