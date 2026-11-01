// Printable data sheets (Chapters 10 and 13 of the clinic manual): one
// landscape page, built from the program or plan it belongs to, with the
// definition and recording rule printed on the sheet and a line for an IOA
// observer. Each is attached to its form in forms/index.js as a variant.

import { cap, frag, fin, fmtDate, mark, thirdPerson } from '../util.js';
import { DS_ID_FIELD, sheetIdentity, promptCodes } from './common.js';

const blankRows = (n, cols) => Array.from({ length: n }, () => Array.from({ length: cols }, () => ''));
const num = (v, d, lo, hi) => Math.min(hi, Math.max(lo, Math.round(Number(v) || d)));
const header = (extra = []) => ({ type: 'fields', items: ['Date', 'Staff', 'IOA observer', ...extra] });
const base = { quick: true, landscape: true, onePage: true, standalone: true, label: 'Data sheet', fileTag: 'DataSheet' };

// ---------- Skill acquisition program ----------

export const skillSheet = {
  ...base, id: 'sheet', title: 'Data Sheet',
  idLine: (d) => [sheetIdentity(d), cap(frag(d.sk_name || ''))].filter(Boolean).join('   ·   '),
  build(v) {
    const d = (id) => v.raw(id);
    const targets = v.list('sk_targets');
    const type = String(d('sk_data'));
    const codes = promptCodes(d('sk_prompts'));
    const legend = `Prompt codes: ${codes.map((p) => `${p.code} = ${p.name}`).join(', ')}.`;
    const def = { type: 'p', text: `Correct response: the client ${frag(v.t('sk_def'))}. Instruction: ${fin(v.t('sk_sd'))}` };
    const mastery = v.opt('sk_mastery') ? [{ type: 'p', text: `Mastery: ${frag(v.raw('sk_mastery'))}.` }] : [];
    const n = num(d('ds_cols'), 10, 3, 15);

    if (/task analysis/.test(type)) {
      return [
        { heading: 'Session', blocks: [{ type: 'fields', items: ['Staff', 'IOA observer', 'Setting'] }] },
        {
          heading: 'Task analysis: record the prompt code for each step',
          blocks: [{
            type: 'sheet', rowHeight: 20,
            widths: [18, 150, ...Array(n).fill('*')],
            head: ['#', 'Step', ...Array.from({ length: n }, (_, i) => `Date\n_____`)],
            rows: [...targets.map((t, i) => [String(i + 1), t, ...Array(n).fill('')]), [{ text: '', colSpan: 1 }, { text: '% independent', bold: true }, ...Array(n).fill('')]],
          }],
        },
        { heading: 'How to record', blocks: [{ type: 'p', text: legend }, def, ...mastery] },
      ];
    }
    if (/duration/.test(type)) {
      return [
        { heading: 'Duration', blocks: [{ type: 'sheet', rowHeight: 22, widths: [70, 90, 70, 70, 80, '*'], head: ['Date', 'Staff', 'Start', 'Stop', 'Duration', 'Notes'], rows: blankRows(10, 6) }] },
        { heading: 'How to record', blocks: [def, ...mastery] },
      ];
    }
    if (/first-trial|probe/.test(type)) {
      const probe = /probe/.test(type);
      return [
        {
          heading: probe ? 'Probe data: + or – for each target' : 'First-trial data: + or – for each target',
          blocks: [{
            type: 'sheet', rowHeight: 20,
            widths: [150, ...Array(n).fill('*')],
            head: ['Target', ...Array.from({ length: n }, () => 'Date\n_____\nStaff ___')],
            rows: [...targets.map((t) => [t, ...Array(n).fill('')]), [{ text: 'Total +', bold: true }, ...Array(n).fill('')]],
          }],
        },
        {
          heading: 'How to record',
          blocks: [
            { type: 'p', text: probe ? 'Probe each target once at the start of the session, before teaching it. Record + for a correct, independent response and – for an incorrect, prompted, or absent response.' : 'Record only the first trial of each target in the session. + = correct and independent; – = incorrect, prompted, or no response.' },
            def, ...mastery,
          ],
        },
      ];
    }
    // All-trial (trial-by-trial) data for one session.
    const t = num(d('ds_cols'), 10, 3, 15);
    return [
      { heading: 'Session', blocks: [header(['Start time', 'End time'])] },
      {
        heading: 'Trial-by-trial data: record a prompt code for each trial',
        blocks: [{
          type: 'sheet', rowHeight: 22,
          widths: [140, ...Array(t).fill('*'), 50],
          head: ['Target', ...Array.from({ length: t }, (_, i) => String(i + 1)), '% I'],
          rows: targets.map((x) => [x, ...Array(t).fill(''), '']),
        }],
      },
      { heading: 'How to record', blocks: [{ type: 'p', text: `${legend} Record I only for a correct response with no prompt. % I = independent trials ÷ trials run × 100.` }, def, ...mastery] },
    ];
  },
};

