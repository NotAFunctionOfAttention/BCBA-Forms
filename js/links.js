// Linked documents: one document drawing answers from others (an FBA feeding a
// BIP, several preference assessments feeding a skill program, and so on).
//
// Links are declared on the source form as `next: [{ to, map, multiple? }]`.
// A document keeps a snapshot of each linked source in `doc.sources`, so the
// link still works if the source is later edited, deleted, or came from a PDF.
// A linked source only fills an answer that is blank, or that it filled before
// and you have not changed since; your own entries are never overwritten.

import { FORMS, formById } from './forms/index.js';
import { CLIENT_FIELDS, PROVIDER_FIELDS, newDocData, allFields } from './engine.js';
import { uid, joinList } from './util.js';

// Every link, as { from, to, multiple, label, carries, map }.
export const LINKS = FORMS.flatMap((f) => (f.next || []).map((l) => ({ ...l, from: f.id })));
export const linksInto = (formId) => LINKS.filter((l) => l.to === formId);
export const linksFrom = (formId) => LINKS.filter((l) => l.from === formId);

const blank = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
const same = (a, b) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '');

// Answers worth carrying in a snapshot or a PDF: everything except images.
function portableData(form, data) {
  const fields = allFields(form);
  const out = {};
  for (const [k, v] of Object.entries(data || {})) {
    const f = fields[k.replace(/(_other|__o)$/, '')];
    if (f && f.type === 'image') continue;
    out[k] = v;
  }
  return out;
}

export function snapshot(form, srcDoc) {
  return {
    form: form.id,
    id: srcDoc.id,
    title: form.title,
    // A form can name the date that best identifies it (e.g. when an assessment was run).
    date: (form.sourceDate && srcDoc.data?.[form.sourceDate]) || srcDoc.data?.doc_date || '',
    client: String(srcDoc.data?.client_name || '').trim(),
    data: structuredClone(portableData(form, srcDoc.data)),
  };
}

// What all current sources say each field should be.
function proposed(targetForm, sources) {
  const out = {};
  // Client and provider details come from the first source that has them.
  for (const s of sources) {
    for (const f of [...CLIENT_FIELDS, ...PROVIDER_FIELDS]) {
      for (const k of [f.id, f.id + '_other', f.id + '__o']) {
        if (out[k] === undefined && !blank(s.data[k])) out[k] = s.data[k];
      }
    }
  }
  // When two kinds of source fill the same field, a field marked `combine` keeps
  // both ('and': one list, 'paragraphs': separate paragraphs); otherwise the
  // later link in LINKS wins.
  const fields = allFields(targetForm);
  const parts = {};
  for (const link of linksInto(targetForm.id)) {
    const list = sources.filter((s) => s.form === link.from).map((s) => s.data);
    if (!list.length) continue;
    const mapped = (link.multiple ? link.map(list) : link.map(list[0])) || {};
    for (const [k, v] of Object.entries(mapped)) {
      if (blank(v)) continue;
      const how = fields[k] && fields[k].combine;
      if (how) (parts[k] = parts[k] || []).push(...(Array.isArray(v) ? v : [v]));
      else out[k] = v;
    }
  }
  for (const [k, vals] of Object.entries(parts)) {
    const uniq = [...new Set(vals)];
    if (fields[k].combine !== 'and') out[k] = uniq.join('\n\n');
    else if (uniq.some((x) => x.includes(','))) out[k] = uniq.length > 1 ? uniq.slice(0, -1).join('; ') + '; and ' + uniq[uniq.length - 1] : uniq[0];
    else out[k] = joinList(uniq);
  }
  return out;
}

// Re-applies all sources to the document. Returns what happened, for a message.
export function applySources(targetForm, doc) {
  const sources = doc.sources || [];
  const auto = doc.autofill || {};
  const next = proposed(targetForm, sources);
  const defaults = newDocData(targetForm, {});
  const idKeys = new Set([...CLIENT_FIELDS, ...PROVIDER_FIELDS].flatMap((f) => [f.id, f.id + '_other', f.id + '__o']));
  const result = { filled: 0, kept: 0, cleared: 0 };
  const keys = new Set([...Object.keys(next), ...Object.keys(auto)]);
  const newAuto = {};
  for (const k of keys) {
    const cur = doc.data[k];
    const ours = k in auto && same(cur, auto[k]); // still what a source put there
    const untouched = blank(cur) || (k !== 'doc_date' && same(cur, defaults[k])); // never answered
    if (k in next) {
      if (untouched || ours) {
        if (!same(cur, next[k])) result.filled++;
        doc.data[k] = structuredClone(next[k]);
        newAuto[k] = structuredClone(next[k]);
      } else if (!same(cur, next[k]) && !idKeys.has(k)) {
        result.kept++;
      }
    } else if (ours) {
      // The source that filled this is gone, and nobody changed it since.
      doc.data[k] = Array.isArray(cur) ? [] : '';
      result.cleared++;
    }
  }
  doc.autofill = newAuto;
  return result;
}

