// Gated resources (the sample ESG report): lead rules shared by the page and
// the esg-report-access edge function, so both accept exactly the same thing.
// Pure: no Deno, zod or Supabase imports.
//
// Only credible addresses get the report: the server rejects disposable and
// placeholder addresses and domains that cannot receive mail, and the report
// itself is delivered as a private link to the address given, so a made-up
// mailbox never receives it. Signed-in accounts (email already confirmed)
// download directly.

export const RESOURCE = {
  id: 'esg-report-sample-2026',
  title: 'Sample ESG Report 2026',
  fileName: 'Senseible-Sample-ESG-Report-2026.pdf',
  pages: 64,
  path: '/esg-report-sample',
} as const;

/** Version of the notice shown beside the form; stored with each lead as proof of what was shown. */
export const NOTICE_VERSION = 'resource-lead-2026-10-16b';
/** Visitors' details are kept 90 days, inside the Privacy Policy's three months for unauthenticated data. */
export const LEAD_RETENTION_DAYS = 90;
export const LINK_VALID_DAYS = 7;
export const MAX_DOWNLOADS_PER_LINK = 25;

export const INDUSTRIES = [
  { id: 'manufacturing', label: 'Manufacturing' },
  { id: 'textiles', label: 'Textiles and apparel' },
  { id: 'metals', label: 'Steel, aluminium and metals' },
  { id: 'chemicals', label: 'Chemicals and pharma' },
  { id: 'food_agri', label: 'Food and agriculture' },
  { id: 'logistics', label: 'Logistics and transport' },
  { id: 'construction', label: 'Construction and real estate' },
  { id: 'it_services', label: 'IT and services' },
  { id: 'finance', label: 'Banking and finance' },
  { id: 'consulting', label: 'Consulting and advisory' },
  { id: 'other', label: 'Other' },
] as const;

export const ROLES = [
  { id: 'founder', label: 'Founder, owner or CXO' },
  { id: 'sustainability', label: 'Sustainability or ESG' },
  { id: 'finance', label: 'Finance' },
  { id: 'operations', label: 'Operations or plant' },
  { id: 'procurement', label: 'Procurement or supply chain' },
  { id: 'consultant', label: 'Consultant or advisor' },
  { id: 'lender', label: 'Lender or investor' },
  { id: 'other', label: 'Other' },
] as const;

export const NEEDS = [
  { id: 'buyer_request', label: 'A buyer asked for ESG or carbon data' },
  { id: 'brsr', label: 'Preparing BRSR or BRSR Core' },
  { id: 'finance', label: 'Green loan or investor due diligence' },
  { id: 'export', label: 'CBAM or EU export requirements' },
  { id: 'advising', label: 'Advising clients' },
  { id: 'benchmark', label: 'Seeing what a good report looks like' },
] as const;

export type IndustryId = (typeof INDUSTRIES)[number]['id'];
export type RoleId = (typeof ROLES)[number]['id'];
export type NeedId = (typeof NEEDS)[number]['id'];

export const LIMITS = { name: [2, 80], company: [2, 120] } as const;

export interface ResourceLead {
  name: string;
  email: string;
  company: string;
  industry: IndustryId;
  role: RoleId;
  need: NeedId;
  marketing: boolean;
}
export type LeadField = keyof ResourceLead | 'form';
export type LeadErrors = Partial<Record<LeadField, string>>;

const text = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');
const inList = <T extends { id: string }>(list: readonly T[], v: string) => list.some((x) => x.id === v);

// ---------------------------------------------------------------------------
// Email checks
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

