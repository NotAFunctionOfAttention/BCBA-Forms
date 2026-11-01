// Suggested phrases for the BIP that depend on earlier answers.
// Each export takes the document's answers (`d`) and returns a list of phrases.
// Behavior keys match the phrases stored by the target behavior dropdown.
// Every phrase is a starting point the clinician edits to fit the client.

import { frag, cap, fmtDate } from '../util.js';

const BEHAVIORS = {
  aggression: {
    def: [
      'hitting, kicking, pushing, scratching, biting, or pinching another person, or throwing objects at another person',
      'any forceful contact between any part of the body, or a thrown object, and another person',
    ],
    onset: ['Physical contact, or release of a thrown object toward another person'],
    offset: ['3 seconds pass without physical contact or a thrown object', '5 seconds pass without physical contact'],
    ex: [
      'Hitting a staff member on the arm with an open or closed hand',
      'Kicking a peer during a transition',
      'Biting a caregiver’s hand',
      'Scratching a staff member’s arm',
      'Throwing a toy that strikes another person',
    ],
    nonex: [
      'High-fiving or hugging when the other person agrees',
      'Accidental contact while reaching for materials',
      'Rough-and-tumble play initiated by the other person',
      'Throwing a ball to another person during a game',
    ],
  },
  'self-injurious behavior (SIB)': {
    def: [
      'any behavior directed at the client’s own body that results in, or could result in, tissue damage, including head hitting, head banging against surfaces, self-biting, and skin picking or scratching',
      'striking the head or face with an open or closed hand, or striking the head against a surface',
    ],
    onset: ['Contact between the hand, teeth, or a surface and the client’s own body'],
    offset: ['3 seconds pass without self-directed contact', '5 seconds pass without self-directed contact'],
    ex: [
      'Hitting the side of the head with a closed fist',
      'Banging the head against a wall or table',
      'Biting the back of the hand',
      'Picking at the skin until it is broken',
      'Scratching the face or arms',
    ],
    nonex: [
      'Scratching an itch without breaking the skin',
      'Rubbing the eyes when tired',
      'Accidental bumps while moving',
      'Touching the face or hair without force',
    ],
  },
  elopement: {
    def: [
      'leaving, or attempting to leave, the designated area without permission by moving more than 3 feet away from the assigned staff member',
      'moving beyond the boundary of the assigned area, or out of the line of sight of the responsible adult, without permission',
    ],
    onset: ['The client moves more than 3 feet from the assigned area or staff member without permission', 'The client crosses the boundary of the assigned area'],
    offset: ['The client returns to, or is returned to, the assigned area', 'The client remains in the assigned area for 10 seconds'],
    ex: [
      'Running out of the therapy room when a task is presented',
      'Leaving the group area during circle time',
      'Running away from the caregiver in a parking lot',
      'Walking out of the classroom without permission',
    ],
    nonex: [
      'Leaving the area with permission or as part of a scheduled transition',
      'Walking to the bathroom after requesting it',
      'Moving to a different activity within the room when allowed',
    ],
  },
  'property destruction': {
    def: [
      'throwing, tearing, breaking, kicking, sweeping off surfaces, or writing on materials or furniture in a way that damages or could damage them',
      'any forceful contact with objects or furniture that damages, or could damage, the item, including throwing, tearing, and kicking',
    ],
    onset: ['Hand, foot, or body makes forceful contact with an object, or an object leaves the hand when thrown'],
    offset: ['5 seconds pass without forceful contact with objects'],
    ex: [
      'Throwing work materials off the table',
      'Tearing a worksheet or book',
      'Kicking a chair over',
      'Sweeping items off a shelf',
      'Writing on the walls or furniture',
    ],
    nonex: [
      'Throwing a ball during a game',
      'Tearing paper as part of a craft activity',
      'Dropping an item accidentally',
      'Putting materials away in a bin',
    ],
  },
  'tantrum behavior': {
    def: [
      'an episode of two or more of the following occurring together: crying or screaming above conversational volume, dropping to the floor, flailing the arms or legs, or stomping the feet',
    ],
    onset: ['Two or more of the defined responses occur within 5 seconds of each other'],
    offset: ['10 seconds pass without any of the defined responses', '30 seconds pass without any of the defined responses'],
    ex: [
      'Screaming and dropping to the floor when told it is time to leave the playground',
      'Crying loudly while kicking the legs on the floor',
      'Stomping the feet and screaming when an item is removed',
    ],
    nonex: [
      'Crying briefly after an injury',
      'Saying "no" or "I don’t want to" in a conversational voice',
      'Lying on the floor during a calm-down activity',
    ],
  },
  'disruptive behavior': {
    def: [
      'behavior that interrupts instruction or the activities of others, including yelling, banging objects, making loud noises, or leaving the seat during seated activities without permission',
    ],
    onset: ['The first instance of a defined response'],
    offset: ['5 seconds pass without a defined response'],
    ex: [
      'Yelling across the room during group instruction',
      'Banging a pencil repeatedly on the table',
      'Leaving the seat and walking around the room during seated work',
      'Making loud noises while peers are working',
    ],
    nonex: [
      'Raising a hand and waiting to speak',
      'Talking at conversational volume during free time',
      'Standing up when instructed to',
    ],
  },
  'verbal aggression': {
    def: [
      'threats, insults, swearing, or yelling directed at another person',
    ],
    onset: ['The client begins a threatening, insulting, or profane statement directed at another person'],
    offset: ['5 seconds pass without a defined statement'],
    ex: [
      'Saying "I’m going to hit you" to a peer',
      'Calling a staff member a name',
      'Swearing at a caregiver when an instruction is given',
      'Yelling at a peer during a game',
    ],
    nonex: [
      'Saying "I’m mad" or "I don’t like that"',
      'Repeating a word from a song or video without directing it at anyone',
      'Raising the voice to be heard in a noisy room',
    ],
  },
  pica: {
    def: [
      'placing any non-food item past the plane of the lips, or attempting to do so',
      'placing inedible items in the mouth or swallowing them',
    ],
    onset: ['A non-food item passes the plane of the lips'],
    offset: ['The item is removed from the mouth or swallowed'],
    ex: [
      'Placing a small toy in the mouth',
      'Eating paper, dirt, or paint chips',
      'Putting fabric, string, or hair in the mouth',
      'Picking up items from the floor and mouthing them',
    ],
    nonex: [
      'Eating food',
      'Using an approved chew item',
      'Brushing teeth with a toothbrush',
      'Blowing on a whistle or instrument during an activity',
    ],
  },
  'motor stereotypy': {
    def: [
      'repetitive motor movements that serve no apparent social purpose, such as hand flapping, body rocking, finger flicking, or spinning',
    ],
    onset: ['The second repetition of a defined movement'],
    offset: ['3 seconds pass without the movement', '5 seconds pass without the movement'],
    ex: [
      'Flapping the hands at chest level',
      'Rocking the body back and forth while seated',
      'Flicking the fingers in front of the eyes',
      'Spinning in place',
    ],
    nonex: [
      'Clapping during a song',
      'Waving to greet someone',
      'A single hand movement while talking',
    ],
  },
  'vocal stereotypy': {
    def: [
      'noncontextual or nonfunctional vocalizations, including repeated sounds, words, or phrases, humming, or delayed echolalia unrelated to the current situation',
    ],
    onset: ['The client produces a noncontextual sound, word, or phrase'],
    offset: ['3 seconds pass without noncontextual vocalizations'],
    ex: [
      'Repeating a line from a video during instruction',
      'Humming or making repetitive sounds during a task',
      'Repeating the same word several times without a listener',
    ],
    nonex: [
      'Singing along during a music activity',
      'Answering a question or making a request',
      'Repeating a word to practice it when instructed',
    ],
  },
};

