<script setup lang="ts">
useHead({ title: 'Non modal dialog pattern' });

const popoverActions = [
  {
    id: 'edit',
    label: $t('general.edit'),
    icon: 'material-symbols:edit-outline-rounded',
    // disabled: true,
    tooltip: 'Tooltip content to explain why the option is disabled.',
  },
  {
    id: 'duplicate',
    label: $t('general.duplicate'),
    icon: 'material-symbols:content-copy-outline-rounded',
    divider: true,
    // disabled: true,
    tooltip: 'Tooltip content to explain why the option is disabled.',
  },
  {
    id: 'delete',
    label: $t('general.delete'),
    icon: 'material-symbols:delete-outline-rounded',
  },
];
</script>

<template>
  <div class="demo-page">
    <h1>Non modal dialog pattern</h1>

    <p class="fs-md">
      A common pattern on the web is to show content on top of other content,
      drawing the user's attention to specific important information or actions
      that need to be taken. This pattern can technically be described as a
      non-modal dialog or popover. Cardan UI uses the
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
      />
      for the Tooltip and Popover components.
    </p>

    <h2 class="mbs-2">Tooltip vs. Toggletip</h2>

    <p class="fs-md">
      A Tooltip is a popup that displays information related to an element when
      the element receives keyboard focus or the mouse hovers over it. Cardan UI
      uses
      <Button
        to="https://inclusive-components.design/tooltips-toggletips"
        label="Toggletips with live regions"
        target="_blank"
        variant="link"
      />
      instead. Toggletips are revealed by click rather than by hover and focus.
      This pattern is more consistent across touch, mouse and keyboard controls.
    </p>

    <p class="c-grey-text mbe-2 fs-sm">
      Note: the
      <Button
        label="Tooltip design pattern"
        to="https://www.w3.org/WAI/ARIA/apg/patterns/tooltip"
        target="_blank"
        variant="link"
      />
      is work in progress; it does not yet have task force consensus.
    </p>

    <div class="demo-page-cols">
      <Card>
        <div class="text-content">
          <h2>Tooltip</h2>

          <p>
            Cardan UI offers a <code>{{ `<Tooltip />`}}</code> component for
            toggletips with static content.
          </p>
        </div>

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

        <div class="text-content">
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

      <Card>
        <div class="text-content">
          <h2>Popover</h2>
          <p class="c-grey-text">
            Cardan UI offers a <code>{{ `<Popover />` }}</code> component for
            interactive toggletips that can contain links or buttons.
          </p>
        </div>

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
              <p style="padding: 1rem 1.5rem">
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
        </div>

        <div class="text-content">
          <h3>Accessibility requirements</h3>

          <p>
            The Popover component is an interative toggletip <em>without</em> a
            live region. When the hidden menu appears, focus will be moved to
            the first menu item.
          </p>

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

      <div style="min-height: 500px" />
    </div>
  </div>
</template>

<style>
.demo-page-cols {
  .flex-wrapper {
    gap: 1.5rem;
    margin-block-end: 1.5rem;
  }

  .card {
    display: grid;
    gap: 1rem;
  }
}
</style>
