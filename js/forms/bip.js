// Behavior Intervention Plan.
// `groups` drives the entry form; `build` turns the answers into the document.
//
// Field types (rendered in js/main.js):
//   text, textarea, date      open answers
//   list                      one item per line
//   select                    closed list, every option given: [value, label]
//   combo                     common options + "Other" free text: [label, phrase]
//                             (phrase is what goes in the document; defaults to label)
//   multi                     checkboxes: [key, label, phrase]; `other: true` adds an
//                             "Other" box with free text, one item per line
//   `suggest` on a list or textarea adds tap-to-insert phrases you can then edit.
//
// Option phrases are written to complete the sentence they land in.

import { cap, frag, fin, joinList } from '../util.js';

// One response reads as a sentence; several become a bulleted list.
function staffWill(key, lead, items) {
  if (items.length === 1) return [{ type: 'p', key, text: `${lead} ${frag(items[0])}.` }];
  return [{ type: 'p', key, text: `${lead}:` }, { type: 'ul', items: items.map(fin) }];
}

const orList = (a) => (a.length <= 2 ? a.join(' or ') : a.slice(0, -1).join(', ') + ', or ' + a[a.length - 1]);

const TARGETS = [
  ['Aggression', 'aggression'],
  ['Self-injurious behavior (SIB)', 'self-injurious behavior (SIB)'],
  ['Elopement', 'elopement'],
  ['Property destruction', 'property destruction'],
  ['Tantrum behavior', 'tantrum behavior'],
  ['Disruptive behavior', 'disruptive behavior'],
  ['Noncompliance', 'noncompliance'],
  ['Verbal aggression', 'verbal aggression'],
  ['Pica', 'pica'],
  ['Motor stereotypy', 'motor stereotypy'],
  ['Vocal stereotypy', 'vocal stereotypy'],
];

const MEASURES = [
  ['freq', 'Frequency (count)', 'frequency'],
  ['rate', 'Rate per hour', 'rate per hour'],
  ['dur_ep', 'Duration per episode', 'duration per episode'],
  ['dur_tot', 'Total duration per session', 'total duration per session'],
  ['pir', 'Partial interval recording (% of intervals)', 'percentage of intervals (partial interval recording)'],
  ['wir', 'Whole interval recording (% of intervals)', 'percentage of intervals (whole interval recording)'],
  ['mts', 'Momentary time sampling (% of samples)', 'percentage of momentary time samples'],
  ['lat', 'Latency', 'latency'],
  ['int', 'Intensity rating', 'intensity rating'],
  ['opp', 'Percentage of opportunities', 'percentage of opportunities'],
];
const MEASURE_COMBO = MEASURES.map(([, l, p]) => [l, p]);

const ASSESSMENTS = [
  ['fai', 'Functional Assessment Interview (FAI)', 'a Functional Assessment Interview (FAI)'],
  ['fast', 'Functional Analysis Screening Tool (FAST)', 'the Functional Analysis Screening Tool (FAST)'],
  ['qabf', 'Questions About Behavioral Function (QABF)', 'the Questions About Behavioral Function (QABF)'],
  ['mas', 'Motivation Assessment Scale (MAS)', 'the Motivation Assessment Scale (MAS)'],
  ['abc_n', 'ABC narrative recording', 'ABC narrative recording'],
  ['abc_c', 'ABC checklist recording', 'ABC checklist recording'],
  ['scatter', 'Scatterplot', 'scatterplot data'],
  ['records', 'Record review', 'a review of records'],
  ['fa', 'Functional analysis (FA)', 'a functional analysis (FA)'],
  ['iisca', 'Interview-informed synthesized contingency analysis (IISCA)', 'an interview-informed synthesized contingency analysis (IISCA)'],
];

const FUNCTIONS = [
  ['escape', 'Escape / avoidance', 'escape from or avoidance of demands'],
  ['attention', 'Attention', 'access to attention'],
  ['tangible', 'Tangible', 'access to preferred items or activities'],
  ['automatic', 'Automatic', 'automatic reinforcement'],
];

