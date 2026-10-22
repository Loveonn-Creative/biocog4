// Checks for the contact form and every page that sends through it
// (send-contact-notification). Pure, so the website tests run every branch.
//
// Goal: stop empty, fake and dummy submissions without turning away a real
// person. So the checks reject only what is certainly not reachable (a
// disposable inbox, a placeholder address, a domain with no mail server, a
// number that cannot exist) and let anything uncertain through: a failed DNS
// lookup, a landline, a foreign number with its country code.
import { checkEmail } from './resourceLead.ts';

export const CONTACT_LIMITS = { perIpPerDay: 10, perEmailPerDay: 5, name: [2, 120], message: [2, 8000] } as const;

export type ContactField = 'name' | 'email' | 'phone' | 'message';
export type ContactVerdict =
  | { ok: true; name: string; email: string; phone: string | null; message: string }
  | { ok: false; field: ContactField; error: string };

export const CONTACT_MESSAGES = {
  name: 'Add your name so we know who to reply to.',
  email: 'Enter an email address you check, like name@company.com.',
  emailTemporary: 'Temporary inboxes cannot receive our reply. Use an email you check.',
  emailNoMail: 'This email domain cannot receive mail. Check the spelling, or use another email.',
  phone: 'Enter a number we can call or WhatsApp. Add the country code if you are outside India.',
  message: 'Add a line about what you need.',
  tooMany: 'We have your messages from today and will reply. For anything urgent, message us on WhatsApp.',
} as const;

const text = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');
const PLACEHOLDER_NAMES = new Set(['test', 'testing', 'tester', 'asdf', 'asdfgh', 'qwerty', 'abc', 'xyz', 'fake', 'dummy', 'name', 'your name', 'na', 'n/a', 'none', 'null']);

/** True for numbers no real line has: one digit repeated, or a plain counting run. */
function isDummyNumber(national: string): boolean {
  if (/^(\d)\1+$/.test(national)) return true;
  return '01234567890123456789'.includes(national) || '98765432109876543210'.includes(national);
}

/**
 * Phone numbers, read the way people in India write them. Accepted:
 * 10-digit mobiles and landlines (98xxxxxxxx, 1123456789), the same with a
 * leading 0, 91 or +91, and any other country written with + and its code
 * (8 to 15 digits). Empty is fine where the form makes it optional.
 */
export function checkPhone(raw: unknown): { ok: true; phone: string | null } | { ok: false } {
  const typed = text(raw);
  if (!typed) return { ok: true, phone: null };
  const compact = typed.replace(/[\s\-().]/g, '');
  if (!/^\+?\d+$/.test(compact)) return { ok: false };
  const plus = compact.startsWith('+');
  const digits = plus ? compact.slice(1) : compact;
  let national: string | null = null;
  if (plus && digits.startsWith('91')) national = digits.slice(2);
  else if (!plus && digits.length === 12 && digits.startsWith('91')) national = digits.slice(2);
  else if (!plus && digits.length === 11 && digits.startsWith('0')) national = digits.slice(1);
  else if (!plus && digits.length === 10) national = digits;
  if (national !== null) {
    if (!/^[1-9]\d{9}$/.test(national) || isDummyNumber(national)) return { ok: false };
    return { ok: true, phone: `+91${national}` };
  }
  if (plus && /^[1-9]\d{7,14}$/.test(digits) && !isDummyNumber(digits.slice(-10))) return { ok: true, phone: `+${digits}` };
  return { ok: false };
}

/** Everything that needs no network. The caller then checks the email domain's mail server. */
export function checkContact(raw: Record<string, unknown>): ContactVerdict {
  const name = text(raw.name).slice(0, CONTACT_LIMITS.name[1]);
  if (name.length < CONTACT_LIMITS.name[0] || !/\p{L}/u.test(name) || PLACEHOLDER_NAMES.has(name.toLowerCase())) return { ok: false, field: 'name', error: CONTACT_MESSAGES.name };
  const email = checkEmail(raw.email);
  if (!email.ok) {
    const error = email.reason === 'disposable' ? CONTACT_MESSAGES.emailTemporary
      : email.reason === 'typo' && email.suggestion ? `Check the spelling: did you mean ${email.suggestion}?`
      : CONTACT_MESSAGES.email;
    return { ok: false, field: 'email', error };
  }
  const phone = checkPhone(raw.phone);
  if (!phone.ok) return { ok: false, field: 'phone', error: CONTACT_MESSAGES.phone };
  const message = typeof raw.message === 'string' ? raw.message.trim().slice(0, CONTACT_LIMITS.message[1]) : '';
  if (message.replace(/\s/g, '').length < CONTACT_LIMITS.message[0]) return { ok: false, field: 'message', error: CONTACT_MESSAGES.message };
  return { ok: true, name, email: email.email, phone: phone.phone, message };
}