const fnSet = (d) => new Set(Array.isArray(d.fn_functions) ? d.fn_functions : []);
const behavior = (d) => BEHAVIORS[String(d.tb_name || '').trim()];

export const definition = (d) => (behavior(d) ? behavior(d).def : []);
export const onset = (d) => (behavior(d) ? behavior(d).onset : []);
export const offset = (d) => (behavior(d) ? behavior(d).offset : []);
export const examples = (d) => (behavior(d) ? behavior(d).ex : []);
export const nonExamples = (d) => (behavior(d) ? behavior(d).nonex : []);

const ANTECEDENTS = {
  escape: [
    'Most likely when non-preferred tasks are presented, especially tabletop work lasting several minutes.',
    'Most likely when difficult or new tasks are introduced.',
    'Most likely when an instruction is repeated or a task is extended.',
    'Rarely observed during play or when no demands are placed.',
  ],
  attention: [
    'Most likely when adult attention is directed to another person or task.',
    'Most likely when the client is asked to play or work independently.',
    'Most likely when a caregiver is on the phone or speaking with another adult.',
    'Rarely observed during one-to-one interaction.',
  ],
  tangible: [
    'Most likely when a preferred item or activity is removed or denied.',
    'Most likely when a preferred activity ends, such as when screen time is over.',
    'Most likely when the client is told to wait for or share a preferred item.',
    'Rarely observed when preferred items are freely available.',
  ],
  automatic: [
    'Observed across settings and activities, including when the client is alone.',
    'Most likely during unstructured time or periods with little to do.',
    'Occurs at similar rates regardless of how others respond.',
  ],
};
const SETTING_EVENTS = [
  'More likely following poor sleep the night before.',
  'More likely when the client is ill, hungry, or in pain.',
  'More likely after changes to the daily routine.',
  'More likely later in the session or the day.',
];

