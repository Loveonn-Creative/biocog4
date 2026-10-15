# Senseible answer-engine strategy

Goal: when someone asks ChatGPT, Perplexity, Gemini or Google a carbon, MRV, CBAM, BRSR or green finance question that Senseible can genuinely answer, the answer engine quotes a Senseible page accurately and names Senseible where it is the right tool. Traffic is a side effect; correct citation is the goal.

## What actually gets a page cited (and what does not)

Answer engines retrieve live pages (ChatGPT search, Perplexity, Gemini and Google AI Overviews all fetch the web) and quote the passage that answers the question most directly and credibly. What helps:

1. **A direct answer in the first 40 to 60 words**, then specifics a generic page does not have: worked numbers, thresholds, deadlines, edge cases, a decision rule.
2. **One intent per URL.** Two Senseible pages answering the same question split signals and confuse retrieval. Every intent has one owner URL (the register below enforces this).
3. **Verifiable facts.** Named primary sources (EUR-Lex, SEBI, IPCC, GHG Protocol, ISO, BEE, CEA) and figures that match them. Engines and auditors both penalise numbers that cannot be traced.
4. **Self-contained sections.** Each heading answers a sub-question on its own, so a retrieval system that cuts the page into chunks still gets a complete answer from one chunk. (This is what "vector-optimised" means in practice.)
5. **Consistent entity facts.** Same name, description, address and capabilities everywhere: pages, JSON-LD, llms.txt, LinkedIn, directories.
6. **Being cited by others.** Links and mentions from credible third-party sites remain the strongest trust signal.

What does not work, stated plainly so we do not spend effort on it:

- **"Seeding pages directly into LLM training corpora."** No one can insert content into a model's training set. What we control is that pages are public, fast, crawlable by AI crawlers and quotable. That is already in place: robots.txt allows GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot, Google-Extended and others; every page is prerendered HTML with a Markdown mirror (/md/...); /llms.txt lists the site; JSON-LD (Organization, FAQPage, TechArticle, BreadcrumbList) is on every page type.
- **Volume for its own sake.** Thin or near-duplicate pages lower the trust of the whole domain. 5,000 to 10,000 is a ceiling, not a target. From about 100 topics, our honest estimate is 1,500 to 3,000 genuinely distinct, useful questions; we stop where unique value stops.
- **"Real-time regulatory triggers."** Content cannot update itself when a regulation changes, and pretending it does risks stale claims. Instead every regulation page carries a "last reviewed" date and is listed in a review queue keyed to the regulation (CBAM, BRSR Core, CCTS, CSRD). When a rule changes, the queue lists exactly which pages to re-check.
- **"Open developer documentation and API sandboxes."** Senseible has no public self-serve API today (enterprise API on request). Publishing developer docs or a sandbox for an API that does not exist would be false and would be found out. What we can publish truthfully now: the open method (the White Paper), the emission factor library as a downloadable open dataset with sources, and the calculation rules. If a public API ships later, docs follow it.

## Architecture

- **Question layer: /answers/{natural-question-slug}.** Short, answer-first pages (the existing Answers system: direct answer, detail, links, sources, FAQPage JSON-LD, Markdown mirror). New how-to pages go here, so there is one question hub, not a second competing one.
- **Depth layer: /climate-intelligence/{guide}.** The 154 existing long guides. An answer links to the one guide that goes deeper on its topic; a guide links back to the answers under it. Answers never restate a guide's whole content.
- **Tool layer:** calculators, CBAM cost pages, factor library, the product. Answers link to the tool that does the job ("calculate it" rather than "read more").
- **Topic hubs:** /answers groups questions by topic, so 200 or 2,000 answers stay navigable and every page is two clicks from the hub.
- **Entity graph:** the Organization entity (already published) is referenced as author and publisher on every page; topic terms get DefinedTerm markup on their hub; answers reference the guide and tool they link to.

## Rules for every page

From docs/seo/brief.md: real question, one intent, primary sources, labelled estimates where no exact figure exists, Senseible's real capabilities only (no certification, assurance, credit issuance or public API claims), founder-led plain voice, no em dashes, natural URL.

## Batch workflow (200 per batch)

1. **Register.** Candidates with intent, owner URL check, evidence, Senseible tie-in, flags (docs/seo/batch-NN.tsv).
2. **Validation by the founder.** Approve, drop or edit candidates. Nothing is written before this.
3. **Write.** Each page from its evidence list.
4. **Audit (automated plus read-through).** No em dashes; direct answer 25 to 60 words; title 60 characters or fewer, unique; slug unique and not overlapping an existing intent; every internal link resolves; at least one primary source; build and SEO gate pass; Markdown mirror and sitemap entry present; spot-read for accuracy and voice.
5. **Deploy** as one PR per batch, so a batch can be reverted as a unit.
6. **Measure.** Monthly: ask a fixed set of 50 real questions in ChatGPT, Perplexity, Gemini and Google AI Overviews; record whether Senseible is cited and whether the citation is accurate. Search Console for impressions on answer pages. Fix pages that are cited inaccurately first.

## Backlinks and citations

Outbound: each page links to the primary source it relies on (regulator, standard body), which helps readers verify and is what answer engines expect of credible pages.

Inbound (needs founder or team action; it cannot be automated honestly):
- Publish the emission factor library as an open dataset (CSV and JSON with sources and licence) that researchers and developers can cite.
- Contribute worked examples and corrections to industry bodies and associations where Senseible has real standing (MSME export councils, industry associations, incubators and programmes Senseible is part of).
- Ask partners, lenders and customers who use Senseible data to reference the method page when they describe their process.
- Consistent profiles on Crunchbase, LinkedIn, GitHub (for the open dataset) and relevant climate-tech directories.

Not doing: paid link schemes, link exchanges, directory spam or links from unrelated sites. They risk penalties and do not improve AI citation.
