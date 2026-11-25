---
name: pr-body
description: The description of a pull request in a Cardan repository: summary, what was verified, the local review tally and findings, and the attribution line. Use it whenever you open a PR with gh pr create.
---

Write the pull request description with these parts, in this order, and
nothing else. Be concise: short fragments over full sentences, only what a
reviewer who did not watch the work needs. The docs the PR changes carry
the detail; don't repeat it here.

## Summary

One short bullet per change, the component or area in bold first
(`**MarkdownPreview**: bare video links play inline`). What changed for
users of the code, not how the work went. Name the `MIGRATION.md` section or
version when there is one. In a project whose change needs a Cardan UI
release not yet on `main`, the first line above the summary is
`Merge after Cardan UI <version> is on main.`; in a Cardan UI release, a
bullet lists the project PRs that wait for it. The summary's last line,
`Notion: <links>`, names the Notion issues the PR closes or advances, from
this session and from the `Notion:` lines of its commits
(`git log origin/<base>..`), for whoever marks them live; leave it out when
there are none.

## Verification

Only the manual steps a reviewer can repeat, and checks that failed or leave
questions. Omit the section when there are none.

## Local review

A first line: reviewer rounds (`cardan:cardan-reviewer`, or
`cardan:plugin-reviewer` for a change to the Claude Code setup alone), the
tally of all findings across rounds and the browser check (browsers, or why
skipped). Then one bullet per finding, the cross-browser check's ≠ rows
included: severity, file, what it was, and its fate (fixed and how, or open
and why). For commits reviewed in an earlier session, such as on a release
branch, take the findings from the `Review:` part of their messages
(`git log origin/<base>..`, the branch the PR targets); a commit without one is named as such, never
filled in from guesswork.
Write "no findings" when there were none. Example:

```
2 rounds (cardan-reviewer): 1 Important, 1 nit; Chrome/Firefox/WebKit ok.

- Important, `app/components/Popover.vue`: Escape left focus on the body; returns it to the trigger now
- nit, `MIGRATION.md`: 2.5.2 section missing; added
```

End with the attribution line the session was given, such as
`🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

Open the PR against the branch the work was cut from (`main`, or
`develop` where a repository releases from it), with a title that is the
commit subject.