export function antecedents(d) {
  const f = fnSet(d);
  return [...Object.keys(ANTECEDENTS).filter((k) => f.has(k)).flatMap((k) => ANTECEDENTS[k]), ...SETTING_EVENTS];
}

const STRATEGIES = {
  escape: [
    'High-probability request sequence before non-preferred tasks',
    'Choice of tasks, materials, or order of activities',
    'Work periods shortened and gradually lengthened (demand fading)',
    'Scheduled breaks built into each work period',
    'Difficult tasks interspersed with easier, mastered tasks',
    'First-then statements pairing non-preferred with preferred activities',
  ],
  attention: [
    'Noncontingent attention delivered on a fixed-time schedule',
    'Frequent behavior-specific praise for appropriate play and engagement',
    'Advance notice before adult attention is diverted, with a preferred activity provided',
    'Staff remain within view and check in briefly while attending to others',
  ],
  tangible: [
    'Advance warning and a visual timer before preferred activities end',
    'Visual schedule showing when preferred items will be available again',
    'First-then statements pairing non-preferred with preferred activities',
    'Noncontingent access to preferred items on a fixed-time schedule',
  ],
  automatic: [
    'Preferred items that provide similar sensory input freely available',
    'Scheduled access to alternative sensory activities',
    'Structured activities planned for periods of unstructured time',
  ],
};
const GENERAL_STRATEGIES = [
  'Visual schedule reviewed at the start of each session',
  'Advance warning and a visual timer before transitions',
  'Priming with a preview of upcoming activities',
  'Preferred items freely available during low-demand periods',
  'Noncontingent reinforcement (NCR) on a fixed-time schedule',
];

export function strategies(d) {
  const f = fnSet(d);
  const out = [...Object.keys(STRATEGIES).filter((k) => f.has(k)).flatMap((k) => STRATEGIES[k]), ...GENERAL_STRATEGIES];
  return [...new Set(out)];
}

const DESIRED = {
  escape: [
    'complete 10-minute work periods with scheduled breaks',
    'complete assigned tasks, requesting breaks or help when needed',
    'follow instructions within 5 seconds across daily routines',
  ],
  attention: [
    'play or work independently for 10 minutes while adults attend to other tasks',
    'gain attention appropriately by tapping a shoulder or saying the person’s name',
  ],
  tangible: [
    'wait up to 5 minutes for preferred items or activities while engaging with another activity',
    'transition away from preferred activities after a 2-minute warning',
    'share and take turns with preferred items',
  ],
  automatic: [
    'engage with appropriate leisure items during unstructured time',
    'engage in alternative sensory activities at appropriate times',
  ],
};

