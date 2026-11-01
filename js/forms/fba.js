// Functional Behavior Assessment report.
// Field types and suggestion conventions are described at the top of bip.js.

import { cap, frag, fin, joinList, lines } from '../util.js';
import * as B from './behavior-suggest.js';
import { TARGETS, ASSESSMENTS, FUNCTIONS } from './common.js';

const RECORDS = [
  ['evals', 'Prior evaluations', 'prior evaluations'],
  ['bip', 'Previous behavior plans', 'previous behavior plans'],
  ['iep', 'IEP or school records', 'IEP and school records'],
  ['medical', 'Medical records', 'medical records'],
  ['intake', 'Intake paperwork', 'intake paperwork'],
  ['progress', 'Previous progress reports', 'previous ABA progress reports'],
];

const INDIRECT = ASSESSMENTS.filter(([k]) => ['fai', 'fast', 'qabf', 'mas'].includes(k));
const DESCRIPTIVE = [
  ...ASSESSMENTS.filter(([k]) => ['abc_n', 'abc_c', 'scatter'].includes(k)),
  ['freq', 'Frequency recording', 'frequency recording'],
  ['dur', 'Duration recording', 'duration recording'],
];

const INFORMANTS = [
  ['cg', 'Parent / caregiver', 'the caregiver'],
  ['teacher', 'Teacher', 'the teacher'],
  ['rbt', 'RBT', 'the RBT'],
  ['client', 'Client', 'the client'],
];

const PLACES = [
  ['therapy', 'Therapy room', 'the therapy room'],
  ['home', 'Home', 'the home'],
  ['class', 'Classroom', 'the classroom'],
  ['common', 'Hallways', 'hallways'],
  ['community', 'Community', 'community settings'],
];

const FN_WORDS = { escape: 'escape', attention: 'attention', tangible: 'access to tangibles', automatic: 'automatic reinforcement' };
const fnKeys = (d) => (Array.isArray(d.fn_functions) ? d.fn_functions : []);
const clientOf = (d) => String(d.client_name || '').trim().split(/\s+/)[0] || 'the client';

const ANT = {
  escape: ['A demand or instruction was presented before most recorded episodes.', 'Episodes most often followed the presentation of difficult or non-preferred tasks.'],
  attention: ['Episodes most often occurred when adult attention was directed elsewhere.', 'Episodes most often occurred when the client was playing alone.'],
  tangible: ['Episodes most often followed the removal or denial of a preferred item or activity.', 'Episodes most often occurred when a preferred activity ended.'],
  automatic: ['Episodes occurred across antecedent conditions with no consistent pattern.', 'Episodes most often occurred during unstructured time with little to do.'],
};
const CON = {
  escape: ['Staff most often removed or delayed the task.', 'The instruction was most often withdrawn or repeated without follow-through.'],
  attention: ['Staff most often responded with reprimands, redirection, or comfort.', 'Peers most often laughed or reacted.'],
  tangible: ['Access to the preferred item or activity was most often restored.', 'Staff most often offered a different preferred item.'],
  automatic: ['No consistent social consequence followed the behavior.', 'The behavior most often continued regardless of how others responded.'],
};
const ABSENT = {
  escape: ['no demands were placed', 'the client was engaged in preferred activities'],
  attention: ['the client had continuous one-to-one attention', 'an adult was playing with the client'],
  tangible: ['preferred items were freely available', 'no preferred activities were ending'],
  automatic: ['the client was engaged in structured activities with high levels of interaction'],
};
const HYP_ANT = {
  escape: 'a non-preferred task or instruction is presented',
  attention: 'adult attention is directed to someone or something else',
  tangible: 'a preferred item or activity is removed or denied',
  automatic: 'the client is alone or has little to do',
};
const HYP_CON = {
  escape: 'removal or delay of the task',
  attention: 'attention from adults',
  tangible: 'access to the preferred item or activity',
  automatic: 'sensory stimulation produced by the behavior itself',
};
const RECS = {
  escape: [
    'Teach the client to request a break using functional communication training (FCT).',
    'Teach the client to request help with difficult tasks.',
    'Use high-probability request sequences and choice-making before non-preferred tasks.',
  ],
  attention: [
    'Teach the client to request attention appropriately using functional communication training (FCT).',
    'Provide noncontingent attention on a fixed-time schedule.',
  ],
  tangible: [
    'Teach the client to request preferred items and to tolerate waiting.',
    'Provide advance warnings and visual timers before preferred activities end.',
  ],
  automatic: [
    'Provide alternative items and activities that produce similar sensory stimulation.',
    'Increase structured activity during periods of unstructured time.',
  ],
};

