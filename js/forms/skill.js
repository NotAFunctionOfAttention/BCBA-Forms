// Skill Acquisition Program.
// Field types and suggestion conventions are described at the top of bip.js.

import { cap, frag, fin, joinList } from '../util.js';
import { FADING, SCHEDULES, THINNING, COLLECTORS } from './common.js';

// Common programs, with starting wording for the fields that depend on them.
export const PROGRAMS = {
  'tacting common items': {
    label: 'Tacting common items',
    def: ['says the name of the item within 3 seconds of the instruction, without a prompt'],
    sd: ['Hold up the item and say "What is it?"', 'Point to the item and say "What’s this?"'],
    materials: ['Target items or photographs of target items', 'Data sheet and reinforcers'],
    targets: ['ball', 'cup', 'shoe', 'car', 'book', 'spoon', 'dog', 'apple'],
    prereq: ['Echoes single words', 'Attends to items held up by the instructor'],
  },
  'manding for preferred items': {
    label: 'Manding for preferred items',
    def: ['requests the item using the target response within 3 seconds of the item becoming visible, without a prompt'],
    sd: ['Hold the preferred item in view without speaking', 'Arrange an opportunity in which the item is visible but out of reach'],
    materials: ['Preferred items identified in the most recent preference assessment'],
    targets: ['bubbles', 'snack', 'iPad', 'ball', 'music', 'swing'],
    prereq: ['Shows interest in preferred items', 'Echoes single words or uses a reliable communication response'],
  },
  'receptive identification of items': {
    label: 'Receptive identification of items',
    def: ['touches or hands over the named item from an array within 3 seconds of the instruction, without a prompt'],
    sd: ['Place an array of 3 items on the table and say "Touch [item]"', 'Say "Give me [item]" with 3 items in front of the client'],
    materials: ['Target items or photographs', 'Distractor items for the array'],
    targets: ['ball', 'cup', 'shoe', 'car', 'book', 'spoon'],
    prereq: ['Scans arrays of 3 items', 'Follows simple gestural instructions'],
  },
  'motor imitation': {
    label: 'Motor imitation',
    def: ['performs the modeled action within 3 seconds of the model, without a prompt'],
    sd: ['Say "Do this" while modeling the action'],
    materials: ['Objects needed for object imitation targets'],
    targets: ['clap hands', 'touch head', 'wave', 'stomp feet', 'raise arms', 'push car'],
    prereq: ['Attends to the instructor for at least 3 seconds', 'Sits or stands near the instructor'],
  },
  'echoics': {
    label: 'Echoics (vocal imitation)',
    def: ['repeats the modeled sound or word within 3 seconds, with an approximation that is acceptable for the current target'],
    sd: ['Say "Say [sound or word]"', 'Model the sound or word with no other instruction'],
    materials: ['Data sheet and reinforcers'],
    targets: ['ba', 'ma', 'up', 'go', 'more', 'hi'],
    prereq: ['Produces some vocal sounds', 'Attends to the instructor’s face'],
  },
  'intraverbal fill-ins': {
    label: 'Intraverbal fill-ins',
    def: ['completes the phrase with the correct word within 3 seconds, without a prompt'],
    sd: ['Say the first part of a familiar phrase, such as "Ready, set…"'],
    materials: ['List of target phrases', 'Data sheet and reinforcers'],
    targets: ['Ready, set… go', 'Twinkle, twinkle, little… star', 'One, two… three', 'Shoes and… socks'],
    prereq: ['Echoes 2-word phrases', 'Tacts at least 20 items'],
  },
  'following one-step instructions': {
    label: 'Following one-step instructions',
    def: ['completes the instructed action within 5 seconds, without a prompt'],
    sd: ['Give a one-step instruction, such as "Come here" or "Sit down"'],
    materials: ['Materials needed for each instruction'],
    targets: ['come here', 'sit down', 'stand up', 'throw it away', 'give me', 'clean up'],
    prereq: ['Responds to own name', 'Attends to the speaker'],
  },
  'matching identical items': {
    label: 'Matching identical items',
    def: ['places the item with its identical match in an array of 3 within 5 seconds, without a prompt'],
    sd: ['Hand the client an item and say "Match"'],
    materials: ['Pairs of identical items or pictures', 'Array of 3 comparison items'],
    targets: ['cup', 'block', 'spoon', 'car', 'ball', 'sock'],
    prereq: ['Scans arrays of 3 items', 'Picks up and releases items on request'],
  },
  'handwashing': {
    label: 'Handwashing',
    def: ['completes each step of the handwashing task analysis in order, without a prompt'],
    sd: ['Say "Wash your hands" at the sink'],
    materials: ['Sink, soap, and towel', 'Visual task analysis'],
    targets: ['Turn on water', 'Wet hands', 'Get soap', 'Rub hands for 20 seconds', 'Rinse hands', 'Turn off water', 'Dry hands'],
    prereq: ['Stands at the sink for at least 1 minute', 'Imitates simple motor actions'],
  },
  'toothbrushing': {
    label: 'Toothbrushing',
    def: ['completes each step of the toothbrushing task analysis in order, without a prompt'],
    sd: ['Say "Brush your teeth" at the bathroom sink'],
    materials: ['Toothbrush, toothpaste, and cup', 'Visual task analysis'],
    targets: ['Pick up toothbrush', 'Put toothpaste on brush', 'Brush top teeth', 'Brush bottom teeth', 'Spit', 'Rinse brush', 'Put toothbrush away'],
    prereq: ['Tolerates the toothbrush in the mouth', 'Imitates simple motor actions'],
  },
  'waiting for preferred items': {
    label: 'Waiting for preferred items',
    def: ['waits without problem behavior for the target duration after being told "Wait," then receives the item'],
    sd: ['Hold up the requested item and say "Wait"'],
    materials: ['Preferred items', 'Visual timer'],
    targets: ['5 seconds', '15 seconds', '30 seconds', '1 minute', '2 minutes', '5 minutes'],
    prereq: ['Requests preferred items', 'Tolerates brief delays of a few seconds'],
  },
};
const PROGRAM_COMBO = Object.entries(PROGRAMS).map(([k, p]) => [p.label, k]);
const prog = (d) => PROGRAMS[String(d.sk_name || '').trim()];