const CURRENT = [
  ['Task is removed or a break is given', 'removal of the task or a break'],
  ['Attention (reprimands, redirection, comfort)', 'attention in the form of reprimands, redirection, or comfort'],
  ['Access to the preferred item or activity', 'access to the preferred item or activity'],
  ['Transition is delayed', 'delay of the transition'],
  ['Sensory stimulation produced by the behavior', 'sensory stimulation produced by the behavior itself'],
];

const REPLACEMENTS = [
  ['Request a break', 'request a break'],
  ['Request help', 'request help'],
  ['Request attention', 'request attention'],
  ['Request a preferred item or activity', 'request the preferred item or activity'],
  ['Request more time before a transition', 'request more time before a transition'],
  ['Engage with an alternative sensory item', 'engage with an alternative item that provides similar sensory stimulation'],
];

const MODES = [
  ['vocal', 'Vocal request', 'a vocal request'],
  ['card', 'Picture card / PECS', 'a picture card'],
  ['sign', 'Manual sign', 'a manual sign'],
  ['aac', 'AAC device', 'an AAC device'],
  ['gesture', 'Gesture', 'a gesture'],
];

const PROCEDURES = [
  ['Functional communication training (FCT)', 'functional communication training (FCT)'],
  ['Discrete trial training (DTT)', 'discrete trial training (DTT)'],
  ['Natural environment teaching (NET)', 'natural environment teaching (NET)'],
  ['Incidental teaching', 'incidental teaching'],
  ['Behavioral skills training (BST)', 'behavioral skills training (BST)'],
  ['Task analysis and chaining', 'task analysis and chaining'],
];

const PROMPTS = [
  ['fp', 'Full physical', 'full physical'],
  ['pp', 'Partial physical', 'partial physical'],
  ['model', 'Model', 'model'],
  ['gest', 'Gestural', 'gestural'],
  ['vocal', 'Vocal / verbal', 'vocal'],
  ['echoic', 'Echoic', 'echoic'],
  ['visual', 'Visual', 'visual'],
];

const FADING = [
  ['Most-to-least', 'most-to-least prompt fading'],
  ['Least-to-most', 'least-to-most prompting'],
  ['Constant time delay', 'constant time delay'],
  ['Progressive time delay', 'progressive time delay'],
  ['Graduated guidance', 'graduated guidance'],
  ['Stimulus fading', 'stimulus fading'],
];

const SCHEDULES = [
  ['Continuous (FR1)', 'a continuous (FR1) schedule'],
  ['Fixed ratio (FR)', 'a fixed-ratio schedule'],
  ['Variable ratio (VR)', 'a variable-ratio schedule'],
  ['Fixed interval (FI)', 'a fixed-interval schedule'],
  ['Variable interval (VI)', 'a variable-interval schedule'],
];

const THINNING = [
  ['Delay to reinforcement', 'gradually increasing the delay to reinforcement'],
  ['Demand fading', 'demand fading, gradually increasing the work required before reinforcement'],
  ['Chained schedule', 'a chained schedule'],
  ['Multiple schedule (signaled availability)', 'a multiple schedule that signals when reinforcement is and is not available'],
  ['Ratio thinning', 'gradually increasing the ratio requirement'],
];

const TARGET_RESPONSES = [
  ['escext', 'Escape extinction (continue the demand)', 'continue the instruction with prompting as needed and without providing a break'],
  ['attext', 'Attention extinction (planned ignoring)', 'withhold attention for the behavior while monitoring for safety'],
  ['tanext', 'Withhold the item or activity', 'withhold access to the requested item or activity'],
  ['block', 'Response blocking', 'block the response with the minimum physical contact needed'],
  ['redirect', 'Redirect to the replacement behavior', 'prompt the replacement behavior once the episode has ended'],
  ['neutral', 'Neutral, brief verbal response', 'keep verbal responses brief and neutral'],
];

const REPL_RESPONSES = [
  ['break', 'Deliver the break immediately', 'deliver the requested break immediately'],
  ['attn', 'Provide attention immediately', 'provide the requested attention immediately'],
  ['tan', 'Provide the item or activity immediately', 'provide the requested item or activity immediately'],
  ['help', 'Provide help immediately', 'provide the requested help immediately'],
  ['praise', 'Pair with specific praise', 'pair the reinforcer with behavior-specific praise'],
];

