# Not allowed

Owner rule (21 October 2026). Check every design, page, copy change and deployment against this list before it ships. If something here blocks a request, say so and ask; do not quietly work around it.

## Design
- Boring hero sections, generic templates, AI-looking dashboards or "vibe-coded" layouts.
- Generic card grids (three identical cards in a row), excessive cards, pills and badges, predictable section outlines repeated across pages.
- Generic gradients, glowing spheres, decorative particles, floating dots, random or meaningless motion, decoration for decoration's sake.
- Emojis, stock or generic icons used as decoration, generic shields, meters or logos laid out in a row.
- Pure white everywhere with no hierarchy, black-and-white clutter, or loud, flashy colour.
- Text-heavy sections, walls of explanation, cluttered placements.
- Heavy motion that slows the page, ignores reduced motion or blocks first paint.
- Horizontal scroll at 390px, misaligned elements, layout shift on language change.
- Redesigning a page, section or flow that already works, or redesigning the same page again without a new, specific reason from the owner.
- Footer changes of any kind without the owner's approval and a mockup first.

## Copy
- Scripted, polished, corporate or AI-sounding writing: generic hooks, clichés, forced emotion, filler, hype.
- Marketing or SEO language on the homepage.
- Internal or non-user words on pages: "illustrative", "sample data", "pro user", "in pipeline", "MRV workspace", "Private to your account · Settings", instructions, disclaimers repeated where the legal pages already cover them.
- Visible citation lines or reference links on product pages (sources stay in code or data files).
- Fabricated proof, customers, logos, numbers, integrations, certifications, compliance claims or guarantees of financing.
- "Simulation" for a user figure (use "Estimate"); "Certificate" for a review badge (exception, owner 26 October 2026: the Verified Emissions Certificate on Reports, which always carries its "not an accredited third-party verification" footer).

## Product and data
- Dummy logic, placeholder modules, dead buttons, dummy links, half-finished features, fake success states.
- Hard-coded, estimated or default values shown as verified; zero substituted for missing data; invented emission factors.
- Showing ITR, bank statement or financial statement files or personal details anywhere, or parsing them outside the approved allow-list.
- Storing guest files or results on the server.
- Removing or denying a capability because its manual, paid or on-ground delivery is not visible in code.
- Adding features with no clear user benefit, or features nobody asked for.
- Breaking any step of OCR → calculation → verification → reporting → monetisation → dashboard.
- Mixing the MSME finance story and the enterprise Scope 3 story on the same surface.
- Mixing up the Grants page (startup offers) and government grants in Monetize.

## Process
- Deploying without inspecting the existing code, data and navigation first.
- Deploying a new design without showing it when the owner asked to see it first.
- Claiming something works without running it; claiming success without live evidence.
- Changing the database, auth, RLS, secrets or environment without explicit approval and a rollback.
- Committing or printing secrets, test credentials, internal inboxes or payment IDs (the repo is public).
- Patching on top of a REVERT, or combining a revert with other changes.
- Silently dropping an earlier requirement when a new one seems to conflict. Resolve it in `senseible.md` and ask if unsure.
