// Legal documents content - Senseible
// Note: All references to "Biocog" are displayed as "Senseible" and biocog.v1@gmail.com as impact@senseible.earth

export interface LegalDocument {
  id: string;
  title: string;
  slug: string;
  effectiveDate: string;
  lastUpdated: string;
  sections: {
    title: string;
    content: string;
  }[];
}

export const legalDocuments: LegalDocument[] = [
  {
    id: 'terms',
    title: 'Terms of Service',
    slug: 'terms',
    effectiveDate: '27 August 2024',
    lastUpdated: '17 December 2025',
    sections: [
      {
        title: '0. Parties & Legal Identity',
        content: `These Terms of Service ("Terms") constitute a legally binding agreement between:

INSPYR FINNOVATION PRIVATE LIMITED, a company incorporated under the laws of India, operating the platform under the brand name "Senseible" ("Senseible", "Platform", "Services", "Company", "We", "Us") and the entity or individual accessing or using the Services ("User", "You", "Customer").

By accessing the Platform (Senseible), You acknowledge that You have read, understood, and agreed to be bound by these Terms.`
      },
      {
        title: '1. Nature of Services',
        content: `Senseible provides AI-powered carbon estimation, ESG intelligence, digital infrastructure provider and climate-finance enablement tools for MSMEs.

**1.1 Platform Classification**

For avoidance of doubt, Senseible is NOT:
- a statutory auditor or verifier
- a carbon registry or exchange
- a financial advisor, NBFC, or investment intermediary
- a government authority or regulator

All outputs are assistive, inferential, and non-binding in nature.

**1.2 Scope of Services**

Senseible automated software services that convert business (GST, invoices, supply chain records, voice inputs) and operational data into:
- estimated carbon emissions
- ESG indicators
- climate-finance eligibility signals
- AI-generated sustainability intelligence
- carbon monetization pathways
- operational insights derived from proprietary models.

Services are automated, probabilistic, model-based estimates and dependent on data quality and regulatory context, derived from user-provided data and third-party datasets.`
      },
      {
        title: '2. User Eligibility & Responsibilities',
        content: `The User represents and warrants that:
- Lawful ownership and authorization of all submitted data
- Accuracy and completeness of inputs
- It holds all necessary rights to provide such data
- Responsibility for statutory filings, disclosures and regulatory compliance.

Senseible does not independently verify raw data unless contractually agreed.`
      },
      {
        title: '3. Data Retention, Training & Derived Intelligence',
        content: `- Unauthenticated user data is retained for up to three (3) months.
- Authenticated or paid user data is retained for up to eighteen (18) months.
- Data may be used to train Senseible's proprietary AI carbon layers, inference systems and proprietary ESG models.
- Users may opt out of future model training by emailing impact@senseible.earth.
- Aggregated, anonymized, or derived learnings incorporated into models are non-reversible and non-deletable.`
      },
      {
        title: '4. Data Sharing & Commercial Enablement',
        content: `User data is never sold.

Data may be shared solely to enable:
- green loans or climate finance
- carbon credit issuance or trading
- compliance with regulatory requirements`
      },
      {
        title: '5. AI Outputs, Limitations & No-Reliance (Disclaimers)',
        content: `- All outputs are probabilistic estimates, not certified measurements.
- May vary due to data, model, or regulation changes.
- No guarantee is provided regarding accuracy, regulatory acceptance, credit issuance, pricing, or liquidity.

Senseible disclaims liability for decisions made using AI outputs. Users assume all risk arising from reliance on outputs.`
      },
      {
        title: '6. Carbon, ESG & Greenwashing Disclaimer',
        content: `- Emission calculations are estimates based on industry factors and inferred scopes (Scope 1–3 where applicable).

Senseible does not guarantee verification, registry approval, or avoidance of greenwashing risks.

Senseible makes no representation that:
- Emissions are certified or verified,
- Outputs meet any registry methodology,
- Use prevents greenwashing claims. Final authority rests with independent third parties.`
      },
      {
        title: '7. Financial & Investment Non-Advice',
        content: `- Nothing on the Platform constitutes financial, investment, lending, or regulatory advice.
- Financing eligibility signals are indicative only.
- Final decisions rest with third-party lenders, registries, or buyers.`
      },
      {
        title: '8. Payments, Taxes, Pricing & Refunds',
        content: `- All fees are prepaid unless stated otherwise.
- Fees for completed AI processing or reports are non-refundable.`
      },
      {
        title: '9. Intellectual Property',
        content: `- Senseible retains all rights in its models, software, workflows, benchmarks, analytics, and derived insights.
- Users retain ownership of raw input data.
- Users are granted a limited, non-transferable license to use the Services.
- Reverse engineering, model extraction, or competitive use of outputs is prohibited.`
      },
      {
        title: '10. Third-Party Dependencies',
        content: `- Services may rely on third-party infrastructure, data sources, registries, or partners.
- Senseible is not liable for third-party failures, downtime, or policy changes.`
      },
      {
        title: '11. Suspension & Termination',
        content: `- Senseible may suspend or terminate access for fraud, misuse, regulatory risk, or data manipulation without obligation to disclose internal detection logic.
- No refunds in suspension either.`
      },
      {
        title: '12. Limitation of Liability',
        content: `Senseible is not liable for indirect, incidental, or consequential damages, including lost revenue or credits.

Total liability is capped at fees paid by the user in the preceding twelve (12) months.`
      },
      {
        title: '13. Regulatory Change & Service Modification',
        content: `Climate, carbon, and ESG regulations are evolving.

Senseible may modify, suspend, or discontinue Services to remain compliant and bears no liability for regulatory changes.`
      },
      {
        title: '14. Governing Law & Jurisdiction',
        content: `These Terms are governed by the laws of India. Courts at Gurugram, Haryana shall have exclusive jurisdiction.

**Indemnity**

User shall indemnify Senseible against claims arising from:
- Unlawful data submission,
- Misuse of outputs,
- Regulatory violations.`
      },
      {
        title: '15. Grievance Redressal',
        content: `Contact: impact@senseible.earth

Grievance Officer details will be provided upon request.`
      }
    ]
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    slug: 'privacy',
    effectiveDate: '27 August 2024',
    lastUpdated: '17 December 2025',
    sections: [
      {
        title: '0. Introduction & Legal Identity',
        content: `This Privacy Policy ("Policy") governs the collection, use, processing, storage, transfer, and protection of information by: INSPYR FINNOVATION PRIVATE LIMITED, operating under the brand name "Senseible" ("Senseible", "Company", "We", "Us").

This Policy applies to all users, customers, partners, and entities accessing or using the Senseible platform ("User", "You").`
      },
      {
        title: '1. Scope & Applicability',
        content: `This Policy applies to all users, including visitors, registered users, and paid customers across India, emerging markets, and other jurisdictions where Senseible operates.

Senseible processes data as:
- (a) Data Fiduciary / Controller for direct users, and
- (b) Data Processor for enterprise, banking, or institutional customers where contractually agreed.

This Policy is designed to align with:
- India Digital Personal Data Protection Act, 2023
- GDPR principles (where applicable)
- Emerging market data protection regimes`
      },
      {
        title: '2. Data We Collect',
        content: `Senseible may collect and process the following categories of data:

**(a) Business & Financial Data**
GST details, invoices, supply chain data, transactional records, operational metrics, accounting data.

**(b) Sustainability & ESG Data**
Activity data, emissions-related information, IoT/satellites data, derived sustainability indicators.

**(c) Voice & Interaction Data**
Voice inputs, transcripts, conversational logs used for onboarding and support.

**(d) Technical & Usage Data**
Device information, IP address, logs, access timestamps, platform usage metrics and patterns.

**(e) Account & Identity Data**
Name, email, authentication credentials, organization details.`
      },
      {
        title: '3. Purpose of Data Processing',
        content: `Data is processed strictly for:
- Carbon and emissions estimation
- ESG intelligence and reporting
- Climate finance, carbon monetization enablement and credit eligibility signals
- Fraud, anomaly, risk, and misuse detection
- Platform security and integrity
- Improving AI carbon models, services, and platform performance`
      },
      {
        title: '4. AI Processing & Model Training',
        content: `Senseible employs AI systems including OCR, large language models, anomaly detection, and proprietary emission inference models.

- (a) Unauthenticated user data is retained for up to three (3) months.
- (b) Authenticated or paid-user data is retained for up to eighteen (18) months.
- (c) Data may be used to train, fine-tune, and improve proprietary AI systems.
- (d) Users may opt out of future AI training by written notice. By emailing impact@senseible.earth.
- (e) Aggregated, anonymized, and learned model parameters are irreversible and non-deletable.`
      },
      {
        title: '5. Data Sharing & Disclosure',
        content: `Senseible does not sell personal or business data.

Data may be disclosed only:
- to enable green loans, registries, partners, financing, climate finance, or carbon credit transactions,
- to comply with legal or regulatory obligations.`
      },
      {
        title: '6. Data Storage & Security',
        content: `Data is stored using secure cloud infrastructure with access controls, encryption, and regional caching where required. Reasonable technical and organizational safeguards are implemented to prevent unauthorized access or misuse.

Senseible implements industry-standard safeguards including:
- encryption at rest and in transit,
- role-based access controls,
- audit logs and monitoring,
- incident response procedures.`
      },
      {
        title: '7. Legal Basis & Compliance',
        content: `Senseible processes data in compliance with:
- India Digital Personal Data Protection Act, 2023
- Applicable emerging market data laws
- GDPR principles where applicable

Processing is based on user consent, contractual necessity, or legitimate interest.`
      },
      {
        title: '8. Data Subject / User Rights',
        content: `Subject to applicable law, Users may:
- request access or correction of data,
- request deletion of identifiable personal data,
- withdraw consent for AI training,
- raise grievances or complaints.

Certain rights may be limited where data has been anonymized or aggregated.`
      },
      {
        title: '9. Data Retention & Deletion',
        content: `Data is retained only for as long as necessary for stated purposes, contractual obligations, or legal requirements.

Upon termination, data may be deleted or anonymized except where retention is legally required or incorporated into aggregated intelligence. Retention periods may be extended for regulatory, audit, training, or dispute resolution purposes.`
      },
      {
        title: '10. Sub-Processors & Third Parties',
        content: `Senseible may engage sub-processors including cloud infrastructure providers, AI service vendors, and analytics partners.

Such sub-processors are bound by contractual data protection obligations and confidentiality.`
      },
      {
        title: '11. Cross-Border Transfers',
        content: `Where data is processed outside the User's jurisdiction, Senseible ensures appropriate contractual, technical, and organizational safeguards.

Senseible does not guarantee data localization unless contractually agreed.`
      },
      {
        title: '12. Children\'s Data',
        content: `Senseible services are not intended for individuals under eighteen (18) years of age.`
      },
      {
        title: '13. Changes to This Policy',
        content: `Senseible may update this Policy to reflect legal, regulatory, or operational changes.

Continued use of the Services constitutes acceptance of the updated Policy.`
      },
      {
        title: '14. Grievance Redressal & Contact',
        content: `Email: impact@senseible.earth

Grievance Officer details will be provided upon request.`
      }
    ]
  },
  {
    id: 'dpa',
    title: 'Data Processing Addendum',
    slug: 'dpa',
    effectiveDate: '27 August 2024',
    lastUpdated: '17 December 2025',
    sections: [
      {
        title: 'Introduction',
        content: `This Data Processing Addendum ("DPA") forms an integral part of the master services agreement, terms of service, or other binding commercial agreement ("Agreement") entered into between:

INSPYR FINNOVATION PRIVATE LIMITED, operating under the brand name "Senseible" ("Processor"), and the counterparty identified in the Agreement ("Controller").

This DPA governs the processing of Personal Data and business data by Senseible on behalf of the Controller and is drafted to comply with applicable data protection laws including the Digital Personal Data Protection Act, 2023 (India), the General Data Protection Regulation (EU), and analogous emerging-market data protection frameworks.`
      },
      {
        title: 'Definitions & Interpretation',
        content: `Capitalized terms not defined herein shall have the meanings assigned to them under the Agreement or applicable data protection law.

This DPA shall be interpreted to ensure lawful processing while preserving Senseible's intellectual property, model integrity, platform security, and commercial viability.`
      },
      {
        title: 'Roles of the Parties',
        content: `(a) The Controller determines the purposes and means of processing Personal Data.

(b) Senseible acts as a Data Processor when processing data on documented instructions of the Controller.

(c) Where Senseible independently determines processing purposes for its platform operations, Senseible acts as an independent Data Controller, except where Senseible independently determines purposes for its platform, in which case Senseible acts as Data Controller.`
      },
      {
        title: 'Scope of Processing',
        content: `**Categories of Data:**
- Business and financial data including GST records, invoices, and transaction data
- Operational, ESG, and emissions-related data
- Identifiers, logs, metadata, and technical records

**Purpose of Processing:**
- Carbon emissions estimation and ESG analytics
- Climate finance enablement and reporting support
- Platform security, fraud prevention, and compliance monitoring

**Duration:**
Processing shall continue for the term of the Agreement unless extended by legal or regulatory requirements.`
      },
      {
        title: 'Processing Instructions',
        content: `Senseible shall process Personal Data only on documented instructions of the Controller, unless required to do so by applicable law, in which case Senseible shall inform the Controller unless prohibited by law.`
      },
      {
        title: 'Confidentiality',
        content: `Senseible ensures that all persons authorized to process Personal Data are bound by confidentiality obligations and receive appropriate training regarding data protection responsibilities.`
      },
      {
        title: 'Technical & Organizational Measures',
        content: `Senseible implements appropriate security measures including:
- Encryption of data at rest and in transit
- Role-based access controls and least-privilege access
- Continuous monitoring, logging, and audit trails
- Incident detection, response, and remediation procedures`
      },
      {
        title: 'Sub-Processors',
        content: `Senseible may engage sub-processors including cloud infrastructure providers and AI service vendors.

Senseible remains responsible for ensuring that sub-processors provide adequate data protection safeguards.

The Controller grants general authorization for such sub-processors unless expressly objected to in writing.`
      },
      {
        title: 'Cross-Border Transfers',
        content: `Personal Data may be processed outside the Controller's jurisdiction subject to appropriate safeguards including contractual protections and technical measures.

No data localization obligation is assumed unless explicitly agreed in writing.`
      },
      {
        title: 'Data Subject Rights Assistance',
        content: `Senseible shall provide reasonable assistance to enable the Controller to respond to lawful data subject requests, taking into account the nature of processing and information available to Senseible.`
      },
      {
        title: 'Personal Data Breach',
        content: `Senseible shall notify the Controller of a confirmed Personal Data breach without undue delay and in any event within seventy-two (72) hours of becoming aware of such breach.`
      },
      {
        title: 'Audits & Compliance Verification',
        content: `The Controller may conduct audits of Senseible's compliance with this DPA upon reasonable notice, subject to confidentiality and security restrictions. Independent third-party certifications may satisfy audit obligations.`
      },
      {
        title: 'Data Return, Deletion & Retention',
        content: `Upon termination of the Agreement, Senseible shall delete or return Personal Data, unless retention is required by law or the data has been irreversibly anonymized and incorporated into aggregated model intelligence.`
      },
      {
        title: 'Liability',
        content: `Liability under this DPA shall be subject to the limitations, exclusions, and caps set forth in the Agreement. No party assumes unlimited liability under this DPA.`
      },
      {
        title: 'Governing Law',
        content: `This DPA shall be governed by the laws of India.`
      },
      {
        title: 'Contact',
        content: `Data protection inquiries may be directed to:

impact@senseible.earth`
      }
    ]
  },
  {
    id: 'sla',
    title: 'Service Level Agreement',
    slug: 'sla',
    effectiveDate: '27 August 2024',
    lastUpdated: '17 December 2025',
    sections: [
      {
        title: 'Introduction',
        content: `This Service Level Agreement ("SLA") forms an integral part of the Master Services Agreement or Terms of Service ("Agreement") entered into between INSPYR FINNOVATION PRIVATE LIMITED, operating under the brand name "Senseible" ("Senseible"), and the customer identified in the applicable order form or agreement ("Customer").

This SLA defines service availability commitments, support obligations, exclusions, remedies, and risk allocation.`
      },
      {
        title: '1. Scope & Applicability',
        content: `This SLA governs service availability and support commitments for Senseible's platform services. This SLA applies solely to paid production services expressly designated as covered services.

Pilot, beta, trial, proof-of-concept, or free services are expressly excluded unless agreed in writing.`
      },
      {
        title: '2. Service Availability',
        content: `Senseible shall use commercially reasonable efforts to provide:
- Monthly platform availability target of 99.0%

Availability excludes:
1. scheduled maintenance,
2. emergency maintenance,
3. force majeure events,
4. third-party service failures (cloud providers, data sources, registries, payment gateways),
5. regulatory or government system outages.

Availability is calculated as total minutes in a month minus downtime, divided by total minutes. Downtime means the period during which core platform functions are unavailable to all users.`
      },
      {
        title: '3. Maintenance Windows',
        content: `Senseible may perform scheduled or emergency maintenance as necessary for security, compliance, or system stability, with or without advance notice where reasonable.`
      },
      {
        title: '4. Support Services',
        content: `Support is provided on a commercially reasonable efforts basis.

Response targets (not resolution guarantees):
- Critical issues: next business day
- High priority issues: two (2) business days
- Standard issues: five (5) business days

Support hours exclude public holidays unless otherwise agreed.`
      },
      {
        title: '5. Service Credits (Sole Remedy)',
        content: `If availability falls below the target:
- User may be eligible for service credits only.
- Credits are capped at one (1) month of fees.
- No cash refunds shall be issued.

Service credits constitute the sole and exclusive remedy.`
      },
      {
        title: '6. Exclusions & No Performance Guarantees',
        content: `Senseible makes no guarantees regarding:
- accuracy of AI outputs,
- carbon emission estimates,
- ESG indicators,
- regulatory acceptance,
- carbon credit issuance,
- financing outcomes.`
      },
      {
        title: '7. Customer Responsibilities',
        content: `Customer is responsible for:
- proper use of the Services,
- maintaining secure access credentials,
- providing accurate data inputs.`
      },
      {
        title: '8. SLA Hierarchy',
        content: `In the event of conflict, the following order applies:
1. Master Agreement / Terms of Service
2. Data Processing Addendum
3. This SLA`
      },
      {
        title: '9. Limitation of Liability',
        content: `Liability under this SLA is subject to the caps and exclusions in the master agreement.`
      },
      {
        title: '10. Governing Law',
        content: `This SLA is governed by the laws of India, unless otherwise agreed in writing.`
      },
      {
        title: '11. Contact',
        content: `Support and SLA notices:

Email: impact@senseible.earth`
      }
    ]
  },
  {
    id: 'ai-policy',
    title: 'AI & Data Processing Policy',
    slug: 'ai-policy',
    effectiveDate: '27 August 2024',
    lastUpdated: '6 December 2025',
    sections: [
      {
        title: 'Preamble',
        content: `This AI & Data Processing Governance Policy ("Policy") constitutes a binding, framework governing the design, development, deployment, operation, limitation, and legal positioning of artificial intelligence systems and data processing activities conducted by INSPYR FINNOVATION PRIVATE LIMITED, operating under the brand name "Senseible" ("Senseible", "Company").

This Policy is drafted to withstand scrutiny from regulators, financial institutions, enterprise customers, auditors, investors, and courts across India, the European Union, and emerging markets. It supersedes and replaces all prior AI‑related disclosures, summaries, or statements.`
      },
      {
        title: '0. Legal Characterisation of the Platform',
        content: `Senseible operates as a digital climate‑intelligence and data‑processing infrastructure provider. Senseible does not operate as an autonomous decision‑making system. All AI systems deployed by Senseible function as assistive analytical tools that generate probabilistic outputs based on statistical inference.

Senseible expressly disclaims classification as a regulated decision‑making authority, advisor, verifier, auditor, or certifying body under any jurisdiction.`
      },
      {
        title: '1. Purpose & Scope',
        content: `Senseible operates an AI-native climate infrastructure platform that transforms business data into carbon intelligence, ESG signals, and climate-finance enablement. This Policy exists to ensure transparency, accountability, and legal clarity around AI usage, data processing, and model governance.

This Policy establishes enforceable rules to: (a) allocate risk between Senseible and counterparties; (b) define lawful purposes and boundaries of AI use; (c) preserve the integrity of proprietary models; (d) prevent regulatory misclassification; and (e) mitigate systemic, operational, and model‑related risks.`
      },
      {
        title: '2. Classification of AI Systems',
        content: `Senseible deploys multiple AI systems including:
- Optical Character Recognition (OCR) for invoice and document ingestion
- Large Language Models (LLMs) for data normalization, categorization, and inference
- Emission Foundation Models for Scope 1–3 estimation
- Statistical anomaly, fraud, and risk‑detection systems
- Voice-based AI systems for MSME onboarding and interaction

All AI systems are assistive and inferential in nature and do not constitute decision-making authorities.`
      },
      {
        title: '3. Nature of AI Outputs',
        content: `AI-generated outputs are probabilistic estimates based on statistical modeling, historical datasets, and inferred patterns.

Outputs are not deterministic facts, certified measurements, or regulatory filings.

Variability may arise due to data quality, model evolution, regulatory changes, or third-party dependencies.`
      },
      {
        title: '4. Human Oversight & Responsibility',
        content: `Senseible maintains human oversight over system design, monitoring, and improvement.

Users remain solely responsible for interpreting outputs and ensuring compliance with applicable laws, audits, and disclosures.`
      },
      {
        title: '5. Data Inputs & Quality Dependency',
        content: `AI outputs are materially dependent on the quality, completeness, timeliness, and accuracy of input data. Senseible does not independently authenticate, audit, or verify raw data unless expressly agreed under a separate written instrument.`
      },
      {
        title: '6. Model Training & Learning',
        content: `Senseible uses user data to train, fine-tune, and improve proprietary AI models.

Training uses aggregated, anonymized, and non-identifiable datasets wherever feasible.

Users may opt out of future training use via written request.

Learnings already embedded into models cannot be reversed or extracted.`
      },
      {
        title: '7. Bias, Error & Drift',
        content: `AI systems may reflect biases present in training data.

Models may drift over time due to changing regulations, markets, or data patterns.

Senseible continuously monitors performance but does not guarantee bias-free or error-free outputs.`
      },
      {
        title: '8. Prohibited Uses',
        content: `Users may not:
- Rely on AI outputs as sole basis for regulatory filings
- Attempt to reverse engineer models
- Use outputs to train competing systems
- Misrepresent AI outputs as certified or verified results`
      },
      {
        title: '9. Data Security & Processing Controls',
        content: `Senseible applies encryption, access controls, environment segregation, audit logs, regional data caching, monitoring, and incident response mechanisms appropriate to the nature of the processing.

Data processing is restricted to authorized personnel and systems.`
      },
      {
        title: '10. Third-Party AI & Infrastructure',
        content: `Senseible may use third-party AI tools or infrastructure components.

Senseible is not liable for third-party model behavior, outages, or policy changes.`
      },
      {
        title: '11. Regulatory Alignment',
        content: `Senseible aligns AI governance with:
- India Digital Personal Data Protection Act, 2023
- Emerging global AI governance principles`
      },
      {
        title: '12. Limitation of AI Liability',
        content: `Senseible disclaims liability for decisions made solely based on AI outputs.

AI systems are provided "as-is" and "as-available."`
      },
      {
        title: '13. Policy Updates',
        content: `This Policy may be updated to reflect regulatory, technical, or operational changes.

Continued use of the Services constitutes acceptance.`
      },
      {
        title: '14. Contact',
        content: `For questions or opt-out requests, contact: impact@senseible.earth`
      }
    ]
  }
];

export const getLegalDocumentBySlug = (slug: string): LegalDocument | undefined => {
  return legalDocuments.find(doc => doc.slug === slug);
};