export function addSource(targetForm, doc, srcForm, srcDoc) {
  const link = linksInto(targetForm.id).find((l) => l.from === srcForm.id);
  if (!link) throw new Error(`A ${srcForm.title} cannot be linked to a ${targetForm.title}.`);
  doc.sources = (doc.sources || []).filter((s) => s.id !== srcDoc.id);
  if (!link.multiple) doc.sources = doc.sources.filter((s) => s.form !== srcForm.id);
  doc.sources.push(snapshot(srcForm, srcDoc));
  return applySources(targetForm, doc);
}

export function removeSource(targetForm, doc, id) {
  doc.sources = (doc.sources || []).filter((s) => s.id !== id);
  return applySources(targetForm, doc);
}

// A new document started from a finished one (the Next steps buttons).
export function startFrom(srcForm, srcDoc, targetForm, settings) {
  const doc = { id: uid(), form: targetForm.id, created: Date.now(), updated: Date.now(), data: newDocData(targetForm, settings), overrides: {}, sources: [], autofill: {} };
  addSource(targetForm, doc, srcForm, srcDoc);
  return doc;
}

// Older documents stored a single `source` without a snapshot.
export function upgrade(doc) {
  if (doc.source && !doc.sources) {
    doc.sources = [{ ...doc.source, client: String(doc.data?.client_name || ''), data: {} }];
    delete doc.source;
  }
  return doc;
}

// ---------- Answers carried inside exported PDFs ----------
// Stored as base64 JSON in a custom PDF metadata field. It is not shown on any
// page; it lets a PDF made by this app be opened again or linked later.

export const PDF_KEY = 'AbaDocsData';

export function pdfPayload(form, doc) {
  const json = JSON.stringify({ app: 'aba-docs', v: 1, form: form.id, id: doc.id, data: portableData(form, doc.data), overrides: doc.overrides || {}, sources: (doc.sources || []).map(({ data, ...rest }) => rest) });
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export async function readPdf(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  let text = '';
  for (let i = 0; i < buf.length; i += 0x8000) text += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  if (!text.startsWith('%PDF')) throw new Error('That file is not a PDF.');
  // The field holds the text directly, or points to an object that does
  // ("/AbaDocsData 19 0 R"). An edited PDF can hold more than one copy; the
  // last one is the newest.
  const found = [];
  const re = new RegExp('/' + PDF_KEY + '\\s*(?:\\(([A-Za-z0-9+/=\\s\\\\]+)\\)|(\\d+)\\s+(\\d+)\\s+R)', 'g');
  for (const m of text.matchAll(re)) {
    if (m[1]) { found.push(m[1]); continue; }
    const obj = new RegExp('(?:^|[\\r\\n\\s])' + m[2] + '\\s+' + m[3] + '\\s+obj\\s*\\(([A-Za-z0-9+/=\\s\\\\]+)\\)', 'g');
    const hits = [...text.matchAll(obj)];
    if (hits.length) found.push(hits[hits.length - 1][1]);
  }
  const all = found.map((x) => [null, x]);
  if (!all.length) throw new Error('This PDF was not made by ABA Docs, or was exported with re-import data turned off, so its answers cannot be read. Documents still on this device can be linked from the list instead.');
  const b64 = all[all.length - 1][1].replace(/[\s\\]/g, '');
  let payload;
  try {
    const raw = atob(b64);
    payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(raw, (c) => c.charCodeAt(0))));
  } catch {
    throw new Error('The answers stored in this PDF could not be read.');
  }
  const form = formById(payload.form);
  if (payload.app !== 'aba-docs' || !form) throw new Error('This PDF was made by a different version of ABA Docs and cannot be read.');
  return {
    form,
    doc: { id: payload.id || uid(), form: form.id, created: Date.now(), updated: Date.now(), data: payload.data || {}, overrides: payload.overrides || {}, sources: payload.sources || [], imported: true },
  };
}