const COLLECTORS = [
  ['rbt', 'Assigned RBT', 'the assigned RBT'],
  ['bcba', 'Supervising BCBA', 'the supervising BCBA'],
  ['cg', 'Caregiver', 'the caregiver'],
  ['school', 'School staff', 'school staff'],
];

const WHEN = [
  ['Every session', 'during every session'],
  ['Daily', 'daily'],
  ['During target activities only', 'during the activities in which the behavior is most likely'],
  ['During scheduled probes', 'during scheduled probe sessions'],
];

const REVIEW = [
  ['Weekly', 'weekly'],
  ['Every 2 weeks', 'every 2 weeks'],
  ['Monthly', 'monthly'],
];

const TRAINEES = [
  ['rbts', 'RBTs assigned to the case', 'all RBTs assigned to the case'],
  ['cg', 'Caregivers', 'the caregivers'],
  ['school', 'School staff', 'school staff working with the client'],
  ['bcbas', 'Other BCBAs on the case', 'other BCBAs on the case'],
];

const TRAIN_METHODS = [
  ['Behavioral skills training (BST)', 'behavioral skills training (BST)'],
  ['BST with video modeling', 'behavioral skills training (BST) with video modeling'],
];

const CRITERIA = [
  ['90% integrity, 2 consecutive observations', 'at least 90% procedural integrity across 2 consecutive observations'],
  ['90% integrity, 3 consecutive observations', 'at least 90% procedural integrity across 3 consecutive observations'],
  ['80% integrity, 2 consecutive observations', 'at least 80% procedural integrity across 2 consecutive observations'],
  ['100% integrity, 2 consecutive observations', '100% procedural integrity across 2 consecutive observations'],
];

const ETHICS = [
  ['consent', 'Written guardian consent obtained', 'Written informed consent for this plan was obtained from the legal guardian before implementation.'],
  ['assent', 'Assent is monitored', 'Client assent is monitored throughout sessions, and procedures will be paused and reviewed if assent is withdrawn.'],
  ['least', 'Least restrictive procedures selected', 'The least restrictive effective procedures were selected, and less intrusive alternatives were considered first.'],
  ['norestrict', 'No restrictive procedures', 'This plan does not include restrictive procedures.'],
  ['restrict', 'Includes restrictive procedures (approved)', 'This plan includes restrictive procedures, which are described above and were reviewed and approved before implementation.'],
  ['review', 'Plan revised if no progress', 'The plan will be reviewed and revised if data do not show improvement by the scheduled review date or if new risks are identified.'],
  ['dignity', 'Dignity and family values respected', 'Procedures were selected with attention to the client’s dignity, preferences, and cultural and family values.'],
];

