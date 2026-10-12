# Kill word: REVERT

Typing **REVERT** (or **REVERT <page>**, for example `REVERT pricing`, `REVERT trust`) undoes that page's most recent redesign and puts the previous version back exactly. Nothing new is written on top.

## Why it is safe

- Every page redesign ships as its own pull request, touching only that page's files.
- Each such PR's description records the `main` commit it started from.
- Undoing is git's own revert of that merge, so the previous files come back byte for byte, with history kept.

## What Claude does when it sees REVERT

1. Find the most recent merged redesign PR for the page named (or the most recent redesign PR if no page is named).
2. Restart the working branch from `main`, run `git revert -m 1 <merge commit of that PR>`, and change nothing else.
3. Run the tests and build, open one PR titled `Revert: <original title>`, and merge it.
4. Report the PR link and that the previous version is live after the next deploy.

No restyling, no partial keep, no follow-up edits in the same PR. If something from the reverted version should come back later, it is proposed again as a fresh, separate PR.

## Redesign PRs this applies to

| Page | PR | Started from |
|------|----|--------------|
| /pricing | [Loveonn-Creative/biocog4#36](https://github.com/Loveonn-Creative/biocog4/pull/36) | `e8b67c3` |
| /trust | [Loveonn-Creative/biocog4#37](https://github.com/Loveonn-Creative/biocog4/pull/37) | `5344c62` |
| /trust (interactives) | "Trust: fix market flow; interactive score, claims and safeguards; doodle icons" | `52af0c5` |
| /solar-signal | "Rooftop solar reduction signal (phase 1)" | `f664b63` |
