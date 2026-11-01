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

import { cap, frag, fin, joinList, thirdPerson, orJoin, fmtDate } from '../util.js';
import * as S from './behavior-suggest.js';
import { orList, TARGETS, MEASURES, MEASURE_COMBO, ASSESSMENTS, FUNCTIONS, MODES, PROCEDURES, PROMPTS, FADING, SCHEDULES, THINNING, COLLECTORS } from './common.js';

// One response reads as a sentence; several become a bulleted list.
function staffWill(key, lead, items) {
  if (items.length === 1) return [{ type: 'p', key, text: `${lead} ${frag(items[0])}.` }];
  return [{ type: 'p', key, text: `${lead}:` }, { type: 'ul', items: items.map(fin) }];
}

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
  // Worded after Ethics Code 2.14 and 2.15, which speak of prioritizing positive
  // reinforcement and set two conditions for restrictive procedures.
  ['least', 'Positive reinforcement prioritized (2.14)', 'Procedures that rely on positive reinforcement were prioritized, and less intrusive alternatives were selected over more restrictive ones (Ethics Code 2.14).'],
  ['norestrict', 'No restrictive procedures', 'This plan does not include restrictive or punishment-based procedures.'],
  ['restrict', 'Restrictive procedures: less intrusive means failed (2.15)', 'This plan includes restrictive or punishment-based procedures, described above, because less intrusive procedures were implemented and were not effective. They were reviewed and approved before implementation (Ethics Code 2.15).'],
  ['restrict_risk', 'Restrictive procedures: risk of harm outweighs (2.15)', 'This plan includes restrictive or punishment-based procedures, described above, because the risk of harm from the behavior outweighs the risk of the procedures. They were reviewed and approved before implementation (Ethics Code 2.15).'],
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

  next: [
    {
      to: 'visual',
      label: 'Review this plan\u2019s data (visual analysis)',
      carries: 'target behavior and measure, with the goal set to decrease',
      map: (d) => {
        const m = String(d.bl_measure || '');
        const unit = /per hour/.test(m) ? 'per hour' : /percentage/.test(m) ? '%' : /duration/.test(m) ? 'minutes' : /latency/.test(m) ? 'seconds' : /frequency/.test(m) ? 'responses' : '';
        return {
          va_program: d.tb_name ? `${cap(frag(d.tb_name))}${m ? ': ' + frag(m) : ''}` : '',
          va_goal_dir: 'down',
          va_prev_name: 'baseline',
          va_cur_name: 'intervention (behavior intervention plan)',
          va_unit: unit,
        };
      },
    },
    {
      to: 'skill',
      label: 'Start a skill program for the replacement behavior',
      carries: 'replacement behavior, response form, teaching procedure, fading, schedule, reinforcers and data collectors',
      map: (d) => {
        const repl = frag(d.replacement || '');
        const modes = MODES.filter(([k]) => (d.repl_modes || []).includes(k)).map((o) => o[2]);
        const REINF = { break: 'the requested break', attn: 'the requested attention', tan: 'the requested item or activity', help: 'the requested help', praise: 'behavior-specific praise' };
        const reinf = (d.cons_repl || []).map((k) => REINF[k]).filter(Boolean);
        return {
          sk_name: repl ? cap(repl) : '', sk_name__o: !!repl,
          sk_rationale: repl ? `This skill is the replacement behavior in the behavior intervention plan for ${frag(d.tb_name || 'the target behavior')}${d.doc_date ? ' dated ' + fmtDate(d.doc_date) : ''}.` : '',
          sk_def: repl ? `${thirdPerson(repl)}${modes.length ? ' using ' + orJoin(modes) : ''}, without a prompt, when the opportunity is presented` : '',
          sk_format: d.teach_proc ? frag(d.teach_proc) : '',
          sk_fading: d.teach_fade, sk_sched: d.teach_sched, sk_thin: d.teach_thin,
          sk_reinforcer: reinf,
          sk_data_who: d.dc_who, sk_data_who_other: d.dc_who_other,
        };
      },
    },
  ],

  groups: [
    {
      title: 'Target behavior',
      fields: [
        { id: 'tb_name', label: 'Target behavior', type: 'combo', options: TARGETS, hint: 'One behavior per plan. Something the person does: if a dead man could do it (not hitting, not following an instruction), it isn’t behavior.' },
        { id: 'tb_def', label: 'Operational definition', type: 'textarea', hint: 'Completes "…is defined as". Tap a suggestion to use it, then edit it to fit.', suggest: S.definition, suggestMode: 'replace', suggestEmpty: 'Choose a target behavior above to see suggestions.' },
        { id: 'tb_onset', label: 'Onset', suggest: S.onset, suggestMode: 'replace', suggestEmpty: 'Choose a target behavior above to see suggestions.' },
        { id: 'tb_offset', label: 'Offset', suggest: S.offset, suggestMode: 'replace', suggestEmpty: 'Choose a target behavior above to see suggestions.' },
        { id: 'tb_ex', label: 'Examples', type: 'list', hint: 'One per line', suggest: S.examples, suggestEmpty: 'Choose a target behavior above to see suggestions.' },
        { id: 'tb_nonex', label: 'Non-examples', type: 'list', hint: 'One per line', suggest: S.nonExamples, suggestEmpty: 'Choose a target behavior above to see suggestions.' },
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
        { id: 'fn_assess', label: 'Assessments conducted', combine: 'union', type: 'multi', options: ASSESSMENTS, other: true, otherHint: 'One per line, e.g. a caregiver rating scale' },
        { id: 'fn_functions', label: 'Function', type: 'multi', options: FUNCTIONS },
        { id: 'fn_evidence', label: 'Supporting evidence', combine: 'paragraphs', type: 'textarea', hint: 'Full sentences. e.g. 80% of recorded episodes followed a demand and ended with removal of the task.' },
      ],
    },
    {
      title: 'Competing behavior pathway',
      fields: [
        { id: 'antecedents', label: 'Setting events and antecedents', type: 'textarea', hint: 'When it is most and least likely. Suggestions follow the function you ticked.', suggest: S.antecedents },
        { id: 'cur_conseq', label: 'Current maintaining consequence', type: 'combo', options: CURRENT },
        { id: 'replacement', label: 'Replacement behavior', type: 'combo', options: REPLACEMENTS, hint: 'Same function, easier to do. A custom answer should complete "will be taught to".' },
        { id: 'repl_modes', label: 'Response form', type: 'multi', options: MODES, other: true, optional: true, otherHint: 'One per line, e.g. a break card on a lanyard' },
        { id: 'desired', label: 'Desired long-term behavior', hint: 'Completes "for the client to".', suggest: S.desired, suggestMode: 'replace', suggestEmpty: 'Tick a function above to see suggestions.' },
      ],
    },
    {
      title: 'Antecedent strategies',
      fields: [
        {
          id: 'ant_strats', label: 'Antecedent strategies', type: 'list', hint: 'One per line, each tied to an antecedent above. Suggestions follow the function you ticked; tap to add, then edit to fit.',
          suggest: S.strategies,
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
        { id: 'teach_notes', label: 'Additional teaching details', type: 'textarea', optional: true, combine: 'paragraphs', hint: 'Optional. Full sentences.', suggest: S.teachNotes },
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
        { id: 'safety_note', label: 'Safety notes', type: 'textarea', optional: true, hint: 'Optional. Risk of injury, protocol name and date.', suggest: S.safetyNotes },
      ],
    },
    {
      title: 'Data collection',
      fields: [
        { id: 'dc_methods', label: 'Measurement', type: 'multi', options: MEASURES, other: true },
        { id: 'dc_who', label: 'Collected by', type: 'multi', options: COLLECTORS, other: true },
        { id: 'dc_when', label: 'When', type: 'combo', options: WHEN },
        { id: 'dc_review', label: 'Graphed and reviewed by the BCBA', type: 'combo', options: REVIEW },
        { id: 'dc_notes', label: 'Additional data details', type: 'textarea', optional: true, hint: 'Optional. Full sentences.', suggest: S.dataNotes },
      ],
    },
    {
      title: 'Goals, generalization and maintenance',
      fields: [
        { id: 'goals', label: 'Goals', type: 'list', hint: 'One per line. Suggestions use your answers above and the review date; adjust the criteria to fit.', suggest: S.goals, suggestEmpty: 'Choose a target behavior above to see suggestions.' },
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