export default {
  id: 'bip',
  title: 'Behavior Intervention Plan',
  fileTag: 'BIP',
  dates: [
    { id: 'doc_date', label: 'Date of plan', required: true },
    { id: 'effective_date', label: 'Effective date' },
    { id: 'review_date', label: 'Review date' },
  ],
  guardianSignature: true,

  groups: [
    {
      title: 'Target behavior',
      fields: [
        { id: 'tb_name', label: 'Target behavior', type: 'combo', options: TARGETS, hint: 'One behavior per plan.' },
        { id: 'tb_def', label: 'Operational definition', type: 'textarea', hint: 'Completes "…is defined as". e.g. hitting or kicking another person with any part of the body' },
        { id: 'tb_onset', label: 'Onset', hint: 'e.g. Physical contact with another person' },
        { id: 'tb_offset', label: 'Offset', hint: 'e.g. 3 seconds pass without contact' },
        { id: 'tb_ex', label: 'Examples', type: 'list', hint: 'One per line' },
        { id: 'tb_nonex', label: 'Non-examples', type: 'list', hint: 'One per line' },
      ],
    },
    {
      title: 'Baseline',
      fields: [
        { id: 'bl_measure', label: 'Measure', type: 'combo', options: MEASURE_COMBO },
        { id: 'bl_period', label: 'Baseline period', hint: 'e.g. 5 sessions between 09/14/2026 and 09/25/2026' },
        { id: 'bl_value', label: 'Result', hint: 'e.g. a mean of 6 per hour (range 3 to 9)' },
      ],
    },
    {
      title: 'Hypothesized function',
      fields: [
        { id: 'fn_assess', label: 'Assessments conducted', type: 'multi', options: ASSESSMENTS, other: true, otherHint: 'One per line, e.g. a caregiver rating scale' },
        { id: 'fn_functions', label: 'Function', type: 'multi', options: FUNCTIONS },
        { id: 'fn_evidence', label: 'Supporting evidence', type: 'textarea', hint: 'Full sentences. e.g. 80% of recorded episodes followed a demand and ended with removal of the task.' },
      ],
    },
    {
      title: 'Competing behavior pathway',
      fields: [
        { id: 'antecedents', label: 'Setting events and antecedents', type: 'textarea', hint: 'When it is most and least likely. e.g. Most likely during tabletop work lasting 10 minutes or longer; rarely observed during play.' },
        { id: 'cur_conseq', label: 'Current maintaining consequence', type: 'combo', options: CURRENT },
        { id: 'replacement', label: 'Replacement behavior', type: 'combo', options: REPLACEMENTS, hint: 'Same function, easier to do. A custom answer should complete "will be taught to".' },
        { id: 'repl_modes', label: 'Response form', type: 'multi', options: MODES, other: true, optional: true, otherHint: 'One per line, e.g. a break card on a lanyard' },
        { id: 'desired', label: 'Desired long-term behavior', hint: 'Completes "for the client to". e.g. complete 10-minute work periods with scheduled breaks' },
      ],
    },
    {
      title: 'Antecedent strategies',
      fields: [
        {
          id: 'ant_strats', label: 'Antecedent strategies', type: 'list', hint: 'One per line, each tied to an antecedent above. Tap a suggestion to add it, then edit it to fit.',
          suggest: [
            'Visual schedule reviewed at the start of each session',
            'High-probability request sequence before non-preferred tasks',
            'Choice of tasks, materials, or order of activities',
            'Noncontingent reinforcement (NCR) on a fixed-time schedule',
            'Advance warning and a visual timer before transitions',
            'First-then statements pairing non-preferred with preferred activities',
            'Work periods shortened and gradually lengthened (demand fading)',
            'Priming with a preview of upcoming activities',
            'Preferred items freely available during low-demand periods',
          ],
        },
      ],
    },
    {
      title: 'Teaching the replacement behavior',
      fields: [
        { id: 'teach_proc', label: 'Teaching procedure', type: 'combo', options: PROCEDURES },
        { id: 'teach_prompts', label: 'Prompt types', type: 'multi', options: PROMPTS, optional: true },
        { id: 'teach_fade', label: 'Prompt fading', type: 'combo', options: FADING, optional: true },
        { id: 'teach_sched', label: 'Initial reinforcement schedule', type: 'combo', options: SCHEDULES },
        { id: 'teach_thin', label: 'Schedule thinning', type: 'combo', options: THINNING, optional: true },
        { id: 'teach_notes', label: 'Additional teaching details', type: 'textarea', optional: true, hint: 'Optional. Full sentences, e.g. time delay steps or thinning criteria.' },
      ],
    },
    {
      title: 'Consequence strategies',
      fields: [
        { id: 'cons_target', label: 'When the target behavior occurs, staff will…', type: 'multi', options: TARGET_RESPONSES, other: true, otherHint: 'One per line. Completes "staff will".' },
        { id: 'cons_repl', label: 'When the replacement behavior occurs, staff will…', type: 'multi', options: REPL_RESPONSES, other: true, otherHint: 'One per line. Completes "staff will".' },
        { id: 'cons_notes', label: 'Additional consequence details', type: 'textarea', optional: true, hint: 'Optional. Full sentences.' },
      ],
    },
    {
      title: 'Crisis and safety',
      fields: [
        { id: 'safety', label: 'Safety', type: 'select', options: [['none', 'No crisis procedures are indicated'], ['protocol', 'A separate crisis protocol applies']] },
        { id: 'safety_note', label: 'Safety notes', type: 'textarea', optional: true, hint: 'Optional. Risk of injury, protocol name and date.' },
      ],
    },
    {
      title: 'Data collection',
      fields: [
        { id: 'dc_methods', label: 'Measurement', type: 'multi', options: MEASURES, other: true },
        { id: 'dc_who', label: 'Collected by', type: 'multi', options: COLLECTORS, other: true },
        { id: 'dc_when', label: 'When', type: 'combo', options: WHEN },
        { id: 'dc_review', label: 'Graphed and reviewed by the BCBA', type: 'combo', options: REVIEW },
        { id: 'dc_notes', label: 'Additional data details', type: 'textarea', optional: true, hint: 'Optional. Full sentences.' },
      ],
    },
    {
      title: 'Goals, generalization and maintenance',
      fields: [
        { id: 'goals', label: 'Goals', type: 'list', hint: 'One per line. Measurable, with criterion and target date.' },
        {
          id: 'gen_maint', label: 'Generalization and maintenance', type: 'textarea', hint: 'Full sentences. Tap a suggestion to add it, then edit it to fit.',
          suggest: [
            'The replacement behavior will be practiced with at least 3 staff members and the caregiver.',
            'Teaching will occur across home, clinic, and community settings.',
            'Varied materials and wording of instructions will be used.',
            'Once goals are met, reinforcement will be thinned gradually.',
            'Maintenance probes will be conducted monthly after goals are met.',
          ],
        },
      ],
    },
    {
      title: 'Training and ethical considerations',
      fields: [
        { id: 'train_who', label: 'Implementers to be trained', type: 'multi', options: TRAINEES, other: true },
        { id: 'train_method', label: 'Training method', type: 'combo', options: TRAIN_METHODS, default: 'behavioral skills training (BST)' },
        { id: 'train_crit', label: 'Integrity criterion', type: 'combo', options: CRITERIA },
        { id: 'ethics', label: 'Ethical considerations', type: 'multi', options: ETHICS, other: true, otherHint: 'Additional statements, one per line, in full sentences.' },
      ],
    },
  ],

  build(v, c) {
    const name = v.t('tb_name');
    const fnText = joinList(v.multi('fn_functions'));
    const assess = joinList(v.multi('fn_assess'));
    const modes = v.multi('repl_modes', { optional: true });
    const prompts = v.multi('teach_prompts', { optional: true });
    const fade = v.opt('teach_fade');
    const thin = v.opt('teach_thin');
    const consRepl = joinList(v.multi('cons_repl'));
    const safety = v.raw('safety') === 'protocol'
      ? 'A separate crisis protocol applies to this plan and is maintained in the client record.'
      : 'No crisis or emergency procedures are indicated under this plan.';
    const para = (id, key) => v.paras(id, { optional: true }).map((t, i) => ({ type: 'p', key: key + i, text: fin(t) }));

    const teach = [
      { type: 'p', key: 'teach', text: `${cap(c.client)} will be taught to ${frag(v.t('replacement'))}${modes.length ? ` using ${orList(modes)}` : ''}. The replacement behavior will be taught through ${frag(v.t('teach_proc'))}.` },
    ];
    if (prompts.length || fade) {
      let t;
      if (prompts.length && fade) t = `Prompting will use ${joinList(prompts)} prompts, faded using ${frag(fade)}.`;
      else if (prompts.length) t = `Prompting will use ${joinList(prompts)} prompts.`;
      else t = `Prompts will be faded using ${frag(fade)}.`;
      teach.push({ type: 'p', key: 'prompts', text: t });
    }
    teach.push({ type: 'p', key: 'sched', text: `The replacement behavior will initially be reinforced on ${frag(v.t('teach_sched'))}${thin ? `, and reinforcement will be thinned using ${frag(thin)}` : ''}.` });
    teach.push({ type: 'p', key: 'desired', text: `The long-term objective is for ${c.client} to ${frag(v.t('desired'))}.` });
    teach.push(...para('teach_notes', 'tnote'));

    return [
      {
        heading: 'Target Behavior',
        blocks: [
          { type: 'p', key: 'def', text: `${cap(name)} is defined as ${frag(v.t('tb_def'))}.` },
          { type: 'dl', rows: [['Onset', fin(v.t('tb_onset'))], ['Offset', fin(v.t('tb_offset'))]] },
          { type: 'sub', text: 'Examples' },
          { type: 'ul', items: v.list('tb_ex').map(fin) },
          { type: 'sub', text: 'Non-examples' },
          { type: 'ul', items: v.list('tb_nonex').map(fin) },
        ],
      },
      {
        heading: 'Baseline',
        blocks: [
          { type: 'p', key: 'baseline', text: `Baseline data on ${frag(name)} (${frag(v.t('bl_measure'))}) were collected across ${frag(v.t('bl_period'))} and showed ${frag(v.t('bl_value'))}.` },
        ],
      },
      {
        heading: 'Hypothesized Function',
        blocks: [
          { type: 'p', key: 'function', text: `Based on ${assess}, ${frag(name)} is hypothesized to be maintained by ${fnText}.` },
          ...v.paras('fn_evidence').map((t, i) => ({ type: 'p', key: 'evidence' + i, text: fin(t) })),
        ],
      },
      {
        heading: 'Competing Behavior Pathway',
        blocks: [
          {
            type: 'table',
            widths: ['*', '*', '*'],
            head: ['Setting Events and Antecedents', 'Behavior', 'Consequence'],
            rows: [
              [{ text: fin(v.t('antecedents')), rowSpan: 3 }, `Target: ${frag(name)}`, `Current: ${frag(v.t('cur_conseq'))}`],
              [null, `Replacement: ${frag(v.t('replacement'))}`, `Same function: staff ${consRepl}`],
              [null, `Desired: ${frag(v.t('desired'))}`, 'Natural reinforcement'],
            ],
          },
        ],
      },
      {
        heading: 'Antecedent Strategies',
        blocks: [
          { type: 'p', key: 'ant', text: `To reduce the likelihood of ${frag(name)}, staff will implement the following antecedent strategies:` },
          { type: 'ul', items: v.list('ant_strats').map(fin) },
        ],
      },
      { heading: 'Replacement Behavior Instruction', blocks: teach },
      {
        heading: 'Consequence Strategies',
        blocks: [
          ...staffWill('cons_t', `If ${frag(name)} occurs, staff will`, v.multi('cons_target')),
          ...staffWill('cons_r', 'When the replacement behavior occurs, staff will', v.multi('cons_repl')),
          ...para('cons_notes', 'cnote'),
        ],
      },
      {
        heading: 'Crisis and Safety',
        blocks: [{ type: 'p', key: 'safety', text: safety }, ...para('safety_note', 'safetynote')],
      },
      {
        heading: 'Data Collection',
        blocks: [
          { type: 'p', key: 'data', text: `Data on ${frag(name)} and on the replacement behavior will be collected ${frag(v.t('dc_when'))} by ${joinList(v.multi('dc_who'))}, using ${joinList(v.multi('dc_methods'))}. Data will be graphed and reviewed by the supervising BCBA ${frag(v.t('dc_review'))}.` },
          ...para('dc_notes', 'dnote'),
        ],
      },
      {
        heading: 'Goals',
        blocks: [{ type: 'ol', items: v.list('goals').map(fin) }],
      },
      {
        heading: 'Generalization and Maintenance',
        blocks: v.paras('gen_maint').map((t, i) => ({ type: 'p', key: 'gen' + i, text: fin(t) })),
      },
      {
        heading: 'Implementer Training',
        blocks: [
          { type: 'p', key: 'train', text: `Prior to implementation, ${joinList(v.multi('train_who'))} will be trained in the procedures in this plan using ${frag(v.t('train_method'))} to a criterion of ${frag(v.t('train_crit'))}.` },
        ],
      },
      {
        heading: 'Ethical Considerations',
        blocks: [{ type: 'p', key: 'ethics', text: v.multi('ethics').map(fin).join(' ') }],
      },
    ];
  },
};
