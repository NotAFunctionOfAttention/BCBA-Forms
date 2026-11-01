// Discharge Summary and Transition Plan, following Chapter 20 of the clinic
// manual: dates of service and reason for discharge, presenting concerns,
// assessments, goals with baseline and final status, current skills and
// remaining needs, effective procedures, the receiving setting and step-down,
// records shared, recommendations, warning signs, re-engaging services, and
// follow-up. Also exports a one-page summary for receiving staff.
// Field types and suggestion conventions are described at the top of bip.js.

import { cap, frag, fin, joinList, lines, fmtDate, mark } from '../util.js';
import { GOAL_AREAS } from './common.js';

const REASONS = [
  ['met', 'Goals met; this level of service is no longer needed', 'Treatment goals were met, and the client no longer needs this level of service.'],
  ['necessity', 'No longer meets medical necessity criteria', 'The client no longer meets medical necessity criteria for continued services.'],
  ['different', 'Needs a different service', 'The client needs a different service that better fits current needs.'],
  ['family', 'Family chose to end services', 'The family chose to end services.'],
  ['progress', 'Lack of meaningful progress despite changes', 'Meaningful progress was not made despite appropriate changes to the plan.'],
  ['circumstances', 'Circumstances changed (move, coverage, participation)', 'Services ended because of a change in circumstances.'],
];
const STATUS = [['met', 'Met'], ['partially met', 'Partially met'], ['not met', 'Not met'], ['discontinued', 'Discontinued']];
const statusLabel = (k) => (STATUS.find((s) => s[0] === k) || STATUS[0])[1];