// ---------- Behavior intervention plan ----------

export const bipSheet = {
  ...base, id: 'sheet', title: 'Behavior Data Sheet',
  idLine: (d) => [sheetIdentity(d), cap(frag(d.tb_name || ''))].filter(Boolean).join('   ·   '),
  build(v) {
    const name = frag(v.t('tb_name'));
    const methods = Array.isArray(v.raw('dc_methods')) ? v.raw('dc_methods') : [];
    const m = methods[0] || 'freq';
    const defs = [
      { type: 'p', text: `${cap(name)}: ${frag(v.t('tb_def'))}. Onset: ${frag(v.t('tb_onset'))}. Offset: ${frag(v.t('tb_offset'))}.` },
      ...(v.opt('replacement') ? [{ type: 'p', text: `Replacement behavior: the client ${thirdPerson(frag(v.raw('replacement')))}.` }] : []),
    ];
    const rows = num(v.raw('ds_rows'), 10, 4, 16);

    if (['pir', 'wir', 'mts'].includes(m)) {
      const secs = num(v.raw('ds_interval'), 10, 5, 600);
      const count = num(v.raw('ds_intervals'), 60, 10, 120);
      const per = 10;
      const rule = {
        pir: `Mark X if ${name} occurs at any point during the interval.`,
        wir: `Mark X only if ${name} occurs throughout the entire interval.`,
        mts: `Look up at the end of each interval. Mark X only if ${name} is occurring at that moment.`,
      }[m];
      const gridRows = Array.from({ length: Math.ceil(count / per) }, (_, r) => [
        `${r * per + 1}–${Math.min(count, (r + 1) * per)}`,
        ...Array.from({ length: per }, (_, c) => (r * per + c < count ? { text: String(r * per + c + 1), fontSize: 6, color: '#888888' } : { text: '', fillColor: '#eeeeee' })),
      ]);
      return [
        { heading: 'Session', blocks: [header(['Start time', 'Activity'])] },
        { heading: `${count} intervals of ${secs} seconds`, blocks: [{ type: 'sheet', rowHeight: 24, widths: [50, ...Array(per).fill('*')], head: ['Intervals', ...Array.from({ length: per }, (_, i) => String(i + 1))], rows: gridRows }] },
        { heading: 'How to record', blocks: [{ type: 'p', text: `${rule} % of intervals = intervals marked ÷ ${count} × 100.` }, ...defs] },
      ];
    }
    if (m === 'dur_ep' || m === 'dur_tot') {
      return [
        { heading: `Duration of ${name}`, blocks: [{ type: 'sheet', rowHeight: 21, widths: [65, 80, 60, 60, 70, '*'], head: ['Date', 'Staff', 'Start', 'Stop', 'Duration', 'What happened before'], rows: blankRows(Math.min(rows, 11), 6) }] },
        { heading: 'How to record', blocks: [{ type: 'p', text: 'Start timing at onset and stop at offset, as defined below. Record each episode on its own line.' }, ...defs] },
      ];
    }
    if (m === 'lat') {
      return [
        { heading: 'Latency', blocks: [{ type: 'sheet', rowHeight: 21, widths: [65, 80, '*', 70, 70, 70], head: ['Date', 'Staff', 'Instruction', 'Time given', 'Response began', 'Latency (s)'], rows: blankRows(Math.min(rows, 11), 6) }] },
        { heading: 'How to record', blocks: [{ type: 'p', text: 'Latency is the time from the end of the instruction to the start of the response.' }, ...defs] },
      ];
    }
    // Event recording, with the replacement behavior alongside.
    const repl = v.opt('replacement') ? 'Replacement (tally)' : 'Notes';
    return [
      {
        heading: 'Event recording: one tally per occurrence',
        blocks: [{
          type: 'sheet', rowHeight: 24,
          widths: [60, 70, 45, 45, '*', 38, '*', 38, 32],
          head: ['Date', 'Staff', 'Start', 'End', `${cap(name)} (tally)`, 'Total', repl, 'Total', 'IOA'],
          rows: blankRows(rows, 9),
        }],
      },
      { heading: 'How to record', blocks: [{ type: 'p', text: 'Count each occurrence from onset to offset as one. Rate per hour = total ÷ hours observed. Tick IOA when a second observer recorded the same session independently.' }, ...defs] },
    ];
  },
};

