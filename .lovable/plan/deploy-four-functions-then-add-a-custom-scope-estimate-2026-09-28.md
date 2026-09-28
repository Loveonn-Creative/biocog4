# Deploy four functions, then add a custom-scope estimate

## Release steps
1. Deploy only the four existing functions: document extraction, carbon verification, team invitation sending, and team invitation acceptance.
2. Confirm that the deployment result reports success for each function individually. If any fails, identify the failed function and stop short of claiming the release is complete.
3. Run safe, non-destructive availability checks where possible; distinguish deployment success from a fully tested document or invitation workflow.

## Pricing-page follow-up
4. After the four deployment results are confirmed, add a small India-only custom-scope estimator above the existing FAQs. Keep the four plans, Scale team-size price, checkout and payment calculations untouched. Keep the partner and MSME pricing views intact.
5. Let visitors select only genuinely bespoke work outside Scale, then set complexity and relevant workload counts. Calculate a transparent rupee range from the six supplied work ranges, count-based scope and a capped multiplier of 1.8. Show the range, selected drivers and the requested estimate-only qualification; do not show internal costs or individual category floor prices as a negotiation menu. If nothing bespoke is selected, show no quote.
6. Send the exact choices, workload inputs and calculated range through the existing contact enquiry flow, with a reviewable prefilled message before submission. Preserve the current enquiry form and delivery path; no new database or payment flow. Check range maths at boundaries and on mobile and desktop, then check the existing pricing and contact actions.

## Technical details
- Function names: `extract-document`, `verify-carbon`, `send-team-invitation`, `accept-team-invitation`.
- Deployment stage: do not change code, database structure, frontend pages, or unrelated functions.
- Estimator stage: use the existing pricing page and contact notification route, with a focused calculation helper and tests. Define and display count thresholds and multiplier rules so the estimate is reproducible; cap the combined multiplier at 1.8. Treat the supplied price bands as indicative commercial inputs, not verified engineering costs or a binding quote.
- Use direct, human-facing copy without generic claims or em dashes in new text. Do not modify existing plan prices or checkout logic.
