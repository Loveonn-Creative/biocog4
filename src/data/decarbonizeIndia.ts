/**
 * Decarbonize India: Impact Ambassador. Every line here comes from the
 * program document and poster. Things the document leaves open (cohort size,
 * fund cadence, global exposure terms) are not stated.
 */
import { LANES, PROGRAM_CONTACT, type LaneId } from '@/lib/ambassadorApplication';

export const DI_PATH = '/decarbonize-india';

export const hero = {
  eyebrow: "India's Green Sprint",
  title: ['Decarbonize', 'India'] as const,
  kicker: 'Impact Ambassador Program',
  line: 'Become the person who got a carbon-heavy business to switch.',
  rhythm: ['90 days', 'One mission', '18 countries'],
  open: 'Any background. 90 days of selfless work. Phase 1 starts October 2026.',
};

/** The wall in the hero: what an owner fears, painted into what they gain. */
export const wall = {
  grey: ['Higher costs', 'Tougher compliance', 'Lost orders'],
  green: ['Lower bills', 'Compliance ready', 'New buyers'],
};

export const realFight = {
  title: 'Keep the steel bottle. Then go where the carbon is.',
  habits: ['Paper straws', 'Cloth bags', 'Steel bottles', 'Switching off bulbs'],
  habitsNote: 'Good habits. A drop in the ocean.',
  sources: ['Textile dye units', 'Metal fabrication shops', 'Chemical plants', 'Data centres', 'Global supply chains', 'Buildings on central AC, 24/7'],
  sourcesNote: 'This is where emissions sit. This is where you show up.',
};

/** What an ambassador says, translated into what an owner hears. */
export const ownerSpeak = {
  title: "Owners don't buy 'save the planet'. They buy 'keep the doors open'.",
  rule: 'Lead with rupees and survival. The carbon story follows.',
  pairs: [
    { say: 'Cut your emissions', hear: 'Cut your power bill' },
    { say: 'Measure your carbon', hear: 'Find where money leaks' },
    { say: 'Go rooftop solar', hear: 'Make your own daytime power' },
    { say: 'Clean up your supply chain', hear: 'Stay on your big buyer\'s list' },
  ],
};

export const laneCopy: Record<LaneId, string> = {
  content: 'Reels, threads and articles that make carbon something people can see.',
  design: 'Visuals an owner understands in three seconds.',
  on_ground: 'Markets, clusters, colleges. Offline, in the local language.',
  msme_talks: 'Walk in, talk costs, leave them asking how to start.',
  esg_interviews: 'Get people who have done it to explain how, on record.',
  code: 'Small tools that answer an owner\'s real question.',
  creative: 'Podcast, street play, comic. If it moves the mission, it counts.',
};
export const lanes = LANES.map(l => ({ ...l, line: laneCopy[l.id] }));

export const sprint = {
  title: 'Daily motion. Big wins.',
  daily: ['Content out', 'Outreach sent', 'Conversations moving'],
  dailyNote: 'Activity keeps you moving. It is not the result.',
  wins: [
    'A campaign that clearly moved the needle',
    'An MSME that took real climate action because of you',
    'Content that measurably shifted the conversation',
  ],
  winsNote: 'Land 2 to 3 of these in 90 days.',
  signal: ['A new comment thread', 'A reshare', 'An owner asking, "How do I start?"'],
};

export const rewards = {
  title: 'Proof you did it. Not that you posted about it.',
  items: [
    { key: 'certificate', name: 'Certificate of Impact', line: 'Official recognition of selfless, real-world climate work.' },
    { key: 'fund', name: '₹1,50,000 Grand Impact Fund', line: 'For the top 3 contributors, put straight into a climate project in their own community. The amount may adjust with program scale and need.' },
    { key: 'global', name: 'Global exposure', line: 'Top certified ambassadors can get a fully sponsored chance with Senseible to travel, train and lead future global programs.' },
    { key: 'portfolio', name: 'A public body of work', line: 'Campaigns, interviews and projects you can point to for the rest of your life. Maybe to your grandkids too.' },
  ],
};

export const quote = 'We do not inherit the Earth from our ancestors; we borrow it from our children.';

export const filter = {
  title: "This is hard. That's the point.",
  points: [
    'Not a job, an internship or a resume line. Selfless service, start to finish.',
    'Nobody hands you tasks. You start, you do your homework, others follow.',
    'Owners say no. Getting one to track and cut carbon is a grind. You turn that no into yes.',
    'Here to post eco-quotes? This is not your room.',
    '90 days minimum. Short on time? Ask for a shorter run or two phases.',
  ],
  close: 'Still here? Good. Bas itna kafi hai.',
};

export const steps = [
  { n: '1', title: 'Know what you will talk about', line: 'Spend ten minutes on the Senseible platform. The interview asks about it.', href: '/platform' },
  { n: '2', title: 'Tell us your first move', line: 'Four short screens, in your own words.' },
  { n: '3', title: 'Interview in 7 to 14 days', line: 'We check how closely you read this page and how precisely you will act.' },
];

export const session = {
  title: 'Meet the team live. Every week.',
  line: 'A 30-minute online overview of the program. Ask anything this page did not answer.',
  whatsappHref: `https://wa.me/${PROGRAM_CONTACT.whatsappNumber}?text=${encodeURIComponent(PROGRAM_CONTACT.whatsappKeyword)}`,
  emailHref: `mailto:${PROGRAM_CONTACT.managerEmail}?subject=${encodeURIComponent('Decarbonize India live session')}`,
  note: 'Messages come in fast. The application and the weekly session get you answers quickest.',
};

export const faqs = [
  {
    question: "What if I can't give 90 days, or 8 hours a day?",
    answer: 'Impact counts more than hours. 90 days is the minimum to learn, start and build speed. You can ask for a shorter run or to work in two phases.',
  },
  {
    question: 'Is this a job or an internship?',
    answer: 'No. It is selfless climate service. You earn a Certificate of Impact and a public body of work, not a salary.',
  },
  {
    question: 'What is the ₹1,50,000 Grand Impact Fund?',
    answer: 'The top 3 contributors get funding put directly into a climate project in their own community. The amount may adjust with program scale and need.',
  },
  {
    question: 'What does the Certificate of Impact prove?',
    answer: 'It is an official certification recognising your selfless act, your real-world work and your direct contribution to climate impact.',
  },
  {
    question: 'What does global exposure mean?',
    answer: 'You work alongside climate volunteers worldwide, and top certified ambassadors can get a fully sponsored opportunity with Senseible to travel, train and lead future global programs.',
  },
  {
    question: 'When does it start, and when is the interview?',
    answer: 'Phase 1 starts in October 2026. Applications are reviewed on a rolling basis, and interviews happen 7 to 14 days after you apply.',
  },
  {
    question: 'Can I use AI to write my application?',
    answer: 'No. Write it yourself. Your own words are part of what the interview looks at.',
  },
  {
    question: 'I have a question this page does not answer.',
    answer: `Email ${PROGRAM_CONTACT.questionsEmail} after reading the page fully. Every email is read.`,
  },
];