// ---------- FBA: ABC recording ----------

export const abcSheet = {
  ...base, id: 'sheet', label: 'ABC data sheet', title: 'ABC Data Sheet', fileTag: 'ABCSheet',
  idLine: (d) => [sheetIdentity(d), cap(frag(d.tb_name || ''))].filter(Boolean).join('   ·   '),
  build(v) {
    const name = frag(v.t('tb_name'));
    const checklist = (Array.isArray(v.raw('desc_methods')) ? v.raw('desc_methods') : []).includes('abc_c');
    const rows = num(v.raw('ds_rows'), 6, 3, 6);
    const def = { type: 'p', text: `${cap(name)}: ${frag(v.t('tb_def'))}.` };
    if (checklist) {
      const A = ['Demand or instruction', 'Transition', 'Item or activity removed', 'Attention elsewhere', 'Alone or unengaged', 'Other: ______'];
      const C = ['Task removed or delayed', 'Attention or reprimand', 'Item or activity given', 'Ignored', 'Redirected', 'Other: ______'];
      const box = (list) => ({ text: list.map((x) => `[  ] ${x}`).join('\n'), fontSize: 7.5, color: '#333333' });
      return [
        {
          heading: 'ABC checklist: tick what happened before and after each episode',
          blocks: [{ type: 'sheet', rowHeight: 70, widths: [70, 60, '*', 80, '*', 34], head: ['Date and time', 'Activity', 'Antecedent', 'Behavior', 'Consequence', 'Initials'], rows: Array.from({ length: Math.min(rows, 4) }, () => ['', '', box(A), '', box(C), '']) }],
        },
        { heading: 'How to record', blocks: [{ type: 'p', text: 'Record every episode as soon as possible after it ends.' }, def] },
      ];
    }
    return [
      {
        heading: 'ABC narrative: describe what happened, without interpreting',
        blocks: [{ type: 'sheet', rowHeight: 46, widths: [70, 75, '*', '*', '*', 34], head: ['Date and time', 'Setting and activity', 'Antecedent (just before)', 'Behavior (what it looked like)', 'Consequence (just after)', 'Initials'], rows: blankRows(rows, 6) }],
      },
      { heading: 'How to record', blocks: [{ type: 'p', text: 'Describe what people said and did in plain behavioral terms (“Mom said ‘time to go’ and turned off the tablet”), not impressions (“he was upset”).' }, def] },
    ];
  },
};

// ---------- Preference assessment ----------