export function desired(d) {
  const f = fnSet(d);
  return Object.keys(DESIRED).filter((k) => f.has(k)).flatMap((k) => DESIRED[k]);
}

const MODE_PHRASES = { vocal: 'a vocal request', card: 'a picture card', sign: 'a manual sign', aac: 'an AAC device', gesture: 'a gesture' };

// Goals built from the answers already given, with standard criteria to edit.
export function goals(d) {
  const name = frag(d.tb_name || '');
  if (!name) return [];
  const client = String(d.client_name || '').trim().split(/\s+/)[0] || 'The client';
  const by = d.review_date ? `by ${fmtDate(d.review_date)}` : 'by the review date';
  const measure = String(d.bl_measure || '');
  const out = [];
  if (/duration/.test(measure)) {
    out.push(`${cap(name)} will last no longer than 1 minute per episode across 3 consecutive weeks ${by}.`);
  } else if (/interval|time samples/.test(measure)) {
    out.push(`${cap(name)} will occur in no more than 10% of intervals across 3 consecutive weeks ${by}.`);
  } else {
    out.push(`${cap(name)} will occur no more than 1 time per hour across 3 consecutive weeks ${by}.`);
  }
  out.push(`${cap(name)} will decrease by at least 80% from the baseline level across 3 consecutive weeks ${by}.`);
  out.push(`${cap(name)} will occur at zero levels across 4 consecutive weeks ${by}.`);
  const repl = frag(d.replacement || '');
  if (repl) {
    const modes = (Array.isArray(d.repl_modes) ? d.repl_modes : []).map((m) => MODE_PHRASES[m]).filter(Boolean);
    const using = modes.length ? ` using ${modes.length > 1 ? modes.slice(0, -1).join(', ') + ' or ' + modes[modes.length - 1] : modes[0]}` : '';
    out.push(`${cap(client)} will independently ${repl}${using} in at least 80% of opportunities across 3 consecutive sessions ${by}.`);
    out.push(`${cap(client)} will ${repl} with at least 3 different adults and in at least 2 settings ${by}.`);
  }
  const des = frag(d.desired || '');
  if (des) out.push(`${cap(client)} will ${des} in at least 80% of opportunities across 3 consecutive weeks ${by}.`);
  return out;
}

export const dataNotes = () => [
  'Data will be recorded on electronic data sheets during each session.',
  'Interobserver agreement (IOA) will be collected in at least 20% of sessions.',
  'Procedural integrity will be checked during supervision visits.',
  'Data will be shared with the caregiver at monthly parent training meetings.',
];

export const teachNotes = (d) => {
  const out = ['At least 10 teaching opportunities will be arranged each session.'];
  const fade = String(d.teach_fade || '');
  if (/constant time delay/.test(fade)) out.push('Prompts will be delivered immediately for the first 2 sessions, then after a 3-second delay.');
  if (/progressive time delay/.test(fade)) out.push('The prompt delay will increase by 1 second after each session at or above 80% correct, up to 5 seconds.');
  if (/most-to-least/.test(fade)) out.push('Prompts will be faded to the next less intrusive level after 2 consecutive sessions at or above 80% correct.');
  if (/least-to-most/.test(fade)) out.push('If no response occurs within 3 seconds, the next more intrusive prompt will be provided.');
  if (d.teach_thin) out.push('Reinforcement will be thinned after 3 consecutive sessions at or above 80% independent responding.');
  return out;
};

export const safetyNotes = (d) => (d.safety === 'protocol' ? [
  'Staff will follow the crisis protocol on file and document each use.',
  'The supervising BCBA will be notified the same day any crisis procedure is used.',
  'Only staff trained in the crisis protocol will implement it.',
] : []);

