// Turns a saved document (form answers + identifiers + wording edits) into a
// document model that both the on-screen preview and the PDF render from.

import { mark, hasMark, MARK_RE, lines, paras, fmtDate, esc, cap, joinList } from './util.js';

// Identifiers shared by every document type. All optional except where the
// form marks a date required: the clinician decides what goes on the record.
export const DIAGNOSES = [
  ['f840', 'F84.0 Autism spectrum disorder'],
  ['f900', 'F90.0 ADHD, predominantly inattentive type'],
  ['f901', 'F90.1 ADHD, predominantly hyperactive type'],
  ['f902', 'F90.2 ADHD, combined type'],
  ['f70', 'F70 Mild intellectual disabilities'],
  ['f71', 'F71 Moderate intellectual disabilities'],
  ['f88', 'F88 Other disorders of psychological development'],
  ['f89', 'F89 Unspecified disorder of psychological development'],
];

export const SETTINGS = [
  ['home', 'Home', 'home'],
  ['clinic', 'Clinic', 'clinic'],
  ['school', 'School', 'school'],
  ['community', 'Community', 'community'],
  ['tele', 'Telehealth', 'telehealth'],
];

// Identifiers shared by every document type. All optional except where the
// form marks a date required: the clinician decides what goes on the record.
export const CLIENT_FIELDS = [
  { id: 'client_name', label: 'Client name' },
  { id: 'client_dob', label: 'Date of birth', type: 'date' },
  { id: 'client_id', label: 'Client ID / MRN' },
  { id: 'diagnosis', label: 'Diagnosis (ICD-10)', type: 'multi', options: DIAGNOSES, other: true, otherHint: 'One per line, code first, e.g. F80.2 Mixed receptive-expressive language disorder' },
  { id: 'payer', label: 'Payer' },
  { id: 'member_id', label: 'Member ID' },
  { id: 'setting', label: 'Service setting', type: 'multi', options: SETTINGS, other: true },
];

export const PROVIDER_FIELDS = [
  { id: 'practice_name', label: 'Practice name' },
  { id: 'practice_addr', label: 'Practice address' },
  { id: 'practice_phone', label: 'Practice phone' },
  { id: 'practice_npi', label: 'Practice NPI' },
  { id: 'author_name', label: 'Prepared by (name)' },
  { id: 'author_cred', label: 'Prepared by (credential)', type: 'combo', options: [['RBT'], ['BCaBA'], ['BCBA'], ['BCBA-D']] },
  { id: 'sup_name', label: 'Supervising BCBA (name)' },
  { id: 'sup_cred', label: 'Supervising BCBA (credential)', type: 'combo', options: [['BCBA'], ['BCBA-D']], default: 'BCBA' },
  { id: 'sup_cert', label: 'BACB certification number' },
];

export function allFields(form) {
  const out = {};
  [...CLIENT_FIELDS, ...PROVIDER_FIELDS, ...form.dates].forEach((f) => { out[f.id] = f; });
  form.groups.forEach((g) => g.fields.forEach((f) => { out[f.id] = f; }));
  return out;
}

export function newDocData(form, settings) {
  const data = {};
  Object.values(allFields(form)).forEach((f) => {
    if (f.default !== undefined) data[f.id] = f.default;
    if (f.type === 'select') data[f.id] = f.options[0][0];
    if (f.type === 'combo' && f.default === undefined) data[f.id] = '';
  });
  PROVIDER_FIELDS.forEach((f) => { if (settings[f.id]) data[f.id] = settings[f.id]; });
  data.diagnosis = ['f840'];
  data.doc_date = new Date().toISOString().slice(0, 10);
  data.sig_guardian = !!form.guardianSignature;
  return data;
}

// Values of a checkbox field as document phrases, plus any "Other" lines.
export function multiValues(f, data) {
  const set = new Set(Array.isArray(data[f.id]) ? data[f.id] : []);
  const out = f.options.filter(([k]) => set.has(k)).map((o) => o[2] ?? o[1]);
  if (f.other && set.has('__other')) out.push(...lines(data[f.id + '_other']));
  return out;
}

