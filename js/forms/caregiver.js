// Caregiver Training Plan, following Chapter 16 of the clinic manual:
// caregivers involved, the hardest moments of the day, measurable training
// goals with baseline and current fidelity, behavioral skills training,
// settings and format, contextual fit, fidelity measurement, and social
// validity. Also exports a one-page plain-language Family summary.
// Field types and suggestion conventions are described at the top of bip.js.

import { cap, frag, fin, joinList, lines, fmtDate, mark } from '../util.js';

// Everyday wording for the app's standard BIP phrases, for the family summary.
// Phrases without a plain version are left out rather than passed on as jargon.
const PLAIN_STRATEGY = {
  'visual schedule reviewed at the start of each session': 'Show the picture schedule at the start of the day and go over what comes next',
  'advance warning and a visual timer before transitions': 'Before something fun ends, say "2 more minutes" and start the timer where your child can see it',
  'high-probability request sequence before non-preferred tasks': 'Before a hard task, ask for two or three easy things your child likes to do',
  'choice of tasks, materials, or order of activities': 'Offer a choice, like which task to do first or which cup to use',
  'first-then statements pairing non-preferred with preferred activities': 'Say "first ___, then ___", with the fun thing second',
  'noncontingent reinforcement (ncr) on a fixed-time schedule': 'Give attention or a favorite item often, before any problem behavior happens',
  'noncontingent attention delivered on a fixed-time schedule': 'Check in with your child every few minutes, even when things are going well',
  'priming with a preview of upcoming activities': 'Tell or show your child what is coming next before it happens',
  'scheduled breaks built into each work period': 'Plan short breaks during chores or homework',
};
const PLAIN_REPLACEMENT = {
  'request a break': 'asks for a break',
  'request help': 'asks for help',
  'request attention': 'asks for your attention',
  'request the preferred item or activity': 'asks for something they want',
  'request more time before a transition': 'asks for more time',
};

const STATUS = [['in progress', 'In progress'], ['met', 'Met'], ['not started', 'Not started'], ['discontinued', 'Discontinued']];
const statusLabel = (k) => (STATUS.find((s) => s[0] === k) || STATUS[0])[1];

