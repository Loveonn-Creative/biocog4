// Decarbonize India: Impact Ambassador application rules, shared by the page
// and the submit-ambassador-application edge function so both accept exactly
// the same thing. Pure: no Deno, zod or Supabase imports.
//
// The applicant writes every answer in their own words. Nothing here drafts,
// suggests or rewrites an answer.

export const LANES = [
  { id: 'content', label: 'Content' },
  { id: 'design', label: 'Design' },
  { id: 'on_ground', label: 'On-ground awareness' },
  { id: 'msme_talks', label: 'Talking to MSMEs' },
  { id: 'esg_interviews', label: 'Interviewing ESG leaders' },
  { id: 'code', label: 'Practical code' },
  { id: 'creative', label: 'Your own creative form' },
] as const;
export type LaneId = (typeof LANES)[number]['id'];

export const COMMITMENTS = [
  { id: 'full_90', label: 'All 90 days' },
  { id: 'shorter', label: 'A shorter run' },
  { id: 'two_phases', label: 'Two phases' },
] as const;
export type CommitmentId = (typeof COMMITMENTS)[number]['id'];

export const LIMITS = {
  name: [2, 80],
  city: [2, 80],
  firstMove: [80, 1200],
  lanes: [2, 3],
} as const;

export interface AmbassadorApplication {
  name: string;
  email: string;
  whatsapp: string | null;
  city: string;
  lanes: LaneId[];
  commitment: CommitmentId;
  firstMove: string;
  workLink: string | null;
  reviewedPlatform: true;
  ownWords: true;
  selfless: true;
}

export type FieldErrors = Partial<Record<keyof AmbassadorApplication | 'form', string>>;

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i;

/** Digits only, with an optional leading +; 8 to 15 digits. */
export function normaliseWhatsapp(v: unknown): string | null {
  const raw = text(v);
  if (!raw) return null;
  const plus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return '';
  return (plus ? '+' : '') + digits;
}

/**
 * Validates one step's worth of fields, or the whole application. Returns the
 * cleaned value when everything passes. A filled honeypot field (`company`)
 * is rejected without saying why.
 */
export function validateApplication(raw: Record<string, unknown>):
  | { ok: true; value: AmbassadorApplication; errors?: undefined }
  | { ok: false; errors: FieldErrors; value?: undefined } {
  const errors: FieldErrors = {};
  if (text(raw.company)) return { ok: false, errors: { form: 'Something went wrong. Please try again.' } };

  const name = text(raw.name);
  if (name.length < LIMITS.name[0] || name.length > LIMITS.name[1]) errors.name = 'Your name, as people know you.';

  const email = text(raw.email).toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) errors.email = 'An email you check. The interview invite goes here.';

  const whatsapp = normaliseWhatsapp(raw.whatsapp);
  if (whatsapp === '') errors.whatsapp = 'Use 8 to 15 digits, with your country code if outside India.';

  const city = text(raw.city);
  if (city.length < LIMITS.city[0] || city.length > LIMITS.city[1]) errors.city = 'The city or town you will work from.';

  const laneIds = new Set<string>(LANES.map(l => l.id));
  const lanes = Array.isArray(raw.lanes) ? [...new Set(raw.lanes.filter((l): l is string => typeof l === 'string' && laneIds.has(l)))] : [];
  if (lanes.length < LIMITS.lanes[0] || lanes.length > LIMITS.lanes[1]) errors.lanes = 'Pick 2 or 3 lanes.';

  const commitment = text(raw.commitment);
  if (!COMMITMENTS.some(c => c.id === commitment)) errors.commitment = 'Choose how you will give your time.';

  const firstMove = text(raw.firstMove);
  if (firstMove.length < LIMITS.firstMove[0]) errors.firstMove = `${LIMITS.firstMove[0] - firstMove.length} more characters, in your own words.`;
  else if (firstMove.length > LIMITS.firstMove[1]) errors.firstMove = `Keep it under ${LIMITS.firstMove[1]} characters.`;

  const workLink = text(raw.workLink) || null;
  if (workLink && (!URL_RE.test(workLink) || workLink.length > 300)) errors.workLink = 'A full link, starting with https://';

  if (raw.reviewedPlatform !== true) errors.reviewedPlatform = 'Review the platform first. The interview asks about it.';
  if (raw.ownWords !== true) errors.ownWords = 'Only your own words are accepted.';
  if (raw.selfless !== true) errors.selfless = 'This is selfless service, not a job or internship.';

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name, email, whatsapp, city,
      lanes: lanes as LaneId[],
      commitment: commitment as CommitmentId,
      firstMove, workLink,
      reviewedPlatform: true, ownWords: true, selfless: true,
    },
  };
}

/** Field groups per step of the form, in order. */
export const STEPS: { id: string; fields: (keyof AmbassadorApplication)[] }[] = [
  { id: 'you', fields: ['name', 'email', 'whatsapp', 'city'] },
  { id: 'lanes', fields: ['lanes', 'commitment'] },
  { id: 'move', fields: ['firstMove', 'workLink'] },
  { id: 'commit', fields: ['reviewedPlatform', 'ownWords', 'selfless'] },
];

/** Errors that belong to one step, so the form only blocks on what is on screen. */
export function stepErrors(errors: FieldErrors, step: number): FieldErrors {
  const fields = new Set<string>(STEPS[step]?.fields ?? []);
  return Object.fromEntries(Object.entries(errors).filter(([k]) => fields.has(k))) as FieldErrors;
}

export const PROGRAM_CONTACT = {
  manager: 'Palanisamy',
  managerEmail: 'palanisamy@senseible.earth',
  whatsappNumber: '917708540931',
  whatsappDisplay: '+91 77085 40931',
  whatsappKeyword: 'CLIMATE',
  questionsEmail: 'decarbonizeindia@senseible.earth',
} as const;
