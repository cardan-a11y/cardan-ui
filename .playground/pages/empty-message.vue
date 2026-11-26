<script setup lang="ts">
useHead({ title: 'Empty message' });

const rules = [
  {
    title: 'Not a live region',
    text: 'It is not announced when it appears. A list that changes in place tells the reader with useResultsFocus() or a status element of the page.',
  },
  {
    title: 'The text says it all',
    text: 'The icon is decorative and hidden from screen readers.',
  },
  {
    title: 'No outer margin',
    text: 'The page sets the spacing where it is used, with a margin on a class of its own on the component.',
  },
  {
    title: 'An action moves focus',
    text: 'A button that removes the message disappears with it. Its click handler moves focus, such as to the filter field.',
  },
];

const courses = [
  'Accessible forms',
  'Colour and contrast',
  'Keyboard navigation',
  'Screen reader basics',
  'WCAG 2.2 for developers',
];

const query = ref('Captions');
const filterInput = ref<{ focusElement: () => void }>();

const filteredCourses = computed(() =>
  courses.filter((course) =>
    course.toLowerCase().includes(query.value.trim().toLowerCase()),
  ),
);

function resetFilter() {
  query.value = '';
  // The button disappears with the empty message: keep focus on the page
  filterInput.value?.focusElement();
}
</script>

<template>
  <div class="demo-page empty-message-page">
    <p class="demo-eyebrow">Feedback</p>
    <h1>Empty message</h1>
    <p class="demo-lead">
      EmptyMessage is the text in the place of a list, a table or search
      results with nothing to show, so an empty list looks the same everywhere.
    </p>

    <ul role="list" class="demo-grid">
      <li v-for="rule in rules" :key="rule.title" class="demo-tile">
        <strong>{{ rule.title }}</strong>
        <span>{{ rule.text }}</span>
      </li>
    </ul>

    <section class="demo-section" aria-labelledby="empty-text">
      <h2 id="empty-text">Text only</h2>
      <p class="demo-hint">
        The text comes from <code>text</code> or from the default slot, which
        takes inline markup such as a link. It renders one paragraph with the
        class <code>empty-message</code>.
      </p>

      <Card>
        <div class="demo-box">
          <EmptyMessage text="There are no courses yet." />
        </div>

        <div class="demo-box">
          <EmptyMessage>
            No articles in this category. Try the
            <NuxtLink to="/">overview</NuxtLink> instead.
          </EmptyMessage>
        </div>

        <code>{{ `<EmptyMessage text="There are no courses yet." />` }}</code>
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="empty-icon">
      <h2 id="empty-icon">With an icon</h2>
      <p class="demo-hint">
        <code>icon</code> adds an icon before the text, in the color of the
        text and on its first line when the text wraps. Use a Material Symbols
        icon, the outlined and rounded variant first.
      </p>

      <Card>
        <div class="demo-box">
          <EmptyMessage
            text="No results match your search. Check the spelling or try a shorter search term."
            icon="material-symbols:search-off-outline-rounded"
          />
        </div>

        <code>{{
          `<EmptyMessage text="No results match your search." icon="material-symbols:search-off-outline-rounded" />`
        }}</code>
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="empty-action">
      <h2 id="empty-action">With an action</h2>
      <p class="demo-hint">
        The <code>actions</code> slot places buttons or links after the text,
        next to it when there is room and below it on a narrow screen. Type a
        word that matches no course to see it. The count above the list has
        <code>role="status"</code>, and Reset filter moves focus to the field.
      </p>

      <Card>
        <div class="demo-box filter-demo">
          <Input
            ref="filterInput"
            v-model="query"
            label="Filter courses"
            type="search"
            size="sm"
          />

          <p role="status" class="fs-sm">
            {{ filteredCourses.length }} of {{ courses.length }} courses
          </p>

          <ul v-if="filteredCourses.length" role="list">
            <li v-for="course in filteredCourses" :key="course">
              {{ course }}
            </li>
          </ul>

          <EmptyMessage v-else text="No courses match this filter.">
            <template #actions>
              <Button
                label="Reset filter"
                variant="outline"
                size="sm"
                @click="resetFilter"
              />
            </template>
          </EmptyMessage>
        </div>
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="empty-look">
      <h2 id="empty-look">Changing the look</h2>
      <p class="demo-hint">
        A project sets the look of every empty message with three variables in
        its <code>main.css</code>. The color keeps 4.5:1 on every surface the
        message appears on, in light and dark mode.
      </p>

      <Card>
        <ul>
          <li>
            <code>--empty-message-color</code>: the text and the icon,
            <code>var(--color-grey-text)</code> by default.
          </li>
          <li>
            <code>--empty-message-font-size</code>: <code>1em</code>, the size
            of the surroundings, by default.
          </li>
          <li>
            <code>--empty-message-font-style</code>: <code>normal</code> by
            default.
          </li>
        </ul>

        <div class="demo-box small-italic">
          <EmptyMessage
            text="This audit has no findings yet."
            icon="material-symbols:inbox-outline-rounded"
          />
        </div>

        <pre><code>{{ `:root {
  --empty-message-font-size: var(--font-size-sm);
  --empty-message-font-style: italic;
}` }}</code></pre>
      </Card>
    </section>
  </div>
</template>

<style>
.demo-page.empty-message-page {
  .card {
    display: grid;
    align-content: start;
    gap: 1rem;
    margin-block-end: 0;

    p,
    ul {
      margin-block: 0;
    }
  }

  .demo-box {
    padding: 1rem;
    border: 1px dashed var(--color-grey-light);
    border-radius: var(--radius-md);
  }

  .filter-demo {
    display: grid;
    gap: 0.75rem;

    ul {
      margin: 0;
      padding-inline-start: 1.25rem;
    }
  }

  .small-italic {
    --empty-message-font-size: var(--font-size-sm);
    --empty-message-font-style: italic;
  }

  code {
    overflow-wrap: anywhere;
  }

  pre {
    margin: 0;
    white-space: pre-wrap;
  }
}
</style>
