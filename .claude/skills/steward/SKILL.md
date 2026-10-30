---
name: steward
description: How Claude drives its own pull requests in this repo to green without risk to the live site. Read before acting on CI, review or merge events.
---

# Steward rules for pull requests

AGENTS.md and docs/context/ always win over this file.

## Never
- Merge. Only the owner merges, by writing "merge N".
- Skip, disable or weaken a test, the SEO gate, the report copy test or the answer validator to get green.
- Push to main, force-push, rewrite history or delete branches you did not create.
- Touch the footer, pricing, payments, verification wording, migrations or edge functions unless that PR was approved for it.
- Delete or rename a published page. Fix it in place.
- Put chat content, competitor research, prices or commercial terms in code, commits or PR text.
- Print secrets, inbox addresses or user data in logs or comments.

## On red CI
1. Reproduce locally with `bun test tests/`, `node scripts/seo/build-answer-library.mjs` and `npm run build`.
2. If the failure is in code this PR touches, make the smallest fix and run all three again before pushing.
3. If the same check is red on main, say so once on the PR and fix it in its own PR.
4. Generated files are rebuilt with their scripts, never edited by hand:
   - answer library: `node scripts/seo/build-answer-library.mjs`;
   - function versions: `node scripts/function-versions.mjs`;
   - intelligence library: `bun scripts/build-intelligence-library.ts`.

## On review comments
- Fix small, clear asks in the next push.
- Anything that changes product behaviour, wording the owner approved, or design goes to the owner first.

## Before telling the owner a PR is ready
- CI is green on the latest commit.
- There is no merge conflict.
- Every changed page or report has been rendered, and an independent agent has reviewed it.
- Tell the owner in one line: what changes for a visitor, then "merge N".

## After the owner merges
Check the live site within the hour: the changed pages return 200 and show the new content. Report one line, with evidence.