const FORMATS = [
  ['Discrete trial training (DTT)', 'discrete trial training (DTT)'],
  ['Natural environment teaching (NET)', 'natural environment teaching (NET)'],
  ['Incidental teaching', 'incidental teaching'],
  ['Forward chaining', 'forward chaining'],
  ['Backward chaining', 'backward chaining'],
  ['Total task chaining', 'total task chaining'],
];

const HIERARCHIES = [
  ['Full physical, partial physical, model, gestural, independent', 'full physical, partial physical, model, gestural, then independent'],
  ['Full echoic, partial echoic, independent', 'a full echoic model, a partial echoic model, then independent'],
  ['Full model, partial model, independent', 'a full model, a partial model, then independent'],
  ['Gestural, model, partial physical, full physical (least to most)', 'gestural, model, partial physical, then full physical prompts, from least to most intrusive'],
  ['Positional prompt, then independent', 'a positional prompt, then independent'],
];

const ERRORS = [
  ['Model, re-present with prompt, transfer trial', 'the instructor will model the correct response, re-present the instruction with an immediate prompt, and then present a transfer trial without a prompt'],
  ['Re-present with the next more intrusive prompt', 'the instructor will re-present the instruction with the next more intrusive prompt'],
  ['Brief pause, then re-present with prompt', 'the instructor will remove the materials for 2 seconds, then re-present the instruction with an immediate prompt'],
  ['No feedback, move to next trial', 'the instructor will provide no feedback and move to the next trial'],
];

const MASTERY = [
  ['80% independent, 3 consecutive sessions, 2 staff', '80% independent responding across 3 consecutive sessions with at least 2 staff members'],
  ['90% independent, 2 consecutive sessions', '90% independent responding across 2 consecutive sessions'],
  ['100% independent, 3 consecutive sessions', '100% independent responding across 3 consecutive sessions'],
  ['100% of steps independent, 3 consecutive sessions', 'independent completion of 100% of task analysis steps across 3 consecutive sessions'],
];

const DATA_TYPES = [
  ['First-trial data', 'first-trial data'],
  ['All-trial data (% correct)', 'all-trial data, recorded as percentage correct'],
  ['Probe data', 'probe data at the start of each session'],
  ['Task analysis step data', 'task analysis data, recording the prompt level for each step'],
  ['Duration data', 'duration data'],
];

const MAINT = [
  ['Weekly for 4 weeks, then monthly', 'weekly for 4 weeks after mastery, then monthly'],
  ['Every 2 weeks for 2 months', 'every 2 weeks for 2 months after mastery'],
  ['Monthly', 'monthly after mastery'],
];

