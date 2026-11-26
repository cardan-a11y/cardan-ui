<script setup lang="ts">
useHead({ title: 'Accordion pattern' });

const isAccordionDetailsOpen = ref(false);
const isAccordionOpen = ref(false);
</script>

<template>
  <div class="demo-page details">
    <p class="demo-eyebrow">Layout</p>
    <h1>Accordion pattern</h1>
    <p class="demo-lead">
      A heading that opens and closes the section of content below it.
      <code>Accordion</code> follows the APG
      <Button
        label="accordion"
        to="https://www.w3.org/WAI/ARIA/apg/patterns/accordion"
        variant="link"
        target="_blank"
      />
      pattern, <code>AccordionDetails</code> is the native
      <code>{{ `<details>` }}</code>.
    </p>

    <section class="demo-section" aria-labelledby="accordion-details">
      <h2 id="accordion-details">AccordionDetails</h2>
      <p class="demo-hint">
        The native <code>{{ `<details>` }}</code> and
        <code>{{ `<summary>` }}</code> elements. Give several the same
        <code>name</code> to open only one at a time, and set
        <code>icon-pos="start"</code> to show the icon before the trigger text.
      </p>

      <Card>
        <AccordionDetails :open="isAccordionDetailsOpen" name="demo-panels">
          <template #trigger>Accordion with HTML</template>
          <template #content>
            <p>
              An accordion is a vertically stacked set of interactive headings
              that each contain a title, content snippet, or thumbnail
              representing a section of content. The headings function as
              controls that enable users to reveal or hide their associated
              sections of content. Accordions are commonly used to reduce the
              need to scroll when presenting multiple sections of content on a
              single page.
            </p>
          </template>
        </AccordionDetails>

        <AccordionDetails :open="isAccordionDetailsOpen" name="demo-panels">
          <template #trigger>Accordion with HTML</template>
          <template #content>
            <p>
              An accordion is a vertically stacked set of interactive headings
              that each contain a title, content snippet, or thumbnail
              representing a section of content. The headings function as
              controls that enable users to reveal or hide their associated
              sections of content. Accordions are commonly used to reduce the
              need to scroll when presenting multiple sections of content on a
              single page.
            </p>
          </template>
        </AccordionDetails>

        <AccordionDetails
          :open="isAccordionDetailsOpen"
          name="demo-panels"
          icon-pos="start"
        >
          <template #trigger>Accordion with HTML and the icon at the start</template>
          <template #content>
            <p>
              An accordion is a vertically stacked set of interactive headings
              that each contain a title, content snippet, or thumbnail
              representing a section of content. The headings function as
              controls that enable users to reveal or hide their associated
              sections of content. Accordions are commonly used to reduce the
              need to scroll when presenting multiple sections of content on a
              single page.
            </p>
          </template>
        </AccordionDetails>
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="accordion-accordion">
      <h2 id="accordion-accordion">Accordion</h2>
      <p class="demo-hint">
        Our own component, animated with CSS. Set <code>h-tag</code> to the
        heading level the trigger has in the page, so the trigger is a heading
        with a button in it, as the pattern asks. Set <code>open</code> to open
        it from outside.
      </p>

      <Card>
        <Accordion :open="isAccordionOpen" h-tag="h3">
          <template #trigger>Accordion with CSS</template>

          <template #content>
            <p>
              An accordion is a vertically stacked set of interactive headings
              that each contain a title, content snippet, or thumbnail
              representing a section of content. The headings function as
              controls that enable users to reveal or hide their associated
              sections of content. Accordions are commonly used to reduce the
              need to scroll when presenting multiple sections of content on a
              single page.
            </p>
          </template>
        </Accordion>

        <Accordion icon-pos="start" h-tag="h3">
          <template #trigger>Accordion with the icon at the start</template>

          <template #content>
            <p>
              Set <code>icon-pos="start"</code> to show the icon before the
              trigger text. The default is <code>end</code>.
            </p>
          </template>
        </Accordion>

        <Accordion icon-size="xl" h-tag="h3">
          <template #trigger>Accordion with a larger icon</template>

          <template #content>
            <p>
              Set <code>icon-size</code> to one of the font sizes to change the
              size of the icon. By default the icon follows the font size of
              the trigger.
            </p>
          </template>
        </Accordion>

        <Accordion h-tag="h3" region>
          <template #trigger>Accordion with a region</template>

          <template #content>
            <p>
              Set <code>region</code> to make the panel a region landmark
              named by its trigger, for a panel with headings or nested
              accordions of its own. Not for a page with many accordions,
              where the landmarks would pile up.
            </p>
          </template>
        </Accordion>
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="accordion-a11y">
      <h2 id="accordion-a11y">Accessibility requirements</h2>

      <Card>
        <ul class="a11y-list">
          <li>The accordion trigger is a <code>button</code> element.</li>
          <li>
            Each accordion header button is wrapped in a heading
            (<code>h-tag</code>), at the level the title has in the page.
          </li>
          <li>
            The trigger element has the <code>aria-expanded</code> attribute.
            The value should align with the open state of the Accordion Panel.
          </li>

          <li>
            The trigger element has the <code>aria-controls</code> attribute.
            The value should refer to the ID of the Accordion Panel element.
          </li>

          <li>
            A closed panel is <code>inert</code>: nothing in it can be focused
            or read, so focusable content needs no care of its own.
          </li>
          <li>
            The panel is a <code>region</code> landmark only with the
            <code>region</code> prop, as the pattern makes it optional and
            warns against a page full of them.
          </li>
        </ul>
      </Card>
    </section>
  </div>
</template>

<style>
.demo-page.details {
  .card {
    margin-block-end: 0;
  }

  .a11y-list {
    margin-block: 0;
  }

  .details-wrapper,
  .accordion-wrapper {
    margin-block-end: 1rem;

    &:last-child {
      margin-block-end: 0;
    }
  }

  .details-panel,
  .accordion-panel {
    p {
      margin-block-end: 0;
    }
  }
}
</style>
