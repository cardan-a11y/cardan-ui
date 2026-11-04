<script setup lang="ts">
useHead({ title: 'Changelog' });
</script>

<template>
  <div class="demo-page changelog-page">
    <h1>Changelog</h1>
    <p class="mbe-2">Release notes for new features and bug fixes.</p>

    <ChangelogEntry v="2.3.3" date="2026-11-04">
      <ul>
        <li>
          CardanLogo: a product lockup takes the room it gets in a flex row
          from the narrow width up at every screen width, no longer only from
          320px
        </li>
        <li>
          MobileMenu: the close button is md by default (was sm)
        </li>
        <li>
          Dialog: the new <code>--dialog-max-width</code> on a dialog's class
          sets its width (800px for one at the side by default; a centered one
          without it is as wide as its content)
        </li>
        <li>
          Dialog: the close button is ghost by default (was outline), and the
          buttons share the row at their own size (md, was lg)
        </li>
        <li>
          Dialog, MultiSelect, DatePicker and FileInput remove their event
          listeners when they unmount; a FileInput no longer keeps handling
          pastes after it is gone
        </li>
        <li>
          ThemeSwitch keeps its place on the server with an empty box of its
          size, so the header no longer moves when the switch appears
        </li>
        <li>
          Button no longer has <code>aria-live="polite"</code>, so a screen
          reader no longer announces a button whose text changes
        </li>
        <li>
          Button: no extra padding around its text, so a button with a label
          is a little narrower
        </li>
        <li>
          CopyButton announces "Copied" through a status message of its own,
          also when a project gives it its own label
        </li>
      </ul>
    </ChangelogEntry>

    <ChangelogEntry v="2.3.2" date="2026-11-03">
      <ul>
        <li>
          Nuxt 4.6.4, a security update, and the latest versions of the other
          dependencies except TypeScript
        </li>
        <li>
          The cardan Claude Code plugin: the release skill also opens the
          release pull request from <code>develop</code> into
          <code>main</code> in Cardan LMS and Cardan Auditor, the guidelines
          describe the branches and releases of each project, and the review
          hook lets a pull request from a pushed branch through without a new
          review
        </li>
      </ul>
    </ChangelogEntry>

    <ChangelogEntry v="2.3.1" date="2026-11-02">
      <ul>
        <li>
          MarkdownPreview renders a bare YouTube or Vimeo link in a paragraph of
          its own as a VideoPlayer, also without <code>trusted</code>; a link
          with its own text stays a link
        </li>
        <li>
          VideoPlayer shares its URL parsing with MarkdownPreview
          (<code>parseVideoUrl()</code>) and recognises YouTube shorts and live
          URLs
        </li>
      </ul>
    </ChangelogEntry>

    <ChangelogEntry v="2.3.0" date="2026-10-29">
      <ul>
        <li>
          MarkdownPreview is safe by default: raw HTML shows as text and
          <code>{…}</code> sets only <code>lang</code>, <code>dir</code> and
          <code>class</code>; the new <code>trusted</code> prop allows both, for
          text the team wrote
        </li>
        <li>
          MarkdownPreview: the new <code>inline</code> prop renders a title or
          label in a <code>&lt;span&gt;</code>, and the new
          <code>heading-offset</code> prop moves the text's headings down
        </li>
        <li>
          MarkdownPreview has no margin outside the text, and a colour swatch
          only takes a plain colour value
        </li>
        <li>
          MarkdownPreview: a wide table scrolls on its own in a region named
          "Table" (new <code>aria.table</code> string) that takes keyboard
          focus, and keeps its table semantics
        </li>
        <li>
          MultiSelect opens its dropdown upwards when the list doesn't fit below
          the field and there is more room above, and caps its height to the
          room on that side, so it stays reachable inside a popover; an
          <code>open-direction</code> passed by the parent still wins
        </li>
        <li>
          Accordion has <code>aria-expanded="false"</code> from the start;
          legends of CheckboxGroup and RadioGroup are semibold, with a little
          more room below them in CheckboxGroup
        </li>
        <li>
          CardanLogo follows the second round of the brand book: product lockups
          have a divider and the product name with a capital, in Body or white
          at 0.8 times the logo height, the logo is 20px high by default (was
          16px), a lockup takes the room it gets in a flex row, from 144px (new
          <code>narrow-width</code> prop) up to its height, so it fits in a
          320px app header, and the tile is the color symbol on a white tile
          (<code>variant="white"</code> for the purple tile)
        </li>
        <li>
          The favicon in <code>.playground/public</code> is the light round tile
          with the symbol at 72%
        </li>
        <li>
          The primary Button is white text on purple in dark mode too, with the
          <code>--color-accent</code>, <code>--color-on-accent</code> and
          <code>--color-accent-hover</code> tokens, which every project needs in
          its <code>main.css</code>; it replaces the <code>cta</code>
          Button, which is removed
        </li>
        <li>
          Cardan Auth UI: the buttons of the sign-in, password and MFA pages and
          of the logout dialog are lg, like the other Auth UI dialogs
        </li>
        <li>
          Cardan Auth UI: recovery codes are shown only when they are created,
          once in the setup and once after regenerating them; MfaSettings offers
          "Regenerate recovery codes" behind the password confirmation instead
          of showing the current codes, and the setup says the codes are shown
          this once
        </li>
        <li>
          Cardan Auth UI: "Disable MFA" in MfaSettings is a danger Button, and
          its description is at most 67ch wide (was 60ch)
        </li>
        <li>
          The md Button and the md Popover trigger have 16px text, and the md
          Button has 16px padding, as the brand book's button
        </li>
        <li>
          <code>--color-grey-graphic</code> is Body 60% in light mode too,
          instead of Always grey, and the template <code>main.css</code> no
          longer has <code>--cardan-always-grey</code>
        </li>
      </ul>
    </ChangelogEntry>

    <ChangelogEntry v="2.2.1" date="2026-10-27">
      <ul>
        <li>
          Make the Popover trigger text one step smaller, like the Button of the
          same size: <code>sm</code> for <code>md</code>, <code>md</code> for
          <code>lg</code> and <code>lg</code> for
          <code>xl</code>
        </li>
        <li>
          Remove the <code>--color-accent-hover</code> design token from the
          template <code>main.css</code>; no component uses it since 2.2
        </li>
      </ul>
    </ChangelogEntry>

    <ChangelogEntry v="2.2.0" date="2026-10-26">
      <ul>
        <li>
          Cardan Auth UI: the endpoints and the password policy are settings
          under <code>cardanAuth</code> in the app config, with the Cardan API's
          paths as defaults
        </li>
        <li>
          Cardan Auth UI: every password form has a reveal button (the new
          PasswordReveal component), the password requirements stay next to
          their field, and the reset page asks for the email address when the
          reset link has none
        </li>
        <li>
          Set the product name of CardanLogo in Hanken Grotesk, whatever font
          the project uses
        </li>
        <li>
          Feature: add <code>iconPos</code> prop to Accordion and
          AccordionDetails components, with the icon at the <code>end</code> by
          default
        </li>
        <li>
          AccordionDetails component shows the same chevron as Accordion instead
          of the native disclosure triangle, with
          <code>icon</code> and <code>arrow</code> props
        </li>
        <li>
          Feature: add <code>iconSize</code> prop to Accordion and
          AccordionDetails components
        </li>
        <li>
          Give each component its own font and icon size variables, such as
          <code>--button-font-size</code> and <code>--button-icon-size</code>,
          instead of the shared <code>--font-size</code> and
          <code>--icon-size</code>, so a Button inside a Callout, Tabs or
          Tooltip no longer takes over their sizes
        </li>
        <li>
          Fill the primary and CTA Button, the primary Popover trigger and the
          selected DatePicker date and MultiSelect group label with
          <code>--color-accent-text</code> and <code>--color-white</code> text;
          the primary and CTA Button hover to
          <code>--color-accent-text-hover</code>
        </li>
        <li>
          Show the checked LanguageSelect option with a
          <code>--color-accent-bg</code> background,
          <code>--color-accent-text</code> text and a
          <code>--color-accent-graphic</code> border
        </li>
        <li>
          Remove the <code>--color-on-accent</code> design token, use
          <code>--color-white</code> instead
        </li>
        <li>
          Use <code>--color-accent-graphic</code> for borders, focus lines and
          indicators and <code>--color-accent-text</code> for accent text:
          components no longer use <code>--color-accent</code> or
          <code>--color-accent-hover</code>
        </li>
        <li>
          Feature: add <code>outline-red</code> variant to Button component; the
          <code>danger</code> variant shows a red border on hover
        </li>
        <li>
          Make Popover component <code>md</code> by default, with 40px
          <code>md</code> and 44px <code>lg</code> triggers like Button and no
          default maximum width; the ghost trigger hovers to
          <code>--color-ghost-hover-bg</code> like the ghost Button
        </li>
        <li>
          Make MenuList buttons <code>md</code> by default instead of
          <code>lg</code>, and give popovers in an inline MenuList square top
          corners
        </li>
        <li>
          Make Search component <code>md</code> by default and the Dialog close
          button <code>md</code>
        </li>
        <li>
          MultiSelect component: borders use
          <code>--color-grey-graphic</code>, the highlighted option uses
          <code>--color-accent-bg</code> with <code>--color-accent-text</code>,
          and a highlighted selected option is red
        </li>
        <li>
          Use larger text in Avatar and UserMenu components, semibold Avatar
          initials and 14px labels in Switch component
        </li>
        <li>Use <code>--color-bg</code> as background of the flat grey Chip</li>
        <li>Fix: align the items of an inline MenuList vertically</li>
      </ul>
    </ChangelogEntry>

    <ChangelogEntry v="2.1.0" date="2026-10-16">
      <ul>
        <li>
          Cardan Auth UI: add the login, forgot password, reset password,
          sign-in challenge and MFA setup pages in the AuthPage frame, with
          PasswordUpdateForm, MfaSettings, LogoutDialog and the MFA setup
          reminder
        </li>
        <li>
          Cardan Auth UI: buttons use the <code>black</code> and
          <code>ghost</code> variants; remove the <code>submit</code> slot of
          LoginForm and the <code>actions</code> slot of MfaSetup
        </li>
        <li>
          Cardan Auth UI: add a <code>card</code> prop to MfaChallenge, and only
          follow a <code>?redirect=</code> to a path within the app
        </li>
        <li>
          Cardan Auth UI: the password forms call the Cardan API's
          <code>/api/v1</code> paths and read the password policy themselves, so
          <code>passwordPolicyEndpoint</code> is gone; AuthError reads JSON:API
          errors and marks them with the API's <code>Content-Language</code>
        </li>
        <li>
          Remove the <code>--auth-*</code> design tokens: Cardan Auth UI uses
          the font size scale and <code>--color-grey-light</code> directly
        </li>
        <li>
          Add the <code>--color-ghost-hover-bg</code> token for the hover
          background of the ghost Button; grey surfaces set it to
          <code>--color-bg</code>, as the grey Callout does
        </li>
        <li>
          Fix: Input without <code>v-model</code> no longer loses its value when
          one of its props changes
        </li>
        <li>
          Use the <code>--color-&lt;color&gt;-text</code> tokens for text on
          tinted surfaces in Chip, Callout and Select, and remove the
          <code>--color-&lt;color&gt;-on-bg</code> design tokens
        </li>
        <li>
          Remove the <code>--color-on-secondary</code> design token: the
          secondary Button uses <code>--color-text</code>
        </li>
        <li>
          New font size scale from <code>xxs</code> (10px) to
          <code>xxxxl</code> (64px): <code>lg</code> is 18px, the 11px and 40px
          sizes and the <code>xxxs</code> and <code>xxxxxl</code> names are
          removed
        </li>
        <li>
          Use the 12px <code>xs</code> size for the small text in form fields,
          chips, small buttons and popovers that used the 11px size
        </li>
        <li>
          Feature: add RequiredChip component, used by all form components and
          now also shown in the legend of a required RadioGroup
        </li>
        <li>
          Rename the <code>black</code> variant of Button component to
          <code>3d</code>
        </li>
        <li>
          Feature: add a basic <code>black</code> variant to Button component,
          without shadow and with the default radius
        </li>
        <li>
          Feature: add <code>solid</code> variant to Chip component, using the
          <code>--color-&lt;color&gt;-text</code> tokens as background
        </li>
        <li>Feature: add <code>textTransform</code> prop to Chip component</li>
        <li>
          Remove the <code>capitalize</code> prop of Chip component, use
          <code>textTransform="capitalize"</code> instead
        </li>
        <li>
          Make <code>solid</code> the default variant of Callout component and
          rename the <code>default</code> variant to <code>outline</code>
        </li>
        <li>
          Add the <code>--color-accent-text-hover</code> design token for the
          hover text of the <code>sidebar</code> Button variant
        </li>
        <li>
          Remove the <code>--shadow-*</code> design tokens and the
          <code>shadow</code> prop of Card component
        </li>
        <li>
          The offset shadow of the <code>3d</code> Button variant is set in
          Button and no longer uses <code>--shadow-offset</code>
        </li>
        <li>Use 14px text in Callout component by default</li>
        <li>
          Set <code>--line-height-heading</code> to 1.25 in the
          <code>main.css</code> template
        </li>
        <li>
          Show the current page in the <code>sidebar</code> Button variant with
          the accent color and an underline, and give its icon the text color
        </li>
        <li>
          Use bold group labels and the <code>--color-accent-text</code> hover
          color in MenuList component
        </li>
      </ul>
    </ChangelogEntry>

    <ChangelogEntry v="2.0.0" date="2026-10-13">
      <p>
        Projects need to add new design tokens, see <code>MIGRATION.md</code> in
        the repository.
      </p>
      <ul>
        <li>Rename the library to Cardan UI (<code>@cardan/ui</code>)</li>
        <li>
          Add the Cardan brand identity to the <code>main.css</code> template:
          colors for light and dark mode, Hanken Grotesk, type scale and motion
        </li>
        <li>
          Feature: add CardanLogo component with full, symbol and tile forms and
          sub-brand lockups
        </li>
        <li>Feature: add <code>solid</code> variant to Callout component</li>
        <li>
          Add design tokens for button colors, text on tinted surfaces and
          tracks
        </li>
        <li>Load fonts with <code>@nuxt/fonts</code> in the layer</li>
        <li>
          Improve contrast of placeholders, MultiSelect options and tags,
          RangeInput labels and DatePicker in dark mode
        </li>
        <li>Announce disabled link buttons to assistive technology</li>
        <li>Replace the bouncing Toast animation with slide and fade</li>
        <li>Fix the transition of the Tabs component</li>
      </ul>
    </ChangelogEntry>
  </div>
</template>

<style>
.changelog-page {
  ul {
    > li {
      margin-block-end: 0.125rem;

      &::marker {
        color: var(--color-accent-graphic);
      }
    }

    ul {
      font-size: var(--font-size-sm);
      margin-block-end: 0.25rem;
    }
  }
}
</style>
