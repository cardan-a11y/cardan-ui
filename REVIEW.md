# Review instructions

This is cardan-ui, the accessible Vue component library of Cardan, shipped as
a Nuxt layer. cardan-auditor-nuxt (Cardan Auditor), cardan-academy-nuxt
(Cardan Academy), cardan-cms-nuxt (cardan.com) and cardan-support-nuxt
(support.cardan.com) extend it, so a change here reaches all of them at once.
cardan-shop-nuxt extends it too, but is being phased out soon: leave it out
of the review. Cardan is an accessibility-first company: an accessibility
regression in this library is a production bug in every project, not polish.
CLAUDE.md holds the conventions;
MIGRATION.md tells projects how to upgrade. The `auth/` directory is a
separate layer, Cardan Auth UI, used by cardan-academy-nuxt and
cardan-auditor-nuxt; its documentation is `auth/README.md`.

## What Important means here

Reserve 🔴 Important for findings that would break behavior or accessibility
in the projects that extend the layer:

- Accessibility regressions against WCAG 2.2 A/AA: removed or wrong ARIA,
  missing accessible names, broken keyboard or focus behavior, lost
  label/error associations, color-only meaning, status changes that are no
  longer announced, targets smaller than 24×24px, or motion that ignores
  `prefers-reduced-motion` (use the `--duration-*` tokens, which collapse to
  `0s`).
- Contrast: text below 4.5:1 or graphics and UI boundaries below 3:1, in
  light **or** dark mode. Check both: the tokens in `app/assets/main.css`
  have separate values under `.light-mode` and `.dark-mode`, and some are
  `color-mix()` values that need to be worked out.
- Reflow: a component that scrolls horizontally or loses content at 320px
  wide.
- A component that starts to depend on something in `app/assets/main.css`
  (a design token, a reset or another global rule) that is not defined
  there, or not listed in MIGRATION.md with a value that keeps the current
  look of existing projects. The layer does not load `main.css`: it is a
  template that each project copies into its own `main.css`, because a
  stylesheet shipped by the layer would be one more render-blocking request
  (PageSpeed). Anything a project's copy lacks silently breaks its styling.
- Breaking changes for projects without a note in MIGRATION.md: a renamed or
  removed prop, variant, slot, emit, class name, exported type, composable,
  page or translation key, or a changed default value.
- i18n: a user-facing string that does not go through `$t()`, or a key that
  is not in **both** `nl.json` and `en.json` (`i18n/locales/` for the
  components, `auth/i18n/locales/` for the auth layer). Projects then show
  the raw key.
- Unsafe HTML: a new `v-html` on text that MarkdownPreview did not render.
- Incorrect logic or state: a `useState` key that collides, reactive state
  that goes stale, listeners or observers that are not cleaned up.
- A broken step in one of the auth flows below.
- A test bent around a defect (a looser assertion, a class check in place
  of behaviour) instead of a fix or a named `it.todo`: it hides the
  regression it should catch. Tests follow CLAUDE.md's Tests section.

Style, naming and refactoring suggestions are 🟡 Nit at most.

## Auth layer flows

A change in `auth/` must keep every step of these flows working, for a
mouse, keyboard and screen reader user. Walk each flow the diff touches,
following `auth/README.md` (Usage and Accessibility):

- **Sign in**: `/login` posts the credentials, refreshes the identity and
  continues to `?redirect=`. A redirect to another site must fall back to
  `redirect.onLogin` (`useAuth()`). When Fortify answers `two_factor: true`,
  it goes to `/two-factor-authentication` with the `?redirect=` carried
  along.
- **Sign-in challenge**: an app code or a recovery code; the page keeps
  `sanctum: { guestOnly: true }`, since the user is not signed in until the
  code is accepted.
- **Setup reminder**: with `mfa_enabled: false` a sign-in detours past
  `/mfa-setup` once; with `mfa_required` there is no skip and the
  `mfa-setup` middleware returns there on every navigation; a `403` with
  `mfa_setup_required` or `backoffice_mfa_required` mid-session goes there
  too.
- **Enable MFA** (`MfaDialog`, `MfaSetup`): intro → QR code → confirm code →
  recovery codes. The recovery codes are read only right after they are
  created and forgotten when the step or dialog closes: never kept in
  `useState`, storage, the URL or logs.
