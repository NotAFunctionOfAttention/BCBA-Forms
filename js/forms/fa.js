// Functional Analysis Summary, following Chapter 6 of the clinic manual:
// reason for the analysis, target behavior, safety and consent (termination
// criteria, medical clearance), design and conditions, results with a graph
// across conditions, interpretation, and a confirmed or revised function.
// Field types and suggestion conventions are described at the top of bip.js.

import { cap, frag, fin, joinList, fmtDate, mark } from '../util.js';
import { TARGETS, FUNCTIONS } from './common.js';
import * as B from './behavior-suggest.js';
import { multielementSVG } from '../graph.js';

const CONDITIONS = [
  ['play', 'Play (control)', 'Free access to preferred items, frequent attention, no demands, and no programmed consequences for problem behavior.'],
  ['attention', 'Attention', 'The analyst stays nearby but busy. After problem behavior, the analyst gives brief attention, such as a mild statement of concern.'],
  ['demand', 'Demand (escape)', 'The analyst presents tasks with prompting. After problem behavior, the task is removed briefly.'],
  ['tangible', 'Tangible', 'The client has brief access to a preferred item, which is then removed. After problem behavior, the item is returned briefly.'],
  ['alone', 'Alone', 'The client is alone in the room with safety monitoring, and no social consequences are provided.'],
  ['ignore', 'Ignore', 'The analyst is present but provides no consequences for problem behavior.'],
  ['transition', 'Escape from transition', 'During neutral play, the analyst says it is time to go and guides the client toward the door. After problem behavior, the transition is delayed briefly.'],
  ['synth_test', 'Synthesized test', 'The reinforcers identified in the interview are withheld together, and all are delivered together after problem behavior.'],
  ['synth_control', 'Synthesized control', 'All reinforcers identified in the interview are freely and continuously available.'],
  ['other', 'Other', ''],
];
const CONTROL = new Set(['play', 'synth_control']);
const COND_FN = { attention: 'attention', demand: 'escape', transition: 'escape', tangible: 'tangible', alone: 'automatic', ignore: 'automatic' };
const FN_PHRASE = Object.fromEntries(FUNCTIONS.map((f) => [f[0], f[2]]));
const condLabel = (k) => (CONDITIONS.find((c) => c[0] === k) || [k, cap(k)])[1];

const nums = (s) => String(s ?? '').split(/[\s,;]+/).filter((x) => x !== '' && !isNaN(Number(x))).map(Number);
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const r1 = (x) => Math.round(x * 10) / 10;

// Per-condition numbers and the overall pattern.
export function analyze(d) {
  const rows = (Array.isArray(d.fa_conditions) ? d.fa_conditions : [])
    .map((r) => ({ key: r.cond || 'other', label: r.cond === 'other' || !r.cond ? (String(r.name || '').trim() || 'Other') : condLabel(r.cond), values: nums(r.data) }))
    .filter((r) => r.values.length);
  if (!rows.length) return null;
  for (const r of rows) { r.mean = mean(r.values); r.min = Math.min(...r.values); r.max = Math.max(...r.values); }
  const control = rows.filter((r) => CONTROL.has(r.key));
  const ctlMax = control.length ? Math.max(...control.map((r) => r.max)) : 0;
  const tests = rows.filter((r) => !CONTROL.has(r.key));
  // "Elevated": most sessions above the highest control session.
  const elevated = tests.filter((r) => r.values.filter((v) => v > ctlMax).length >= Math.ceil(r.values.length * 2 / 3) && r.mean > ctlMax);
  const top = Math.max(...rows.map((r) => r.mean));
  const allHigh = rows.every((r) => r.mean >= 0.5 * top) && top > 0;
  const aloneHigh = rows.some((r) => (r.key === 'alone' || r.key === 'ignore') && r.mean === top);
  let pattern;
  if (allHigh && aloneHigh) pattern = 'automatic';
  else if (!elevated.length) pattern = 'undifferentiated';
  else if (elevated.length === 1) pattern = 'single';
  else pattern = 'multiple';
  return { rows, control, elevated, pattern };
}

const unitWord = (d) => {
  const m = String(d.fa_measure || '');
  return /minute/.test(m) ? 'responses per minute' : /latency/.test(m) ? 'seconds' : /interval/.test(m) ? '% of intervals' : 'responses per session';
};