export default {
  id: 'cg',
  title: 'Caregiver Training Plan',
  fileTag: 'CaregiverTraining',
  dates: [
    { id: 'doc_date', label: 'Date of plan', required: true },
    { id: 'cg_review', label: 'Next review' },
  ],
  guardianSignature: true,

  variants: [{
    id: 'family', label: 'Family summary', title: 'Family Summary', fileTag: 'FamilySummary', quick: true, onePage: true,
    idLine: (d) => [String(d.client_name || '').trim().split(/\s+/)[0], d.doc_date ? `Updated ${fmtDate(d.doc_date)}` : ''].filter(Boolean).join('   ·   '),
    build(v) {
      const contact = v.opt('cg_contact');
      return [
        { col: 1, heading: 'What we are working on', blocks: [{ type: 'p', text: fin(v.t('cg_plain_goal')) }] },
        { col: 1, heading: 'Why it helps', blocks: v.paras('cg_plain_why').map((t) => ({ type: 'p', text: fin(t) })) },
        { col: 2, heading: 'What to do', blocks: [{ type: 'ol', items: v.list('cg_plain_steps').map(fin) }] },
        { col: 2, heading: 'What to expect', blocks: v.paras('cg_plain_expect').map((t) => ({ type: 'p', text: fin(t) })) },
        ...(contact ? [{ col: 1, heading: 'Questions', blocks: [{ type: 'p', text: fin(contact) }] }] : []),
      ];
    },
  }],

  from: [
    {
      from: 'tx', label: 'Start a caregiver training plan from this treatment plan',
      carries: 'the caregiver training goals and schedule',
      map: (d) => ({
        cg_goals: lines(d.tp_cg_goals).map((g) => ({ caregiver: 'Caregivers', goal: fin(g), status: 'in progress' })),
        cg_format: d.tp_cg_schedule ? `${frag(d.tp_cg_schedule)}` : '',
      }),
    },
    {
      from: 'bip', label: 'Start caregiver training on this BIP',
      carries: 'goals for the BIP’s antecedent strategies and response to the replacement behavior, and a starting plain-language summary',
      map: (d) => {
        const name = frag(d.tb_name || 'problem behavior');
        const repl = frag(d.replacement || '');
        const strategies = lines(d.ant_strats);
        return {
          cg_goals: [
            ...(strategies.length ? [{ caregiver: 'Caregivers', goal: `Implement the antecedent strategies in the behavior intervention plan (${strategies.map((x) => frag(x)).join('; ')}) with at least 80% fidelity across 3 consecutive observations.`, status: 'in progress' }] : []),
            ...(repl ? [{ caregiver: 'Caregivers', goal: `Respond to the client’s attempts to ${repl} within 5 seconds in at least 80% of opportunities across 3 consecutive observations.`, status: 'in progress' }] : []),
          ],
          cg_plain_goal: PLAIN_REPLACEMENT[repl] ? `Helping ${String(d.client_name || '').trim().split(/\s+/)[0] || 'your child'} learn to ${PLAIN_REPLACEMENT[repl].replace(/^asks/, 'ask')} instead of ${name === 'aggression' ? 'hitting' : name}.` : '',
          cg_plain_steps: [
            ...strategies.map((x) => PLAIN_STRATEGY[frag(x).toLowerCase()]).filter(Boolean).slice(0, 3),
            ...(PLAIN_REPLACEMENT[repl] ? [`When your child ${PLAIN_REPLACEMENT[repl]}, say yes right away and follow through`] : []),
          ].join('\n'),
        };
      },
    },
  ],

  next: [
    {
      to: 'pr', label: 'Use this in a progress report',
      carries: 'caregiver training progress on each goal',
      map: (d) => {
        const goals = (Array.isArray(d.cg_goals) ? d.cg_goals : []).filter((g) => String(g.goal || '').trim());
        return {
          pr_cg: goals.map((g) => `${cap(frag(g.caregiver || 'Caregivers'))}: ${frag(g.goal)}. Baseline fidelity ${g.baseline || 'not recorded'}; current fidelity ${g.current || 'not yet measured'} (${statusLabel(g.status).toLowerCase()}).`).join('\n\n'),
        };
      },
    },
  ],

  groups: [
    {
      title: 'Caregivers and priorities',
      fields: [
        { id: 'cg_people', label: 'Caregivers taking part', type: 'multi', other: true, options: [['mother', 'Mother', 'the mother'], ['father', 'Father', 'the father'], ['grand', 'Grandparent', 'a grandparent'], ['sibling', 'Older sibling', 'an older sibling'], ['other', 'Other caregiver', 'another caregiver']] },
        { id: 'cg_language', label: 'Language for training and written materials', hint: 'e.g. Spanish' },
        { id: 'cg_hard', label: 'Hardest moments of the day, in the family’s words', type: 'list', hint: 'Training goals come from these. One per line.' },
      ],
    },
    {
      title: 'Training goals',
      fields: [
        {
          id: 'cg_goals', label: 'Goals', type: 'grid', layout: 'cards', rowName: 'goal', combine: 'rows',
          hint: 'Two or three at a time is often right. Each states the procedure and a fidelity criterion.',
          columns: [
            { id: 'caregiver', label: 'Caregiver', placeholder: 'e.g. Mother and grandmother' },
            { id: 'goal', label: 'Goal', type: 'textarea', rows: 3, placeholder: 'e.g. Use the transition warning and timer with at least 80% fidelity across 3 observed transitions.' },
            { id: 'baseline', label: 'Baseline fidelity', placeholder: 'e.g. 20%' },
            { id: 'current', label: 'Current fidelity', optional: true, placeholder: 'e.g. 75%' },
            { id: 'status', label: 'Status', type: 'select', options: STATUS },
          ],
        },
      ],
    },
    {
      title: 'How training is done',
      fields: [
        {
          id: 'cg_bst', label: 'Behavioral skills training', type: 'multi',
          options: [
            ['instr', 'Instructions with a written summary', 'plain-language instructions with a one-page written summary in the family’s language'],
            ['model', 'Modeling (live or video)', 'modeling, live with the child or by video'],
            ['rehearse', 'Rehearsal (role play, then with the child)', 'rehearsal, first in role play and then with the child'],
            ['feedback', 'Specific feedback', 'specific feedback focused on one or two things at a time'],
          ],
        },
        { id: 'cg_settings', label: 'Where training happens', type: 'multi', other: true, options: [['home', 'Home', 'home'], ['car', 'Car', 'the car'], ['community', 'Community', 'the community'], ['clinic', 'Clinic', 'the clinic'], ['tele', 'Telehealth', 'telehealth']] },
        { id: 'cg_format', label: 'Schedule', type: 'combo', options: [['1 hour weekly in the home', 'one hour weekly in the home'], ['2 hours weekly', 'two hours weekly'], ['Weekly telehealth coaching', 'weekly telehealth coaching'], ['Twice monthly', 'twice monthly']] },
        {
          id: 'cg_fit', label: 'Contextual fit', type: 'textarea', hint: 'How procedures were adapted to the family’s values, routines and resources. Full sentences.',
          suggest: [
            'Procedures were simplified to the steps that matter most so they fit busy routines.',
            'Materials use the family’s own words and items from the home.',
            'Training times were set around the father’s rotating shifts.',
            'All written materials are provided in the family’s preferred language.',
          ],
        },
        { id: 'cg_fidelity', label: 'How fidelity is measured', type: 'combo', options: [['Short checklist, graphed', 'a short fidelity checklist scored during observation and graphed'], ['Checklist plus caregiver video', 'a fidelity checklist scored from live observation or caregiver-recorded video']] },
      ],
    },
    {
      title: 'Social validity',
      fields: [
        {
          id: 'cg_validity', label: 'Caregiver feedback', type: 'multi', other: true, otherHint: 'One per line, full sentences.',
          options: [
            ['doable', 'Procedures are doable', 'Caregivers report that the procedures are doable in daily routines.'],
            ['helping', 'Procedures are helping', 'Caregivers report that the procedures are helping.'],
            ['hard', 'Some steps are hard to fit in', 'Caregivers report that some steps are hard to fit into daily routines, and these are being adjusted.'],
            ['confident', 'More confident', 'Caregivers report feeling more confident handling difficult moments.'],
          ],
        },
      ],
    },
    {
      title: 'Family summary (one page, plain language)',
      fields: [
        { id: 'cg_plain_goal', label: 'What we are working on', hint: 'One sentence, no jargon. e.g. Teaching Jordan to ask for more time instead of hitting when it is time to leave.' },
        {
          id: 'cg_plain_why', label: 'Why it helps', type: 'textarea', hint: 'Two or three plain sentences.',
          suggest: [
            'When asking works, your child has less reason to hit or run.',
            'Doing the same thing every time helps your child learn faster.',
            'A warning before something ends helps your child know what is coming.',
          ],
        },
        { id: 'cg_plain_steps', label: 'What to do', type: 'list', hint: 'A few short steps in everyday words. One per line.' },
        {
          id: 'cg_plain_expect', label: 'What to expect', type: 'textarea', hint: 'Plain sentences.',
          suggest: [
            'At first, the behavior may get worse for a short time before it gets better. This is common and means the plan is starting to work.',
            'Change takes a few weeks of doing the same thing every day.',
          ],
        },
        { id: 'cg_contact', label: 'Who to ask with questions', optional: true, hint: 'Optional. e.g. Call Sam at (555) 555-0100.' },
      ],
    },
  ],

  build(v) {
    const goals = v.rows('cg_goals').filter((g) => String(g.goal || '').trim());
    const lang = v.opt('cg_language');
    const hard = v.list('cg_hard');
    return [
      {
        heading: 'Caregivers and Priorities',
        blocks: [
          { type: 'p', key: 'people', text: `Training includes ${joinList(v.multi('cg_people'))}.${lang ? ` Training and written materials are provided in ${frag(lang)}.` : ''}` },
          { type: 'p', key: 'hardintro', text: 'The family described the hardest moments of the day as:' },
          { type: 'ul', items: hard.map((h) => (h.startsWith('⟦') ? h : `“${fin(h)}”`)) },
        ],
      },
      {
        heading: 'Training Goals',
        blocks: goals.length ? [{
          type: 'table', widths: [80, '*', 55, 55, 60], head: ['Caregiver', 'Goal', 'Baseline', 'Current', 'Status'],
          rows: goals.map((g) => [g.caregiver || '', fin(g.goal), g.baseline || mark('Baseline'), g.current || '—', statusLabel(g.status)]),
        }] : [{ type: 'p', text: mark('Training goals') }],
      },
      {
        heading: 'Training Methods',
        blocks: [
          { type: 'p', key: 'bst', text: `Training uses behavioral skills training: ${joinList(v.multi('cg_bst'))}. Training takes place in ${joinList(v.multi('cg_settings'))}, ${frag(v.t('cg_format'))}.` },
          ...v.paras('cg_fit').map((t, i) => ({ type: 'p', key: 'fit' + i, text: fin(t) })),
          { type: 'p', key: 'fid', text: `Fidelity is measured with ${frag(v.t('cg_fidelity'))}.` },
        ],
      },
      { heading: 'Social Validity', blocks: [{ type: 'p', key: 'sv', text: v.multi('cg_validity').map(fin).join(' ') }] },
    ];
  },
};