- **Disable MFA, regenerate recovery codes**: behind the password
  confirmation; an account that requires MFA is sent to `/mfa-setup`
  instead. Changing the authenticator app is disable and set up again,
  never Fortify's `force` re-enable.
- **Password confirmation**: a `423` opens `PasswordConfirmationDialog`,
  then the call is retried once; cancelling leaves the user where they
  were.
- **Forgot and reset password**: the reset signs the user in, through the
  challenge when MFA is on; the requirements come from the policy endpoint
  or the `passwordPolicy` setting.
- **Sign out**: `LogoutDialog` asks before signing out.

Also 🔴 Important in `auth/`: a password, code or token that ends up in a
URL, storage, a log or an error message; a changed endpoint default or
`cardanAuth` setting without a note in `auth/README.md`; a focus move or
`role="alert"` error region from the Accessibility section that no longer
happens.

## Always check

- Components use design tokens, never hard-coded colors, sizes, radii or
  durations. Exceptions: the fixed artwork colors in `CardanLogo`, the black
  video area in `VideoPlayer`/`YouTube` and the hue slider in `RangeInput`.
- No chain that papers over a renamed token:
  `var(--new-token, var(--old-token))`. A bare read is preferred, not
  required: a default in `var()` that makes sense, such as
  `var(--button-radius, var(--radius-md))`, is not a finding.
- Components never use the `--cardan-*` primitives; only the semantic
  `--color-*` tokens in `main.css` do.
- Text and icons on tinted (`-bg`) surfaces use the matching
  `--color-*-text` token.
- Custom CSS: nested classes, logical properties
  (`margin-inline`, `padding-block`, …), mobile-first.
- The `cardan` plugin under `plugins/cardan` is what every Cardan project
  loads: a change to its guidelines, reviewer, hook or skills reaches them
  at their next plugin update. A change to it alone goes to the
  `cardan:plugin-reviewer`; in a change with other files it is reviewed
  here with that reviewer's checks (see the cardan-reviewer agent), and
  `claude plugin validate ./plugins/cardan` must pass.
- Common translations belong here: a string that several projects need
  (buttons like Close, Save or Cancel, generic labels and errors) goes into
  the layer's locale files, as the auth strings did, so projects don't each
  keep a copy.
- MarkdownPreview stays safe by default: raw HTML is shown as text and
  `{…}` sets only `lang`, `dir` and `class`. `trusted` is for text the team
  wrote.
- Props are typed; shared types live in `app/types/index.ts` as
  `declare global`.
- No new external dependencies unless clearly necessary, and nothing loaded
  from a CDN at runtime (projects run a strict Content Security Policy).
- Icons are Material Symbols (`material-symbols:*-outline-rounded` first)
  and decorative unless a text label is missing.
- A change to a component that has a test comes with an updated or new
  test; without one it is a 🟡 Nit.

## Do not report

- Type errors elsewhere than in the change: `pnpm run typecheck` passes on
  `main`, so a type error the change introduces is a finding, one the
  base branch already has is not.
- Anything `pnpm run lint` (ESLint) already enforces, or formatting.
- `pnpm-lock.yaml`, `.playground/public/**`, and generated or vendored code.
- Code style in the playground pages under `.playground/`; they are
  documentation. Accessibility problems in them still count.
- A missing test for a change to a component that has no test yet and is
  not a form component or dialog: the suite under `test/` covers those with
  axe and is growing from there.

## Cap the nits

Report at most five 🟡 Nits per review; summarize the rest as "plus N
similar items." If everything found is a Nit, lead the summary with
"No blocking issues."

## Verification bar

Behavior claims need a `file:line` citation from this repository, not an
inference from naming. Contrast claims need the two colors and the ratio,
for the mode they apply to. For claims about how a consuming project is
affected, state the assumption explicitly: those projects are not in this
repository.

## Re-review convergence

After the first review round, report Important findings only; suppress new
nits unless the changes since then introduced them.

## Summary shape

Open the review with a one-line tally, e.g. `1 important, 3 nits`, followed
by one sentence on whether the change is safe to merge for the projects
that extend the layer, and whether MIGRATION.md covers what they need to do.