/** Known disposable and temporary inbox domains (kept short: patterns and the MX check catch the rest). */
export const DISPOSABLE_DOMAINS = new Set([
  '0-mail.com', '10minutemail.com', '10minutemail.net', '10minmail.com', '20minutemail.com',
  'anonbox.net', 'anonymbox.com', 'burnermail.io', 'byom.de', 'chacuo.net', 'deadaddress.com',
  'discard.email', 'discardmail.com', 'dispostable.com', 'dropmail.me', 'easytrashmail.com', 'emailfake.com',
  'emailondeck.com', 'emailtemporanea.net', 'fakeinbox.com', 'fakemail.net', 'fakemailgenerator.com',
  'filzmail.com', 'getairmail.com', 'getnada.com', 'gettempmail.com', 'guerrillamail.biz', 'guerrillamail.com',
  'guerrillamail.de', 'guerrillamail.info', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamailblock.com',
  'harakirimail.com', 'incognitomail.org', 'inboxbear.com', 'inboxkitten.com', 'instant-mail.de', 'jetable.org',
  'kurzepost.de', 'linshiyouxiang.net', 'mail-temp.com', 'mail.tm', 'mail7.io', 'mailcatch.com', 'maildrop.cc',
  'mailexpire.com', 'mailforspam.com', 'mailinator.com', 'mailinator.net', 'mailinator2.com', 'mailnesia.com',
  'mailnull.com', 'mailpoof.com', 'mailsac.com', 'mailtemp.info', 'mailtothis.com', 'meltmail.com',
  'mintemail.com', 'moakt.com', 'mohmal.com', 'mt2015.com', 'mytemp.email', 'mytrashmail.com', 'nada.email',
  'neverbox.com', 'no-spam.ws', 'nowmymail.com', 'nwytg.net', 'one-time.email', 'onetimemail.net',
  'owlymail.com', 'pokemail.net', 'proxymail.eu', 'rcpt.at', 'rootfest.net', 'sharklasers.com', 'shieldemail.com',
  'smailpro.com', 'spam4.me', 'spambog.com', 'spambox.us', 'spamgourmet.com', 'spamex.com', 'spamfree24.org',
  'spamgob.com', 'spamherelots.com', 'spaml.de', 'spammotel.com', 'tafmail.com', 'temp-mail.io', 'temp-mail.org',
  'tempail.com', 'tempemail.co', 'tempemail.net', 'tempinbox.com', 'tempmail.dev', 'tempmail.net',
  'tempmail.plus', 'tempmailaddress.com', 'tempmailo.com', 'tempr.email', 'tempsky.com', 'temporary-mail.net',
  'temporarymail.com', 'thankyou2010.com', 'throwam.com', 'throwawaymail.com', 'tmail.ws', 'tmailinator.com',
  'tmpmail.net', 'tmpmail.org', 'trash-mail.com', 'trashmail.com', 'trashmail.de', 'trashmail.io',
  'trashmail.net', 'trashmail.ws', 'trbvm.com', 'veryrealemail.com', 'wegwerfmail.de', 'wegwerfmail.net',
  'yepmail.net', 'yopmail.com', 'yopmail.fr', 'yopmail.net', 'zetmail.com', 'zippymail.info', 'zoemail.org',
  'grr.la', 'guerrillamail.co', 'spam.la', 'emltmp.com', 'tmpbox.net', 'mailto.plus',
  'fexpost.com', 'fexbox.org', 'mailgolem.com', 'luxusmail.org',
]);

/** Words that only temporary-inbox services put in their domain or mail-server names. */
const DISPOSABLE_PATTERN = /(temp-?mail|tempinbox|10minute|minutemail|throwaway|disposable|trashmail|trash-mail|guerrilla|mailinator|yopmail|fakeinbox|fakemail|burnermail|spambox|spamgourmet|wegwerf|dropmail|mailnesia|maildrop|sharklasers|getnada|mohmal|emailondeck|mailcatch|jetable)/;

/** Reserved for documentation (RFC 2606/6761) or obvious placeholders. */
const PLACEHOLDER_DOMAINS = new Set(['example.com', 'example.org', 'example.net', 'test.com', 'test.in', 'domain.com', 'email.test', 'sample.com', 'abc.com', 'xyz.com', 'company.com', 'yourcompany.com', 'mycompany.com', 'mail.test', 'localhost']);
const PLACEHOLDER_TLDS = new Set(['test', 'example', 'invalid', 'localhost', 'local']);
const PLACEHOLDER_LOCAL = new Set(['test', 'testing', 'tester', 'fake', 'asdf', 'asdfgh', 'qwerty', 'noreply', 'no-reply', 'donotreply', 'example', 'sample', 'dummy', 'null', 'none', 'nobody', 'abc', 'xyz', 'aaa', 'abcd', 'abc123', '123', '1234', '12345']);