function accessor(form, data) {
  const fields = allFields(form);
  const label = (id) => (fields[id] ? fields[id].label : id);
  const raw = (id) => {
    const r = data[id];
    return r === undefined || r === null ? '' : r;
  };
  const filled = (id) => String(raw(id)).trim() !== '';
  return {
    raw,
    missing: (id) => mark(label(id)),
    t: (id) => (filled(id) ? String(raw(id)) : mark(label(id))),
    opt: (id) => (filled(id) ? String(raw(id)) : ''),
    list: (id) => { const l = lines(raw(id)); return l.length ? l : [mark(label(id))]; },
    paras: (id, { optional } = {}) => { const p = paras(raw(id)); return p.length || optional ? p : [mark(label(id))]; },
    rows: (id) => (Array.isArray(data[id]) ? data[id] : []),
    multi: (id, { optional } = {}) => {
      const out = multiValues(fields[id], data);
      return out.length || optional ? out : [mark(label(id))];
    },
  };
}

const person = (name, cred) => [name, cred].map((s) => String(s || '').trim()).filter(Boolean).join(', ');

export function buildModel(form, doc) {
  const d = doc.data || {};
  const v = accessor(form, d);
  const first = String(d.client_name || '').trim().split(/\s+/)[0];
  const ctx = { client: first || 'the client' };

  const overrides = doc.overrides || {};
  const sections = form.build(v, ctx).map((s) => ({
    ...s,
    blocks: s.blocks.map((b) => {
      if (b.type !== 'p' || !b.key) return b;
      const o = overrides[b.key];
      if (!o) return { ...b, generated: b.text };
      return { ...b, generated: b.text, text: o.text, edited: true, stale: o.src !== b.text };
    }),
  }));

  const idRows = [
    ['Client', d.client_name],
    ['Date of birth', fmtDate(d.client_dob)],
    ['Client ID / MRN', d.client_id],
    ['Diagnosis', multiValues(CLIENT_FIELDS[3], d).join('; ')],
    ['Payer', d.payer],
    ['Member ID', d.member_id],
    // A start and end date can share one row ("Reporting period: 11/01/2026 to 04/30/2027").
    ...form.dates.filter((f) => !form.period || ![form.period.start, form.period.end].includes(f.id)).map((f) => [f.label, fmtDate(d[f.id])]),
    ...(form.period ? [[form.period.label, [d[form.period.start], d[form.period.end]].filter(Boolean).map(fmtDate).join(' to ')]] : []),
    ['Service setting', cap(joinList(multiValues(CLIENT_FIELDS[6], d)))],
    ['Based on', (doc.sources || []).map((s) => `${s.title}${s.date ? ' dated ' + fmtDate(s.date) : ''}`).join('; ')],
    ['Prepared by', person(d.author_name, d.author_cred)],
    ['Supervising BCBA', person(d.sup_name, d.sup_cred) + (d.sup_cert ? ` (BACB #${String(d.sup_cert).trim()})` : '')],
  ].filter(([, val]) => String(val || '').trim());

  const signers = [
    { role: 'Prepared by', name: person(d.author_name, d.author_cred) },
    { role: 'Supervising BCBA', name: person(d.sup_name, d.sup_cred) },
  ];
  if (d.sig_guardian) signers.push({ role: 'Parent / Guardian', name: '' });

  const missing = new Set();
  const scan = (s) => { if (hasMark(s)) for (const m of String(s).matchAll(MARK_RE)) missing.add(m[1]); };
  sections.forEach((s) => s.blocks.forEach((b) => {
    scan(b.text);
    (b.items || []).forEach(scan);
    (b.rows || []).forEach((r) => r.forEach((cell) => scan(cell && typeof cell === 'object' ? cell.text : cell)));
  }));
  form.dates.filter((f) => f.required && !d[f.id]).forEach((f) => missing.add(f.label));

  const lastName = String(d.client_name || '').trim().split(/\s+/).pop() || 'Client';
  const fileName = `${form.fileTag}_${lastName.replace(/[^A-Za-z0-9-]/g, '')}_${d.doc_date || 'undated'}.pdf`;

  return {
    title: form.title,
    practice: { name: d.practice_name, addr: d.practice_addr, phone: d.practice_phone, npi: d.practice_npi },
    clientLine: [d.client_name, d.client_dob ? 'DOB ' + fmtDate(d.client_dob) : '', d.client_id ? 'ID ' + d.client_id : ''].filter(Boolean).join('  |  '),
    docDate: fmtDate(d.doc_date),
    idRows,
    sections,
    signers,
    missing: [...missing],
    fileName,
  };
}

