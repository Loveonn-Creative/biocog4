// What the trust seal may say. Each item is checkable: it links to the
// published document or method it names. No partner, customer or certification
// claims live here; company proof is added separately once approved.

export type ProofGroup = 'method' | 'data' | 'direction';

export interface ProofItem {
  key: string;
  mark: string;        // short typographic seal text, not a third-party logo
  name: string;
  group: ProofGroup;
  line: string;        // what it means for the user, one sentence
  href: string;        // where to check it
  external?: boolean;
}

export const PROOF_GROUP_LABEL: Record<ProofGroup, string> = {
  method: 'Methods we follow',
  data: 'How your data is held',
  direction: 'Where it points',
};

export const proofItems: ProofItem[] = [
  { key: 'ghg', mark: 'GHG', name: 'GHG Protocol', group: 'method', line: 'Scopes and Scope 3 categories are counted the way the Corporate and Scope 3 Standards define them.', href: 'https://ghgprotocol.org/standards', external: true },
  { key: 'ipcc', mark: 'IPCC', name: 'IPCC 2006 Guidelines', group: 'method', line: 'Fuel emission factors come from the IPCC default tables, with the source shown on every line.', href: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/', external: true },
  { key: 'cbam', mark: 'CBAM', name: 'EU Regulation 2023/956', group: 'method', line: 'CBAM figures follow the EU regulation text, including default values and the free-allocation phase-out.', href: 'https://eur-lex.europa.eu/eli/reg/2023/956/oj', external: true },
  { key: 'dpa', mark: 'DPA', name: 'Data Processing Addendum', group: 'data', line: 'Drafted for India’s Digital Personal Data Protection Act, 2023 and the EU GDPR. Read it before you upload.', href: '/legal/dpa' },
  { key: 'dpdp', mark: 'DPDP', name: 'Privacy Policy', group: 'data', line: 'Written to align with India’s DPDP Act, 2023: what is collected, why, and how to ask to see or correct it.', href: '/legal/privacy' },
  { key: 'hash', mark: 'SHA‑256', name: 'Document fingerprint', group: 'data', line: 'Every document is fingerprinted, so the same bill can never be counted twice.', href: '/trust' },
  { key: 'rls', mark: 'YOURS', name: 'Your records, your account', group: 'data', line: 'Records are visible to your account and the team you invite, enforced in the database itself.', href: '/trust' },
  { key: 'nz', mark: '2070', name: 'India’s net-zero target', group: 'direction', line: 'India committed to net zero by 2070 at COP26 in 2021. A verified record is where a business’s part of that starts.', href: '/net-zero' },
];
