# Operating principles

1. **Deterministic where determinism is possible.** HSN-to-scope and grid-factor math are rule-based. AI is used only for parsing unstructured inputs into structured fields.
2. **Explicit failure over silent estimation.** When inputs are missing or inconsistent, the platform returns the exact math reason for failure. It does not guess.
3. **Evidence before output.** A document stub with SHA-256 hash is recorded before processing begins, so the audit trail exists even if processing fails.
4. **Private by default.** Row-Level Security on every table. IP addresses are hashed. Cross-tenant access is impossible by construction.
5. **Speak in outcomes, not features.** Public pages describe what changes for the user, not what runs in our cluster.
6. **Calm and regulator-safe.** Tone is precise and reviewable. No marketing inflation.
7. **Global framing.** India is one of ten countries served. Numbers are localised, not centred.
8. **No greenwashing path.** The same evidence cannot be reused. Duplicate hashes are blocked at the verification layer.
