<script setup lang="ts">
useHead({ title: 'Non modal dialog pattern' });

const popoverActions = [
  {
    id: 'edit',
    label: $t('general.edit'),
    icon: 'material-symbols:edit-outline-rounded',
    tooltip: 'Tooltip content that explains the option.',
  },
  {
    id: 'duplicate',
    label: $t('general.duplicate'),
    icon: 'material-symbols:content-copy-outline-rounded',
    divider: true,
    tooltip: 'Tooltip content that explains the option.',
  },
  {
    id: 'delete',
    label: $t('general.delete'),
    icon: 'material-symbols:delete-outline-rounded',
  },
];

const filterFrom = ref();

const rules = [
  {
    title: 'Tooltip: text only',
    text: 'A toggletip with static text: a button shows it in a live region, and focus stays on the button.',
  },
  {
    title: 'Popover: links or buttons',
    text: 'A disclosure, not a menu: a list of links or buttons. Focus moves to its first item when it opens.',
  },
  {
    title: 'A click, not a hover',
    text: 'Both open on a click or a key press, never on hover or focus alone: the same for touch, mouse and keyboard.',
  },
  {
    title: 'Escape closes',
    text: 'Escape closes either one. A Popover gives focus back to its trigger.',
  },
];
</script>

<template>
  <div class="demo-page tooltip-page">
    <p class="demo-eyebrow">Actions</p>
    <h1>Non modal dialog pattern</h1>
    <p class="demo-lead">
      Tooltip and Popover show content on top of the page, which stays in reach.
      Both use the
      <Button
        to="https://developer.mozilla.org/en-US/docs/Web/API/Popover_API"
        label="Popover API"
        variant="link"
        target="_blank"
      />
      and
      <Button
        to="https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Anchor_positioning"
        label="CSS anchor positioning"
        variant="link"
        target="_blank"
      />.
    </p>

    <ul role="list" class="demo-grid">
      <li v-for="rule in rules" :key="rule.title" class="demo-tile">
        <strong>{{ rule.title }}</strong>
        <span>{{ rule.text }}</span>
      </li>
    </ul>

    <section class="demo-section" aria-labelledby="tooltip-toggletip">
      <h2 id="tooltip-toggletip">Tooltip vs. Toggletip</h2>
      <p class="demo-hint">
        A tooltip shows when its element gets keyboard focus or the mouse hovers
        over it. Cardan UI uses
        <Button
          to="https://inclusive-components.design/tooltips-toggletips"
          label="Toggletips with live regions"
          target="_blank"
          variant="link"
        />
        instead, which open on a click. The APG
        <Button
          label="Tooltip design pattern"
          to="https://www.w3.org/WAI/ARIA/apg/patterns/tooltip"
          target="_blank"
          variant="link"
        />
        is work in progress, without task force consensus.
      </p>
    </section>

    <section class="demo-section" aria-labelledby="tooltip-tooltip">
      <h2 id="tooltip-tooltip">Tooltip</h2>
      <p class="demo-hint">
        <code>{{ `<Tooltip />` }}</code> is a toggletip with static content.
        <code>placement</code> sets its side, and
        <code>:hide-label="false"</code> shows the label next to the icon.
      </p>

      <Card>
        <div class="flex-wrapper">
          <Tooltip label="Live regions" :max-width="480" icon-size="xxl">
            Live regions are used to present changes in web content that occur
            after a web page has loaded.
          </Tooltip>

          <Tooltip label="Live regions" placement="right" :hide-label="false">
            Live regions are used to present changes in web content that occur
            after a web page has loaded. Typical uses include presenting news
            feeds, feedback and error messages, or live chat output to screen
            readers, which would otherwise not know about this content changing
            or being added to a web page already rendered.
          </Tooltip>
        </div>

        <div>
          <h3>Accessibility requirements</h3>
          <ul class="a11y-list">
            <li>Use a <code>button</code> element to trigger the toggletip.</li>

            <li>
              The trigger element has a clickable target area of at least 24px x
              24px.
            </li>

            <li>
              <s>
                The trigger element has the
                <code>aria-expanded</code> attribute. The value should align
                with the open state of the toggletip.
              </s>

              <ul>
                <li>
                  When a popover is associated with a button with the
                  <code>popovertarget</code> attribute, the browser
                  automatically conveys and updates the expanded/collapsed
                  state.
                </li>
              </ul>
            </li>

            <li>
              <s>
                The trigger element has the
                <code>aria-controls</code> attribute. The value should refer to
                the ID of the toggletip.
              </s>

              <ul>
                <li>
                  The <code>popovertarget</code> attribute establishes the
                  relationship (an implicit <code>aria-details</code>) between
                  the trigger and the toggletip.
                </li>
              </ul>
            </li>

            <li>
              Focus stays on the triggering element while the toggletip is
              displayed.
            </li>

            <li>The toggletip can be hidden with the <kbd>Escape</kbd> key.</li>

            <li>
              <s>
                The element that triggers the toggletip references the toggletip
                element with aria-describedby.
              </s>
              <ul>
                <li>
                  Don't describe toggletips with aria-describedby. It makes the
                  trigger button non-functional to screen reader users.
                </li>
              </ul>
            </li>

            <li>
              <s>
                The element that serves as the toggletip container has
                <code>role="tooltip"</code>.
              </s>
              <ul>
                <li>
                  The <code>role="tooltip"</code> attribute is not applicable
                  since we are using <code>role="status"</code> for the live
                  region.
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </Card>
    </section>

    <section class="demo-section" aria-labelledby="tooltip-popover">
      <h2 id="tooltip-popover">Popover</h2>
      <p class="demo-hint">
        <code>{{ `<Popover />` }}</code> is for content to act on: a
        <code>list</code> of links or buttons, or your own in its slot. It has
        no live region: focus moves to its first item when it opens.
      </p>

      <Card>
        <div class="flex-wrapper">
          <Popover
            hide-label
            placement="bottom"
            span="right"
            button-variant="secondary"
            :max-width="480"
            :list="popoverActions"
          >
            <template #menu-list-item="{ item }">
              <MenuListTooltip :item="item">
                {{ item.tooltip }}
              </MenuListTooltip>
            </template>
          </Popover>

          <Popover
            label="Popover label"
            icon="material-symbols:keyboard-double-arrow-down-rounded"
            placement="top"
            span="right"
            button-variant="secondary"
            :hide-label="false"
          >
            <template #content>
              <p class="tooltip-popover-content">
                An interesting article about
                <Button
                  label="accessibility of the popover attribute"
                  to="https://hidde.blog/popover-accessibility/"
                  variant="link"
                  target="_blank"
                />.
              </p>
            </template>
          </Popover>

          <Popover
            label="Filters"
            icon="material-symbols:filter-list-rounded"
            span="right"
            button-variant="secondary"
            :hide-label="false"
          >
            <template #content>
              <div class="tooltip-popover-content">
                <DatePicker v-model="filterFrom" label="From" />
              </div>
            </template>
          </Popover>
        </div>

        <p>
          A Popover can hold a form field with a popup of its own, such as the
          calendar of a DatePicker in a filter. The open Popover sets no
          <code>translate</code>, so the calendar, placed with
          <code>position: fixed</code>, is not cut off by its edge.
        </p>

        <div>
          <h3>Accessibility requirements</h3>

          <ul class="a11y-list">
            <li>
              Use a <code>button</code> element to open or close the menu.
            </li>

            <li>
              <s>
                The trigger element has an <code>aria-controls</code> attribute.
                The value should refer to the ID of the menu.
              </s>
            </li>

            <li>
              <s>
                The trigger element has <code>aria-expanded</code> attribute.
                The value should align with the open state of the toggletip.
              </s>

              <ul>
                <li>
                  When a popover is associated with a button with the
                  <code>popovertarget</code> attribute, the browser will
                  automatically convey whether the popover is expanded or
                  collapsed.
                </li>
              </ul>
            </li>

            <li>
              Keyboard focus is not trapped: <kbd>Tab</kbd> past the last item
              leaves and closes the menu, and <kbd>Shift</kbd> + <kbd>Tab</kbd>
              before the first item returns focus to the trigger, and leaving
              the trigger for the page closes the menu. The content is a list of
              links or buttons, a
              <Button
                label="disclosure"
                to="https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/"
                variant="link"
                target="_blank"
              />, not a menu with its roles and arrow keys.
            </li>

            <li>
              The menu can be closed with the <kbd>Escape</kbd> key, which
              returns focus to the trigger.
            </li>
          </ul>
        </div>
      </Card>
    </section>

    <div class="tooltip-spacer" />
  </div>
</template>

<style>
.demo-page.tooltip-page {
  .card {
    display: grid;
    gap: 1rem;
    margin-block-end: 0;

    h3 {
      margin-block: 1rem 0.75rem;
      font-size: var(--font-size-md);
    }
  }

  .flex-wrapper {
    gap: 1.5rem;
  }

  .a11y-list {
    margin-block: 0;
  }

  .tooltip-popover-content {
    padding: 1rem 1.5rem;
  }

  .tooltip-spacer {
    min-block-size: 500px;
  }
}
</style>