/** Personal mailbox providers: accepted (many MSME owners use one) but flagged for the team. */
export const FREE_MAILBOX_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'yahoo.in', 'ymail.com', 'rocketmail.com',
  'outlook.com', 'outlook.in', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'live.in', 'msn.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com', 'pm.me', 'rediffmail.com',
  'gmx.com', 'gmx.net', 'mail.com', 'yandex.com', 'yandex.ru', 'zohomail.in', 'tutanota.com', 'hey.com',
]);

/** Common typos of the largest providers, so a slip is caught before the link goes nowhere. */
const DOMAIN_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com',
  'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cm': 'gmail.com', 'gnail.com': 'gmail.com',
  'gmaill.com': 'gmail.com', 'gmail.in': 'gmail.com', 'gmali.com': 'gmail.com', 'gmeil.com': 'gmail.com',
  'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.co': 'yahoo.com', 'yahoo.con': 'yahoo.com',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'hotmail.con': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com', 'outlook.co': 'outlook.com', 'outlook.con': 'outlook.com',
  'rediffmai.com': 'rediffmail.com', 'redifmail.com': 'rediffmail.com', 'iclod.com': 'icloud.com', 'icloud.co': 'icloud.com',
};

export type EmailVerdict =
  | { ok: true; email: string; domain: string; freeMailbox: boolean; reason?: undefined; suggestion?: undefined }
  | { ok: false; reason: 'syntax' | 'disposable' | 'placeholder' | 'typo'; suggestion?: string };

export function isDisposableDomain(domain: string): boolean {
  const d = domain.toLowerCase();
  if (DISPOSABLE_DOMAINS.has(d) || DISPOSABLE_PATTERN.test(d)) return true;
  // Subdomains of a disposable service (e.g. abc.mailinator.com).
  const parts = d.split('.');
  for (let i = 1; i < parts.length - 1; i++) if (DISPOSABLE_DOMAINS.has(parts.slice(i).join('.'))) return true;
  return false;
}

/** Syntax, typo, placeholder and disposable checks: everything that needs no network. */
export function checkEmail(raw: unknown): EmailVerdict {
  const email = text(raw).toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return { ok: false, reason: 'syntax' };
  const at = email.lastIndexOf('@');
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return { ok: false, reason: 'syntax' };
  const typo = DOMAIN_TYPOS[domain];
  if (typo) return { ok: false, reason: 'typo', suggestion: `${local}@${typo}` };
  const tld = domain.slice(domain.lastIndexOf('.') + 1);
  if (PLACEHOLDER_DOMAINS.has(domain) || PLACEHOLDER_TLDS.has(tld) || PLACEHOLDER_LOCAL.has(local.replace(/\+.*$/, ''))) return { ok: false, reason: 'placeholder' };
  if (isDisposableDomain(domain)) return { ok: false, reason: 'disposable' };
  return { ok: true, email, domain, freeMailbox: FREE_MAILBOX_DOMAINS.has(domain) };
}

export const EMAIL_MESSAGES = {
  syntax: 'Enter a complete email address, like name@company.com.',
  disposable: 'Temporary inboxes cannot receive the report. Use your work email.',
  placeholder: 'Use an email address you check. The report link is sent there.',
  typo: 'Check the spelling of your email.',
  no_mail: 'This email domain cannot receive mail. Check it, or use your work email.',
} as const;

/** One answer from a DNS-over-HTTPS JSON lookup (dns.google / cloudflare-dns.com format). */
export interface DnsAnswer { Status?: number; Answer?: { type: number; data: string }[] }