export default {
  id: 'dc',
  title: 'Discharge Summary and Transition Plan',
  fileTag: 'Discharge',
  dates: [
    { id: 'doc_date', label: 'Date of summary', required: true },
    { id: 'svc_start', label: 'Services began' },
    { id: 'svc_end', label: 'Services ended' },
  ],
  period: { start: 'svc_start', end: 'svc_end', label: 'Dates of service' },
  guardianSignature: false,

  // A short, practical summary for teachers and new providers.
  variants: [{
    id: 'receiving', label: 'Summary for receiving staff', title: 'Transition Summary', fileTag: 'TransitionSummary', quick: true, onePage: true,
    idLine: (d) => [String(d.client_name || '').trim(), d.dc_receiving ? `Moving to ${frag(d.dc_receiving)}` : '', d.svc_end ? `ABA services ended ${fmtDate(d.svc_end)}` : ''].filter(Boolean).join('   ·   '),
    build(v) {
      const contact = v.opt('dc_contact');
      return [
        { col: 1, heading: 'What the child can do now', blocks: v.paras('dc_current').map((t) => ({ type: 'p', text: fin(t) })) },
        { col: 1, heading: 'Still working on', blocks: [{ type: 'ul', items: v.list('dc_needs').map(fin) }] },
        { col: 2, heading: 'What works: please keep doing', blocks: [{ type: 'ol', items: v.list('dc_effective').map(fin) }] },
        { col: 2, heading: 'If you see these, reach out', blocks: [{ type: 'ul', items: v.list('dc_warning').map(fin) }] },
        ...(contact ? [{ col: 1, heading: 'Contact', blocks: [{ type: 'p', text: fin(contact) }] }] : []),
      ];
    },
  }],

  from: [
    {
      from: 'tx', label: 'Start a discharge summary from this plan',
      carries: 'presenting concerns, assessments, and goals with baselines',
      map: (d) => ({
        dc_presenting: String(d.tp_referral || '').trim(),
        dc_assess: [d.tp_fba_summary, d.tp_pref_summary, d.tp_skill_summary].map((t) => String(t || '').trim()).filter(Boolean).join('\n\n'),
        dc_goals: (Array.isArray(d.tp_goals) ? d.tp_goals : []).filter((r) => String(r.goal || '').trim()).map((r) => ({ area: r.area || '', goal: r.goal, baseline: r.baseline || '' })),
      }),
    },
    {
      from: 'pr', label: 'Start a discharge summary from this report',
      carries: 'each goal’s final level and status, and the latest interpretation',
      map: (d) => ({
        dc_goals: (Array.isArray(d.pr_goals) ? d.pr_goals : []).filter((r) => String(r.goal || '').trim()).map((r) => ({
          area: r.area || '', goal: r.goal, baseline: r.baseline || '', final: r.current || '',
          status: r.status === 'met' ? 'met' : r.status === 'discontinued' ? 'discontinued' : r.status === 'not progressing' ? 'not met' : 'partially met',
        })),
        dc_current: String(d.pr_interp || '').trim(),
      }),
    },
    {
      from: 'intake', label: 'Start a discharge summary from this intake',
      carries: 'the concerns the family described at intake',
      map: (d) => ({
        dc_presenting: lines(d.in_concerns).length ? `At intake, the family’s main concerns were: ${lines(d.in_concerns).map((c) => `“${cap(frag(c))}”`).join('; ')}.` : '',
      }),
    },
  ],

  groups: [
    {
      title: 'Reason for discharge',
      fields: [
        { id: 'dc_reason', label: 'Reason', type: 'select', options: REASONS.map((r) => [r[0], r[1]]) },
        { id: 'dc_reason_note', label: 'Details', type: 'textarea', optional: true, hint: 'Optional. Full sentences.' },
      ],
    },
    {
      title: 'Course of treatment',
      fields: [
        { id: 'dc_presenting', label: 'Presenting concerns at intake', type: 'textarea', combine: 'paragraphs' },
        { id: 'dc_assess', label: 'Assessments and results', type: 'textarea', combine: 'paragraphs' },
        {
          id: 'dc_goals', label: 'Goals', type: 'grid', layout: 'cards', rowName: 'goal', combine: 'rows',
          columns: [
            { id: 'area', label: 'Area', type: 'select', options: [['', 'Choose…'], ...GOAL_AREAS] },
            { id: 'goal', label: 'Goal', type: 'textarea', rows: 3 },
            { id: 'baseline', label: 'Baseline' },
            { id: 'final', label: 'Final level' },
            { id: 'status', label: 'Status', type: 'select', options: STATUS },
          ],
        },
        { id: 'dc_current', label: 'Current skills', type: 'textarea', hint: 'Plain sentences; this also goes on the summary for receiving staff.' },
        { id: 'dc_needs', label: 'Remaining needs', type: 'list', hint: 'One per line.' },
        {
          id: 'dc_effective', label: 'Effective procedures to continue', type: 'list', hint: 'What has worked and the next setting should keep doing, in plain words. One per line.',
          suggest: [
            'Give a 2-minute warning and show a visual timer before ending a preferred activity',
            'Honor requests for a break or more time right away, then return to the task',
            'Use a visual schedule for the day',
            'Praise asking with words right away and specifically',
            'Hold hands in parking lots until the child is buckled in',
          ],
        },
      ],
    },
    {
      title: 'Transition',
      fields: [
        { id: 'dc_receiving', label: 'Receiving setting or provider', hint: 'e.g. a public preschool classroom' },
        {
          id: 'dc_stepdown', label: 'Step-down', type: 'grid', rowName: 'stage', optional: true,
          hint: 'Optional. Gradual reduction in services, with data at each stage.',
          columns: [
            { id: 'stage', label: 'Stage', placeholder: 'e.g. Mornings at preschool, afternoons in clinic' },
            { id: 'hours', label: 'Hours/week', type: 'number' },
            { id: 'dates', label: 'Dates', placeholder: 'e.g. 03/01 to 04/15/2027' },
            { id: 'criterion', label: 'Move on when', placeholder: 'e.g. no elopement for 3 weeks' },
          ],
        },
        { id: 'dc_shared', label: 'Shared with the receiving setting, with written consent', type: 'multi', optional: true, other: true, options: [['summary', 'This discharge summary', 'this discharge summary'], ['procedures', 'Summary of effective procedures', 'a summary of effective procedures'], ['data', 'Recent data', 'recent data'], ['training', 'Brief training for receiving staff', 'brief training for receiving staff on the procedures that are working']] },
        { id: 'dc_release_date', label: 'Date consent to share was obtained', type: 'date', optional: true },
      ],
    },
    {
      title: 'Recommendations and follow-up',
      fields: [
        { id: 'dc_recs', label: 'Recommendations for the family and receiving providers', type: 'list', hint: 'One per line.' },
        {
          id: 'dc_warning', label: 'Warning signs to reach out', type: 'list', hint: 'One per line, plain words.',
          suggest: ['Hitting or running away returns, or happens more than once a week', 'Asking with words decreases', 'New difficult behavior appears', 'Skills learned in therapy stop being used at home or school'],
        },
        {
          id: 'dc_reengage', label: 'How to re-engage services', type: 'textarea',
          suggest: ['The family can contact the clinic at any time to request a new assessment. Services can resume with a new authorization from the payer.'],
        },
        { id: 'dc_followup', label: 'Follow-up', type: 'combo', options: [['1 and 3 months after discharge', 'at 1 and 3 months after discharge'], ['1, 3, and 6 months after discharge', 'at 1, 3, and 6 months after discharge'], ['None scheduled', 'none']], hint: 'Completes "Follow-up contacts are scheduled…".' },
        { id: 'dc_contact', label: 'Contact for receiving staff', optional: true, hint: 'Optional. e.g. Sam Example, BCBA, (555) 555-0100' },
      ],
    },
  ],

  build(v, c) {
    const reason = REASONS.find((r) => r[0] === (v.raw('dc_reason') || 'met'));
    const goals = v.rows('dc_goals').filter((g) => String(g.goal || '').trim());
    const steps = v.rows('dc_stepdown').filter((r) => String(r.stage || '').trim());
    const shared = v.multi('dc_shared', { optional: true });
    const rel = v.raw('dc_release_date');
    const follow = v.opt('dc_followup');
    const para = (id, key, optional) => v.paras(id, { optional }).map((t, i) => ({ type: 'p', key: key + i, text: fin(t) }));
    return [
      { heading: 'Reason for Discharge', blocks: [{ type: 'p', key: 'reason', text: reason[2] }, ...para('dc_reason_note', 'rn', true)] },
      { heading: 'Presenting Concerns', blocks: para('dc_presenting', 'pres') },
      { heading: 'Assessments', blocks: para('dc_assess', 'assess') },
      {
        heading: 'Goals and Outcomes',
        blocks: goals.length ? [{
          type: 'table', widths: ['*', 85, 85, 60], head: ['Goal', 'Baseline', 'Final', 'Status'],
          rows: goals.map((g, i) => [`${g.area ? g.area + ': ' : ''}${fin(g.goal)}`, g.baseline || '—', g.final || mark('Final level for goal ' + (i + 1)), statusLabel(g.status)]),
        }] : [{ type: 'p', text: mark('Goals') }],
      },
      {
        heading: 'Current Skills and Remaining Needs',
        blocks: [...para('dc_current', 'cur'), { type: 'sub', text: 'Remaining needs' }, { type: 'ul', items: v.list('dc_needs').map(fin) }],
      },
      { heading: 'Effective Procedures', blocks: [{ type: 'p', key: 'effi', text: 'The following procedures have been effective and should be continued:' }, { type: 'ol', items: v.list('dc_effective').map(fin) }] },
      {
        heading: 'Transition Plan',
        blocks: [
          { type: 'p', key: 'recv', text: `${cap(c.client)} is transitioning to ${frag(v.t('dc_receiving'))}.` },
          ...(steps.length ? [{ type: 'table', widths: ['*', 55, 95, 120], head: ['Stage', 'Hours/week', 'Dates', 'Move on when'], rows: steps.map((r) => [r.stage, String(r.hours ?? ''), r.dates || '', r.criterion || '']) }] : []),
          { type: 'p', key: 'shared', text: shared.length ? `With written consent${rel ? ` obtained on ${fmtDate(rel)}` : ''}, the following were shared with the receiving setting: ${joinList(shared)}.` : 'No records have been shared with a receiving setting.' },
        ],
      },
      {
        heading: 'Recommendations and Follow-up',
        blocks: [
          { type: 'ul', items: v.list('dc_recs').map(fin) },
          { type: 'sub', text: 'Warning signs that the family should reach out' },
          { type: 'ul', items: v.list('dc_warning').map(fin) },
          ...para('dc_reengage', 're'),
          { type: 'p', key: 'fu', text: follow && follow !== 'none' ? `Follow-up contacts are scheduled ${frag(follow)}.` : 'No follow-up contacts are scheduled.' },
        ],
      },
    ];
  },
};
