# MRV Pipeline E2E Tests

Playwright scripts driven from shell. Each spec is a standalone Python file
that assumes:

- Local dev server is up at http://localhost:8080 (Vite).
- Supabase edge functions are deployed (already automated).
- The sandbox has `LOVABLE_BROWSER_SUPABASE_*` env vars for authenticated flows,
  matching the Lovable browser-use workflow.

## Specs

- `01_scan_to_extract.py` — upload sample invoice, assert extraction UI renders line items + totals.
- `02_verify_success.py` — verified green (solar) invoice → status: verified.
- `02b_verify_rejected.py` — bad invoice → status: rejected renders in UI (regression guard).
- `02c_guest_adoption.py` — guest upload then signed-in verify adopts ownership.
- `03_history_updates.py` — verified item appears in /history with SHA badge.
- `04_reports.py` — GRI/BRSR/TCFD generation returns a valid PDF.
- `05_dashboard_realtime.py` — dashboard summary updates within 5s of a verify in another tab.
- `06_monetize.py` — verified green invoice surfaces in /monetize with payout preview.
- `07_bulk.py` — 5-invoice bulk upload dedupes on SHA256.

## Fixtures

Place sample invoices under `tests/e2e/fixtures/`:

- `solar_invoice.pdf` — verifiable renewable
- `diesel_invoice.pdf` — grey scope 1
- `ev_invoice.pdf` — green mobility
- `duplicate_of_solar.pdf` — same SHA as `solar_invoice.pdf`

## Run

```bash
python tests/e2e/01_scan_to_extract.py
```

Each script prints screenshots and observed state under `/tmp/browser/mrv/`.
