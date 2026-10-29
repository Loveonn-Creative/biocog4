# Replace the sample ESG report file

Goal: the sample report link at /esg-report-sample delivers your newly uploaded PDF instead of the old one.

## Steps
1. Check the uploaded file (`senseible_esg-report-sample-2026-2.pdf`): confirm it is a valid PDF and note its page count and size.
2. Upload it to the private `gated-resources` storage folder under the exact name `esg-report-sample-2026.pdf`, replacing the old file. It is not added to the code, the public folder or any open link, because the project is public.
3. Confirm the stored file now matches your upload (same size and fingerprint).
4. Check access: a signed-out visitor still can't open the file directly, and the report-access function still returns a working, expiring link.

## What stays unchanged
No code, database tables or functions change, and the footer is untouched.

## Technical details
- Upload with upsert through the storage API from a short one-off script run in the sandbox (kept under /tmp). It uses the server key available to backend tools, and never prints it.
- If the sandbox can't upload with a server key, I'll stop and tell you. You would then need to upload it yourself from the backend's Storage view (Cloud → Storage → gated-resources).