/**
 * Reads the MX (and, when there is no MX, A/AAAA) lookups for a domain.
 * 'no_domain': the domain does not exist. 'no_mail': it publishes no mail
 * server, or a null MX. 'disposable': its mail is handled by a temporary-inbox
 * service. 'unknown': the lookup itself failed; the caller lets it through
 * because the emailed link still proves the mailbox.
 */
export function mxVerdict(mx: DnsAnswer | null, address: DnsAnswer | null): 'ok' | 'no_domain' | 'no_mail' | 'disposable' | 'unknown' {
  if (!mx || typeof mx.Status !== 'number') return 'unknown';
  if (mx.Status === 3) return 'no_domain';
  if (mx.Status !== 0) return 'unknown';
  const hosts = (mx.Answer ?? []).filter((a) => a.type === 15).map((a) => a.data.trim().split(/\s+/).pop()?.replace(/\.$/, '').toLowerCase() ?? '');
  if (hosts.length) {
    if (hosts.every((h) => h === '' || h === '.')) return 'no_mail';
    if (hosts.some((h) => isDisposableDomain(h))) return 'disposable';
    return 'ok';
  }
  // RFC 5321: with no MX, mail goes to the domain's own address record.
  if (!address || typeof address.Status !== 'number') return 'unknown';
  if (address.Status === 3) return 'no_domain';
  return (address.Answer ?? []).some((a) => a.type === 1 || a.type === 28) ? 'ok' : 'no_mail';
}

// ---------------------------------------------------------------------------
// Form validation
// ---------------------------------------------------------------------------

/**
 * Validates the whole form. A filled honeypot (`website`) or a form sent
 * faster than a person can type (`elapsedMs` under 2.5 s) is rejected without
 * saying why.
 */
export function validateLead(raw: Record<string, unknown>):
  | { ok: true; value: ResourceLead; freeMailbox: boolean; domain: string; errors?: undefined; suggestion?: undefined }
  | { ok: false; errors: LeadErrors; suggestion?: string; value?: undefined } {
  if (text(raw.website)) return { ok: false, errors: { form: 'Something went wrong. Please try again.' } };
  if (typeof raw.elapsedMs === 'number' && raw.elapsedMs < 2500) return { ok: false, errors: { form: 'Something went wrong. Please try again.' } };

  const errors: LeadErrors = {};
  const name = text(raw.name);
  if (name.length < LIMITS.name[0] || name.length > LIMITS.name[1] || !/\p{L}/u.test(name)) errors.name = 'Your name, so we know who asked.';
  const company = text(raw.company);
  if (company.length < LIMITS.company[0] || company.length > LIMITS.company[1] || !/[\p{L}\p{N}]/u.test(company)) errors.company = 'Your company or organisation.';
  const industry = text(raw.industry);
  if (!inList(INDUSTRIES, industry)) errors.industry = 'Choose the closest industry.';
  const role = text(raw.role);
  if (!inList(ROLES, role)) errors.role = 'Choose the closest role.';
  const need = text(raw.need);
  if (!inList(NEEDS, need)) errors.need = 'Choose what brings you here.';

  const verdict = checkEmail(raw.email);
  let suggestion: string | undefined;
  if (!verdict.ok) {
    errors.email = EMAIL_MESSAGES[verdict.reason];
    suggestion = verdict.suggestion;
  }

  if (Object.keys(errors).length || !verdict.ok) return { ok: false, errors, suggestion };
  return {
    ok: true,
    value: { name, email: verdict.email, company, industry: industry as IndustryId, role: role as RoleId, need: need as NeedId, marketing: raw.marketing === true },
    freeMailbox: verdict.freeMailbox,
    domain: verdict.domain,
  };
}

/** a***@company.com: enough for the person to recognise their address on screen. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 1) return email;
  return `${email[0]}${'*'.repeat(Math.min(Math.max(at - 1, 1), 6))}${email.slice(at)}`;
}

export const labelOf = (list: readonly { id: string; label: string }[], id: string) => list.find((x) => x.id === id)?.label ?? id;
