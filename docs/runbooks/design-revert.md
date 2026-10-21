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
| App pages: /reports, /verify, /monetize, /history, /mrv (`REVERT app pages` undoes all five at once) | [Loveonn-Creative/biocog4#44](https://github.com/Loveonn-Creative/biocog4/pull/44) | `f7c93bb` (merge `9b5d119`) |
| /carbon-credits | [Loveonn-Creative/biocog4#45](https://github.com/Loveonn-Creative/biocog4/pull/45) | `9b5d119` (merge `ea925b0`) |
| /about | [Loveonn-Creative/biocog4#46](https://github.com/Loveonn-Creative/biocog4/pull/46) | `ea925b0` (merge `914e0db`) |
| /contact | [Loveonn-Creative/biocog4#47](https://github.com/Loveonn-Creative/biocog4/pull/47) | `914e0db` (merge `944bcaf`) |
| /careers | [Loveonn-Creative/biocog4#68](https://github.com/Loveonn-Creative/biocog4/pull/68) | `d2bcee6` (merge `eadd071`) |
| /enterprise | [Loveonn-Creative/biocog4#81](https://github.com/Loveonn-Creative/biocog4/pull/81) | `e72bc37` (merge `43c48be`) |
| /net-zero | [Loveonn-Creative/biocog4#83](https://github.com/Loveonn-Creative/biocog4/pull/83) | `953a0b2` (merge `cf77b35`) |
| /climate-finance | [Loveonn-Creative/biocog4#84](https://github.com/Loveonn-Creative/biocog4/pull/84) | `cf77b35` (merge `c488704`) |
| /partners | [Loveonn-Creative/biocog4#85](https://github.com/Loveonn-Creative/biocog4/pull/85) | `c488704` (merge `2f9c6ea`) |
| /mission | [Loveonn-Creative/biocog4#86](https://github.com/Loveonn-Creative/biocog4/pull/86) | `2f9c6ea` (merge `2d09dc0`) |
| /principles | [Loveonn-Creative/biocog4#87](https://github.com/Loveonn-Creative/biocog4/pull/87) | `2d09dc0` |
| /enterprise (ledger hero, traceability threads) | [Loveonn-Creative/biocog4#96](https://github.com/Loveonn-Creative/biocog4/pull/96) | `8ce3eed` |
| /reduction-signal (fuel switch and efficiency) | "Fuel switch and efficiency signal page" | `07bfa17` |
| /grants (application as a letter) | "Grants: application as a fill-in letter" | `75519be` |
| /white-paper (living paper, new page) | "White Paper page" | `67723b1` |
| 404 page (reader; `REVERT 404`) | "404: address reader" | `761882f` |
| Footer (delivery truck story; `REVERT footer`) | "Footer: one delivery, made visible" | `755cad5` |
| Footer (shipment routes: truck, train, ship, plane; `REVERT footer`) | "Footer: one shipment, four routes" | `89aadbd` |
| /dashboard (design audit: one focal frame, scope bar, first-record steps, document status, type scale) | "Dashboard: design audit" | `fa2658b` |
