# Upgrading Cardan UI

This guide is for developers of projects that extend the layer. Each section says what a project must do or check for a release: new tokens for its `main.css`, renamed props or classes, modules or CSP hosts. The components read their design tokens from the project's own `main.css`, a copy of the template in [`app/assets/main.css`](app/assets/main.css), so a token a release adds has to be pasted there.

A release that needs nothing from projects has a one-line section that says so; what it changed is in the playground's changelog ([`.playground/pages/changelog.vue`](.playground/pages/changelog.vue)). The newest minor is at the top. Within a minor, its own notes come first, by topic, and its patch releases follow, newest first. The projects are kept up to date, so the file only holds the five most recent releases that ask something of them, with the one-line sections in between: each release that asks something removes the notes older than that. Older notes are in the history of this file (`git log -p MIGRATION.md`).

## Upgrading to 2.4

2.4.0 is the accessibility release after the audit of November 2026: 98 findings in the form fields, the overlays, the display components and the auth layer. Most of it keeps working in a project that does nothing; the topics below rename or remove something. The patch releases follow them, newest first: 2.4.1.

### Form fields

- **A field is described by its error only while the error shows**: after a failed submit of its Form, or with `show-invalid`. Until now every Input, Textarea, Select, MultiSelect and DatePicker pointed `aria-describedby` at its hidden error text, so a screen reader read "Value invalid" on a valid field. The control also gets `aria-invalid="true"` while the error shows. A test that read the error through `aria-describedby` before a submit sets `show-invalid` first.
- **An error from the server goes in `custom-error`**, not in `error-message`. `error-message` is the text for a constraint the browser checks (`required`, `type`, `pattern`); it was never shown for a message the browser had no reason to show, such as a 422 after a submit. `custom-error` shows that text under the field, marks the field `aria-invalid` and describes it by the text until the user changes the value; it does not hold the form back, the server judges the next submit, so the parent moves focus to the field itself (`focusElement()`). Give it the message, or `undefined` for none; set it to `undefined` before a new request, since the same text again would not show after the user has typed. cardan-academy-nuxt passed the server's errors as `error-message` in its request form and checkout, where they never showed; both list them in the alert above the button now, as the auth forms do.
- **An attribute on Input, Textarea or Select goes to the control**, not to the wrapper: `inputmode`, `data-*`, `aria-*` and every other attribute land on the `<input>`, `<textarea>` or `<select>`, and `class` and `style` stay on the wrapper. CSS that matched an attribute on `.form-field-wrapper` selects the control instead. Input also has an `inputmode` prop, for the virtual keyboard; the auth layer's code fields use it.
- **Removed props**: `multiple` on Select (it could not work; use MultiSelect) and `pattern` on Textarea (a textarea has no pattern). The default `pattern` of an Input with `type="tel"` is gone: it rejected every real phone number. A project that needs a format passes its own `pattern`; the field's error text is "Phone number is invalid".
- **RangeInput's custom properties are its own**: `--range-input-thumb-color`, `--range-input-thumb-width`, `--range-input-thumb-height`, `--range-input-thumb-border-size`, `--range-input-thumb-border-color`, `--range-input-thumb-radius`, `--range-input-track-bg-color`, `--range-input-track-progress-color`, `--range-input-track-radius`, `--range-input-track-height`, `--range-input-track-width` and `--range-input-output-bg-color` (were `--thumb-*`, `--track-*` and `--output-bg-color`). The styles are scoped to the component and no longer reach another `input[type="range"]`. cardan-auditor-nuxt's review form overrides four of them and is updated.
- **MultiSelect names its combobox by the field label and the selection** ("Cheese, Ham Toppings" once something is selected, as @vueform/multiselect puts the selection first): the label was out of the name as soon as something was selected (Cardan Auditor findings CAN-11.F8 and F9). The error text and instruction now reach the combobox through the library's `aria` prop. `items-selected-label` is the text after the count. A `required` MultiSelect passes the focus a Form gives its hidden input on to the combobox.
- **FileInput takes a paste from anywhere on the page, except from a text field, an editor or another FileInput**, and with several FileInputs on a page the one with focus takes it, or the first one. A file it rejects (too big, wrong type) is no longer the value: the field keeps what it had, in the native input too, so a form that posts the input sends the file the field shows; it shows the error at once (no `show-invalid` needed) and the same file can be chosen again. `show-invalid`, or a failed submit of the Form, shows "<label> is missing" for a required image field without a file. A parent that read `validity` after a rejected file to show its own error can keep doing so; `update:modelValue` is not emitted for a rejected file.
- **DatePicker has `show-invalid`**, like the other fields, and no longer wraps its calendar in a live region. Each day of its calendar is named with its weekday ("Monday 9 November 2026") and the header's abbreviations carry the full weekday names (Cardan Auditor finding CAN-11.F48). The keyboard access of the calendar (CAN-11.F47: focus stays in the input when the menu opens, so Tab closes it) is the library's to fix, Vuepic/vue-datepicker#1283, still open; nothing in its props, events or slots changes it.
- **The radios of a RadioGroup share a `name`** (the group's id by default), so the arrow keys move between them also without a `name` prop.

### Overlays and navigation

- **Popover is an APG disclosure, with the focus handling of a menu button**: its content is a list of links or buttons without menu roles; when it opens, focus moves to its first item; Tab past the last item leaves and closes it; Shift+Tab before the first returns focus to the trigger, and leaving the trigger for the page closes it; Escape and a choice close it and give focus back to the trigger (which fell to the page until now). Keyboard focus is no longer trapped in it, and its content is no longer in a `.vue-focus-loop` element: CSS that selected it inside `.popover-content` selects `.popover-content` itself. Its custom properties are `--popover-radius` and `--popover-max-width` (were `--radius` and `--max-width`), and the trigger's radius no longer needs `!important`.
- **Tooltip**: the `title` prop is removed (a native title bubble cannot be dismissed or hovered, WCAG 1.4.13; no project passed it). Its custom properties are `--tooltip-gap`, `--tooltip-max-width` and `--tooltip-icon-color` (were `--gap`, `--max-width` and `--icon-color`).
- **Dialog**: the `modal` prop is removed; it did nothing (the native dialog is modal). `disable-escape` is best effort: a browser lets a second Escape without a click or keypress in between close the dialog anyway, so a step that must be completed also handles `close`.
- **MobileMenu** puts an attribute on its dialog only, no longer on its wrapper too; its navigation label is an `h2` that renders only with `nav-label` (was an empty `h1` without it); its width is `--mobile-menu-width` (was `--width`). Focus returns to a trigger in the `trigger` slot when the menu closes.
- **A tab icon is an icon name**: a `TabOption.icon` that started with `<svg` was injected as HTML, an XSS surface for an icon from an API; that branch is removed (no project used it) and `icon` is a Material Symbols name as everywhere else.
- **Tabs ids are per instance**: `<id>-tab-<value>` and `<id>-tabpanel-<value>` (were `tab-<value>` and `tabpanel-<value>`), so two Tabs on a page with the same values no longer share ids. CSS or a test that selected `#tab-<value>` selects `[id$="-tab-<value>"]` or the role instead. The tab list is reachable while nothing is selected (the first tab is in the tab order), and the open panel is in the tab order itself, as in the APG example.
- **A MenuList inside a MenuList is a plain `div`**, not a `nav` landmark of its own; the menu has one. CSS that selected the nested `nav.menu-list-nav` selects `.menu-list-nav`. A nested list emits the sub-item that was clicked (it emitted its parent item).
- **Accordion emits `update:open`** when the user opens or closes it, so `v-model:open` keeps the parent's state in step; a one-way `:open` keeps working. Its custom properties are `--accordion-overflow` and `--accordion-min-height` (were `--overflow` and `--min-height`).
- **Toast has no `role` prop**; a toast is announced by the one polite live region of ToastManager, which is teleported to `#teleports` (was `body`), so it also renders on the server. A project that wrapped `<ToastManager>` in `<ClientOnly>` can drop the wrapper. The timer's custom properties are `--toast-animation-duration` and `--toast-animation-play-state`.
- **UserMenu closes its menu before it opens the sign-out dialog**, and its `aria-expanded` is `false` from the start.
- **FocusLoop** keeps the page it made inert in step with its own state: a loop that closes in the same tick it opened, or unmounts while open, releases the page; what another loop made inert stays inert. Tab and Shift+Tab at its edges go by where focus came from, so the loop wraps the same way every time it opens. The playground's popover page and README's new "Browser support" section say what Tooltip and Popover need from a browser.

### Display components and utilities

- **ErrorMessage, `useErrorMessage()` and `extractApiError()` are in the layer**: the error box of a form or a page, for both API shapes (Laravel's `{ message, errors: { field: [...] } }` and the JSON:API envelope of `/api/v1`), with the API's `Content-Language` (English without one) and, when the request got no usable answer, a message in the page's language that tells an offline browser (`error.offline`) from a server error such as an HTML error page (`error.general`). Both keys are in the layer: drop your own `error.general` where it says the same. The `text` prop holds the page's own text, before the API's messages (it has no slot). Delete your own `app/components/ErrorMessage.vue` and `app/composables/useErrorMessage.ts`: the layer's take the same `:data="errorData"` and `handleError(error)`. `errorData` is in Laravel's shape now, also from a JSON:API answer: read a message for a toast with `apiErrorMessages(errorData.value)[0]`, not `errors[0].detail`. The box takes no outer margin; give it one in your `main.css` where your layout needs it. cardan-academy-nuxt and cardan-auditor-nuxt are updated on their branches, which can only merge after this release is on `main`.
- **Breadcrumbs is in the layer**: `<Breadcrumbs :items="[{ label: 'Home', to: '/' }, { label: 'Webinars' }]" />` renders the trail to the current page, in the look of Cardan Academy's catalog trail. The project decides what the trail is, a home link included; the last item is the current page and renders as text with `aria-current="page"`, an item without `to` as text, and `lang` marks a label in another language. The landmark is named by the new key `aria.breadcrumb` ("Breadcrumb" / "Kruimelpad"), or by the `label` prop where a page has two trails. The slash between the items is not read by a screen reader. It needs no new token. Nothing breaks for a project that keeps its own trail. cardan-academy-nuxt and cardan-support-nuxt render it through the layer, each as a thin wrapper that only builds the items: the Academy's CatalogBreadcrumbs (its `catalog.breadcrumb` key is gone) and the support site's BreadCrumbs (which now shows the category's and the article's own titles). cardan-cms-nuxt keeps its own trail on `main`; its TheBreadcrumbs (the trail comes from Statamic) renders the layer's only on the unmerged branch `chore/prepare-cardan-ui-2.4`.
- **A Button that opens a new window says so in its name**: hidden "(open in new window)" text after the label, also in an `aria-label`, as a link in a markdown text has since 2.3.7; the `title` that said the same is gone, since a title is read once more as the description. A test that matched the link's name exactly includes it.
- **A loading Button is not `disabled`**: it keeps focus, with `aria-disabled="true"`, `aria-busy="true"` and the `disabled` look, and swallows its clicks itself (no `click`, no navigation, no submit) until it is done; until now the `disabled` attribute dropped focus to the page the moment a submit started. Code that checked `:disabled` while loading looks at `aria-busy`. Its radius custom property is `--button-radius` (was `--radius`; MenuList is updated, no project set it), and `.button-variant--link` no longer needs `!important`. The `topbar` variant shows its current page and hover underline also with reduced motion.
- **A link in a markdown text opens in a new window only when it goes to another origin**; a route, an anchor, a `mailto:` and a same-origin link stay in the tab. On the server every absolute link counts as external. MarkdownPreview's `ellipsis-lines` prop is removed: a clamped markdown text keeps its links in the tab order. A text that must be clamped goes in `<Ellipsis is="div" :lines>` (cardan-auditor-nuxt's project and default-finding tables, for the user's number of lines, are updated), whose doc says that interactive content belongs outside a clamped text.
- **VideoPlayer** refetches when its `url` changes, falls back from `hq720.webp` to the oEmbed thumbnail and then to `hqdefault.jpg` when YouTube has no large thumbnail, and titles its frame "Video" when the metadata fails. The project's `@nuxt/image` config needs `image: { domains: ['i.ytimg.com', 'i.vimeocdn.com'] }` (CLAUDE.md says so now): cardan-cms-nuxt has only `i.ytimg.com`, cardan-academy-nuxt neither, so their thumbnails fall through to the error path.
- **PricingCard** formats the price in the app's locale as a currency ("€ 76" in Dutch, "€76" in English, thousands per locale), so the server and the browser agree. The "(Recommended)" `aria-label` on its chip is gone (prohibited on a `span`; the text is in the heading).
- **AvatarButton** has a name without `aria-label`: the initials, or "Profile picture" (`general.avatar`). **CopyButton** says "Copied" or "Copy failed" (new key `general.copy-failed`) and goes back to "Copy" after two seconds, announced each time.
- **LanguageSwitcher** marks the active language with `aria-current`; it still links to the home page of each language. **ThemeSelect, ThemeSwitch and ThemeToggle** generate their ids and radio name: `#theme-switch` and `#theme-toggle` no longer exist (nothing used them), and ThemeSelect's label rules are scoped to it.
- **MarkdownEditor** applies the same `{…}` attribute allowlist as MarkdownPreview, configures md-editor-v3 once per app, trims its value on blur instead of on every keystroke, and keeps its hidden required textarea out of the tab order. Its label is still not associated with the editor's textbox: md-editor-v3 has no way in, and the editor is to be replaced.
- **`d()` is `formatDateTime(date, format, locale)`**, with the locale required (the one-letter global collided with vue-i18n's `d`, and defaulted to Dutch). cardan-auditor-nuxt's 22 call sites and cardan-support-nuxt's ReleaseDate are renamed on their branches; `useDate().formatDate` keeps its name and now also reads a future date ("in 5 minutes"), with two new keys, `date.in-minutes` and `date.in-hours`, that an app overriding `date.*` copies.
- **`xsTransition`…`xxlTransition` are `transitionDuration('xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl')`**, which reads the `--duration-*` token from the page, so a timer follows the tokens and is 0 with reduced motion (a timeout that must still run should not treat 0 as "never"); on the server it is 0. cardan-auditor-nuxt's six timers are updated on its branch.
- **ProgressCircle has a `label` prop** for its accessible name ("Progress" / "Voortgang" by default, visually hidden); its name was its own value. Pass `label` where "Progress" is not the meaning: cardan-support-nuxt's HealthStatusCards (disk space), cardan-academy-nuxt's QuizScoreBadge (score; it also passes a `display-percentage` prop that does not exist, `show-value` is the one). `aria-valuetext` says what the ring shows ("42%", "7 of 10"); the value's class is `.progress-circle-value` (was `.progress-circle-label`). ProgressMeter has the same `aria-valuetext`. Both count from `min`: a meter from 50 to 100 at 75 is half, not 150%.
- **Skeleton is decorative** (`aria-hidden`): the element it stands in for carries `aria-busy="true"` while it loads, as Table does.
- **Custom properties set from props are the component's own**: `--progress-circle-size`, `--progress-circle-radius`, `--progress-meter-width`, `--skeleton-size`, `--skeleton-width`, `--skeleton-radius`, `--spacer-size` (were `--size`, `--radius`, `--width`). No project overrode the old names.
- **`sort()`** takes `T[] | undefined` and no longer throws on a missing nested key. **`formatFileSize()`** falls back to Dutch outside a Nuxt context instead of throwing.
- **ESLint**: `@typescript-eslint/no-explicit-any` is an error and `vue/no-v-html` a warning in the layer again.

### Cardan Auth UI

- **AuthError is gone**: the forms show their errors in the base layer's ErrorMessage. `extractAuthError()` is `extractApiError()`, the `AuthErrorData` type is `ApiErrorData`, the class `.auth-error` is `.error-message` and the message key `auth.error-generic` is `error.general`, or `error.offline` when the browser was offline. No project used them.
- **The code fields** have `inputmode="numeric"` and the TOTP code `autocomplete="one-time-code"` (iOS and Android fill a code from SMS or mail, and a password manager that holds the TOTP secret fills that), without `data-1p-ignore`.
- **`requestPasswordConfirmation()` rejects when no PasswordConfirmationDialog is mounted** (it hung forever), and resolves only once the dialog has closed, so focus moves can follow it. MfaSettings and MfaSetup mount the dialog themselves; a layout-level mount keeps working next to it (the last one mounted answers). An app that mounts MfaDialog on its own mounts PasswordConfirmationDialog next to it. `cancelPasswordConfirmation` is gone.
- **`useMfa()`**: `resetMfa()` clears everything, recovery codes and credentials included, and runs on every exit; `getRecoveryCodes()` returns `string[] | null`; `enterCode()` stops on the code step when the codes could not be fetched (`mfa.recovery-codes-unavailable`), instead of enabling MFA with codes nobody saw; a 401 on the challenge resets, shows a toast (`mfa.session-expired`, so ToastManager must be mounted) and sends the user to /login with the original `redirect`. MfaDialog focuses the step on every step change (`useMfaStepFocus()`), as MfaSetup did. The API's QR SVG is reduced to `svg`, `rect`, `g` and `path` before it is inlined.
- **`useMfaSetupReminder()`** no longer requires setup from an account with `mfa_exempt` (the global middleware looped between every page and /mfa-setup), and reads its sessionStorage flag on the client after hydration.
- **`useLogoutDialog().handleLogout()`** awaits the sign-out, shows a refusal in the dialog and closes only on success; it returns a promise and throws on failure.
- **The password reset form** sends a user whose password was reset but whose sign-in failed to /login with the address prefilled, instead of a reset error. **The forgot-password form** accepts another address after a success. **The password-policy route must be public**: a guest on the reset form reads it, and a 401 no longer redirects (the configured policy stays).
- New message keys an app may override: `mfa.recovery-codes-unavailable`, `mfa.recovery-codes-missing`, `mfa.session-expired`. The layer needs the base layer at the same version (`transitionDuration`).

### Tokens

- **Paste these token values into your `main.css`** (cardan-cms-nuxt keeps its own tokens until its rebrand): the dark-mode red graphic is the mix the red text uses, so a red meter fill reaches 3:1 on its track (was 2.2:1) and the danger button's hover border 3:1 on the red surface (was 2.8:1); and the header height UserMenu positions itself with, which every project already declares with its own value, is in the template now.

  ```css
  :where(.dark-mode) {
    --color-red-graphic: color-mix(
      in srgb,
      var(--cardan-error) 65%,
      var(--cardan-white)
    );
  }
  ```

### 2.4.1

New: AppShell, AppHeader, AppSidebar and SidebarLayout, the parts of an app's layout (`/layout` in the playground). Nothing changes in a project until it uses them.

- **`--app-max-width` is in the template** (`1280px`): AppHeader keeps its content within it. The four projects already define it in their own `main.css`; a project without it adds it before using AppHeader.
- **A project's own `AppHeader`, `AppSidebar`, `AppShell` or `SidebarLayout` shadows the layer's.** To use the layer's, rename the project's component first (the Auditor's and the support site's `AppHeader` became `TheHeader`).
- **AppHeader sticks from 360px wide and 480px high**, and AppSidebar and a sticky SidebarLayout panel with it. A project's own sticky parts under the header use the same condition, or they stick under a header that has scrolled away.
- **A bar or toolbar a project keeps sticky under the header sets `--app-header-sticky-below`** (its height) on `:root` while it sticks: keyboard focus then stops below it too, instead of under it (WCAG 2.4.11), and a SidebarLayout panel starts under it. The Auditor's audit and report navigation and its filter toolbar do so. A bar that sticks by a container query cannot, since a rule on `:root` cannot query a container: it gives the content it covers a `scroll-margin-block-start` of its height in that container query instead, as the Academy's catalogue toolbar does.
- **Remove a `scroll-margin` that makes room for the header**: AppHeader's scroll padding covers the header and what sticks under it, so a margin that adds `--app-header-height` (or the height of a bar that sets `--app-header-sticky-below`) counts it twice and lands an anchor, a skip link's target or a list that much lower.

Also a round of audit fixes. Paste the token, rename what a project sets, and check the rest:

- **Paste `--font-family-input: system-ui, sans-serif;`** into `:where(:root)` of your `main.css`, after `--font-family`. The fields read it without a fallback now, so without it they take the page's font.
- **Renamed custom properties**, for a project whose CSS or `style` sets one: a Form's `--col-width` and `--col-width-<n>` are `--form-col-width` and `--form-col-width-<n>` (cardan-auditor-nuxt's forms and filters and cardan-cms-nuxt's StatamicForm set them: rename them as this release reaches `main`, or their fields take the full row); MultiSelect's `--height` is `--multi-select-height`, Ellipsis's `--line-clamp` `--ellipsis-line-clamp`, VideoPlayer's `--aspect-ratio` `--video-player-aspect-ratio`, ThemeSwitch's and ThemeToggle's `--color-shape` `--theme-switch-shape-color` and `--theme-toggle-shape-color`, the markdown color swatch's `--color` `--markdown-swatch-color`, and Table's loading `--color-1` and `--color-2` `--table-shimmer-color-1` and `--table-shimmer-color-2`.
- **An inline MenuList spaces its items by `--menu-list-gap`, 1.5rem by default.** It read `--gap`, which was 0 unless an ancestor set it. Set `--menu-list-gap: 0` where margins space the items, as cardan-auditor-nuxt's top navigation does.
- **MultiSelect and DatePicker put an attribute on the control only**, as Input, Textarea and Select do since 2.4: `class` and `style` stay on the wrapper, the rest reaches the library's component and no longer the wrapper too. CSS or a test that found an attribute on `.form-field-wrapper` looks at the control. DatePicker puts a project's `aria-describedby` on its input.
- **A loading Popover trigger is not `disabled`**, as a loading Button since 2.4: it keeps focus, with `aria-disabled="true"` and `aria-busy="true"`, and ignores its clicks, so the popover does not open. A test or style that matched `:disabled` on a loading trigger matches `[aria-disabled='true']`.
- **A DatePicker's input is named by its `label`**, no longer "Datepicker input": a test that finds the input by that name finds it by the label.
- **RangeInput without a model starts at `min`** in its `<input>` too: a form that posts an untouched RangeInput sends `min`, where the browser sent the middle of the range.
- **The layer sets `<html lang>` and `dir` from the locale** (its `language` and `dir` in the i18n config, which the four projects set), and its own `htmlAttrs.lang: 'nl'` is gone. A project's static `htmlAttrs.lang` (cardan-auditor-nuxt, cardan-support-nuxt) and its `useLocaleHead()` binding on `<Html>` can go, but only once its production build has this release.
- **A toast cannot be reached or heard while a modal Dialog or MobileMenu is open**: the browser makes everything outside the dialog inert. Show a message about what happens in a dialog, such as a form's error, inside it, with ErrorMessage.
- **A link to another origin in MarkdownPreview no longer gets a `title` from the layer**: the hidden text "(open in new window)" in its name remains. A link that sets its own title in the markdown (`[text](url "title")`) keeps it. A test or style that selects the layer's `title` (`a[title]`, `getAttribute('title')`) selects the link by its name or by `target="_blank"`. None of the four projects does.
- **A sticky SidebarLayout whose panel holds text only and can be taller than the viewport takes `side-label`**, the panel's name: the panel is then an `aside` with that name, and while it scrolls it is a tab stop itself, so the keyboard scrolls it in Safari too, which does not focus a scroll container on its own (WCAG 2.1.1). Its content drops its own landmark and name (a `div`, not a second `aside`). A panel that leads focus through links or fields needs nothing. cardan-academy-nuxt's CheckoutShell passes it (its order panel), so that change merges only after this release is on `main`.
- **Cardan Auth UI**: new message key `mfa.recovery-codes-regenerate-unavailable` for an app that overrides the `mfa` messages. `useMfaDialog().loadingMfaDisableDialog` is new, for a project's own Disable MFA button; cardan-auditor-nuxt's UserProfileForm uses it, so that change merges only after this release is on `main`.

## Upgrading to 2.3

### 2.3.8

2.3.8 needs nothing from projects. See changelog for details.

### 2.3.7

2.3.7 is a round of accessibility and form fixes, with the card surface and gradient of the brand book. Paste the token values below into your `main.css`; the rest keeps working, but check the items after it.

- **Paste these token values into your `main.css`**: the card surface of the brand book (Kaart, `#FBFAF9`, where cards were white), the new brand gradient `--gradient-bg` (once per page, under a card), and two graphics that failed the 3:1 that borders, icons and indicators need. Dark `--color-red-graphic` was 2.66:1 on the page and is 3.42:1, and it draws every error border, also the new one of a required Checkbox; light `--color-yellow-graphic` was 2.77:1 and is 3.37:1. cardan-cms-nuxt keeps its own dark red, which passes.

  ```css
  :where(:root) {
    --cardan-card: #fbfaf9;
    --gradient-bg: linear-gradient(
      in srgb 110.32deg,
      var(--color-accent-bg) 0%,
      var(--color-green-bg) 76.34%
    );
  }

  :where(.light-mode) {
    --color-card-bg: var(--cardan-card);
    --color-yellow-graphic: hsl(45 80% 36%);
  }

  :where(.dark-mode) {
    --color-red-graphic: var(--cardan-error);
  }
  ```

- **A required Checkbox is checked by the form.** `required` now sets `required` on the input, so a Form does not submit while the box is unticked: it moves focus to the box and shows "Tick this box to continue" under it, or your `error-message`. A check of your own after submit no longer runs; move its text to `error-message` (cardan-academy-nuxt's checkout terms). For a group, pass `required` to CheckboxGroup, which asks for one box, not to every box (cardan-cms-nuxt's `StatamicCheckboxGroup`), or each box shows the error.
- **Tabs puts an attribute on its wrapper only.** Until now every attribute on `<Tabs>`, a `class`, an `id`, an `aria-labelledby`, landed on the wrapper and on the tablist. CSS that selected the class on the tablist (`.tablist.my-tabs`) matches nothing now, and an `aria-labelledby` names the wrapper instead of the tablist; use the `aria-label` prop for the tablist's name. The projects select their classes on the wrapper, which keeps working. The arrow keys act on `keydown` and no longer scroll the page; Home and End go to the first and last tab.
- **Select, CheckboxGroup and RadioGroup type their options.** `options` is `T[]`, and `value-key`, `label-key`, `disabled-key`, `name-key` and `title-key` must name a field of `T`: a key that is not in the option type is a type error now, which is the point. An untyped array keeps working. The option types are `SelectOption` and `GroupOption`.
- **Focus returns to the element that opened a Dialog when it closes**, also with Escape; until now it fell to the page, because the rest of the page was still `inert` when the browser restored it. A dialog that moved focus itself on close keeps doing so.
- **Focus moves on Vue's next tick instead of after a timer** in FocusLoop, UserMenu, AvatarButton, MobileMenu and MarkdownEditor, so it lands as soon as the element exists, also with reduced motion. A test that waited for the old timer can read focus right after the next tick.
- **LanguageSelect and LanguageSwitcher list the locales of the i18n config** (`locales` from `useI18n()`), with the `name` and `language` of each. The radio ids are `language-option-<code>` (were `-english` and `-dutch`). A third language needs an entry in the config and, for DatePicker, its date-fns locale in `dateFnsLocales` in `DatePicker.vue`.
- **`useCookiesDialog()` no longer returns `cookiesDialogRef`.** Open the dialog with `openCookiesDialog()`, or set `cookiesDialogOpen`; CookiesDialog follows the flag. The shared state keys are `cardan-ui:cookie-consent`, `cardan-ui:cookies-dialog-open` and `cardan-ui:toasts` (were `cookieConsent`, `cookiesDialogRef` and `toasts`); read them through `useCookiesDialog()` and `useToast()`, never with `useState()` directly. The `cookieConsent` browser cookie keeps its name, so saved choices stay valid.
- **The layer bundles the icons its components show on first paint, and the ones two or more projects use** (`bundledIcons` in `app/utils/icons.ts`, through `icon.clientBundle.icons` in its `nuxt.config.ts`; a project's own list is merged with it). **Install `@iconify-json/svg-spinners` and `@iconify-json/material-symbols`** if your project lacks one (cardan-support-nuxt has no `svg-spinners`): a listed icon whose collection is missing fails the production build, whether a page shows it or not. Then remove those icons from your own `icon.clientBundle.icons`: in cardan-academy-nuxt `material-symbols:close-rounded`, `material-symbols:more-horiz` and `svg-spinners:90-ring-with-bg`.
- **MobileMenu renders its dialog on the server** through Nuxt's `#teleports`, always: the `teleport-to` prop is removed. No project passed it.
- **`useDate()` reads the locale through `useI18n()`**, so call it in `setup`, as the components do; it no longer works from a plugin, a store or a callback outside a component. No project calls it there.
- **The field components render through the new FormField component**: the label with its chip, the control, the error text and the instruction, in that order. The classes are the same (`.form-field-wrapper`, `label`, `.instruction`, `.error-wrapper`), so CSS keeps working. Two things change: the error text sits directly under the field in every field, above the instruction, where Select and Textarea showed it below; and an Input without a `label` renders no empty `<label>`.
- **FileInput keeps the chosen file as its value** while an image is compressed, and the compressed file replaces it; the value no longer goes empty in between. A watcher on the value sees the chosen file first and then the compressed one.
- **A link in a markdown text ends in hidden text "(open in new window)"** in the current language, and gets that title only when it has none of its own. The icon after the link is decorative now; CSS that changed its alternative text can go.

### 2.3.6

2.3.6 needs nothing from projects. See changelog for details.

### 2.3.5

2.3.5 makes **MarkdownPreview** lighter: highlight.js loads only when a text has a code block, with six grammars instead of 38. In Cardan Academy that takes about 150 KB raw (50 KB gzipped) out of the chunk every course page executes, and keeps highlight.js out of pages without code.

- **A code block is coloured after the text is in the page**: it is a dark block with plain text first and its tokens get their colours a moment later, also in a server-rendered page. The HTML of a block is unchanged except for a `data-lang` attribute on the `<code>` element (`<pre><code class="hljs" data-lang="css">`), and the theme still ships with the component, so styles on `.hljs` keep working. A test that reads a block's spans right after mount waits for them (`vi.waitFor`).
- **Six grammars**: `xml` (also `html` and `svg`), `css`, `javascript`, `typescript`, `json` and `bash`, with the aliases highlight.js gives them (`js`, `ts`, `sh`, …). A fence in another language stays plain, where `highlight.js/lib/common` coloured 38 languages. Check your stored markdown for fences in another language (PHP, Python, SQL, YAML, …); when Cardan content needs one, add it to `app/components/Markdown/highlight.ts` in cardan-ui, so every project gets it. The playground's markdown page lists the set.
- **`vite.optimizeDeps.include`** in a project's `nuxt.config.ts`: replace `highlight.js/lib/common` with the six `highlight.js/lib/languages/*` entries, as the playground does (`.playground/nuxt.config.ts`); cardan-academy-nuxt has them.
- **The header cells of a markdown table** carry `scope="col"`, which WCAG H63 asks for. Nothing to do, unless your CSS selects `th[scope]`.

### 2.3.4

2.3.4 brings **Accordion** closer to the APG accordion pattern. It looks the same in a project that does nothing, but its panel is no longer a landmark.

- **New `h-tag` prop** wraps the trigger button in a heading (`h-tag="h3"`), at the level the section's title has in the page, as the pattern asks. Set it on every Accordion whose trigger is a title. A heading inside the `trigger` slot moves out: `<Accordion h-tag="h3"><template #trigger>Transcript</template>` instead of an `<h3>` in the slot, since a button may not contain a heading.
- **The panel is a plain `div`** and a `region` landmark only with the new **`region` prop**, with `aria-labelledby` to its trigger. Until now every panel was a `<section aria-labelledby>`, a landmark, and the pattern warns against a page full of them. Add `region` to a panel with headings or nested accordions of its own.
- **The trigger is in a wrapper** (`.accordion-header`, the heading or a `div`), so it is no longer a sibling of the panel. A selector such as `.accordion-trigger[aria-expanded='true'] ~ .accordion-panel-wrapper` in a project matches nothing now; the wrapper carries `.accordion-wrapper--open` instead.
- **The panel's overflow follows its state** also without a transition (reduced motion): a closing panel no longer paints over what follows, an opening one no longer clips focus outlines. Remove a workaround that set `overflow` on `.accordion-panel` from `aria-expanded`.
- **MobileMenu** pads the start of its content with `--app-padding-inline`, the project's own inline padding, as its navigation already did, instead of a fixed 1.25rem. In cardan-auditor-nuxt that is 0.75rem below 480px, in cardan-academy-nuxt below 768px. The token is now in the `main.css` template (0.75rem, 1.5rem from 480px). A project without it has no padding there and adds it to its `main.css`. cardan-support-nuxt names its padding `--padding-inline`, so it pastes:

  ```css
  :where(:root) {
    --app-padding-inline: var(--padding-inline);
  }
  ```

- **The outline Button** has a `--color-grey-light` border (was `--color-grey-bg`), which stands out from the background. Check a place where your own CSS changed that border.
- **`formatFileSize(bytes, locale?)`** counts in decimal units and formats in the app's locale unless you give another ("2,4 MB" in Dutch). A call with one argument keeps working.
- **`toolbars` and `footers`**, MarkdownEditor's toolbar settings, are no longer auto-imported from `app/utils/markdown.ts`; they moved into the component. No project used them.
- **Every project's `netlify.toml`** skips builds of documentation, AI and CI changes (cardan-ui#32 and the matching PRs in each project): check that yours has the `ignore` command.

### 2.3.3

2.3.3 needs nothing from projects. See changelog for details.

### 2.3.2

2.3.2 is a security update: Nuxt 4.6.4, and the latest versions of the other dependencies except TypeScript.

- **Update Nuxt to 4.6.4** in every project, first of all in the ones that render on the server (Cardan Academy's public pages, Cardan Support, the websites): `pnpm update --latest '!typescript'`, then `pnpm run build`. Keep TypeScript on 6.
- **A project on `compatibilityVersion: 5`** (cardan-academy-nuxt, cardan-auditor-nuxt) sets `experimental: { nitroAutoImports: true }` in its `nuxt.config.ts`. With version 5, Nuxt 4.6 turns off the auto-imports of the server bundle, which the server runtime of `@nuxtjs/i18n` and `@nuxt/image` still relies on; without them the build fails with `"useRuntimeConfig" is not exported by "#imports"`.
