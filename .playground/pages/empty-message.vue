<script setup lang="ts">
useHead({ title: 'Empty message' });

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
    <h1>Empty message</h1>

    <p class="mbe-2 fs-lg">
      EmptyMessage is the text that takes the place of a list, a table or a
      set of search results when there is nothing to show. It replaces the
      paragraph with the <code>no-results</code> class that every project
      styled on its own, so that an empty list looks the same everywhere and
      a project changes its look in one place.
    </p>

    <div class="card-cols">
      <Card>
        <h2>Text only</h2>

        <p class="c-grey-text">
          The text comes from the <code>text</code> prop or from the default
          slot, which also takes inline markup such as a link or emphasis.
          With only a text, the component renders a single paragraph with the
          class <code>empty-message</code>, just like the paragraph it
          replaces, so the markup of a page stays the same. The component has
          no outer margin: the spacing around it depends on where it is used,
          so the page sets it there, with
          <code>--empty-message-margin-block</code> on a class of its own on
          the component.
        </p>

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

      <Card>
        <h2>With an icon</h2>

        <p class="c-grey-text">
          The <code>icon</code> prop adds an icon before the text. The icon is
          decorative: it is hidden from screen readers, so the text has to say
          everything on its own. It takes the color of the text and sits on
          its first line when the text wraps. Use a Material Symbols icon, the
          outlined and rounded variant first.
        </p>

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

      <Card>
        <h2>With an action</h2>

        <p class="c-grey-text">
          The <code>actions</code> slot places one or more buttons or links
          after the text, such as a button that resets the filters of a
          catalog. The component then renders a wrapper with the paragraph and
          the actions, which sit next to the text when there is room and below
          it on a narrow screen. Type a word below that matches no course to
          see it.
        </p>

        <p class="c-grey-text">
          When an action removes the empty message, as resetting the filters
          does, the button that had focus disappears with it. Move focus to a
          sensible place in its click handler, such as the filter field, so a
          keyboard or screen reader user does not end up at the top of the
          page.
        </p>

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

      <Card>
        <h2>Not a live region</h2>

        <p class="c-grey-text">
          EmptyMessage is not a live region, and screen readers do not
          announce it when it appears. That is deliberate: an empty message
          that appears on page load should not interrupt the reader, and a
          list that changes in place already tells the reader what happened.
          Use <code>useResultsFocus()</code> to bring the reader to the
          results after a filter or a page change, or a status element of the
          page itself, such as the result count in the example with an action,
          which has <code>role="status"</code>.
        </p>
      </Card>

      <Card>
        <h2>Changing the look</h2>

        <p class="c-grey-text">
          The text is grey and has the size and style of its surroundings by
          default. A project changes the look of every empty message at once
          with three CSS variables in its <code>main.css</code>. The color
          must keep a contrast of at least 4.5:1 with every surface the
          message appears on, in light and dark mode.
        </p>

        <ul class="c-grey-text">
          <li>
            <code>--empty-message-color</code>: the color of the text and the
            icon, <code>var(--color-grey-text)</code> by default.
          </li>
          <li>
            <code>--empty-message-font-size</code>: the font size,
            <code>1em</code> (the size of the surroundings) by default.
          </li>
          <li>
            <code>--empty-message-font-style</code>: the font style,
            <code>normal</code> by default.
          </li>
          <li>
            <code>--empty-message-margin-block</code>: the margin above and
            below, <code>0</code> by default. Unlike the other three, it is
            set where the component is used, on a class of the project's own,
            and not once for the whole project.
          </li>
        </ul>

        <p class="c-grey-text">
          The example below sets a smaller italic text, the look the Auditor
          has always given its empty lists.
        </p>

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
    </div>
  </div>
</template>

<style>
.demo-page.empty-message-page {
  .card {
    display: grid;
    align-content: start;
    gap: 1rem;

    h2,
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
