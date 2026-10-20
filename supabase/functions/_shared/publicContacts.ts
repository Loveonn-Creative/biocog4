// Named public contacts (people's work emails and WhatsApp numbers). They are
// meant to be seen on the page, but are kept out of the repository, the
// JavaScript bundle and every prerendered or Markdown copy as plain text, so
// address harvesters scanning code or HTML do not find them. They are decoded
// only where they are shown (the browser) or used (server email sending).
// This is not a secret store: secrets live only in edge-function env vars.
// Role inboxes such as impact@ stay plain; they are the published contact.

const ENCODED = {
  dataOfficerEmail: 'c25laGFAc2Vuc2VpYmxlLmVhcnRo',
  coordinatorPalanisamyEmail: 'cGFsYW5pc2FteUBzZW5zZWlibGUuZWFydGg=',
  coordinatorVatsalyaEmail: 'dmF0c2FseWFAc2Vuc2VpYmxlLmVhcnRo',
  salesWhatsapp: 'OTE3MjYwMDY0NDc2',
  ambassadorWhatsapp: 'OTE3NzA4NTQwOTMx',
} as const;

export type PublicContactKey = keyof typeof ENCODED;

/** The contact in plain form, for display or for sending email. */
export function revealContact(key: PublicContactKey): string {
  return atob(ENCODED[key]);
}

/** A WhatsApp number ("91XXXXXXXXXX") as it is written on the page: "+91 XXXXX XXXXX". */
export function displayWhatsapp(key: 'salesWhatsapp' | 'ambassadorWhatsapp'): string {
  const n = revealContact(key);
  return `+${n.slice(0, 2)} ${n.slice(2, 7)} ${n.slice(7)}`;
}

/**
 * Text placeholders for contacts inside long copy (legal pages). The page
 * replaces them with the contact; static and Markdown copies replace them
 * with a pointer to the page instead, so no copy carries the plain value.
 */
const TOKEN = /\[\[contact:(\w+)\]\]/g;

export function fillContacts(text: string, mode: 'reveal' | 'static'): string {
  return text.replace(TOKEN, (whole, key: string) => {
    if (!(key in ENCODED)) return whole;
    return mode === 'reveal' ? revealContact(key as PublicContactKey) : 'shown on the live page at senseible.earth';
  });
}
