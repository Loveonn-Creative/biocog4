# Proposed Privacy Policy amendment: requested resources (for owner approval)

**Status: draft. The Privacy Policy has not been changed.** The form at `/esg-report-sample` shows its own notice (purpose, retention, rights, Data Officer contact, link to the policy), which is what DPDP Act 2023 section 5 requires at the point of collection. The policy itself should still list this purpose, because section 3 says data is processed "strictly for" a list that does not include it.

## Gap found

| Policy section | Today | Gap |
|---|---|---|
| 3. Purpose of Data Processing | Carbon estimation, ESG, climate finance, fraud, security, model improvement | Sending a resource someone asked for, and optional marketing updates, are not listed |
| 2. Data We Collect | Account and identity data (name, email, organisation) | Industry, role and stated need from a visitor form are not named |
| 9. Retention | Three months unauthenticated, 18 months authenticated | Covered: visitor leads are kept 90 days, signed-in downloads 18 months |
| 14. Grievance | Data Officer contact | Covered: the form names the Data Officer |

## Proposed text

Add to **2. Data We Collect**:

> **(f) Requests You Make**
> When you ask for a report, guide or other resource, your name, work email, company, industry, role and the reason you give, and whether you agreed to receive updates.

Add to **3. Purpose of Data Processing**:

> - Sending you a resource you asked for, confirming that your email address can receive it, and understanding who uses our resources
> - Sending you updates about Senseible, only if you separately agree; you can withdraw at any time

Add to **9. Data Retention & Deletion**:

> Details given to request a resource are kept for up to ninety (90) days, or up to eighteen (18) months when the request is made from a signed-in account, unless you ask us to delete them sooner.

Update **lastUpdated** and keep the previous text on file, since the form stores the notice version (`resource-lead-2026-10-16`) shown with each request.

## To apply

Approve the wording (or edit it), and the change goes into `src/data/legalContent.ts` as its own PR.