export default {
  id: 'skill',
  title: 'Skill Acquisition Program',
  fileTag: 'SkillProgram',
  dates: [
    { id: 'doc_date', label: 'Date written', required: true },
    { id: 'start_date', label: 'Start date' },
  ],
  guardianSignature: false,

  next: [
    {
      to: 'visual',
      label: 'Review this program\u2019s data (visual analysis)',
      carries: 'program name and measure, teaching phase, and the mastery criterion as the review target',
      map: (d) => {
        const p = prog(d);
        const name = p ? p.label : cap(frag(d.sk_name || ''));
        const data = String(d.sk_data || '');
        const measure = /first-trial/.test(data) ? '% correct on the first trial'
          : /task analysis/.test(data) ? '% of steps completed independently'
          : /probe/.test(data) ? '% correct on probes'
          : /duration/.test(data) ? 'duration'
          : '% correct';
        return {
          va_program: name ? `${name}: ${measure}` : '',
          va_goal_dir: 'up',
          va_prev_name: 'baseline',
          va_cur_name: d.sk_format ? frag(d.sk_format) : '',
          va_unit: measure === 'duration' ? 'seconds' : '%',
          va_review_crit: d.sk_mastery ? `the mastery criterion of ${frag(d.sk_mastery)} is met` : '',
        };
      },
    },
  ],

  groups: [
    {
      title: 'Skill',
      fields: [
        { id: 'sk_name', label: 'Program', type: 'combo', options: PROGRAM_COMBO, hint: 'Choosing a common program fills suggestions below.' },
        {
          id: 'sk_rationale', label: 'Rationale', type: 'textarea', combine: 'paragraphs', hint: 'Link to an assessment result or a family goal. Full sentences.',
          suggest: [
            'This skill was identified as a deficit on the VB-MAPP.',
            'This skill was identified as a deficit on the ABLLS-R.',
            'The caregiver identified this skill as a priority.',
            'This skill is a prerequisite for more advanced communication goals.',
            'This skill will increase independence in daily routines.',
          ],
        },
        { id: 'sk_prereq', label: 'Prerequisite skills', type: 'list', hint: 'One per line.', suggest: (d) => [...(prog(d)?.prereq || []), 'Sits at a table for at least 2 minutes', 'Responds to own name'] },
        { id: 'sk_def', label: 'Correct response', type: 'textarea', hint: 'Completes "A correct response is recorded when the client…".', suggest: (d) => prog(d)?.def || [], suggestMode: 'replace', suggestEmpty: 'Choose a program above to see suggestions.' },
      ],
    },
    {
      title: 'Targets and baseline',
      fields: [
        { id: 'sk_targets', label: 'Initial targets', type: 'list', hint: 'One per line.', suggest: (d) => prog(d)?.targets || [], suggestEmpty: 'Choose a program above to see suggestions.' },
        {
          id: 'sk_newtargets', label: 'Adding new targets', type: 'combo',
          options: [
            ['Add one as each is mastered', 'A new target will be added as each target is mastered.'],
            ['Add in sets of 3', 'New targets will be added in sets of 3 when the current set is mastered.'],
            ['From caregiver priority list', 'New targets will be selected from the caregiver priority list as targets are mastered.'],
          ],
        },
        { id: 'sk_baseline', label: 'Baseline', hint: 'Probe results before teaching. e.g. 0 of 8 targets correct across 2 probe sessions' },
      ],
    },
    {
      title: 'Teaching procedure',
      fields: [
        { id: 'sk_format', label: 'Teaching format', type: 'combo', options: FORMATS },
        {
          id: 'sk_format_why', label: 'Why this format', type: 'textarea', optional: true, hint: 'Optional. Full sentences.',
          suggest: [
            'Discrete trial training allows many learning opportunities in a short time.',
            'Natural environment teaching uses the client’s motivation in the moment and supports generalization.',
            'Chaining is used because the skill is a sequence of steps.',
          ],
        },
        { id: 'sk_materials', label: 'Materials', type: 'list', hint: 'One per line.', suggest: (d) => prog(d)?.materials || [] },
        { id: 'sk_sd', label: 'Instruction (SD)', hint: 'Exactly what the instructor does and says.', suggest: (d) => prog(d)?.sd || [], suggestMode: 'replace', suggestEmpty: 'Choose a program above to see suggestions.' },
        { id: 'sk_prompts', label: 'Prompt hierarchy', type: 'combo', options: HIERARCHIES },
        { id: 'sk_fading', label: 'Prompt fading', type: 'combo', options: FADING },
        {
          id: 'sk_fade_rule', label: 'Rule for fading prompts', type: 'textarea', optional: true, hint: 'Optional. Full sentences.',
          suggest: (d) => {
            const f = String(d.sk_fading || '');
            const out = [];
            if (/constant time delay/.test(f)) out.push('Prompts will be delivered immediately for the first 2 sessions, then after a 3-second delay.');
            if (/progressive time delay/.test(f)) out.push('The prompt delay will increase by 1 second after each session at or above 80% correct, up to 5 seconds.');
            if (/most-to-least/.test(f)) out.push('Prompts will be faded to the next less intrusive level after 2 consecutive sessions at or above 80% correct.');
            if (/least-to-most/.test(f)) out.push('If no response occurs within 3 seconds, the next more intrusive prompt will be provided.');
            out.push('Prompts will return to the previous level after 2 consecutive sessions below 50% correct.');
            return out;
          },
        },
        { id: 'sk_error', label: 'Error correction', type: 'combo', options: ERRORS, hint: 'Completes "After an error or no response,…".' },
      ],
    },
    {
      title: 'Reinforcement and mastery',
      fields: [
        { id: 'sk_reinforcer', label: 'Reinforcers', combine: 'and', hint: 'What and how much. e.g. 20 seconds with a preferred toy and behavior-specific praise' },
        { id: 'sk_sched', label: 'Reinforcement schedule', type: 'combo', options: SCHEDULES },
        { id: 'sk_thin', label: 'Schedule thinning', type: 'combo', options: THINNING, optional: true },
        { id: 'sk_mastery', label: 'Mastery criterion', type: 'combo', options: MASTERY },
        { id: 'sk_data', label: 'Data collection', type: 'combo', options: DATA_TYPES },
        { id: 'sk_data_who', label: 'Recorded by', type: 'multi', options: COLLECTORS, other: true },
      ],
    },
    {
      title: 'Generalization and maintenance',
      fields: [
        {
          id: 'sk_gen', label: 'Generalization', type: 'list', hint: 'One per line.',
          suggest: [
            'Targets will be taught by at least 3 different staff members and the caregiver',
            'Targets will be practiced in at least 2 settings',
            'At least 3 different examples of each target will be used',
            'Instructions will be varied once the target is mastered with the original instruction',
          ],
        },
        { id: 'sk_maint', label: 'Maintenance probes', type: 'combo', options: MAINT, hint: 'Completes "Mastered targets will be probed…".' },
      ],
    },
  ],

  build(v, c) {
    const p = PROGRAMS[String(v.raw('sk_name')).trim()];
    const progName = p ? p.label : cap(v.t('sk_name'));
    const thin = v.opt('sk_thin');
    const para = (id, key, optional) => v.paras(id, { optional }).map((t, i) => ({ type: 'p', key: key + i, text: fin(t) }));
    return [
      {
        heading: 'Program',
        blocks: [
          { type: 'dl', wide: true, rows: [['Program name', progName], ['Teaching format', cap(v.t('sk_format'))]] },
          ...para('sk_rationale', 'rationale'),
        ],
      },
      {
        heading: 'Prerequisite Skills',
        blocks: [{ type: 'ul', items: v.list('sk_prereq').map(fin) }],
      },
      {
        heading: 'Operational Definition',
        blocks: [{ type: 'p', key: 'def', text: `A correct response is recorded when ${c.client} ${frag(v.t('sk_def'))}.` }],
      },
      {
        heading: 'Targets and Baseline',
        blocks: [
          { type: 'sub', text: 'Initial targets' },
          { type: 'ul', items: v.list('sk_targets') },
          { type: 'p', key: 'newtargets', text: fin(v.t('sk_newtargets')) },
          { type: 'p', key: 'baseline', text: `Baseline: ${fin(v.t('sk_baseline'))}` },
        ],
      },
      {
        heading: 'Teaching Procedure',
        blocks: [
          ...para('sk_format_why', 'why', true),
          {
            type: 'ol', items: [
              `Arrange materials: ${v.list('sk_materials').map(frag).join('; ')}.`,
              `Present the instruction: ${fin(v.t('sk_sd'))}`,
              `Prompt using ${frag(v.t('sk_prompts'))}, faded using ${frag(v.t('sk_fading'))}.`,
              `Following a correct response, deliver ${frag(v.t('sk_reinforcer'))} on ${frag(v.t('sk_sched'))}${thin ? `, thinned using ${frag(thin)}` : ''}.`,
              `After an error or no response, ${frag(v.t('sk_error'))}.`,
            ],
          },
          ...para('sk_fade_rule', 'fade', true),
        ],
      },
      {
        heading: 'Mastery Criterion and Data Collection',
        blocks: [
          { type: 'p', key: 'mastery', text: `A target is mastered at ${frag(v.t('sk_mastery'))}.` },
          { type: 'p', key: 'data', text: `${cap(joinList(v.multi('sk_data_who')))} will record ${frag(v.t('sk_data'))}.` },
        ],
      },
      {
        heading: 'Generalization and Maintenance',
        blocks: [
          { type: 'ul', items: v.list('sk_gen').map(fin) },
          { type: 'p', key: 'maint', text: `Mastered targets will be probed ${frag(v.t('sk_maint'))}.` },
        ],
      },
    ];
  },
};
