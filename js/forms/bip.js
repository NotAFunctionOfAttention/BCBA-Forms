// Behavior Intervention Plan.
// `groups` drives the entry form; `build` turns the answers into the document.
// Hints describe the expected phrasing so the answers drop into the sentences
// below without editing.

import { cap, frag, fin, paras, joinList } from '../util.js';

const FUNCTIONS = [
  ['escape', 'escape from or avoidance of demands'],
  ['attention', 'access to attention'],
  ['tangible', 'access to preferred items or activities'],
  ['automatic', 'automatic reinforcement'],
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
        { id: 'tb_name', label: 'Target behavior', hint: 'One behavior per plan, named plainly. e.g. aggression' },
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
        { id: 'bl_measure', label: 'Measure', hint: 'e.g. rate per hour' },
        { id: 'bl_period', label: 'Baseline period', hint: 'e.g. 5 sessions between 09/14/2026 and 09/25/2026' },
        { id: 'bl_value', label: 'Result', hint: 'e.g. a mean of 6 per hour (range 3 to 9)' },
      ],
    },
    {
      title: 'Hypothesized function',
      fields: [
        { id: 'fn_assess', label: 'Assessments conducted', type: 'textarea', hint: 'Completes "Based on…". e.g. a Functional Assessment Interview with the caregiver and 3 days of ABC data collection' },
        { id: 'fn_functions', label: 'Function', type: 'checks', options: FUNCTIONS },
        { id: 'fn_evidence', label: 'Supporting evidence', type: 'textarea', hint: 'Full sentences. e.g. 80% of recorded episodes followed a demand and ended with removal of the task.' },
      ],
    },
    {
      title: 'Competing behavior pathway',
      fields: [
        { id: 'antecedents', label: 'Setting events and antecedents', type: 'textarea', hint: 'When it is most and least likely. e.g. Most likely during tabletop work lasting 10 minutes or longer; rarely observed during play.' },
        { id: 'cur_conseq', label: 'Current maintaining consequence', hint: 'e.g. Staff remove the task or provide a break' },
        { id: 'replacement', label: 'Replacement behavior', hint: 'Same function, easier to do. Completes "will be taught to". e.g. request a break using a picture card or by saying "break, please"' },
        { id: 'desired', label: 'Desired long-term behavior', hint: 'Completes "for the client to". e.g. complete 10-minute work periods with scheduled breaks' },
      ],
    },
    {
      title: 'Intervention',
      fields: [
        { id: 'ant_strats', label: 'Antecedent strategies', type: 'list', hint: 'One per line, each tied to an antecedent above. e.g. Visual schedule reviewed at the start of each work period' },
        { id: 'teach', label: 'Teaching procedure for the replacement behavior', type: 'textarea', hint: 'Completes "using". e.g. functional communication training (FCT) with full physical prompts faded by a 2-second time delay, with breaks delivered on an FR1 schedule' },
        { id: 'cons_target', label: 'Staff response to the target behavior', type: 'textarea', hint: 'Completes "staff will". e.g. continue the instruction using physical guidance as approved, without providing a break' },
        { id: 'cons_repl', label: 'Staff response to the replacement behavior', type: 'textarea', hint: 'Completes "staff will". e.g. honor the request immediately with a 1-minute break' },
        { id: 'safety', label: 'Safety', type: 'select', options: [['none', 'No crisis procedures are indicated'], ['protocol', 'A separate crisis protocol applies']] },
        { id: 'safety_note', label: 'Safety notes', type: 'textarea', optional: true, hint: 'Optional. Risk of injury, protocol name and date.' },
      ],
    },
    {
      title: 'Measurement and goals',
      fields: [
        { id: 'data', label: 'Data collection', type: 'textarea', hint: 'What, how, who and when, in full sentences.' },
        { id: 'goals', label: 'Goals', type: 'list', hint: 'One per line. Measurable, with criterion and target date.' },
        { id: 'gen_maint', label: 'Generalization and maintenance', type: 'textarea', hint: 'People, settings, materials, and the plan for thinning reinforcement. Full sentences.' },
      ],
    },
    {
      title: 'Training and ethical considerations',
      fields: [
        { id: 'train_who', label: 'Implementers to be trained', hint: 'e.g. all RBTs assigned to the case and the primary caregiver' },
        { id: 'train_method', label: 'Training method', default: 'behavioral skills training (BST)' },
        { id: 'train_crit', label: 'Integrity criterion', hint: 'e.g. at least 90% procedural integrity across 2 consecutive observations' },
        { id: 'ethics', label: 'Ethical considerations', type: 'textarea', hint: 'Restrictive procedures, less restrictive alternatives, consent and assent. Full sentences.' },
      ],
    },
  ],

  build(v, c) {
    const name = v.t('tb_name');
    const fns = v.checks('fn_functions', FUNCTIONS);
    const fnText = fns.length ? joinList(fns) : v.missing('fn_functions');
    const safety = v.raw('safety') === 'protocol'
      ? 'A separate crisis protocol applies to this plan and is maintained in the client record.'
      : 'No crisis or emergency procedures are indicated under this plan.';

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
          { type: 'p', key: 'function', text: `Based on ${frag(v.t('fn_assess'))}, ${frag(name)} is hypothesized to be maintained by ${fnText}.` },
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
              [null, `Replacement: ${frag(v.t('replacement'))}`, `Same function: ${frag(v.t('cons_repl'))}`],
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
      {
        heading: 'Replacement Behavior Instruction',
        blocks: [
          { type: 'p', key: 'teach', text: `${cap(c.client)} will be taught to ${frag(v.t('replacement'))} using ${frag(v.t('teach'))}. The long-term objective is for ${c.client} to ${frag(v.t('desired'))}.` },
        ],
      },
      {
        heading: 'Consequence Strategies',
        blocks: [
          { type: 'p', key: 'cons', text: `If ${frag(name)} occurs, staff will ${frag(v.t('cons_target'))}. Following each occurrence of the replacement behavior, staff will ${frag(v.t('cons_repl'))}.` },
        ],
      },
      {
        heading: 'Crisis and Safety',
        blocks: [
          { type: 'p', key: 'safety', text: safety },
          ...paras(v.raw('safety_note')).map((t, i) => ({ type: 'p', key: 'safetynote' + i, text: fin(t) })),
        ],
      },
      {
        heading: 'Data Collection',
        blocks: v.paras('data').map((t, i) => ({ type: 'p', key: 'data' + i, text: fin(t) })),
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
          { type: 'p', key: 'train', text: `Prior to implementation, ${frag(v.t('train_who'))} will be trained in the procedures in this plan using ${frag(v.t('train_method'))} to a criterion of ${frag(v.t('train_crit'))}.` },
        ],
      },
      {
        heading: 'Ethical Considerations',
        blocks: v.paras('ethics').map((t, i) => ({ type: 'p', key: 'ethics' + i, text: fin(t) })),
      },
    ];
  },
};
