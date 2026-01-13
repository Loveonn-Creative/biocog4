export interface VoiceCommand {
  patterns: RegExp[];
  action: string;
  route?: string;
  description: string;
}

export const voiceCommands: VoiceCommand[] = [
  {
    patterns: [
      /go to (the )?dashboard/i,
      /show (me )?(my )?dashboard/i,
      /open dashboard/i,
    ],
    action: 'navigate',
    route: '/dashboard',
    description: 'Go to Dashboard',
  },
  {
    patterns: [
      /upload (an? )?(invoice|document|bill)/i,
      /scan (an? )?(invoice|document|bill)/i,
      /go to upload/i,
      /go home/i,
    ],
    action: 'navigate',
    route: '/',
    description: 'Upload Invoice',
  },
  {
    patterns: [
      /show (me )?(my )?emissions?/i,
      /check (my )?carbon/i,
      /view emissions?/i,
    ],
    action: 'navigate',
    route: '/dashboard',
    description: 'View Emissions',
  },
  {
    patterns: [
      /go to pricing/i,
      /show (me )?pricing/i,
      /check (the )?plans?/i,
      /upgrade/i,
    ],
    action: 'navigate',
    route: '/pricing',
    description: 'View Pricing',
  },
  {
    patterns: [
      /generate (a )?report/i,
      /create (a )?report/i,
      /go to reports?/i,
      /show (me )?(my )?reports?/i,
    ],
    action: 'navigate',
    route: '/reports',
    description: 'Generate Report',
  },
  {
    patterns: [
      /verify (my )?(carbon|emissions?|data)/i,
      /go to verif(y|ication)/i,
      /start verification/i,
    ],
    action: 'navigate',
    route: '/verify',
    description: 'Verify Carbon',
  },
  {
    patterns: [
      /monetize/i,
      /carbon credits?/i,
      /sell (my )?carbon/i,
      /go to monetize/i,
    ],
    action: 'navigate',
    route: '/monetize',
    description: 'Monetize Carbon',
  },
  {
    patterns: [
      /go to (my )?profile/i,
      /show (my )?profile/i,
      /edit (my )?profile/i,
    ],
    action: 'navigate',
    route: '/profile',
    description: 'View Profile',
  },
  {
    patterns: [
      /go to settings?/i,
      /open settings?/i,
      /show settings?/i,
    ],
    action: 'navigate',
    route: '/settings',
    description: 'Open Settings',
  },
  {
    patterns: [
      /talk to (the )?ai/i,
      /ask (the )?ai/i,
      /go to intelligence/i,
      /open (the )?chat/i,
      /esg (head|advisor|assistant)/i,
    ],
    action: 'navigate',
    route: '/intelligence',
    description: 'AI ESG Head',
  },
  {
    patterns: [
      /mrv (dashboard)?/i,
      /measurement reporting verification/i,
      /show mrv/i,
    ],
    action: 'navigate',
    route: '/mrv-dashboard',
    description: 'MRV Dashboard',
  },
  {
    patterns: [
      /contact (us|support)?/i,
      /get help/i,
      /need help/i,
      /support/i,
    ],
    action: 'navigate',
    route: '/contact',
    description: 'Contact Support',
  },
  {
    patterns: [
      /sign out/i,
      /log ?out/i,
      /logout/i,
    ],
    action: 'signout',
    description: 'Sign Out',
  },
  {
    patterns: [
      /sign in/i,
      /log ?in/i,
      /login/i,
    ],
    action: 'navigate',
    route: '/auth',
    description: 'Sign In',
  },
];

export const matchVoiceCommand = (transcript: string): VoiceCommand | null => {
  const normalized = transcript.toLowerCase().trim();
  
  for (const command of voiceCommands) {
    for (const pattern of command.patterns) {
      if (pattern.test(normalized)) {
        return command;
      }
    }
  }
  
  return null;
};

export const getCommandSuggestions = (): string[] => {
  return [
    "Go to dashboard",
    "Upload invoice",
    "Show my emissions",
    "Generate report",
    "Talk to AI",
    "Check pricing",
    "Verify carbon",
    "Monetize",
  ];
};
