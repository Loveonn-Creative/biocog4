# Deploy the four changed functions

## Release steps
1. Deploy only the four existing functions: document extraction, carbon verification, team invitation sending, and team invitation acceptance.
2. Confirm that the deployment result reports success for each function individually. If any fails, identify the failed function and stop short of claiming the release is complete.
3. Run safe, non-destructive availability checks where possible; distinguish deployment success from a fully tested document or invitation workflow.

## Technical details
- Function names: `extract-document`, `verify-carbon`, `send-team-invitation`, `accept-team-invitation`.
- Do not change code, database structure, frontend pages, or unrelated functions.
