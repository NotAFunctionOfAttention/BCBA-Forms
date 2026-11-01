// Skill Assessment Summary, following Chapter 8 of the clinic manual:
// instruments and how each was scored (tested, observed, reported), results,
// strengths, deficits, barriers to learning, missing prerequisites,
// imbalances between related skills, and prioritized candidate goals.
// Published instruments are copyrighted: the form records tool names, the
// scores you enter, and your own summary, never test items.
// Field types and suggestion conventions are described at the top of bip.js.

import { cap, frag, fin, joinList, fmtDate, mark } from '../util.js';
import { GOAL_AREAS } from './common.js';

const TOOLS = [
  ['VB-MAPP', 'VB-MAPP'],
  ['ABLLS-R', 'ABLLS-R'],
  ['AFLS', 'AFLS'],
  ['PEAK', 'PEAK'],
  ['Essential for Living', 'Essential for Living'],
  ['Vineland Adaptive Behavior Scales', 'Vineland Adaptive Behavior Scales'],
  ['Informal probes', 'Informal probes'],
  ['Other', 'Other'],
];
const PRIORITY = [['high', 'High'], ['medium', 'Medium'], ['low', 'Low']];

export default {
  id: 'sa',
  title: 'Skill Assessment Summary',
  fileTag: 'SkillAssessment',
  dates: [
    { id: 'doc_date', label: 'Date of report', required: true },
    { id: 'sa_start', label: 'Assessment start' },
    { id: 'sa_end', label: 'Assessment end' },
  ],
  period: { start: 'sa_start', end: 'sa_end', label: 'Assessment period' },
  guardianSignature: false,

  from: [
    {
      from: 'intake', label: 'Start a skill assessment from this intake',
      carries: 'the planned instruments and the child’s strengths',
      map: (d) => {
        const names = { vbmapp: 'VB-MAPP', ablls: 'ABLLS-R', afls: 'AFLS', peak: 'PEAK', efl: 'Essential for Living', vineland: 'Vineland Adaptive Behavior Scales' };
        return {
          sa_tools: (d.in_plan || []).filter((k) => names[k]).map((k) => ({ tool: names[k] })),
          sa_strengths: d.in_strengths,
        };
      },
    },
  ],

  next: [
    {
      to: 'tx', label: 'Start a treatment plan from this assessment',
      carries: 'the assessment summary and the candidate goals, highest priority first',
      map: (d) => {
        const tools = (Array.isArray(d.sa_tools) ? d.sa_tools : []).map((r) => r.tool).filter(Boolean);
        const toolKeys = { 'VB-MAPP': 'vbmapp', 'ABLLS-R': 'ablls', AFLS: 'afls', PEAK: 'peak', 'Essential for Living': 'efl', 'Vineland Adaptive Behavior Scales': 'vineland' };
        const rank = { high: 0, medium: 1, low: 2 };
        const goals = (Array.isArray(d.sa_goals) ? d.sa_goals : []).filter((r) => String(r.goal || '').trim())
          .sort((a, b) => (rank[a.priority || 'high'] ?? 3) - (rank[b.priority || 'high'] ?? 3));
        return {
          tp_assessments: tools.map((t) => toolKeys[t]).filter(Boolean),
          tp_skill_summary: String(d.sa_summary || '').trim(),
          tp_goals: goals.map((r) => ({ area: r.area || '', goal: r.goal, baseline: r.baseline || '' })),
        };
      },
    },
  ],

  groups: [
    {
      title: 'Instruments and methods',
      fields: [
        {
          id: 'sa_tools', label: 'Instruments used', type: 'grid', layout: 'cards', rowName: 'instrument',
          hint: 'Record scores you obtained. Do not copy test items or scoring criteria into the report; they are copyrighted.',
          columns: [
            { id: 'tool', label: 'Instrument', type: 'select', options: [['', 'Choose…'], ...TOOLS] },
            { id: 'name', label: 'Name (for Other)', optional: true },
            { id: 'how', label: 'Scored by', type: 'select', options: [['', 'Choose…'], ['direct testing', 'Direct testing'], ['direct testing and observation', 'Direct testing and observation'], ['direct testing, observation, and caregiver report', 'Testing, observation, and caregiver report'], ['caregiver report', 'Caregiver report']] },
            { id: 'result', label: 'Results', type: 'textarea', rows: 2, placeholder: 'e.g. Level 1 milestones: 9 of 15; Level 2: 2 of 15. Adaptive Behavior Composite standard score 68.' },
          ],
        },
        { id: 'sa_sessions', label: 'Number of sessions', hint: 'e.g. 3 sessions of about 90 minutes' },
        {
          id: 'sa_conditions', label: 'Testing conditions', type: 'multi', other: true,
          options: [
            ['paired', 'Testing began after pairing', 'Testing began after the assessor had paired with the client.'],
            ['blocks', 'Short blocks with breaks and reinforcement', 'Testing was done in short blocks mixed with play and reinforcement.'],
            ['sessions', 'Spread across sessions', 'Testing was spread across sessions so that one difficult day did not determine the results.'],
            ['manual', 'Scored according to the manual', 'Items were scored according to each manual, and reported skills were recorded as reported rather than credited as tested.'],
          ],
        },
      ],
    },
    {
      title: 'Strengths, deficits and barriers',
      fields: [
        { id: 'sa_strengths', label: 'Strengths', type: 'list', hint: 'One per line.', suggest: ['Strong visual matching skills', 'Imitates simple motor actions', 'Follows familiar routines', 'Enjoys social games such as chase and tickles', 'Tacts many common items'] },
        { id: 'sa_deficits', label: 'Deficits in high-priority areas', type: 'list', hint: 'One per line. Describe the skill; do not copy test items.', suggest: ['Few independent mands; relies on leading adults', 'Limited echoic repertoire', 'Does not yet respond to his name consistently', 'Limited play with peers', 'Dependent on adults for dressing and toileting'] },
        {
          id: 'sa_barriers', label: 'Barriers to learning', type: 'multi', optional: true, other: true,
          options: [
            ['pb', 'Problem behavior', 'problem behavior'],
            ['prompt', 'Prompt dependency', 'prompt dependency'],
            ['motivation', 'Weak motivation', 'weak motivation'],
            ['attending', 'Poor attending', 'poor attending'],
            ['generalization', 'Failure to generalize', 'failure to generalize'],
          ],
        },
        { id: 'sa_prereq', label: 'Missing prerequisites', type: 'list', optional: true, hint: 'Optional. Skills needed before important next skills can be taught. One per line.' },
        {
          id: 'sa_imbalance', label: 'Imbalances between related skills', type: 'textarea', optional: true, hint: 'Optional. Full sentences.',
          suggest: ['Tacts are well ahead of mands, so teaching will emphasize requesting.', 'Receptive skills are ahead of expressive skills.', 'Skills shown at home have not yet been seen in the clinic.'],
        },
      ],
    },
    {
      title: 'Candidate goals and summary',
      fields: [
        {
          id: 'sa_goals', label: 'Candidate goals', type: 'grid', layout: 'cards', rowName: 'goal',
          hint: 'The assessment suggests targets; clinical judgment and the family’s priorities choose them.',
          columns: [
            { id: 'priority', label: 'Priority', type: 'select', options: PRIORITY },
            { id: 'area', label: 'Area', type: 'select', options: [['', 'Choose…'], ...GOAL_AREAS] },
            { id: 'goal', label: 'Goal', type: 'textarea', rows: 3 },
            { id: 'baseline', label: 'Baseline', optional: true },
          ],
        },
        { id: 'sa_summary', label: 'Summary in plain language', type: 'textarea', hint: 'A short summary for the treatment plan and the family, with enough detail to justify goals. Full sentences.' },
      ],
    },
  ],

  build(v, c) {
    const tools = v.rows('sa_tools').filter((r) => r.tool);
    const barriers = v.multi('sa_barriers', { optional: true });
    const prereq = v.list('sa_prereq').filter((x) => !x.startsWith('⟦'));
    const goals = v.rows('sa_goals').filter((r) => String(r.goal || '').trim());
    const rank = { high: 0, medium: 1, low: 2 };
    goals.sort((a, b) => (rank[a.priority || 'high'] ?? 3) - (rank[b.priority || 'high'] ?? 3));
    const para = (id, key, optional) => v.paras(id, { optional }).map((t, i) => ({ type: 'p', key: key + i, text: fin(t) }));
    const label = (r) => (r.tool === 'Other' ? (String(r.name || '').trim() || 'Other') : r.tool);

    return [
      {
        heading: 'Instruments and Methods',
        blocks: [
          { type: 'p', key: 'method', text: `${cap(c.client)} was assessed across ${frag(v.t('sa_sessions'))}. ${v.multi('sa_conditions').map(fin).join(' ')}` },
          tools.length
            ? { type: 'table', widths: [120, 100, '*'], head: ['Instrument', 'Scored by', 'Results'], rows: tools.map((r) => [label(r), r.how ? cap(r.how) : '', r.result ? fin(r.result) : mark('Results for ' + label(r))]) }
            : { type: 'p', text: mark('Instruments used') },
        ],
      },
      { heading: 'Strengths', blocks: [{ type: 'ul', items: v.list('sa_strengths').map(fin) }] },
      { heading: 'Deficits', blocks: [{ type: 'ul', items: v.list('sa_deficits').map(fin) }] },
      {
        heading: 'Barriers to Learning',
        blocks: [
          { type: 'p', key: 'barriers', text: barriers.length ? `Barriers that will affect teaching include ${joinList(barriers)}.` : 'No significant barriers to learning were identified.' },
          ...(prereq.length ? [{ type: 'p', key: 'pre', text: 'Missing prerequisites for important next skills:' }, { type: 'ul', items: prereq.map(fin) }] : []),
          ...para('sa_imbalance', 'imb', true),
        ],
      },
      {
        heading: 'Candidate Goals',
        blocks: goals.length ? [{
          type: 'table', widths: [55, 95, '*'], head: ['Priority', 'Area', 'Goal'],
          rows: goals.map((g) => [cap(g.priority || 'high'), g.area || '', fin(g.goal) + (g.baseline ? ` Baseline: ${fin(g.baseline)}` : '')]),
        }] : [{ type: 'p', text: mark('Candidate goals') }],
      },
      { heading: 'Summary', blocks: para('sa_summary', 'sum') },
    ];
  },
};
