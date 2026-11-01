// Visual Analysis and Phase Change Decision.
// Field types and suggestion conventions are described at the top of bip.js.
// If data points are entered for both phases, suggestions for level, trend,
// variability, immediacy and overlap are calculated from them.

import { cap, frag, fin, joinList, fmtDate } from '../util.js';

const nums = (s) => String(s ?? '').split(/[\s,;]+/).map((x) => x.replace(/%$/, '')).filter((x) => x !== '' && !isNaN(Number(x))).map(Number);
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const median = (a) => { const b = [...a].sort((x, y) => x - y); const m = Math.floor(b.length / 2); return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
const round = (x) => Math.round(x * 10) / 10;
function slope(a) {
  const n = a.length;
  if (n < 2) return 0;
  const xm = (n - 1) / 2, ym = mean(a);
  let num = 0, den = 0;
  a.forEach((y, x) => { num += (x - xm) * (y - ym); den += (x - xm) ** 2; });
  return num / den;
}

export function stats(d) {
  const prev = nums(d.va_prev_vals), cur = nums(d.va_cur_vals);
  if (prev.length < 2 || cur.length < 2) return null;
  const unit = String(d.va_unit ?? '%');
  const fmt = (x) => (unit === '%' ? `${round(x)}%` : `${round(x)}${unit ? ' ' + unit : ''}`);
  const all = [...prev, ...cur];
  const span = Math.max(...all) - Math.min(...all) || 1;
  const sl = slope(cur);
  const change = sl * (cur.length - 1); // total change along the fitted line
  const last = cur.slice(-4);
  const lastFlat = cur.length >= 7 && Math.abs(slope(last) * (last.length - 1)) < 0.1 * span;
  let trend;
  if (Math.abs(change) < 0.1 * span) trend = 'no clear trend';
  else {
    const dir = change > 0 ? 'increasing' : 'decreasing';
    const steep = Math.abs(change) > 0.5 * span ? 'a steep ' : 'a gradual ';
    trend = lastFlat ? `${steep}${dir} trend that levels off over the last ${last.length} sessions` : `${steep}${dir} trend`;
  }
  const lo = Math.min(...cur), hi = Math.max(...cur), m = mean(cur);
  // Judge bounce around the trend line, not the raw range, so a steady climb is not "variable".
  const xm = (cur.length - 1) / 2;
  const resid = cur.map((y, x) => y - (m + sl * (x - xm)));
  const rel = (Math.max(...resid) - Math.min(...resid)) / span;
  const around = trend === 'no clear trend' ? '' : ' around the trend';
  const varLabel = (rel < 0.2 ? 'low variability' : rel < 0.4 ? 'moderate variability' : 'high variability') + around;
  const pLo = Math.min(...prev), pHi = Math.max(...prev);
  const overlap = cur.filter((x) => x >= pLo && x <= pHi).length;
  const firstOut = cur.findIndex((x) => x < pLo || x > pHi);
  const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
  const immediacy = firstOut === -1 ? null : `in the ${ORD[firstOut] || `${firstOut + 1}th`} session of the current phase`;
  return {
    prev, cur, fmt, trend, lastFlat, change, span,
    prevMean: mean(prev), curMean: m, prevMed: median(prev), curMed: median(cur),
    variability: `${varLabel} (range ${fmt(lo)} to ${fmt(hi)})`,
    overlap: `${overlap} of ${cur.length} (${Math.round((overlap / cur.length) * 100)}%)`,
    overlapN: overlap,
    immediacy,
    lastMean: mean(last),
  };
}

const phaseName = (d, which) => frag(d[which] || '') || (which === 'va_prev_name' ? 'the previous phase' : 'the current phase');

const DECISIONS = [
  ['continue', 'Continue'],
  ['modify', 'Modify'],
  ['advance', 'Advance to the next phase'],
  ['master', 'Mastered'],
  ['discontinue', 'Discontinue'],
];
const DECISION_TEXT = {
  continue: 'The current procedure will continue without change',
  modify: 'The procedure will be modified',
  advance: 'The program will advance to the next phase',
  master: 'The target is mastered and will move to maintenance',
  discontinue: 'The program will be discontinued',
};
const CHANGES = {
  continue: ['No change to the procedure. The current procedure will continue as written.'],
  modify: [
    'The prompt delay will increase from 0 seconds to 3 seconds.',
    'Reinforcers will change to the highest-ranked items from the most recent preference assessment.',
    'Additional teaching trials will be added to each session.',
    'The target will be broken into smaller steps.',
    'Procedural integrity will be checked and staff retrained before teaching continues.',
  ],
  advance: [
    'The program will advance to the next step of the prompt-fading plan.',
    'Reinforcement will be thinned to the next step of the schedule.',
    'New targets will be introduced.',
  ],
  master: ['The target will move to maintenance probes, and the next target will be introduced.'],
  discontinue: ['The program will be discontinued, and the supervising BCBA will review alternative goals with the caregiver.'],
};

export default {
  id: 'visual',
  title: 'Visual Analysis and Phase Change Decision',
  fileTag: 'PhaseChange',
  dates: [{ id: 'doc_date', label: 'Date of review', required: true }],
  guardianSignature: false,

  groups: [
    {
      title: 'Program and phases',
      fields: [
        { id: 'va_program', label: 'Program and measure', hint: 'Which program, and what is measured. e.g. Manding for a break: % independent' },
        { id: 'va_goal_dir', label: 'Goal is to', type: 'select', options: [['up', 'Increase (skill)'], ['down', 'Decrease (behavior)']] },
        { id: 'va_prev_name', label: 'Previous phase', type: 'combo', options: [['Baseline', 'baseline'], ['Intervention', 'intervention'], ['Previous prompt level', 'the previous prompt level']] },
        { id: 'va_cur_name', label: 'Current phase', hint: 'e.g. FCT with full physical prompts' },
        { id: 'va_unit', label: 'Unit', type: 'combo', options: [['%', '%'], ['per hour', 'per hour'], ['responses', 'responses'], ['minutes', 'minutes'], ['seconds', 'seconds']], default: '%' },
        { id: 'va_prev_vals', label: 'Previous phase data points', optional: true, hint: 'Optional. Values in session order, separated by commas. Used to calculate the suggestions below.' },
        { id: 'va_cur_vals', label: 'Current phase data points', optional: true, hint: 'Optional. Values in session order, separated by commas.' },
        { id: 'va_graph', label: 'Graph', type: 'image', optional: true, hint: 'Optional. A photo or screenshot of the graph. It is stored on this device and printed in the report.' },
      ],
    },
    {
      title: 'Visual analysis',
      fields: [
        {
          id: 'va_level', label: 'Level', hint: 'Completes "Level changed from…".', suggestMode: 'replace', suggestEmpty: 'Enter data points above to see calculated suggestions.',
          suggest: (d) => {
            const s = stats(d); if (!s) return [];
            return [
              `a mean of ${s.fmt(s.prevMean)} in ${phaseName(d, 'va_prev_name')} to a mean of ${s.fmt(s.curMean)} in ${phaseName(d, 'va_cur_name')}`,
              `a median of ${s.fmt(s.prevMed)} in ${phaseName(d, 'va_prev_name')} to a median of ${s.fmt(s.curMed)} in ${phaseName(d, 'va_cur_name')}`,
            ];
          },
        },
        {
          id: 'va_trend', label: 'Trend in the current phase', hint: 'Completes "The current phase shows…".', suggestMode: 'replace',
          suggest: (d) => { const s = stats(d); return [...new Set([...(s ? [s.trend] : []), 'an increasing trend', 'a decreasing trend', 'no clear trend'])]; },
        },
        {
          id: 'va_var', label: 'Variability', hint: 'Completes "…with…".', suggestMode: 'replace',
          suggest: (d) => { const s = stats(d); return s ? [s.variability] : ['low variability', 'moderate variability', 'high variability']; },
        },
        {
          id: 'va_imm', label: 'Immediacy of change', hint: 'Completes "Change was first evident…".', suggestMode: 'replace',
          suggest: (d) => { const s = stats(d); return [...new Set([...(s && s.immediacy ? [s.immediacy] : []), 'in the first session of the current phase', 'within the first 3 sessions of the current phase', 'gradually over several sessions', 'at no point during the current phase'])]; },
        },
        {
          id: 'va_overlap', label: 'Overlap', hint: 'Data points in the current phase that fall within the range of the previous phase. e.g. 5 of 12 (42%)', suggestMode: 'replace',
          suggest: (d) => { const s = stats(d); return s ? [s.overlap] : []; }, suggestEmpty: 'Enter data points above to calculate overlap.',
        },
        {
          id: 'va_factors', label: 'Other factors', type: 'multi', other: true, otherHint: 'One per line, full sentences.',
          options: [
            ['none', 'None identified', 'No other factors that could account for the data were identified.'],
            ['absence', 'Absences', 'Sessions were missed because of absences.'],
            ['staff', 'Staff changes', 'Staff changes occurred during this phase.'],
            ['illness', 'Illness', 'The client was ill during part of this phase.'],
            ['integrity', 'Integrity problems', 'Procedural integrity problems were identified during this phase.'],
            ['schedule', 'Schedule change', 'The client’s schedule changed during this phase.'],
            ['meds', 'Medication change', 'A medication change occurred during this phase.'],
          ],
        },
      ],
    },
    {
      title: 'Interpretation and decision',
      fields: [
        {
          id: 'va_summary', label: 'What the data show', type: 'textarea', hint: 'One sentence.', suggestMode: 'replace',
          suggest: (d) => {
            const s = stats(d); const up = d.va_goal_dir !== 'down';
            const out = [];
            if (s) {
              const better = up ? s.curMean > s.prevMean : s.curMean < s.prevMean;
              if (s.lastFlat && better) out.push(`${up ? 'Responding increased' : 'The behavior decreased'} during ${phaseName(d, 'va_cur_name')} but has leveled off at about ${s.fmt(Math.round(s.lastMean))}.`);
              else if (better && s.trend !== 'no clear trend') out.push(`${up ? 'Responding is increasing' : 'The behavior is decreasing'} steadily during ${phaseName(d, 'va_cur_name')}.`);
              if (!better || s.overlapN === s.cur.length) out.push(`${up ? 'Responding' : 'The behavior'} has not changed meaningfully from ${phaseName(d, 'va_prev_name')}.`);
            }
            out.push(up ? 'The skill is being acquired with prompts but has stalled.' : 'The behavior has decreased to near-zero levels.');
            out.push(up ? 'The skill has met the mastery criterion.' : 'The behavior has not decreased from baseline levels.');
            return [...new Set(out)];
          },
        },
        { id: 'va_decision', label: 'Decision', type: 'select', options: DECISIONS },
        {
          id: 'va_why', label: 'Features supporting the decision', type: 'multi', other: true, otherHint: 'One per line. Completes "…based on".',
          options: [
            ['level', 'Level', 'the change in level'],
            ['trend', 'Trend', 'the trend in the current phase'],
            ['var', 'Variability', 'the variability of the current phase'],
            ['imm', 'Immediacy', 'the immediacy of the change'],
            ['overlap', 'Overlap', 'the degree of overlap between phases'],
            ['stable', 'Stability of recent data', 'the stability of the most recent data points'],
            ['criterion', 'Mastery criterion met', 'the mastery criterion having been met'],
            ['stall', 'No progress over recent sessions', 'the lack of progress over recent sessions'],
          ],
        },
        { id: 'va_change', label: 'Change to procedure', type: 'textarea', hint: 'The exact change. Suggestions follow the decision.', suggest: (d) => CHANGES[d.va_decision || 'continue'] },
        { id: 'va_change_start', label: 'Change begins', type: 'date', optional: true },
      ],
    },
    {
      title: 'Review',
      fields: [
        { id: 'va_review_date', label: 'Next review', type: 'date' },
        {
          id: 'va_review_crit', label: 'What result means it is working', hint: 'Completes "…will be considered effective if…".',
          suggestMode: 'replace',
          suggest: (d) => (d.va_goal_dir === 'down'
            ? ['the behavior decreases by at least 50% within 5 sessions', 'the behavior remains below the goal level for 3 consecutive weeks']
            : ['independent responding exceeds 60% within 5 sessions', 'independent responding increases across 3 consecutive sessions', 'the mastery criterion is met within 10 sessions']),
        },
      ],
    },
  ],

  build(v) {
    const s = stats({ va_prev_vals: v.raw('va_prev_vals'), va_cur_vals: v.raw('va_cur_vals'), va_unit: v.raw('va_unit') });
    const prevName = v.t('va_prev_name'), curName = v.t('va_cur_name');
    const phases = s
      ? `${cap(frag(prevName))} (${s.prev.length} sessions) compared with ${frag(curName)} (${s.cur.length} sessions)`
      : `${cap(frag(prevName))} compared with ${frag(curName)}`;
    const graph = v.raw('va_graph');
    const start = v.raw('va_change_start');
    const decision = v.raw('va_decision') || 'continue';

    return [
      {
        heading: 'Program',
        blocks: [
          { type: 'dl', wide: true, rows: [['Program and measure', fin(v.t('va_program')).replace(/\.$/, '')], ['Phases compared', phases]] },
          ...(graph ? [{ type: 'image', src: graph, caption: `Figure 1. ${fin(v.t('va_program'))}` }] : []),
        ],
      },
      {
        heading: 'Visual Analysis',
        blocks: [
          { type: 'p', key: 'analysis', text: `Level changed from ${frag(v.t('va_level'))}. The current phase shows ${frag(v.t('va_trend'))} with ${frag(v.t('va_var'))}. Change was first evident ${frag(v.t('va_imm'))}. Of the current data points, ${frag(v.t('va_overlap'))} fall within the range of the previous phase.` },
          { type: 'p', key: 'factors', text: v.multi('va_factors').map(fin).join(' ') },
        ],
      },
      {
        heading: 'Interpretation',
        blocks: [{ type: 'p', key: 'interp', text: fin(v.t('va_summary')) }],
      },
      {
        heading: 'Decision',
        blocks: [{ type: 'p', key: 'decision', text: `${DECISION_TEXT[decision]}. This decision is based on ${joinList(v.multi('va_why'))}.` }],
      },
      {
        heading: 'Change to Procedure',
        blocks: [
          ...v.paras('va_change').map((t, i) => ({ type: 'p', key: 'change' + i, text: fin(t) })),
          ...(start ? [{ type: 'p', key: 'start', text: `The change will begin on ${fmtDate(start)}.` }] : []),
        ],
      },
      {
        heading: 'Review',
        blocks: [{ type: 'p', key: 'review', text: `The data will be reviewed again on ${v.raw('va_review_date') ? fmtDate(v.raw('va_review_date')) : v.missing('va_review_date')}. The change will be considered effective if ${frag(v.t('va_review_crit'))}.` }],
      },
    ];
  },
};
