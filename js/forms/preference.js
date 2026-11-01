// Preference Assessment summary.
// Field types and suggestion conventions are described at the top of bip.js.

import { cap, frag, fin, joinList, mark } from '../util.js';

const FORMATS = [
  ['MSWO (multiple stimulus without replacement)', 'multiple-stimulus without replacement (MSWO)'],
  ['Brief MSWO', 'brief multiple-stimulus without replacement (MSWO)'],
  ['MSW (multiple stimulus with replacement)', 'multiple-stimulus with replacement (MSW)'],
  ['Paired stimulus', 'paired-stimulus'],
  ['Single stimulus', 'single-stimulus'],
  ['Free operant', 'free-operant'],
];

const WHY = [
  ['scan', 'Client scans arrays of several items', 'the client scans arrays of several items'],
  ['tolerate', 'Client tolerates removal of items', 'the client tolerates removal of items'],
  ['quick', 'Quick to administer', 'it can be administered quickly'],
  ['hierarchy', 'Produces a full hierarchy', 'it produces a ranked hierarchy of all items'],
  ['noscan', 'Client does not yet scan larger arrays', 'the client does not yet scan arrays of more than 2 items'],
  ['removal', 'Removing items evokes problem behavior', 'removing items has been associated with problem behavior'],
  ['activities', 'Assesses activities that cannot be presented in an array', 'it allows assessment of activities that cannot be presented in an array'],
];

const SOURCES = [
  ['cg', 'Caregiver interview', 'a caregiver interview'],
  ['raisd', 'RAISD', 'the Reinforcer Assessment for Individuals with Severe Disabilities (RAISD)'],
  ['client', 'Client interview', 'a client interview'],
  ['staff', 'Staff report', 'staff report'],
  ['obs', 'Free-operant observation', 'free-operant observation'],
  ['prior', 'Prior preference assessments', 'prior preference assessments'],
];

const pct = (r) => (Number(r.avail) > 0 && r.sel !== '' && r.sel !== undefined ? Math.round((Number(r.sel) / Number(r.avail)) * 100) : null);
const autoLevel = (p) => (p === null ? '' : p >= 67 ? 'High' : p >= 34 ? 'Moderate' : 'Low');
const levelOf = (r) => (r.level && r.level !== 'auto' ? r.level : autoLevel(pct(r)));

// Rows with a name and a usable count, highest % first.
function ranked(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((r, i) => ({ ...r, i, p: pct(r) }))
    .filter((r) => String(r.item || '').trim() && r.p !== null)
    .sort((a, b) => b.p - a.p || a.i - b.i);
}

function rankOf(r, rows) {
  const list = ranked(rows);
  const idx = list.findIndex((x) => x.item === r.item && x.sel === r.sel && x.avail === r.avail);
  return idx < 0 ? '' : '#' + (idx + 1);
}

const byLevel = (d, lvl) => ranked(d.pa_results).filter((r) => levelOf(r) === lvl).map((r) => String(r.item).trim());

