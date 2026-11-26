<script setup lang="ts">
useHead({ title: 'Buttons & Links' });

const agreed = ref(false);
const message = ref('');
const sendStatus = ref('');
const sent = ref(false);

// A press while unavailable says why; emptied first, so a second press is
// read out again
async function onSend() {
  if (agreed.value) return;
  sendStatus.value = '';
  await nextTick();
  sendStatus.value = 'Not sent: tick “I agree to the terms” first.';
}
</script>

<template>
  <div class="demo-page">
    <h1>Buttons & Links</h1>

    <blockquote>
      <p class="fs-md">
        A
        <Button
          label="button"
          to="https://www.w3.org/WAI/ARIA/apg/patterns/button"
          variant="link"
          target="_blank"
        />
        is a widget that enables users to trigger an action or event, such as
        submitting a form, opening a dialog, canceling an action, or performing
        a delete operation.

      <span class="spacer" style="min-height:16px" />

        A
        <Button
          label="link"
          to="https://www.w3.org/WAI/ARIA/apg/patterns/link"
          variant="link"
          target="_blank"
        />
        provides an interactive reference to a resource. The target resource can
        be either external or local, i.e., either outside or within the current
        page or application.
      </p>
    </blockquote>

    <p class="mbs-2 mbe-2">Note: when you set the <code>to</code> or <code>href</code> prop, the <code>{{`<Button>`}}</code> component will be rendered as a <code>{{`<NuxtLink>`}}</code> component.</p>

    <Card>
      <h2>Variants</h2>
      <div class="flex-wrapper">
        <Button variant="primary" label="Primary" />
        <Button variant="secondary" label="Secondary" />
        <Button variant="outline" label="Outline" />
        <Button variant="ghost" label="Ghost" />
        <Button variant="danger" label="Danger" />
        <Button variant="green" label="Green" />
        <Button variant="black" label="Black" />
        <Button variant="3d" label="3D" />
        <Button variant="link" label="Link" style="margin-inline-start:0.75rem" />
      </div>
    </Card>

    <Card>
      <h2>Sizes</h2>
      <div class="flex-wrapper">
        <Button icon="material-symbols:accessibility-new-rounded" size="xl" label="Extra Large" />
        <Button icon="material-symbols:accessibility-new-rounded" size="lg" label="Large" />
        <Button icon="material-symbols:accessibility-new-rounded" size="md" label="Medium" />
        <Button icon="material-symbols:accessibility-new-rounded" size="sm" label="Small" />
        <Button icon="material-symbols:accessibility-new-rounded" size="xs" label="Extra Small" />
      </div>
    </Card>

    <Card>
      <h2>Font sizes</h2>
      <div class="flex-wrapper" style="--gap: 1rem">
        <Button variant="link" font-size="lg" label="Large link" />
        <Button variant="link" font-size="md" label="Medium link" />
        <Button variant="link" font-size="sm" label="Small link" />
        <Button variant="link" font-size="xs" label="XS link" />
        <Button variant="link" font-size="xxs" label="XXS link" />
      </div>
    </Card>

    <Card>
      <h2>Icon sizes</h2>
      <div class="flex-wrapper" style="--gap: 1rem">
        <Button icon="material-symbols:check-circle-rounded" icon-pos="end" icon-size="lg" label="Large icon" />
        <Button icon="material-symbols:check-circle-rounded" icon-pos="end" icon-size="md" label="Medium icon" />
        <Button icon="material-symbols:check-circle-rounded" icon-pos="end" icon-size="sm" label="Small icon" />
        <Button icon="material-symbols:check-circle-rounded" icon-pos="end" icon-size="xs" label="XS icon" />
        <Button icon="material-symbols:check-circle-rounded" icon-pos="end" icon-size="xxs" label="XXS icon" />
      </div>
    </Card>

    <Card>
      <h2>Icons</h2>
      <div class="flex-wrapper">
        <Button
          icon="material-symbols:download-rounded"
          icon-size="xl"
          label="Download"
          variant="primary"
          hide-label
        />
        <Button icon="material-symbols:chevron-left-rounded" label="Previous" />
        <Button icon="material-symbols:chevron-right-rounded" icon-pos="end" label="Next" />
        <Button variant="ghost" icon="material-symbols:arrow-left-alt-rounded" label="Back" />
        <Button
          variant="link"
          to="https://www.cardan.com"
          target="_blank"
          label="Cardan.com"
        />
      </div>
    </Card>

    <Card>
      <h2>Border radius</h2>
      <div class="flex-wrapper">
        <Button
          radius="full"
          size="xl"
          icon="material-symbols:download-rounded"
          label="Download"
        />
        <Button
          radius="full"
          size="xl"
          icon-size="xl"
          icon="material-symbols:download-rounded"
          hide-label
          label="Download"
        />
        <Button
          radius="md"
          size="xl"
          icon-size="xxl"
          icon="material-symbols:download-rounded"
          hide-label
          label="Download"
        />
        <Button
          radius="sm"
          size="lg"
          icon-size="xl"
          icon="material-symbols:download-rounded"
          hide-label
          label="Download"
        />
        <Button
          radius="xs"
          size="sm"
          icon-size="lg"
          icon="material-symbols:download-rounded"
          hide-label
          label="Download"
        />
      </div>
    </Card>

    <Card>
      <h2>States</h2>
      <div class="flex-wrapper">
        <Button size="lg" loading label="Loading" />
        <Button size="lg" loading label="Loading link" to="/" />
        <Button size="lg" disabled label="Disabled button" />
        <Button size="lg" aria-disabled label="Unavailable button" />
        <Button size="lg" aria-disabled label="Unavailable link" to="/" />
        <Button
          size="lg"
          disabled
          label="Disabled link"
          to="https://www.cardan.com"
          icon-pos="end"
          icon="material-symbols:open-in-new-rounded"
        />
        <CopyButton size="lg" text="Demo Text" />
      </div>

      <Spacer size="lg" />

      <h3>Unavailable, but focusable</h3>
      <p>
        <code>disabled</code> takes a button out of the Tab order, so a
        keyboard or screen reader user may never find it, or learn why it does
        nothing. <code>aria-disabled</code> keeps it focusable and says it is
        unavailable: a submit button does not submit, also not on Enter in a
        field of its form, and an unavailable link keeps its href but is not
        followed. A click, Enter or Space still emits <code>click</code>, so
        a press can say why nothing happens. Say why in its description
        (<code>aria-describedby</code>) or in text next to it.
      </p>
      <Form @submit="sent = true">
        <Input v-model="message" label="Message" />
        <Checkbox v-model="agreed" label="I agree to the terms" />
        <div class="flex-wrapper">
          <Button
            type="submit"
            variant="primary"
            label="Send"
            :aria-disabled="!agreed"
            aria-describedby="send-reason"
            @click="onSend"
          />
          <p id="send-reason">
            {{ agreed ? '' : 'Tick “I agree to the terms” to send.' }}
          </p>
        </div>
        <p role="status">{{ sent ? 'Sent.' : sendStatus }}</p>
      </Form>

      <Spacer size="lg" />

      <h3>The current page, disabled</h3>
      <p>
        A disabled link has no href, so it cannot be followed or reached with
        Tab. When it leads to the current page it keeps that look and
        <code>aria-current="page"</code>, as an enabled one has them.
      </p>
      <div class="flex-wrapper">
        <Button
          variant="sidebar"
          to="/buttons"
          icon="material-symbols:smart-button-rounded"
          label="Buttons & Links"
        />
        <Button
          variant="sidebar"
          to="/buttons"
          icon="material-symbols:smart-button-rounded"
          label="Buttons & Links"
          disabled
        />
      </div>
    </Card>
  </div>
</template>