const pick = (d, table) => fnKeys(d).flatMap((k) => (Array.isArray(table[k]) ? table[k] : [table[k]]));

export default {
  id: 'fba',
  title: 'Functional Behavior Assessment',
  fileTag: 'FBA',
  dates: [
    { id: 'doc_date', label: 'Date of report', required: true },
    { id: 'assess_start', label: 'Assessment start date' },
    { id: 'assess_end', label: 'Assessment end date' },
  ],
  guardianSignature: false,

  // Documents this one can start. See startFrom() in js/engine.js.
  next: [
    {
      to: 'bip',
      label: 'Start a BIP from this FBA',
      carries: 'target behavior and definition, function, assessments, evidence, antecedents and current consequence',
      map(d) {
        const has = (id, k) => Array.isArray(d[id]) && d[id].includes(k);
        // Tools the BIP lists by name; anything else goes in as an "Other" line.
        const named = new Set(['fai', 'fast', 'qabf', 'mas', 'abc_n', 'abc_c', 'scatter']);
        const picked = [...(d.indirect || []), ...(d.desc_methods || [])];
        const assess = picked.filter((k) => named.has(k));
        if ((d.records || []).length) assess.push('records');
        const otherLines = [
          ...(has('indirect', '__other') ? lines(d.indirect_other) : []),
          ...(has('desc_methods', '__other') ? lines(d.desc_methods_other) : []),
          ...(has('desc_methods', 'freq') ? ['frequency recording'] : []),
          ...(has('desc_methods', 'dur') ? ['duration recording'] : []),
        ];
        if (otherLines.length) assess.push('__other');
        const absent = lines(d.absent).map(frag);
        const antecedents = [
          d.hyp_ante ? fin(`Most likely when ${frag(d.hyp_ante)}`) : '',
          String(d.setting_events || '').trim(),
          absent.length ? fin(`Rarely observed when ${joinList(absent)}`) : '',
        ].filter(Boolean).join(' ');
        return {
          tb_name: d.tb_name, tb_name__o: d.tb_name__o,
          tb_def: d.tb_def, tb_onset: d.tb_onset, tb_offset: d.tb_offset, tb_ex: d.tb_ex, tb_nonex: d.tb_nonex,
          fn_functions: d.fn_functions,
          fn_assess: assess, fn_assess_other: otherLines.join('\n'),
          fn_evidence: [d.indirect_result, d.ant_patterns, d.con_patterns].map((t) => String(t || '').trim()).filter(Boolean).join('\n\n'),
          antecedents,
          cur_conseq: d.hyp_conseq ? cap(frag(d.hyp_conseq)) : '',
        };
      },
    },
  ],

  groups: [
    {
      title: 'Reason for referral',
      fields: [
        {
          id: 'referral', label: 'Referral question', type: 'textarea', hint: 'Written before data collection. Suggestions use the client and target behavior.',
          suggestMode: 'replace', suggestEmpty: 'Choose a target behavior below to see suggestions.',
          suggest: (d) => (d.tb_name ? [
            `What variables maintain ${clientOf(d)}'s ${frag(d.tb_name)}?`,
            `What function does ${frag(d.tb_name)} serve for ${clientOf(d)}, and what replacement behavior should be taught?`,
            `What antecedents and consequences are associated with ${clientOf(d)}'s ${frag(d.tb_name)} across home and clinic settings?`,
          ] : []),
        },
      ],
    },
    {
      title: 'Target behavior',
      fields: [
        { id: 'tb_name', label: 'Target behavior', type: 'combo', options: TARGETS },
        { id: 'tb_def', label: 'Operational definition', type: 'textarea', hint: 'Completes "…is defined as".', suggest: B.definition, suggestMode: 'replace', suggestEmpty: 'Choose a target behavior above to see suggestions.' },
        { id: 'tb_onset', label: 'Onset', suggest: B.onset, suggestMode: 'replace' },
        { id: 'tb_offset', label: 'Offset', suggest: B.offset, suggestMode: 'replace' },
        { id: 'tb_ex', label: 'Examples', type: 'list', hint: 'One per line', suggest: B.examples },
        { id: 'tb_nonex', label: 'Non-examples', type: 'list', hint: 'One per line', suggest: B.nonExamples },
      ],
    },
    {
      title: 'Assessment methods',
      fields: [
        { id: 'records', label: 'Records reviewed', type: 'multi', options: RECORDS, other: true },
        {
          id: 'records_notes', label: 'Relevant findings from records', type: 'textarea', optional: true, hint: 'Optional. Full sentences.',
          suggest: [
            'No medical conditions relevant to the target behavior were identified.',
            'Records indicate the behavior has been present for more than 1 year.',
            'A previous behavior plan addressed this behavior with limited success.',
          ],
        },
        { id: 'indirect', label: 'Indirect assessment tools', type: 'multi', options: INDIRECT, other: true },
        { id: 'informants', label: 'Informants', type: 'multi', options: INFORMANTS, other: true },
        {
          id: 'indirect_result', label: 'Indirect assessment results', type: 'textarea', hint: 'What each tool pointed to. Suggestions follow the tools and function you ticked.',
          suggest: (d) => {
            const tools = INDIRECT.filter(([k]) => (d.indirect || []).includes(k)).map((o) => o[2]);
            const fns = fnKeys(d).map((k) => FN_WORDS[k]);
            if (!tools.length || !fns.length) return [];
            return tools.map((t) => `${cap(t.replace(/^(a|an|the) /i, 'the '))} identified ${joinList(fns)} as the most likely function.`);
          },
          suggestEmpty: 'Tick the tools above and a function under Hypothesis to see suggestions.',
        },
        { id: 'desc_methods', label: 'Descriptive assessment methods', type: 'multi', options: DESCRIPTIVE, other: true },
        { id: 'desc_amount', label: 'Number and length of observations', hint: 'e.g. 6 observations totaling 4 hours' },
        { id: 'desc_places', label: 'Observation settings', type: 'multi', options: PLACES, other: true },
      ],
    },
    {
      title: 'Results',
      fields: [
        { id: 'fn_functions', label: 'Function suggested by the data', type: 'multi', options: FUNCTIONS, hint: 'Ticking a function here fills the suggestions below.' },
        { id: 'ant_patterns', label: 'Antecedent patterns', type: 'textarea', hint: 'Which antecedents preceded the behavior most often. Add percentages.', suggest: (d) => pick(d, ANT), suggestEmpty: 'Tick a function above to see suggestions.' },
        { id: 'con_patterns', label: 'Consequence patterns', type: 'textarea', hint: 'What followed most often. Add percentages.', suggest: (d) => pick(d, CON), suggestEmpty: 'Tick a function above to see suggestions.' },
        {
          id: 'setting_events', label: 'Setting events', type: 'textarea', optional: true, hint: 'Optional. Sleep, illness, schedule changes, time of day.',
          suggest: [
            'Episodes were more frequent on days following poor sleep.',
            'Episodes were more frequent when the client was ill.',
            'Episodes were more frequent after changes to the daily routine.',
            'Episodes were more frequent later in the day.',
            'No setting events were identified.',
          ],
        },
        { id: 'absent', label: 'The behavior rarely occurred when…', type: 'list', hint: 'One condition per line. These help rule out other functions.', suggest: (d) => pick(d, ABSENT), suggestEmpty: 'Tick a function above to see suggestions.' },
        { id: 'agree', label: 'Agreement between sources', type: 'select', options: [['agree', 'Indirect and descriptive results agreed'], ['partial', 'Results partially agreed'], ['disagree', 'Results disagreed']] },
        { id: 'agree_notes', label: 'Where sources differed', type: 'textarea', optional: true, hint: 'Optional. Full sentences.' },
      ],
    },
    {
      title: 'Hypothesis',
      fields: [
        { id: 'hyp_setting', label: 'Setting event (if any)', optional: true, hint: 'Optional. Completes "When…". e.g. the client has slept poorly', suggest: ['the client has slept poorly', 'the client is ill', 'the daily routine has changed'], suggestMode: 'replace' },
        { id: 'hyp_ante', label: 'Antecedent', hint: 'Completes "When…".', suggest: (d) => pick(d, HYP_ANT), suggestMode: 'replace', suggestEmpty: 'Tick a function under Results to see suggestions.' },
        { id: 'hyp_conseq', label: 'Resulting consequence', hint: 'Completes "…which results in".', suggest: (d) => pick(d, HYP_CON), suggestMode: 'replace', suggestEmpty: 'Tick a function under Results to see suggestions.' },
        { id: 'confidence', label: 'Confidence in the hypothesis', type: 'select', options: [['high', 'High'], ['moderate', 'Moderate'], ['low', 'Low']] },
        {
          id: 'conf_reason', label: 'Reason for this confidence level', type: 'textarea', hint: 'Full sentences.',
          suggest: [
            'Indirect and descriptive data consistently pointed to the same function.',
            'Descriptive data showed a clear and consistent antecedent and consequence pattern.',
            'Results were mixed across sources, and more than one function may be involved.',
            'The number of recorded episodes was small.',
          ],
        },
        {
          id: 'next_steps', label: 'Next steps', type: 'multi', other: true,
          options: [
            ['bip', 'Develop a BIP based on this hypothesis', 'A function-based behavior intervention plan will be developed based on this hypothesis.'],
            ['fa', 'Functional analysis recommended', 'A functional analysis is recommended to confirm the hypothesized function before intervention.'],
            ['more', 'Collect more descriptive data', 'Additional descriptive data will be collected before the hypothesis is finalized.'],
            ['medical', 'Medical consultation recommended', 'Consultation with the client’s physician is recommended to rule out medical contributors.'],
          ],
        },
      ],
    },
    {
      title: 'Recommendations',
      fields: [
        { id: 'recs', label: 'Recommendations', type: 'list', hint: 'One per line. Suggestions follow the function you ticked.', suggest: (d) => [...pick(d, RECS), 'Collect ongoing data on the target behavior and the replacement behavior.', 'Train caregivers and staff on the behavior plan using behavioral skills training (BST).'] },
      ],
    },
  ],

  build(v, c) {
    const name = v.t('tb_name');
    const fns = v.multi('fn_functions');
    const informants = v.multi('informants');
    const agree = { agree: 'Results of the indirect and descriptive assessments agreed.', partial: 'Results of the indirect and descriptive assessments partially agreed.', disagree: 'Results of the indirect and descriptive assessments did not agree.' }[v.raw('agree') || 'agree'];
    const setting = v.opt('hyp_setting');
    const absent = v.list('absent').map(frag);
    const para = (id, key, optional) => v.paras(id, { optional }).map((t, i) => ({ type: 'p', key: key + i, text: fin(t) }));

    return [
      {
        heading: 'Reason for Referral',
        blocks: [{ type: 'p', key: 'referral', text: `This assessment was conducted to answer the following question: ${fin(v.t('referral')).replace(/\.$/, '?').replace(/\?\?$/, '?')}` }],
      },
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
        heading: 'Assessment Methods',
        blocks: [
          {
            type: 'dl', wide: true, rows: [
              ['Records reviewed', cap(joinList(v.multi('records')))],
              ['Indirect assessment', `${cap(joinList(v.multi('indirect')))}, completed with ${joinList(informants)}`],
              ['Descriptive assessment', `${cap(joinList(v.multi('desc_methods')))}; ${frag(v.t('desc_amount'))}; ${joinList(v.multi('desc_places'))}`],
            ],
          },
          ...para('records_notes', 'records', true),
        ],
      },
      {
        heading: 'Results',
        blocks: [
          ...para('indirect_result', 'indirect'),
          ...para('ant_patterns', 'ant'),
          ...para('con_patterns', 'con'),
          ...para('setting_events', 'setting', true),
          { type: 'p', key: 'absent', text: `${cap(name)} rarely occurred when ${joinList(absent)}.` },
          { type: 'p', key: 'agree', text: agree },
          ...para('agree_notes', 'agreenote', true),
        ],
      },
      {
        heading: 'Hypothesis Statement',
        blocks: [{
          type: 'p', key: 'hyp',
          text: `When ${setting ? `${frag(setting)} and ` : ''}${frag(v.t('hyp_ante'))}, ${c.client} engages in ${frag(name)}, which results in ${frag(v.t('hyp_conseq'))}. ${cap(name)} is hypothesized to be maintained by ${joinList(fns)}.`,
        }],
      },
      {
        heading: 'Confidence and Next Steps',
        blocks: [
          { type: 'p', key: 'conf', text: `Confidence in this hypothesis is ${v.raw('confidence') || 'high'}. ${v.paras('conf_reason').map(fin).join(' ')}` },
          { type: 'p', key: 'next', text: v.multi('next_steps').map(fin).join(' ') },
        ],
      },
      {
        heading: 'Recommendations',
        blocks: [{ type: 'ul', items: v.list('recs').map(fin) }],
      },
    ];
  },
};