export default {
  id: 'pref',
  title: 'Preference Assessment',
  fileTag: 'PrefAssessment',
  dates: [
    { id: 'doc_date', label: 'Date of report', required: true },
    { id: 'assess_date', label: 'Date of assessment' },
  ],
  guardianSignature: false,

  groups: [
    {
      title: 'Purpose and items',
      fields: [
        {
          id: 'pa_reason', label: 'Reason for the assessment', type: 'combo', hint: 'Completes "…was conducted because".',
          options: [
            ['Current reinforcers losing effectiveness', 'current reinforcers appear to have lost effectiveness'],
            ['New program needs reinforcers', 'reinforcers are needed for a new program'],
            ['Routine reassessment', 'preferences are reassessed routinely as part of the treatment plan'],
            ['New to services', 'the client is new to services and preferences were not yet known'],
            ['Increase in problem behavior', 'problem behavior has increased during sessions'],
          ],
        },
        { id: 'pa_sources', label: 'Items nominated through', type: 'multi', options: SOURCES, other: true },
      ],
    },
    {
      title: 'Method',
      fields: [
        { id: 'pa_format', label: 'Format', type: 'combo', options: FORMATS },
        { id: 'pa_why', label: 'Why this format', type: 'multi', options: WHY, other: true, otherHint: 'One per line. Completes "…because".' },
        {
          id: 'pa_setup', label: 'Setup', type: 'textarea', hint: 'Number of items, arrays or trials, access time, presentation order. Suggestions follow the format and the items in the results table.',
          suggest: (d) => {
            const n = ranked(d.pa_results).length || (Array.isArray(d.pa_results) ? d.pa_results.filter((r) => r.item).length : 0);
            const words = ['', 'One item was', 'Two items were', 'Three items were', 'Four items were', 'Five items were', 'Six items were', 'Seven items were', 'Eight items were', 'Nine items were', 'Ten items were'];
            const items = n ? (words[n] || `A total of ${n} items were`) : 'Items were';
            const f = String(d.pa_format || '');
            const out = [];
            if (/without replacement/.test(f)) out.push(`${items} presented in a single array, with the selected item removed after each trial, across 5 arrays.`);
            if (/with replacement/.test(f)) out.push(`${items} presented in an array, with the selected item replaced after each trial, across 5 arrays.`);
            if (/^paired/.test(f)) out.push(`${items} presented in pairs, with each item paired with every other item once.`);
            if (/^single/.test(f)) out.push(`${items} presented one at a time, 5 times each, and approach or engagement was recorded.`);
            if (/free-operant/.test(f)) out.push(`${items} freely available for 5 minutes, and time engaged with each was recorded.`);
            out.push('Each selection was followed by 30 seconds of access to the item.');
            out.push('Item positions were rotated after each trial.');
            return out;
          },
        },
        {
          id: 'pa_exposure', label: 'Pre-session exposure', type: 'combo',
          options: [
            ['Each item sampled briefly', 'Each item was sampled briefly before the first trial.'],
            ['Each item sampled for 30 s', 'The client had 30 seconds of access to each item before the first trial.'],
            ['No pre-session sampling', 'No pre-session sampling was conducted.'],
          ],
        },
      ],
    },
    {
      title: 'Results',
      fields: [
        {
          id: 'pa_results', label: 'Results by item', type: 'grid', rowName: 'item',
          hint: 'Enter times selected and times available. The % and rank are worked out for you. Level is set automatically (High 67%+, Moderate 34–66%, Low below 34%) unless you choose one.',
          columns: [
            { id: 'item', label: 'Item', placeholder: 'e.g. bubbles' },
            { id: 'sel', label: 'Selected', type: 'number' },
            { id: 'avail', label: 'Available', type: 'number' },
            { id: 'pct', label: '%', calc: (r) => (pct(r) === null ? '' : pct(r) + '%') },
            { id: 'rank', label: 'Rank', calc: rankOf },
            { id: 'level', label: 'Level', type: 'select', options: [['auto', 'Auto'], ['High', 'High'], ['Moderate', 'Moderate'], ['Low', 'Low']] },
          ],
        },
        {
          id: 'pa_notes', label: 'Notable behavior', type: 'multi', other: true, otherHint: 'One per line, full sentences.',
          options: [
            ['nopb', 'No problem behavior', 'No problem behavior was observed during the assessment.'],
            ['pb', 'Problem behavior on removal', 'Problem behavior occurred when items were removed.'],
            ['allsel', 'Selection on every trial', 'The client made a selection on every trial.'],
            ['nosel', 'No selection on some trials', 'The client did not make a selection on some trials.'],
            ['nobias', 'No position bias', 'No position bias was observed.'],
            ['bias', 'Position bias observed', 'A position bias was observed, with selections favoring one side of the array.'],
          ],
        },
      ],
    },
    {
      title: 'Interpretation and recommendations',
      fields: [
        {
          id: 'pa_limits', label: 'Interpretation and limitations', type: 'multi', other: true, otherHint: 'One per line, full sentences.',
          options: [
            ['efficacy', 'Preference is not reinforcer efficacy', 'Preference does not guarantee that an item will function as a reinforcer.'],
            ['test', 'Reinforcer assessment recommended', 'A reinforcer assessment is recommended to confirm the effectiveness of the highest-ranked items.'],
            ['shift', 'Preferences change over time', 'Preferences may change over time and with deprivation and satiation.'],
            ['edible', 'Edible items may displace others', 'Edible items may be selected over leisure items and were interpreted with this in mind.'],
          ],
        },
        {
          id: 'pa_use', label: 'Use in programming', type: 'list', hint: 'One per line. Suggestions use the levels in your results table.',
          suggestEmpty: 'Fill in the results table to see suggestions.',
          suggest: (d) => {
            const hi = byLevel(d, 'High'), mid = byLevel(d, 'Moderate'), lo = byLevel(d, 'Low');
            const out = [];
            if (hi.length) {
              out.push(`${cap(joinList(hi))} will be reserved for the replacement behavior and the most difficult tasks.`);
              out.push(`${cap(joinList(hi))} will be used as ${hi.length === 1 ? 'the reinforcer' : 'reinforcers'} in functional communication training (FCT).`);
            }
            if (mid.length) out.push(`${cap(joinList(mid))} will be used as ${mid.length === 1 ? 'a reinforcer' : 'reinforcers'} during discrete trial and natural environment teaching.`);
            if (lo.length) out.push(`${cap(joinList(lo))} will not be used as ${lo.length === 1 ? 'a reinforcer' : 'reinforcers'} at this time.`);
            if (hi.length || mid.length) out.push('Reinforcers will be rotated across sessions to reduce satiation.');
            return out;
          },
        },
        {
          id: 'pa_reassess', label: 'Reassessment schedule', type: 'combo', hint: 'Completes "Preferences will be reassessed…".',
          options: [
            ['Monthly', 'monthly'],
            ['Every 2 weeks', 'every 2 weeks'],
            ['Weekly', 'weekly'],
            ['Each session (brief MSWO)', 'at the start of each session using a brief MSWO'],
          ],
        },
        {
          id: 'pa_triggers', label: 'Reassess sooner if…', type: 'multi', optional: true, other: true,
          options: [
            ['resp', 'Responding decreases', 'responding decreases'],
            ['pb', 'Problem behavior increases', 'problem behavior increases'],
            ['interest', 'Reduced interest in top items', 'the client shows reduced interest in the top-ranked items'],
            ['new', 'New items become available', 'new items become available'],
          ],
        },
      ],
    },
  ],

  build(v, c) {
    const rows = ranked(v.rows('pa_results'));
    const fmt = v.t('pa_format');
    const triggers = v.multi('pa_triggers', { optional: true });
    const resultsTable = rows.length
      ? {
        type: 'table',
        widths: [32, '*', 70, 40, 70],
        head: ['Rank', 'Item', 'Selected / available', '%', 'Preference'],
        rows: rows.map((r, i) => [String(i + 1), String(r.item).trim(), `${r.sel} / ${r.avail}`, `${r.p}%`, levelOf(r)]),
      }
      : { type: 'p', text: mark('Results by item') };
    const setup = v.paras('pa_setup').map(fin).join(' ');

    return [
      {
        heading: 'Purpose',
        blocks: [{ type: 'p', key: 'purpose', text: `A preference assessment was conducted with ${c.client} because ${frag(v.t('pa_reason'))}. Items were nominated through ${joinList(v.multi('pa_sources'))}.` }],
      },
      {
        heading: 'Method',
        blocks: [{ type: 'p', key: 'method', text: `A ${frag(fmt)} preference assessment was used because ${joinList(v.multi('pa_why'))}. ${setup} ${fin(v.t('pa_exposure'))}` }],
      },
      {
        heading: 'Results',
        blocks: [resultsTable, { type: 'p', key: 'notes', text: v.multi('pa_notes').map(fin).join(' ') }],
      },
      {
        heading: 'Interpretation and Limitations',
        blocks: [{ type: 'p', key: 'limits', text: v.multi('pa_limits').map(fin).join(' ') }],
      },
      {
        heading: 'Recommendations',
        blocks: [
          { type: 'ul', items: v.list('pa_use').map(fin) },
          { type: 'p', key: 'reassess', text: `Preferences will be reassessed ${frag(v.t('pa_reassess'))}${triggers.length ? `, or sooner if ${joinList(triggers)}` : ''}.` },
        ],
      },
    ];
  },
};
