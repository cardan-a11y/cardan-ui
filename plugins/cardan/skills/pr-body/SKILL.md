---
name: pr-body
description: The description of a pull request in a Cardan repository: summary, what was verified, the local review tally and the attribution line. Use it whenever you open a PR with gh pr create.
---

Write the pull request description with these parts, in this order, and
nothing else. Be concise: short fragments over full sentences, only what a
reviewer who did not watch the work needs. The docs the PR changes carry
the detail; don't repeat it here.

## Summary

One short bullet per change, the component or area in bold first
(`**MarkdownPreview**: bare video links play inline`). What changed for
users of the code, not how the work went. Name the `MIGRATION.md` section or
version when there is one.

## Verification

Only the manual steps a reviewer can repeat, and checks that failed or leave
questions. Omit the section when there are none.

## Local review

One terse line: reviewer rounds (`cardan:cardan-reviewer`, or
`cardan:plugin-reviewer` for a change to the Claude Code setup alone), the
first round's tally, the browser check (browsers, or why skipped), and the
fate of each finding (fixed, or open and why). Example: `2 rounds
(cardan-reviewer): 1 Important, 2 nits, all fixed; Chrome/Firefox/WebKit ok.`

End with the attribution line the session was given, such as
`🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

Open the PR against the branch the work was cut from (`main`, or
`develop` where a repository releases from it), with a title that is the
commit subject.
