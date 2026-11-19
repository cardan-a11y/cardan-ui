<script setup lang="ts">
useHead({ title: 'Status messages' });

const { announcements, polite, assertive } = useAnnounce();

const usageExample = [
  '```ts',
  `const { polite, assertive } = useAnnounce();

// After a search that ran in place
polite(t('search.results', { count: results.length }));

// After a submit that failed on something not tied to one field
assertive(t('form.not-saved'));`,
  '```',
].join('\n');
</script>

<template>
  <div class="demo-page announcer-page">
    <h1>Status messages</h1>

    <p class="fs-md demo-description">
      A status message tells someone the result of what they did, without moving
      their focus: a search that found three results, a change that was saved, a
      form that could not be sent. A screen reader user hears it only when it is
      in a live region, so WCAG 2.2 success criterion 4.1.3 asks for one. The
      <code>useAnnounce()</code> composable puts a message in the live regions
      of the Announcer component, which AppShell renders once for the whole app.
    </p>

    <Card>
      <h2>Polite and assertive</h2>

      <p>
        <code>polite()</code> waits until the screen reader has finished what it
        is reading, and is right for nearly every message.
        <code>assertive()</code> interrupts it, and is for a message that cannot
        wait, such as a submit that failed. Each urgency has its own live
        region, which keeps its role and urgency for the life of the page. Both
        regions are in the page's HTML from the start, because a region that
        appears together with its text is not read out.
      </p>

      <MarkdownPreview :content="usageExample" class="announcer-demo-code" />
    </Card>

    <Card>
      <h2>The same message twice</h2>

      <p>
        Someone sends a form, hears that the email address is required, changes
        the wrong field and sends it again. The second failure is news, even
        though the text is the same, so the Announcer adds every message as a
        new element and a screen reader reads it out again. A page title that
        stays the same after a navigation is the exception: the route announcer
        stays quiet, because two pages with the same title need distinct titles
        instead.
      </p>

      <p>
        The messages stay in their region and are not cleared after a few
        seconds: a polite message waits for its turn, and a region emptied in
        the meantime could lose it. Each region keeps its three latest messages.
      </p>

      <div class="announcer-demo-actions">
        <Button label="Save" @click="polite('Changes saved')" />
        <Button
          label="Send with an error"
          variant="secondary"
          @click="assertive('Email address is required')"
        />
      </div>

      <h3 class="mbs-2">In the live regions now</h3>

      <dl class="announcer-demo-regions">
        <template
          v-for="urgency in ['polite', 'assertive'] as const"
          :key="urgency"
        >
          <dt>{{ urgency }}</dt>
          <dd>
            <ol v-if="announcements[urgency].length">
              <li v-for="message in announcements[urgency]" :key="message.id">
                {{ message.text }}
              </li>
            </ol>
            <template v-else>Empty</template>
          </dd>
        </template>
      </dl>
    </Card>

    <Card>
      <h2>Inside a modal dialog</h2>

      <p>
        While a modal Dialog or the MobileMenu is open, the rest of the page is
        inert, the live regions included, so a screen reader does not read out
        their messages. A dialog shows its own message instead, with
        ErrorMessage, which is a live region inside the dialog.
      </p>
    </Card>
  </div>
</template>

<style>
.announcer-page {
  .announcer-demo-code {
    margin-block-start: 1rem;
  }

  .announcer-demo-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-block-start: 1rem;
  }

  .announcer-demo-regions dt {
    font-weight: bold;
  }
}
</style>