export default {
  id: 'fa',
  title: 'Functional Analysis Summary',
  fileTag: 'FASummary',
  dates: [
    { id: 'doc_date', label: 'Date of report', required: true },
    { id: 'fa_start', label: 'First session' },
    { id: 'fa_end', label: 'Last session' },
  ],
  period: { start: 'fa_start', end: 'fa_end', label: 'Sessions conducted' },
  guardianSignature: false,

  from: [
    {
      from: 'fba', label: 'Start an FA summary from this FBA',
      carries: 'target behavior and definition, and the FBA hypothesis to test',
      map: (d) => ({
        tb_name: d.tb_name, tb_name__o: d.tb_name__o, tb_def: d.tb_def, tb_onset: d.tb_onset, tb_offset: d.tb_offset,
        fa_prior: d.hyp_ante && d.hyp_conseq ? `The functional behavior assessment${d.doc_date ? ' dated ' + fmtDate(d.doc_date) : ''} hypothesized that ${frag(d.tb_name || 'the behavior')} occurs when ${frag(d.hyp_ante)} and results in ${frag(d.hyp_conseq)}.` : '',
      }),
    },
  ],

  // What this analysis can start or add to.
  next: [
    {
      to: 'bip', label: 'Start a BIP from this analysis',
      carries: 'target behavior and definition, the confirmed function, and the FA results as evidence',
      map: (d) => ({
        tb_name: d.tb_name, tb_name__o: d.tb_name__o, tb_def: d.tb_def, tb_onset: d.tb_onset, tb_offset: d.tb_offset,
        fn_functions: Array.isArray(d.fa_function) ? d.fa_function.filter((k) => FN_PHRASE[k]) : [],
        fn_assess: ['fa'],
        fn_evidence: [String(d.fa_results || '').trim(), String(d.fa_interp || '').trim()].filter(Boolean).join('\n\n'),
      }),
    },
    {
      to: 'tx', label: 'Start a treatment plan from this analysis',
      carries: 'the FA result in the assessment summary',
      map: (d) => {
        const fns = (d.fa_function || []).map((k) => FN_PHRASE[k]).filter(Boolean);
        return {
          tp_assessments: ['fa'],
          tp_fba_summary: d.tb_name && fns.length ? `A functional analysis${d.doc_date ? ' dated ' + fmtDate(d.doc_date) : ''} showed that ${frag(d.tb_name)} is maintained by ${joinList(fns)}.` : '',
        };
      },
    },
  ],

  groups: [
    {
      title: 'Reason for the analysis',
      fields: [
        {
          id: 'fa_reason', label: 'Why a functional analysis was conducted', type: 'multi', other: true, otherHint: 'One per line, full sentences.',
          options: [
            ['unclear', 'Function unclear after FBA', 'The function was unclear after indirect and descriptive assessment.'],
            ['competing', 'Competing hypotheses, different treatments', 'Two possible functions would lead to different treatments.'],
            ['severity', 'Severity of the behavior', 'The behavior is serious enough that treating the wrong function carries real cost.'],
          ],
        },
        { id: 'fa_prior', label: 'Hypothesis being tested', type: 'textarea', optional: true, hint: 'Optional. Filled in when an FBA is linked.' },
      ],
    },
    {
      title: 'Target behavior',
      fields: [
        { id: 'tb_name', label: 'Target behavior', type: 'combo', options: TARGETS },
        { id: 'tb_def', label: 'Operational definition', type: 'textarea', hint: 'Completes "…is defined as".', suggest: B.definition, suggestMode: 'replace', suggestEmpty: 'Choose a target behavior above to see suggestions.' },
        { id: 'fa_precursor', label: 'Precursor targeted instead', optional: true, hint: 'Optional. If a less dangerous behavior that reliably comes first was targeted, describe it. e.g. raising a hand toward another person' },
      ],
    },
    {
      title: 'Safety and consent',
      fields: [
        {
          id: 'fa_medical', label: 'Medical review', type: 'combo',
          options: [
            ['Physician ruled out medical causes and cleared', 'The client’s physician ruled out medical causes and cleared the client for the analysis.'],
            ['Medical causes addressed', 'Medical concerns identified at intake were addressed by the client’s physician before the analysis.'],
            ['Not required (low severity)', 'Medical clearance was not required given the low severity of the behavior.'],
          ],
        },
        {
          id: 'fa_termination', label: 'Termination criteria', type: 'list', hint: 'Conditions under which a session stops immediately. One per line.',
          suggest: [
            'Any injury to the client or staff',
            'Any scratch that breaks the skin',
            'Five consecutive minutes of crying',
            'Three high-intensity responses in one session',
            'Signs of distress beyond the agreed level',
          ],
        },
        {
          id: 'fa_protect', label: 'Safeguards', type: 'textarea', optional: true, hint: 'Optional. Full sentences.',
          suggest: [
            'Two staff were present during every session.',
            'Sessions were conducted in a room cleared of hazards.',
            'Protective equipment was available and used as prescribed.',
            'Data were graphed after every session to monitor risk.',
          ],
        },
        { id: 'fa_consent_date', label: 'Date written consent was obtained', type: 'date' },
      ],
    },
    {
      title: 'Design',
      fields: [
        {
          id: 'fa_type', label: 'Type of analysis', type: 'combo',
          options: [
            ['Standard (multielement)', 'a standard functional analysis using a multielement design'],
            ['Modified standard', 'a modified standard functional analysis using a multielement design'],
            ['Brief', 'a brief functional analysis'],
            ['Trial-based', 'a trial-based functional analysis embedded in daily routines'],
            ['Latency-based', 'a latency-based functional analysis'],
            ['IISCA', 'an interview-informed synthesized contingency analysis (IISCA)'],
          ],
        },
        { id: 'fa_setting', label: 'Setting', hint: 'e.g. a clinic session room' },
        { id: 'fa_measure', label: 'Measure', type: 'combo', options: [['Responses per session', 'responses per session'], ['Responses per minute', 'responses per minute'], ['Latency to first response', 'latency to the first response, in seconds'], ['Percentage of intervals', 'percentage of intervals']] },
        { id: 'fa_session_len', label: 'Session length', type: 'combo', options: [['5 minutes', '5 minutes'], ['10 minutes', '10 minutes'], ['15 minutes', '15 minutes'], ['Until first response (latency)', 'until the first response or a set maximum']] },
        { id: 'fa_reinf', label: 'Reinforcer access after problem behavior', type: 'combo', options: [['20 seconds', '20 seconds'], ['30 seconds', '30 seconds'], ['60 seconds', '60 seconds']] },
        { id: 'fa_order', label: 'Order of conditions', type: 'combo', options: [['Rotating', 'a rotating order'], ['Random', 'a random order'], ['Fixed sequence', 'a fixed sequence']] },
        {
          id: 'fa_conditions', label: 'Conditions', type: 'grid', layout: 'cards', rowName: 'condition',
          hint: 'Choosing a condition fills in its standard description; tailor it to this client (actual preferred items, actual difficult tasks). Enter each session’s result in order to draw the graph.',
          columns: [
            { id: 'cond', label: 'Condition', type: 'select', options: [['', 'Choose…'], ...CONDITIONS.map((c) => [c[0], c[1]])], fills: { col: 'desc', values: Object.fromEntries(CONDITIONS.filter((c) => c[2]).map((c) => [c[0], c[2]])) } },
            { id: 'name', label: 'Name (for Other)', optional: true },
            { id: 'desc', label: 'What the analyst does', type: 'textarea', rows: 3 },
            { id: 'data', label: 'Session results, in order', placeholder: 'e.g. 3, 5, 4, 6' },
            { id: 'summary', label: 'Summary', calc: (r) => { const v = nums(r.data); return v.length ? `${v.length} sessions, mean ${r1(mean(v))}, range ${Math.min(...v)} to ${Math.max(...v)}` : ''; } },
          ],
        },
        { id: 'fa_ioa', label: 'Interobserver agreement', optional: true, hint: 'Optional. e.g. collected in 30% of sessions, with a mean agreement of 94% (range 88% to 100%)' },
      ],
    },
    {
      title: 'Results and interpretation',
      fields: [
        { id: 'fa_graph', label: 'Graph', type: 'image', optional: true, hint: 'Optional. If no image is attached, the report draws the graph from the session results above.' },
        {
          id: 'fa_results', label: 'Results', type: 'textarea', hint: 'Suggestions are calculated from the session results.', suggestMode: 'replace', suggestEmpty: 'Enter session results for each condition to see calculated suggestions.',
          suggest: (d) => {
            const a = analyze(d); if (!a) return [];
            const name = frag(d.tb_name || 'Problem behavior');
            const u = unitWord(d);
            const parts = a.rows.map((r) => `In the ${r.label.toLowerCase()} condition, ${name} occurred at a mean of ${r1(r.mean)} ${u} (range ${r.min} to ${r.max}) across ${r.values.length} sessions.`);
            return [cap(parts.join(' '))];
          },
        },
        {
          id: 'fa_interp', label: 'Interpretation', type: 'textarea', suggestMode: 'replace',
          suggest: (d) => {
            const a = analyze(d); if (!a) return [];
            const name = frag(d.tb_name || 'problem behavior');
            const short = (r) => r.label.replace(/\s*\(.*\)/, '').toLowerCase();
            const ctl = a.control.length ? `the ${a.control.map(short).join(' and ')} condition` : 'the other conditions';
            const fn = (r) => FN_PHRASE[COND_FN[r.key]] || (r.key === 'synth_test' ? 'the combination of reinforcers tested in the synthesized condition' : `the contingency in the ${r.label.toLowerCase()} condition`);
            switch (a.pattern) {
              case 'single': return [`Responding was clearly differentiated. ${cap(name)} was elevated in the ${short(a.elevated[0])} condition relative to ${ctl}, indicating that it is maintained by ${fn(a.elevated[0])}.`];
              case 'multiple': return [`Responding was elevated in more than one test condition (${joinList(a.elevated.map(short))}) relative to ${ctl}, indicating that ${name} is maintained by multiple functions: ${joinList(a.elevated.map(fn))}. Treatment will need to address each.`];
              case 'automatic': return [`${cap(name)} occurred at high levels across all conditions and was highest in the alone or ignore condition, suggesting that it is maintained by automatic reinforcement.`];
              default: return [`Responding was low and undifferentiated across conditions. The behavior may not have occurred often enough to analyze, or the conditions may not have captured the variables that matter in daily life. The analysis will be adjusted.`];
            }
          },
        },
        { id: 'fa_function', label: 'Function', type: 'multi', options: FUNCTIONS, other: true, otherHint: 'One per line. Completes "maintained by".' },
        { id: 'fa_compare', label: 'Compared with the earlier hypothesis', type: 'select', options: [['confirms', 'Confirms the FBA hypothesis'], ['revises', 'Revises the FBA hypothesis'], ['none', 'No earlier hypothesis']] },
        { id: 'fa_conf', label: 'Confidence', type: 'select', options: [['high', 'High'], ['moderate', 'Moderate'], ['low', 'Low']] },
        {
          id: 'fa_recs', label: 'Recommendations', type: 'list', hint: 'One per line. Suggestions follow the function you ticked.',
          suggest: (d) => {
            const f = new Set(d.fa_function || []);
            const out = [];
            if (f.has('escape')) out.push('Teach a break or help request using functional communication training (FCT)', 'Reduce the aversiveness of demands with demand fading and choice');
            if (f.has('attention')) out.push('Teach an appropriate way to request attention', 'Provide noncontingent attention on a fixed-time schedule');
            if (f.has('tangible')) out.push('Teach the client to request preferred items and to tolerate waiting', 'Use advance warnings and visual timers before preferred activities end');
            if (f.has('automatic')) out.push('Provide alternative items that produce similar sensory stimulation', 'Enrich the environment during unstructured time');
            out.push('Develop a function-based behavior intervention plan based on these results');
            return out;
          },
        },
      ],
    },
  ],

  build(v, c) {
    const d = { fa_conditions: v.rows('fa_conditions'), fa_measure: v.raw('fa_measure'), tb_name: v.raw('tb_name') };
    const name = v.t('tb_name');
    const a = analyze(d);
    const conds = v.rows('fa_conditions').filter((r) => r.cond);
    const graph = v.raw('fa_graph');
    const u = unitWord(d);
    const percent = /interval/.test(u);
    const para = (id, key, optional) => v.paras(id, { optional }).map((t, i) => ({ type: 'p', key: key + i, text: fin(t) }));
    const fns = v.multi('fa_function');
    const consent = v.raw('fa_consent_date');
    const precursor = v.opt('fa_precursor');
    const compare = { confirms: 'These results confirm the hypothesis from the functional behavior assessment.', revises: 'These results revise the hypothesis from the functional behavior assessment.', none: '' }[v.raw('fa_compare') || 'confirms'];

    const resultBlocks = [];
    if (graph) resultBlocks.push({ type: 'image', src: graph, caption: `Figure 1. ${cap(frag(name))} across functional analysis conditions.` });
    else if (a) resultBlocks.push({ type: 'svg', svg: multielementSVG(a.rows.map((r) => ({ label: r.label, values: r.values })), { yLabel: cap(u), percent }), caption: `Figure 1. ${cap(frag(name))} (${u}) across functional analysis conditions. Sessions are numbered in the order conditions were rotated.` });
    if (a) resultBlocks.push({ type: 'table', widths: ['*', 60, 60, 80], head: ['Condition', 'Sessions', 'Mean', 'Range'], rows: a.rows.map((r) => [r.label, String(r.values.length), String(r1(r.mean)), `${r.min} to ${r.max}`]) });
    resultBlocks.push(...para('fa_results', 'res'));
    if (v.opt('fa_ioa')) resultBlocks.push({ type: 'p', key: 'ioa', text: `Interobserver agreement was ${frag(v.raw('fa_ioa'))}.` });

    return [
      { heading: 'Reason for the Analysis', blocks: [{ type: 'p', key: 'reason', text: v.multi('fa_reason').map(fin).join(' ') }, ...para('fa_prior', 'prior', true)] },
      {
        heading: 'Target Behavior',
        blocks: [
          { type: 'p', key: 'def', text: `${cap(name)} is defined as ${frag(v.t('tb_def'))}.` },
          ...(precursor ? [{ type: 'p', key: 'precursor', text: `To limit risk, the analysis targeted a precursor that reliably comes before ${frag(name)}: ${frag(precursor)}.` }] : []),
        ],
      },
      {
        heading: 'Safety and Consent',
        blocks: [
          { type: 'p', key: 'medical', text: fin(v.t('fa_medical')) },
          { type: 'p', key: 'consent', text: consent ? `Written caregiver consent was obtained on ${fmtDate(consent)}, after the conditions, safeguards, and expected length of the analysis were explained.` : mark('Date written consent was obtained') },
          { type: 'p', key: 'term', text: 'A session was to stop immediately if any of the following occurred:' },
          { type: 'ul', items: v.list('fa_termination').map(fin) },
          ...para('fa_protect', 'protect', true),
        ],
      },
      {
        heading: 'Method',
        blocks: [
          { type: 'p', key: 'method', text: `${cap(frag(v.t('fa_type')))} was conducted in ${frag(v.t('fa_setting'))}. Sessions lasted ${frag(v.t('fa_session_len'))} and were presented in ${frag(v.t('fa_order'))}. After problem behavior, the programmed reinforcer was delivered for ${frag(v.t('fa_reinf'))}. The measure was ${frag(v.t('fa_measure'))}.` },
          conds.length
            ? { type: 'table', widths: [110, '*'], head: ['Condition', 'Procedure'], rows: conds.map((r) => [r.cond === 'other' ? (String(r.name || '').trim() || 'Other') : condLabel(r.cond), fin(r.desc || '') || mark('Procedure for ' + condLabel(r.cond))]) }
            : { type: 'p', text: mark('Conditions') },
        ],
      },
      { heading: 'Results', blocks: resultBlocks },
      {
        heading: 'Interpretation',
        blocks: [
          ...para('fa_interp', 'interp'),
          { type: 'p', key: 'fn', text: `${cap(frag(name))} is maintained by ${joinList(fns)}. ${compare} Confidence in this result is ${v.raw('fa_conf') || 'high'}.`.replace(/\s+/g, ' ') },
        ],
      },
      { heading: 'Recommendations', blocks: [{ type: 'ul', items: v.list('fa_recs').map(fin) }] },
    ];
  },
};
