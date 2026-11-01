// Progress Report and reauthorization request, following Chapter 18 of the
// clinic manual: reporting period, services authorized and delivered, progress
// on each goal (baseline, current, status, graph), caregiver training,
// interpretation, barriers, updated goals, service recommendation with
// justification, and coordination of care.
// Field types and suggestion conventions are described at the top of bip.js.

import { cap, frag, fin, joinList, fmtDate, mark } from '../util.js';
import { GOAL_AREAS, SERVICES } from './common.js';
import { stats } from './visual.js';

const STATUS = [
  ['progressing', 'Progressing'],
  ['met', 'Met'],
  ['not progressing', 'Not progressing'],
  ['discontinued', 'Discontinued'],
  ['new', 'New this period'],
];
const statusLabel = (k) => (STATUS.find((s) => s[0] === k) || STATUS[0])[1];
const num = (x) => Number(x) || 0;
const pct = (r) => (num(r.authorized) > 0 && r.delivered !== '' && r.delivered !== undefined ? Math.round((num(r.delivered) / num(r.authorized)) * 100) : null);
const sum = (rows, k) => (Array.isArray(rows) ? rows : []).reduce((n, r) => n + num(r[k]), 0);

export default {
  id: 'pr',
  title: 'Progress Report',
  fileTag: 'ProgressReport',
  dates: [
    { id: 'doc_date', label: 'Date of report', required: true },
    { id: 'period_start', label: 'Reporting period start' },
    { id: 'period_end', label: 'Reporting period end' },
  ],
  guardianSignature: false,
  period: { start: 'period_start', end: 'period_end', label: 'Reporting period' },

  from: [
    {
      from: 'tx', label: 'Start a progress report for this plan',
      carries: 'goals and baselines, services, and coordination of care',
      map: (d) => ({
        pr_goals: (Array.isArray(d.tp_goals) ? d.tp_goals : []).filter((r) => String(r.goal || '').trim())
          .map((r) => ({ area: r.area || '', goal: r.goal, baseline: r.baseline || '', status: 'progressing' })),
        pr_services: (Array.isArray(d.tp_services) ? d.tp_services : []).filter((r) => r.service).map((r) => ({ service: r.service })),
        pr_recommend: (Array.isArray(d.tp_services) ? d.tp_services : []).filter((r) => r.service),
        pr_type: d.tp_type,
        pr_coord: Array.isArray(d.tp_coord) && d.tp_coord.length ? 'Coordination of care continued with the providers listed in the treatment plan.' : '',
      }),
    },
    {
      from: 'visual', multiple: true, label: 'Use this analysis in a progress report',
      carries: 'each program’s current level, status and interpretation, matched to its goal',
      // The matching to goals happens in combineSources below.
      map: () => ({}),
    },
  ],

  // Fold each visual analysis into the goal it reviews (matched by the program
  // or behavior name), or add it as a goal of its own.
  combineSources(out, sources) {
    const analyses = sources.filter((s) => s.form === 'visual').map((s) => s.data);
    if (!analyses.length) return;
    const rows = (out.pr_goals || []).map(({ _auto, ...r }) => r);
    for (const d of analyses) {
      const program = String(d.va_program || '').trim();
      const key = program.split(':')[0].trim().toLowerCase();
      const s = stats(d);
      const up = d.va_goal_dir !== 'down';
      let row = key && rows.find((r) => String(r.goal || '').toLowerCase().includes(key));
      if (!row) { row = { area: up ? '' : 'Behavior reduction', goal: program, baseline: '' }; rows.push(row); }
      if (s) {
        row.current = `${s.fmt(s.curMean)} (mean of the last ${s.cur.length} sessions)`;
        if (!row.baseline) row.baseline = `${s.fmt(s.prevMean)} (mean)`;
      } else if (d.va_level) {
        row.current = `Level changed from ${frag(d.va_level)}`;
      }
      const better = s ? (up ? s.curMean > s.prevMean : s.curMean < s.prevMean) : true;
      row.status = d.va_decision === 'master' ? 'met' : d.va_decision === 'discontinue' ? 'discontinued' : better ? 'progressing' : 'not progressing';
      row.interp = [d.va_summary ? fin(d.va_summary) : '', d.va_change && d.va_decision && d.va_decision !== 'continue' ? `Change made: ${fin(String(d.va_change).trim())}` : ''].filter(Boolean).join(' ');
    }
    out.pr_goals = rows.map((r, n) => ({ ...r, _auto: `pr_goals:${n}` }));
  },

  groups: [
    {
      title: 'Services this period',
      fields: [
        {
          id: 'pr_services', label: 'Hours authorized and delivered', type: 'grid', rowName: 'service',
          hint: 'Totals for the reporting period.',
          columns: [
            { id: 'service', label: 'Service', type: 'select', options: [['', 'Choose…'], ...SERVICES] },
            { id: 'authorized', label: 'Authorized', type: 'number' },
            { id: 'delivered', label: 'Delivered', type: 'number' },
            { id: 'pct', label: '%', calc: (r) => (pct(r) === null ? '' : pct(r) + '%') },
          ],
          footer: (rows) => {
            const a = sum(rows, 'authorized'), dl = sum(rows, 'delivered');
            return a ? `Total: ${dl} of ${a} hours delivered (${Math.round((dl / a) * 100)}%)` : 'Total: —';
          },
        },
        {
          id: 'pr_gap', label: 'Reasons for any gap', type: 'textarea', optional: true, hint: 'Optional. Full sentences.',
          suggest: [
            'Sessions were cancelled because of client illness.',
            'Sessions were cancelled for a family vacation.',
            'The clinic was closed for holidays.',
            'Staffing changes reduced available session time for part of the period.',
            'All authorized hours were delivered.',
          ],
        },
      ],
    },
    {
      title: 'Progress on goals',
      fields: [
        {
          id: 'pr_goals', label: 'Goals', type: 'grid', layout: 'cards', rowName: 'goal', combine: 'rows',
          hint: 'A linked treatment plan adds its goals; linked visual analyses fill in current level, status and interpretation.',
          columns: [
            { id: 'area', label: 'Area', type: 'select', options: [['', 'Choose…'], ...GOAL_AREAS] },
            { id: 'goal', label: 'Goal', type: 'textarea', rows: 3 },
            { id: 'baseline', label: 'Baseline' },
            { id: 'current', label: 'Current level' },
            { id: 'status', label: 'Status', type: 'select', options: STATUS },
            { id: 'interp', label: 'Interpretation', type: 'textarea', rows: 2, placeholder: 'What the data mean for this goal.' },
            { id: 'graph', label: 'Graph', type: 'image', optional: true },
          ],
        },
      ],
    },
    {
      title: 'Caregiver training',
      fields: [
        {
          id: 'pr_cg', label: 'Caregiver training progress', type: 'textarea', hint: 'Sessions attended, skills trained, fidelity. Full sentences.',
          suggest: [
            'Caregivers attended all scheduled training sessions this period.',
            'Caregivers met the fidelity criterion on the transition procedure.',
            'Caregiver fidelity on responding to requests is improving but has not yet met criterion.',
            'Caregiver attendance was limited this period, and a revised schedule has been agreed.',
          ],
        },
      ],
    },
    {
      title: 'Interpretation and barriers',
      fields: [
        {
          id: 'pr_interp', label: 'Overall interpretation', type: 'textarea', hint: 'What is driving progress or its absence. Interpret, do not only report. Full sentences.',
          suggest: [
            'Gains in functional communication coincided with decreases in problem behavior, consistent with the hypothesized function.',
            'Progress was fastest on goals taught daily in both clinic and home.',
            'Progress slowed on goals taught only in the clinic, suggesting more practice at home is needed.',
          ],
        },
        {
          id: 'pr_barriers', label: 'Barriers and how they are being addressed', type: 'list', optional: true, hint: 'Optional. One per line.',
          suggest: [
            'Missed sessions reduced practice opportunities; make-up sessions are being scheduled',
            'Staff turnover required retraining; new staff reached the integrity criterion before working with the client',
            'Limited caregiver availability; training was moved to evening telehealth sessions',
            'Illness during the period; goals were held at their current criteria rather than advanced',
          ],
        },
      ],
    },
    {
      title: 'Next period',
      fields: [
        { id: 'pr_next_goals', label: 'New or revised goals', type: 'list', optional: true, hint: 'Optional. One per line. Mastered goals are retired; new goals come from updated assessment.' },
        { id: 'pr_type', label: 'Type of treatment', type: 'select', options: [['comprehensive', 'Comprehensive'], ['focused', 'Focused']] },
        {
          id: 'pr_recommend', label: 'Recommended services', type: 'grid', rowName: 'service',
          columns: [
            { id: 'service', label: 'Service', type: 'select', options: [['', 'Choose…'], ...SERVICES] },
            { id: 'hours', label: 'Hours/week', type: 'number' },
            { id: 'setting', label: 'Setting' },
            { id: 'code', label: 'Code', placeholder: 'optional' },
          ],
          footer: (rows) => `Total: ${sum(rows, 'hours')} hours per week`,
        },
        {
          id: 'pr_justification', label: 'Clinical justification', type: 'textarea', hint: 'Connect the hours to the remaining goals and current needs. Full sentences.',
          suggest: [
            'Continued services at the current intensity are recommended because several goals are progressing but not yet met.',
            'A reduction in hours is recommended because the client has met most goals and is transitioning to a less intensive setting.',
            'An increase in caregiver training is recommended to support generalization to home.',
          ],
        },
        {
          id: 'pr_coord', label: 'Coordination of care', type: 'textarea', optional: true, hint: 'Optional. Full sentences.',
          suggest: [
            'The BCBA met with the speech-language pathologist to align communication targets.',
            'A progress summary was shared with the pediatrician with caregiver consent.',
            'No changes in other services occurred this period.',
          ],
        },
      ],
    },
  ],

  build(v) {
    const period = [v.raw('period_start'), v.raw('period_end')].filter(Boolean).map(fmtDate);
    const services = v.rows('pr_services').filter((r) => r.service);
    const svcTable = services.length ? {
      type: 'table', widths: ['*', 70, 70, 50],
      head: ['Service', 'Authorized', 'Delivered', '%'],
      rows: [
        ...services.map((r) => [r.service, String(r.authorized ?? ''), String(r.delivered ?? ''), pct(r) === null ? '' : pct(r) + '%']),
        ['Total', String(sum(services, 'authorized')), String(sum(services, 'delivered')), sum(services, 'authorized') ? Math.round((sum(services, 'delivered') / sum(services, 'authorized')) * 100) + '%' : ''],
      ],
    } : { type: 'p', text: mark('Hours authorized and delivered') };

    const goals = v.rows('pr_goals').filter((r) => String(r.goal || '').trim());
    const counts = STATUS.map(([k, l]) => [l, goals.filter((g) => (g.status || 'progressing') === k).length]).filter(([, n]) => n);
    const goalBlocks = goals.length ? [
      { type: 'p', key: 'goalcount', text: `${goals.length} goal${goals.length > 1 ? 's were' : ' was'} addressed this period: ${joinList(counts.map(([l, n]) => `${n} ${l.toLowerCase()}`))}.` },
      ...goals.flatMap((g, i) => [
        { type: 'sub', text: `Goal ${i + 1}${g.area ? ' · ' + g.area : ''}` },
        { type: 'p', text: fin(g.goal) },
        { type: 'dl', rows: [['Baseline', g.baseline ? fin(g.baseline) : mark('Baseline for goal ' + (i + 1))], ['Current', g.current ? fin(g.current) : mark('Current level for goal ' + (i + 1))], ['Status', statusLabel(g.status || 'progressing')]] },
        ...(String(g.interp || '').trim() ? [{ type: 'p', text: fin(g.interp) }] : []),
        ...(g.graph ? [{ type: 'image', src: g.graph, caption: `Figure ${i + 1}. Goal ${i + 1}${g.area ? ` (${g.area})` : ''}.` }] : []),
      ]),
    ] : [{ type: 'p', text: mark('Goals') }];

    const rec = v.rows('pr_recommend').filter((r) => r.service);
    const hasCode = rec.some((r) => String(r.code || '').trim());
    const recTable = rec.length ? {
      type: 'table',
      widths: hasCode ? ['*', 60, 100, 70] : ['*', 70, 120],
      head: hasCode ? ['Service', 'Hours/week', 'Setting', 'Code'] : ['Service', 'Hours/week', 'Setting'],
      rows: [...rec.map((r) => [r.service, String(r.hours ?? ''), r.setting || '', ...(hasCode ? [r.code || ''] : [])]), ['Total', String(sum(rec, 'hours')), '', ...(hasCode ? [''] : [])]],
    } : { type: 'p', text: mark('Recommended services') };
    const para = (id, key, optional) => v.paras(id, { optional }).map((t, i) => ({ type: 'p', key: key + i, text: fin(t) }));
    const barriers = v.list('pr_barriers').filter((x) => !x.startsWith('⟦'));
    const next = v.list('pr_next_goals').filter((x) => !x.startsWith('⟦'));

    return [
      {
        heading: 'Reporting Period and Services',
        blocks: [
          { type: 'p', key: 'period', text: period.length === 2 ? `This report covers services from ${period[0]} to ${period[1]}.` : period.length ? `This report covers services through ${period[0]}.` : 'This report covers the current authorization period.' },
          svcTable,
          ...para('pr_gap', 'gap', true),
        ],
      },
      { heading: 'Progress on Goals', blocks: goalBlocks },
      { heading: 'Caregiver Training', blocks: para('pr_cg', 'cg') },
      { heading: 'Interpretation', blocks: para('pr_interp', 'interp') },
      { heading: 'Barriers', blocks: barriers.length ? [{ type: 'ul', items: barriers.map(fin) }] : [{ type: 'p', key: 'nobar', text: 'No significant barriers to progress were identified this period.' }] },
      ...(next.length ? [{ heading: 'New and Revised Goals', blocks: [{ type: 'ol', items: next.map(fin) }] }] : []),
      {
        heading: 'Service Recommendation',
        blocks: [{ type: 'p', key: 'type', text: v.raw('pr_type') === 'focused' ? 'Focused treatment is recommended for the next period.' : 'Comprehensive treatment is recommended for the next period.' }, recTable, ...para('pr_justification', 'just')],
      },
      ...(String(v.raw('pr_coord')).trim() ? [{ heading: 'Coordination of Care', blocks: para('pr_coord', 'coord', true) }] : []),
    ];
  },
};
