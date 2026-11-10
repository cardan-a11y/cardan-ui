---
name: pr-body
description: The description of a pull request in a Cardan repository: summary, what was verified, the local review tally and the attribution line. Use it whenever you open a PR with gh pr create.
---

Write the pull request description with these parts, in this order, and
nothing else. Keep it to what a reviewer who did not watch the work needs.

## Summary

One bullet per change, each a full sentence that names the component or
area in bold at the start (`**MarkdownPreview** renders …`). Say what
changed for users of the code, not how the work went. Mention a
`MIGRATION.md` section or a version when there is one.

## Verification

Focus on the manual steps a reviewer can repeat. Only mention checks that failed or leave questions.

## Local review

One line: how many rounds the reviewer agent ran (`cardan:cardan-reviewer`, or
`cardan:plugin-reviewer` for a change to the plugin alone), the
tally of the first round (Important and nits), the browser check (Chrome,
Firefox and WebKit, or why it was skipped), and what happened to each
Important finding and nit (fixed, or left open and why).

End with the attribution line the session was given, such as
`🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

Open the PR against the branch the work was cut from (`main`, or
`develop` where a repository releases from it), with a title that is the
commit subject.