// ---------- On-screen preview ----------

const hl = (s) => esc(s).replace(MARK_RE, (_, l) => `<span class="miss">${l}</span>`);

export function modelToHTML(m) {
  const p = m.practice;
  const out = [];
  out.push('<div class="page">');
  if (p.name || p.addr || p.phone) {
    out.push(`<div class="pv-practice"><div class="pv-pname">${esc(p.name)}</div><div>${esc([p.addr, p.phone].filter(Boolean).join('  |  '))}</div>${p.npi ? `<div>NPI ${esc(p.npi)}</div>` : ''}</div>`);
  }
  out.push(`<h1 class="pv-title">${esc(m.title)}</h1>`);
  if (m.idRows.length) {
    out.push('<table class="pv-id">');
    for (let i = 0; i < m.idRows.length; i += 2) {
      const a = m.idRows[i], b = m.idRows[i + 1];
      out.push(`<tr><th>${esc(a[0])}</th><td>${esc(a[1])}</td>${b ? `<th>${esc(b[0])}</th><td>${esc(b[1])}</td>` : '<th></th><td></td>'}</tr>`);
    }
    out.push('</table>');
  }
  for (const s of m.sections) {
    out.push(`<section><h2>${esc(s.heading)}</h2>`);
    for (const b of s.blocks) {
      if (b.type === 'p') {
        const cls = ['pv-p', b.edited ? 'edited' : '', b.stale ? 'stale' : ''].join(' ');
        out.push(`<div class="${cls}" data-key="${esc(b.key || '')}"><p>${hl(b.text)}</p>`);
        if (b.key) {
          out.push(`<div class="pv-tools"><button type="button" class="link" data-act="edit">Edit wording</button>${b.edited ? '<button type="button" class="link" data-act="revert">Revert</button>' : ''}</div>`);
          if (b.stale) out.push('<div class="stale-note">Your answers changed after you edited this paragraph. <button type="button" class="link" data-act="revert">Use updated text</button> or <button type="button" class="link" data-act="keep">keep your wording</button>.</div>');
        }
        out.push('</div>');
      } else if (b.type === 'image') {
        out.push(`<figure class="pv-fig"><img src="${esc(b.src)}" alt="">${b.caption ? `<figcaption>${hl(b.caption)}</figcaption>` : ''}</figure>`);
      } else if (b.type === 'sub') {
        out.push(`<h3>${esc(b.text)}</h3>`);
      } else if (b.type === 'ul' || b.type === 'ol') {
        out.push(`<${b.type}${b.start ? ` start="${b.start}"` : ''}>${b.items.map((i) => `<li>${hl(i)}</li>`).join('')}</${b.type}>`);
      } else if (b.type === 'dl') {
        out.push(`<table class="pv-dl${b.wide ? ' wide' : ''}">${b.rows.map(([k, val]) => `<tr><th>${esc(k)}</th><td>${hl(val)}</td></tr>`).join('')}</table>`);
      } else if (b.type === 'table') {
        out.push(`<table class="pv-table"><tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>`);
        for (const r of b.rows) {
          out.push('<tr>' + r.map((cell) => {
            if (cell === null) return '';
            if (typeof cell === 'object') return `<td rowspan="${cell.rowSpan || 1}">${hl(cell.text)}</td>`;
            return `<td>${hl(cell)}</td>`;
          }).join('') + '</tr>');
        }
        out.push('</table>');
      }
    }
    out.push('</section>');
  }
  out.push('<section class="pv-sigs"><h2>Signatures</h2>');
  for (const s of m.signers) {
    out.push(`<div class="pv-sig"><div class="pv-sigline"></div><div class="pv-sigmeta"><span>${esc(s.role)}${s.name ? ': ' + esc(s.name) : ''}</span><span>Date</span></div></div>`);
  }
  out.push('</section></div>');
  return out.join('');
}
