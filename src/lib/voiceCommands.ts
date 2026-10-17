// Voice navigation on Biocog Intelligence (opt-in, off by default). Only a
// short, exact command matches: every pattern is anchored to the whole
// utterance, so a question that merely contains "sign out" or "log in" is
// sent to the chat as a question, never acted on.

export interface VoiceCommand {
  patterns: RegExp[];
  action: 'navigate' | 'signout';
  route?: string;
  description: string;
}

/** Longest utterance treated as a command; anything longer is a question. */
export const MAX_COMMAND_WORDS = 6;

const OPEN = '(?:go to|open|show(?: me)?|take me to|view)';

const cmd = (sources: string[], rest: Omit<VoiceCommand, 'patterns'>): VoiceCommand => ({
  patterns: sources.map((s) => new RegExp(`^(?:${s})$`, 'i')),
  ...rest,
});

export const voiceCommands: VoiceCommand[] = [
  cmd([`${OPEN}(?: my| the)? dashboard`], { action: 'navigate', route: '/dashboard', description: 'Go to Dashboard' }),
  cmd(['(?:upload|scan)(?: an?)? (?:invoice|document|bill)', 'go to upload', 'go home'], { action: 'navigate', route: '/', description: 'Upload Invoice' }),
  cmd([`(?:${OPEN}|check)(?: my)? (?:emissions?|carbon)`], { action: 'navigate', route: '/dashboard', description: 'View Emissions' }),
  cmd([`${OPEN}(?: the)? (?:pricing|plans?)`, 'check(?: the)? plans?'], { action: 'navigate', route: '/pricing', description: 'View Pricing' }),
  cmd(['(?:generate|create)(?: a)? report', `${OPEN}(?: my)? reports?`], { action: 'navigate', route: '/reports', description: 'Generate Report' }),
  cmd(['verify(?: my)? (?:carbon|emissions?|data|records)', 'go to verif(?:y|ication)', 'start verification'], { action: 'navigate', route: '/verify', description: 'Verify Carbon' }),
  cmd(['monetize', `${OPEN} monetiz(?:e|ation)`], { action: 'navigate', route: '/monetize', description: 'Monetize Carbon' }),
  cmd([`(?:${OPEN}|edit)(?: my)? profile`], { action: 'navigate', route: '/profile', description: 'View Profile' }),
  cmd([`${OPEN}(?: my| the)? settings?`], { action: 'navigate', route: '/settings', description: 'Open Settings' }),
  cmd([`${OPEN}(?: the)? (?:intelligence|chat)`], { action: 'navigate', route: '/intelligence', description: 'Biocog Intelligence' }),
  cmd([`${OPEN}(?: the)? mrv(?: dashboard)?`], { action: 'navigate', route: '/mrv-dashboard', description: 'MRV Dashboard' }),
  cmd(['contact (?:us|support)', '(?:get|need) help'], { action: 'navigate', route: '/contact', description: 'Contact Support' }),
  cmd(['sign ?out', 'log ?out'], { action: 'signout', description: 'Sign Out' }),
  cmd(['sign ?in', 'log ?in'], { action: 'navigate', route: '/auth', description: 'Sign In' }),
  cmd([`${OPEN}(?: the)?(?: carbon| free)? calculators?`], { action: 'navigate', route: '/calculators', description: 'Open Calculators' }),
  cmd([`${OPEN}(?: the)? (?:product carbon footprint|pcf) calculator`], { action: 'navigate', route: '/calculators/product-carbon-footprint', description: 'PCF Calculator' }),
  cmd([`${OPEN}(?: the)? supplier (?:emissions?|risk|carbon) calculator`], { action: 'navigate', route: '/calculators/supplier-emissions-risk', description: 'Supplier Risk Calculator' }),
  cmd([`${OPEN}(?: the)? (?:solar|energy transition|renewable) calculator`], { action: 'navigate', route: '/calculators/energy-transition-savings', description: 'Energy Transition Calculator' }),
  cmd([`${OPEN}(?: the)? (?:logistics|freight) calculator`], { action: 'navigate', route: '/calculators/logistics-emissions', description: 'Logistics Calculator' }),
  cmd([`${OPEN}(?: the)? (?:carbon pricing|eu ets) calculator`], { action: 'navigate', route: '/calculators/carbon-pricing-impact', description: 'Carbon Pricing Calculator' }),
];

/** The utterance as a command candidate: lower case, no end punctuation or "please". */
export function normalizeUtterance(transcript: string): string {
  return transcript
    .toLowerCase()
    .replace(/[.!?,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^please /, '')
    .replace(/ please$/, '');
}

/** The command the whole utterance names, or null (then it is a question for the chat). */
export const matchVoiceCommand = (transcript: string): VoiceCommand | null => {
  const normalized = normalizeUtterance(transcript);
  if (!normalized || normalized.split(' ').length > MAX_COMMAND_WORDS) return null;
  for (const command of voiceCommands) {
    if (command.patterns.some((p) => p.test(normalized))) return command;
  }
  return null;
};

export const getCommandSuggestions = (): string[] => [
  'Go to dashboard',
  'Upload invoice',
  'Show my emissions',
  'Generate report',
  'Check plans',
  'Verify carbon',
];