export const prefSheet = {
  ...base, id: 'sheet', title: 'Preference Assessment Data Sheet',
  idLine: (d) => [sheetIdentity(d), d.assess_date ? fmtDate(d.assess_date) : ''].filter(Boolean).join('   ·   '),
  build(v) {
    const items = (Array.isArray(v.raw('pa_results')) ? v.raw('pa_results') : []).map((r) => String(r.item || '').trim()).filter(Boolean);
    if (items.length < 2) return [{ heading: 'Items', blocks: [{ type: 'p', text: mark('At least 2 items in the results table') }] }];
    const fmt = String(v.raw('pa_format'));
    const top = { heading: 'Session', blocks: [header(['Setting'])] };

    if (/paired/.test(fmt)) {
      // Every pair once, in round-robin order so no item appears in two trials
      // in a row, with each item's left and right positions balanced.
      const list = items.length % 2 ? [...items, null] : [...items];
      const n = list.length;
      const pairs = [];
      const leftCount = new Map(items.map((x) => [x, 0]));
      let ring = list.slice(1);
      let lastItems = new Set();
      for (let round = 0; round < n - 1; round++) {
        const order = [list[0], ...ring];
        let roundPairs = [];
        for (let k = 0; k < n / 2; k++) {
          const a = order[k], b = order[n - 1 - k];
          if (a !== null && b !== null) roundPairs.push([a, b]);
        }
        // Start each round with a pair that shares no item with the previous trial.
        const start = roundPairs.findIndex((pr) => !pr.some((x) => lastItems.has(x)));
        if (start > 0) roundPairs = [...roundPairs.slice(start), ...roundPairs.slice(0, start)];
        for (const [a, b] of roundPairs) {
          const pair = leftCount.get(a) <= leftCount.get(b) ? [a, b] : [b, a];
          leftCount.set(pair[0], leftCount.get(pair[0]) + 1);
          pairs.push(pair);
        }
        if (roundPairs.length) lastItems = new Set(roundPairs[roundPairs.length - 1]);
        ring = [ring[ring.length - 1], ...ring.slice(0, -1)];
      }
      const half = Math.ceil(pairs.length / 2);
      const row = (p, k) => [String(k + 1), p[0], p[1], ''];
      const left = pairs.slice(0, half).map((p, k) => row(p, k));
      const right = pairs.slice(half).map((p, k) => row(p, k + half));
      const body = left.map((r, k) => [...r, ...(right[k] || ['', '', '', ''])]);
      return [
        top,
        { heading: `Paired-stimulus trials (${pairs.length})`, blocks: [{ type: 'sheet', rowHeight: 16, widths: [20, '*', '*', 70, 20, '*', '*', 70], head: ['#', 'Left', 'Right', 'Selected', '#', 'Left', 'Right', 'Selected'], rows: body }] },
        { heading: 'How to record', blocks: [{ type: 'p', text: 'Present both items, say “pick one,” and give brief access to the item selected. Write L, R, or N (no selection). % selected = times chosen ÷ times presented × 100.' }] },
      ];
    }
    if (/single/.test(fmt)) {
      return [
        top,
        { heading: 'Single-stimulus presentations: + approached, – did not', blocks: [{ type: 'sheet', rowHeight: 20, widths: [160, ...Array(5).fill('*'), 60], head: ['Item', '1', '2', '3', '4', '5', '% approach'], rows: items.map((x) => [x, '', '', '', '', '', '']) }] },
      ];
    }
    if (/free-operant/.test(fmt)) {
      return [
        top,
        { heading: 'Free operant: seconds engaged with each item', blocks: [{ type: 'sheet', rowHeight: 20, widths: [160, '*', '*', 80], head: ['Item', 'Seconds engaged', 'Notes', '% of session'], rows: items.map((x) => [x, '', '', '']) }] },
      ];
    }
    // MSWO / MSW: selection order in each array.
    const arrays = 5;
    return [
      top,
      {
        heading: /without replacement/.test(fmt) ? 'Selection order in each array (selected item is removed)' : 'Item selected on each trial (items are replaced)',
        blocks: [{ type: 'sheet', rowHeight: 20, widths: [160, ...Array(arrays).fill('*'), 60, 60], head: ['Item', ...Array.from({ length: arrays }, (_, i) => `Array ${i + 1}`), 'Selected', '% selected'], rows: items.map((x) => [x, ...Array(arrays + 2).fill('')]) }],
      },
      { heading: 'How to record', blocks: [{ type: 'p', text: 'Write 1 for the first item selected in an array, 2 for the second, and so on. Rotate item positions after each trial. % selected = times selected ÷ times available × 100.' }] },
    ];
  },
};

// Print settings shown at the end of each form.
export const sheetGroup = (extra = []) => ({ title: 'Data sheet (printing)', fields: [DS_ID_FIELD, ...extra] });
