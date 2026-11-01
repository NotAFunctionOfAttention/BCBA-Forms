import * as store from './store.js';
import { FORMS, STAGES, formById } from './forms/index.js';
import { CLIENT_FIELDS, PROVIDER_FIELDS, newDocData, buildModel, modelToHTML, allFields } from './engine.js';
import { LINKS, linksInto, linksFrom, addSource, removeSource, startFrom, upgrade, pdfPayload, readPdf } from './links.js';
import { makePdfBlob } from './pdf.js';
import { encryptJSON, decryptJSON } from './crypto.js';
import { esc, uid, fmtDate, cap } from './util.js';

const app = document.getElementById('app');
const $ = (sel, root = document) => root.querySelector(sel);

// ---------- Small UI helpers ----------

function dialog(html, { onOpen } = {}) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.innerHTML = `<form method="dialog">${html}</form>`;
    document.body.appendChild(d);
    d.addEventListener('close', () => { resolve(d.returnValue === 'ok' ? d : null); setTimeout(() => d.remove(), 0); });
    d.showModal();
    if (onOpen) onOpen(d);
  });
}

const alertBox = (title, body) => dialog(`<h3>${esc(title)}</h3>${body}<div class="actions"><button value="ok" class="primary">OK</button></div>`);
const confirmBox = async (title, body, okLabel = 'Delete') =>
  !!(await dialog(`<h3>${esc(title)}</h3><p>${esc(body)}</p><div class="actions"><button value="cancel">Cancel</button><button value="ok" class="danger">${esc(okLabel)}</button></div>`));

// Choose a document on this device, or upload a PDF. Resolves to a doc id, 'upload', or null.
function pickDialog(title, intro, docs) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'picker';
    d.innerHTML = `<h3>${esc(title)}</h3><p class="small">${esc(intro)}</p>
      ${docs.length ? `<ul class="pick-list">${docs.map((x) => `<li><button type="button" data-pick="${esc(x.id)}"><strong>${esc(x.data.client_name || 'No client name')}</strong><span>${esc(fmtDate(x.data.doc_date))}${x.imported ? ' · imported from PDF' : ''}</span></button></li>`).join('')}</ul>` : '<p class="muted small">None on this device.</p>'}
      <div class="actions"><button type="button" data-pick="cancel">Cancel</button><button type="button" class="primary" data-pick="upload">Upload a PDF…</button></div>`;
    document.body.appendChild(d);
    d.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pick]');
      if (!b) return;
      const v = b.dataset.pick;
      d.close();
      d.remove();
      resolve(v === 'cancel' ? null : v);
    });
    d.addEventListener('cancel', () => { d.remove(); resolve(null); });
    d.showModal();
  });
}

function chooseFile(accept) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files[0] || null);
    input.click();
  });
}

// Reads a PDF made by this app. If the document is already on this device,
// that copy is used. `keep()` saves an uploaded one; call it only once the
// person has confirmed they want it.
async function importPdf(file) {
  const { form, doc } = await readPdf(file);
  const existing = await store.getDoc(doc.id);
  if (existing) return { form, doc: upgrade(existing), existed: true, keep: async () => {} };
  return { form, doc, existed: false, keep: () => store.putDoc(doc) };
}

async function saveFile(blob, name) {
  const file = new File([blob], name, { type: blob.type });
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// ---------- Routing ----------

window.addEventListener('hashchange', route);

async function route() {
  const h = location.hash.slice(1);
  if (h.startsWith('doc/')) return showEditor(h.slice(4));
  if (h === 'settings') return showSettings();
  return showHome();
}

// ---------- Home ----------

function linksCard() {
  const items = LINKS.map((l) => {
    const from = formById(l.from), to = formById(l.to);
    return `<li><strong>${esc(from.title)} \u2192 ${esc(to.title)}</strong><span>Carries over the ${esc(l.carries)}.${l.multiple ? ' More than one can be linked; their items are combined.' : ''}</span></li>`;
  });
  return `<section class="card links-card">
    <details>
      <summary><h2>How documents connect</h2></summary>
      <p>Documents can draw answers from earlier ones in two ways:</p>
      <ul class="links-how">
        <li><strong>Next steps</strong> at the bottom of a finished document starts the next one from it.</li>
        <li><strong>Based on</strong> at the top of a document links earlier ones to it. Pick a document on this device, or upload a PDF this app exported, for example a preference assessment from last week.</li>
      </ul>
      <p>Linked documents fill only answers that are blank, or that they filled and you have not changed, so nothing you typed is overwritten. Removing a link takes back what it filled. The new document lists its sources under \u201cBased on\u201d in its header. It keeps its own copy of what it used, so later changes to the earlier document do not change it.</p>
      <p class="muted small">PDFs exported by this app carry a hidden copy of their answers so they can be uploaded later. It never appears on the page and can be turned off in Settings.</p>
      <p class="muted small">A typical sequence: FBA \u2192 BIP \u2192 a skill program for the replacement behavior \u2192 visual analysis of each program\u2019s data. A preference assessment can supply reinforcers to a BIP or a skill program at any point.</p>
      <ul class="links-list">${items.join('')}</ul>
    </details>
  </section>`;
}

async function showHome() {
  const docs = (await store.listDocs()).sort((a, b) => b.updated - a.updated);
  app.innerHTML = `
    <header class="bar"><h1>ABA Docs</h1><a class="btn" href="#settings">Settings</a></header>
    <main class="home">
      <section class="card">
        <h2>New document</h2>
        ${STAGES.map(([stage, forms]) => `<h3 class="stage">${esc(stage)}</h3><div class="new-list">${forms.map((f) => `<button class="primary" data-new="${f.id}">${esc(f.title)}</button>`).join('')}</div>`).join('')}
        <p class="small muted import-line">Have a PDF this app exported earlier? <button class="link" data-import="1">Open it here</button> to keep working with it on this device.</p>
      </section>
      ${linksCard()}
      <section class="card">
        <h2>Documents on this device</h2>
        ${docs.length ? '<ul class="doc-list">' + docs.map((d) => {
          const f = formById(d.form);
          return `<li><a href="#doc/${d.id}"><strong>${esc(f ? f.title : d.form)}</strong><span>${esc(d.data.client_name || 'No client name')} · ${esc(fmtDate(d.data.doc_date))}${d.imported ? ' · imported from PDF' : ''}</span></a>
            <div class="row-actions"><button class="link" data-dup="${d.id}">Duplicate</button><button class="link danger-text" data-del="${d.id}">Delete</button></div></li>`;
        }).join('') + '</ul>' : '<p class="muted">No documents yet.</p>'}
      </section>
      <p class="muted small">Everything you enter stays on this device. This app makes no network connections.</p>
    </main>`;

  app.onclick = async (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.import) {
      const file = await chooseFile('application/pdf,.pdf');
      if (!file) return;
      try {
        const { doc, existed, keep } = await importPdf(file);
        await keep();
        if (existed) await alertBox('Already on this device', '<p>This document is already on this device, so the copy here was opened instead.</p>');
        location.hash = 'doc/' + doc.id;
      } catch (err) {
        alertBox('Could not open the PDF', `<p>${esc(err.message)}</p>`);
      }
      return;
    }
    if (t.dataset.new) {
      const form = formById(t.dataset.new);
      const doc = { id: uid(), form: form.id, created: Date.now(), updated: Date.now(), data: newDocData(form, await store.getSettings()), overrides: {} };
      await store.putDoc(doc);
      location.hash = 'doc/' + doc.id;
    } else if (t.dataset.dup) {
      const src = await store.getDoc(t.dataset.dup);
      const copy = { ...structuredClone(src), id: uid(), created: Date.now(), updated: Date.now() };
      copy.data.doc_date = new Date().toISOString().slice(0, 10);
      await store.putDoc(copy);
      showHome();
    } else if (t.dataset.del) {
      if (await confirmBox('Delete document?', 'This removes it from this device. It cannot be undone.')) {
        await store.deleteDoc(t.dataset.del);
        showHome();
      }
    }
  };
}

// ---------- Editor ----------

const OTHER = '__other';

function fieldHTML(f, data) {
  const value = data[f.id] ?? '';
  const id = 'f_' + f.id;
  const hint = f.hint ? `<small class="hint">${esc(f.hint)}</small>` : '';
  const opt = f.optional ? ' <span class="muted">(optional)</span>' : '';
  const chips = f.suggest ? `<div class="chips" data-chips="${f.id}">${chipsInner(f, data)}</div>` : '';
  let input;
  switch (f.type) {
    case 'textarea':
    case 'list':
      input = `<textarea id="${id}" data-id="${f.id}" rows="${f.type === 'list' ? 4 : 3}">${esc(value)}</textarea>`;
      break;
    case 'date':
      input = `<input type="date" id="${id}" data-id="${f.id}" value="${esc(value)}">`;
      break;
    case 'select':
      input = `<select id="${id}" data-id="${f.id}">${f.options.map(([k, l]) => `<option value="${esc(k)}"${k === value ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
      break;
    case 'combo': {
      // Stored value is the document phrase itself; anything not in the list is "Other".
      const phrases = f.options.map((o) => o[1] ?? o[0]);
      const isOther = data[f.id + '__o'] || (String(value).trim() !== '' && !phrases.includes(value));
      input = `<select id="${id}" data-combo="${f.id}"><option value="">Choose…</option>${f.options.map((o) => {
        const ph = o[1] ?? o[0];
        return `<option value="${esc(ph)}"${!isOther && ph === value ? ' selected' : ''}>${esc(o[0])}</option>`;
      }).join('')}<option value="${OTHER}"${isOther ? ' selected' : ''}>Other (type your own)</option></select>
      <input type="text" class="other-input" data-id="${f.id}" value="${isOther ? esc(value) : ''}" placeholder="Type your answer" autocomplete="off"${isOther ? '' : ' hidden'}>`;
      break;
    }
    case 'multi': {
      const set = new Set(Array.isArray(value) ? value : []);
      const boxes = f.options.map(([k, l]) => `<label class="check"><input type="checkbox" value="${esc(k)}"${set.has(k) ? ' checked' : ''}> ${esc(l)}</label>`).join('');
      const other = f.other ? `<label class="check"><input type="checkbox" value="${OTHER}"${set.has(OTHER) ? ' checked' : ''}> Other</label>
        <textarea class="other-input" data-id="${f.id}_other" rows="2" placeholder="${esc(f.otherHint || 'One per line')}"${set.has(OTHER) ? '' : ' hidden'}>${esc(data[f.id + '_other'] ?? '')}</textarea>` : '';
      return `<fieldset class="field checks" data-multi="${f.id}"><legend>${esc(f.label)}${opt}</legend>${hint}${boxes}${other}</fieldset>`;
    }
    case 'number':
      input = `<input type="number" inputmode="decimal" id="${id}" data-id="${f.id}" value="${esc(value)}">`;
      break;
    case 'grid':
      return `<div class="field" data-gridfield="${f.id}"><label>${esc(f.label)}${opt}</label>${hint}${gridHTML(f, data)}</div>`;
    case 'image':
      return `<div class="field img-field" data-imagefield="${f.id}"><label for="${id}">${esc(f.label)}${opt}</label>${hint}
        ${value ? `<img src="${esc(value)}" alt=""><button type="button" class="link danger-text" data-image-del="${f.id}">Remove image</button>` : ''}
        <input type="file" id="${id}" accept="image/*" data-image="${f.id}"${value ? ' hidden' : ''}></div>`;
    default:
      input = `<input type="text" id="${id}" data-id="${f.id}" value="${esc(value)}" autocomplete="off">`;
  }
  return `<div class="field"><label for="${id}">${esc(f.label)}${opt}</label>${hint}${input}${chips}</div>`;
}

// Editable table: one object per row. Columns may be computed (`calc`).
// `layout: 'cards'` shows each row as a card with stacked, labelled answers
// (for long text such as goals); `footer(rows)` adds a line such as a total.
function gridCell(f, c, r, i, rows) {
  if (c.calc) return `<span class="calc" data-calc="${f.id}:${i}:${c.id}">${esc(c.calc(r, rows))}</span>`;
  const v = r[c.id] ?? '';
  const at = `data-grid="${f.id}" data-row="${i}" data-col="${c.id}"`;
  switch (c.type) {
    case 'select': return `<select ${at}>${c.options.map(([k, l]) => `<option value="${esc(k)}"${k === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    case 'number': return `<input type="number" inputmode="decimal" min="0" step="any" ${at} value="${esc(v)}">`;
    case 'textarea': return `<textarea rows="${c.rows || 2}" ${at}${c.placeholder ? ` placeholder="${esc(c.placeholder)}"` : ''}>${esc(v)}</textarea>`;
    case 'image': return v
      ? `<img src="${esc(v)}" alt=""><button type="button" class="link danger-text" data-grid-imgdel="${f.id}" data-row="${i}" data-col="${c.id}">Remove image</button>`
      : `<input type="file" accept="image/*" data-grid-img="${f.id}" data-row="${i}" data-col="${c.id}">`;
    default: return `<input type="text" ${at} value="${esc(v)}" autocomplete="off"${c.placeholder ? ` placeholder="${esc(c.placeholder)}"` : ''}>`;
  }
}

function gridHTML(f, data) {
  const rows = Array.isArray(data[f.id]) && data[f.id].length ? data[f.id] : [{}];
  if (!Array.isArray(data[f.id]) || !data[f.id].length) data[f.id] = rows;
  const del = (i) => `<button type="button" class="link danger-text" data-grid-del="${f.id}" data-row="${i}" aria-label="Remove ${esc(f.rowName || 'row')}">${f.layout === 'cards' ? 'Remove' : '✕'}</button>`;
  let body;
  if (f.layout === 'cards') {
    body = rows.map((r, i) => `<div class="grid-card${r._auto ? ' from-link' : ''}"><div class="grid-card-head"><strong>${esc(cap(f.rowName || 'row'))} ${i + 1}</strong>${r._auto ? '<span class="muted small">from a linked document</span>' : ''}${del(i)}</div>
      ${f.columns.map((c) => `<label class="grid-card-field${c.type === 'image' ? ' img-field' : ''}"><span>${esc(c.label)}${c.optional ? ' <span class="muted">(optional)</span>' : ''}</span>${gridCell(f, c, r, i, rows)}</label>`).join('')}</div>`).join('');
  } else {
    const head = f.columns.map((c) => `<th>${esc(c.label)}</th>`).join('') + '<th></th>';
    body = `<div class="grid-wrap"><table class="grid"><thead><tr>${head}</tr></thead><tbody>${rows.map((r, i) => '<tr>' + f.columns.map((c) => `<td${c.calc ? ' class="calc"' : ''}>${gridCell(f, c, r, i, rows)}</td>`).join('') + `<td>${del(i)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  const foot = f.footer ? `<p class="grid-footer" data-gridfoot="${f.id}">${esc(f.footer(rows))}</p>` : '';
  return `${body}${foot}<div class="grid-actions"><button type="button" class="small" data-grid-add="${f.id}">+ Add ${esc(f.rowName || 'row')}</button></div>`;
}

// Photos and screenshots are shrunk and re-encoded on the device before saving.
function readImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be read as an image.')); };
    img.src = url;
  });
}

// Suggestions can be a fixed list or depend on other answers. A used one
// shows a check mark; tapping it again takes it back out.
const chipUsed = (f, value, t) => (f.suggestMode === 'replace' ? value.trim() === t : value.includes(t.replace(/\.$/, '')));

function chipsInner(f, data) {
  const list = typeof f.suggest === 'function' ? f.suggest(data) : f.suggest;
  if (!list.length) return f.suggestEmpty ? `<span class="hint">${esc(f.suggestEmpty)}</span>` : '';
  const value = String(data[f.id] ?? '');
  return list.map((t) => {
    const used = chipUsed(f, value, t);
    return `<button type="button" class="chip${used ? ' used' : ''}" data-chip="${f.id}" data-text="${esc(t)}">${used ? '\u2713' : '+'} ${esc(t)}</button>`;
  }).join('');
}

// Wires every control inside `root` to write into `data`, then calls onChange.
function bindFields(root, data, onChange) {
  root.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.grid) {
      const rows = data[t.dataset.grid];
      rows[+t.dataset.row][t.dataset.col] = t.type === 'number' ? (t.value === '' ? '' : Number(t.value)) : t.value;
      const f = fieldMap[t.dataset.grid];
      // A column can fill another blank column of the same row from its choice
      // (e.g. choosing an FA condition fills in its standard description).
      const col = f.columns.find((c) => c.id === t.dataset.col);
      if (col && col.fills && t.value && col.fills.values[t.value] && !String(rows[+t.dataset.row][col.fills.col] || '').trim()) {
        rows[+t.dataset.row][col.fills.col] = col.fills.values[t.value];
        const target = root.querySelector(`[data-grid="${f.id}"][data-row="${t.dataset.row}"][data-col="${col.fills.col}"]`);
        if (target) target.value = col.fills.values[t.value];
      }
      // Refresh computed cells and totals without rebuilding the inputs being typed in.
      root.querySelectorAll(`[data-calc^="${f.id}:"]`).forEach((el) => {
        const [, i, col] = el.dataset.calc.split(':');
        el.textContent = f.columns.find((c) => c.id === col).calc(rows[+i], rows);
      });
      const foot = root.querySelector(`[data-gridfoot="${f.id}"]`);
      if (foot) foot.textContent = f.footer(rows);
    } else if (t.dataset.image) {
      return;
    } else if (t.dataset.combo) {
      const id = t.dataset.combo;
      const other = t.parentElement.querySelector('.other-input');
      if (t.value === OTHER) {
        data[id + '__o'] = true;
        data[id] = '';
        other.value = '';
        other.hidden = false;
        other.focus();
      } else {
        data[id + '__o'] = false;
        data[id] = t.value;
        other.hidden = true;
      }
    } else if (t.dataset.id) {
      data[t.dataset.id] = t.value;
    } else {
      const fs = t.closest('[data-multi]');
      if (!fs) return;
      const vals = [...fs.querySelectorAll('input[type=checkbox]:checked')].map((i) => i.value);
      data[fs.dataset.multi] = vals;
      const other = fs.querySelector('.other-input');
      if (other) {
        other.hidden = !vals.includes(OTHER);
        if (t.value === OTHER && t.checked) other.focus();
      }
    }
    onChange(t);
    refreshChips();
  });
  const refreshChips = () => root.querySelectorAll('[data-chips]').forEach((box) => { box.innerHTML = chipsInner(fieldMap[box.dataset.chips], data); });
  const redrawGrid = (id) => {
    const box = root.querySelector(`[data-gridfield="${id}"]`);
    box.outerHTML = fieldHTML(fieldMap[id], data);
    onChange();
    refreshChips();
  };
  root.addEventListener('change', async (e) => {
    const t = e.target;
    if (t.dataset.gridImg && t.files[0]) {
      try {
        data[t.dataset.gridImg][+t.dataset.row][t.dataset.col] = await readImage(t.files[0]);
      } catch (err) {
        alertBox('Image not added', `<p>${esc(err.message)}</p>`);
        return;
      }
      redrawGrid(t.dataset.gridImg);
      return;
    }
    if (!t.dataset.image || !t.files[0]) return;
    try {
      data[t.dataset.image] = await readImage(t.files[0]);
    } catch (err) {
      alertBox('Image not added', `<p>${esc(err.message)}</p>`);
      return;
    }
    t.closest('[data-imagefield]').outerHTML = fieldHTML(fieldMap[t.dataset.image], data);
    onChange();
  });
  root.addEventListener('click', (e) => {
    const add = e.target.closest('[data-grid-add]');
    if (add) { data[add.dataset.gridAdd].push({}); redrawGrid(add.dataset.gridAdd); return; }
    const del = e.target.closest('[data-grid-del]');
    if (del) {
      const rows = data[del.dataset.gridDel];
      rows.splice(+del.dataset.row, 1);
      if (!rows.length) rows.push({});
      redrawGrid(del.dataset.gridDel);
      return;
    }
    const gImgDel = e.target.closest('[data-grid-imgdel]');
    if (gImgDel) {
      data[gImgDel.dataset.gridImgdel][+gImgDel.dataset.row][gImgDel.dataset.col] = '';
      redrawGrid(gImgDel.dataset.gridImgdel);
      return;
    }
    const imgDel = e.target.closest('[data-image-del]');
    if (imgDel) {
      data[imgDel.dataset.imageDel] = '';
      imgDel.closest('[data-imagefield]').outerHTML = fieldHTML(fieldMap[imgDel.dataset.imageDel], data);
      onChange();
      return;
    }
    const chip = e.target.closest('[data-chip]');
    if (!chip) return;
    const f = fieldMap[chip.dataset.chip];
    const el = root.querySelector(`[data-id="${f.id}"]`);
    const text = chip.dataset.text;
    const cur = el.value;
    if (f.suggestMode === 'replace') {
      el.value = text;
    } else if (chipUsed(f, cur, text)) {
      const bare = text.replace(/\.$/, '');
      el.value = f.type === 'list'
        ? cur.split('\n').filter((l) => !l.includes(bare)).join('\n')
        : cur.replace(new RegExp('\\s*' + bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\.?'), '').trim();
    } else {
      const sep = f.type === 'list' ? '\n' : ' ';
      el.value = cur.trim() ? cur.replace(/\s+$/, '') + sep + text : text;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

let fieldMap = {};

function groupHTML(title, fields, data, open = true, extra = '') {
  return `<details class="group"${open ? ' open' : ''}><summary>${esc(title)}</summary>${fields.map((f) => fieldHTML(f, data)).join('')}${extra}</details>`;
}

let sourceMsg = '';
let sourceMsgFor = '';

async function showEditor(id) {
  if (sourceMsgFor !== id) { sourceMsgFor = id; sourceMsg = ''; window.scrollTo(0, 0); }
  const stored = await store.getDoc(id);
  if (!stored) { location.hash = ''; return; }
  const doc = upgrade(stored);
  const form = formById(doc.form);
  const incoming = linksInto(form.id);
  const outgoing = linksFrom(form.id);
  doc.overrides = doc.overrides || {};
  let model;

  app.innerHTML = `
    <header class="bar">
      <a class="btn" href="#">Documents</a>
      <h1 class="doc-title">${esc(form.title)}</h1>
      <span class="export-btns">${(form.variants || []).map((vr, i) => `<button data-variant="${i}">${esc(vr.label)}</button>`).join('')}<button class="primary" id="export">Export PDF</button></span>
    </header>
    <div class="tabs" role="tablist"><button data-tab="form" class="on">Enter</button><button data-tab="preview">Review</button></div>
    <main class="editor" data-show="form">
      <form class="ed-form" autocomplete="off">
        ${incoming.length ? `<section class="group sources"><h3>Based on</h3>
          <p class="hint">Link earlier documents to fill in the answers they share with this one. They fill only blank answers, never ones you typed. Pick a document on this device or upload a PDF this app exported.</p>
          ${(doc.sources || []).length ? `<ul class="source-list">${doc.sources.map((s) => `<li><span><strong>${esc(s.title)}</strong>${s.date ? ' dated ' + esc(fmtDate(s.date)) : ''}${s.client ? ' · ' + esc(s.client) : ''}</span>
            <span class="row-actions"><a class="link" href="#doc/${esc(s.id)}" data-open="${esc(s.id)}">Open</a><button type="button" class="link danger-text" data-unlink="${esc(s.id)}">Remove</button></span></li>`).join('')}</ul>` : ''}
          <div class="source-add">${incoming.map((l) => {
            const has = (doc.sources || []).some((s) => s.form === l.from);
            const t = formById(l.from).title;
            return `<button type="button" class="small" data-link="${l.from}">${l.multiple ? '+ Add a' : has ? 'Change the' : '+ Link a'} ${esc(t)}</button>`;
          }).join('')}</div>
          ${sourceMsg ? `<p class="source-msg">${esc(sourceMsg)}</p>` : ''}
        </section>` : ''}
        ${groupHTML('Client', CLIENT_FIELDS, doc.data)}
        ${groupHTML('Document', form.dates.map((f) => ({ ...f, type: 'date' })), doc.data, true,
          `<label class="check"><input type="checkbox" id="sig_guardian"${doc.data.sig_guardian ? ' checked' : ''}> Include parent/guardian signature line</label>`)}
        ${groupHTML('Provider', PROVIDER_FIELDS, doc.data, false)}
        ${form.groups.map((g) => groupHTML(g.title, g.fields, doc.data)).join('')}
        ${outgoing.length ? `<section class="group next-steps"><h3>Next steps</h3>
          <p class="hint">Start a new document from this one. It copies the client and provider details and the items listed; nothing in this document changes. To add this document to one you already started, use Based on in that document instead.</p>
          ${outgoing.map((l, i) => `<div class="next-item"><button type="button" class="primary" data-next="${i}">${esc(l.label)}</button><small class="hint">Carries over the ${esc(l.carries)}.</small></div>`).join('')}
        </section>` : ''}
      </form>
      <div class="ed-preview"><div id="preview"></div></div>
    </main>`;

  const preview = $('#preview');
  const editorEl = $('.editor');
  sourceMsg = '';

  let saveTimer;
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => { doc.updated = Date.now(); store.putDoc(doc); }, 300); };
  let renderTimer;
  const render = () => {
    model = buildModel(form, doc);
    preview.innerHTML = modelToHTML(model);
  };
  const soon = () => { clearTimeout(renderTimer); renderTimer = setTimeout(render, 150); };
  render();

  const formEl = $('.ed-form');
  fieldMap = allFields(form);
  bindFields(formEl, doc.data, () => { save(); soon(); });
  $('#sig_guardian').addEventListener('change', (e) => { doc.data.sig_guardian = e.target.checked; save(); soon(); });
  formEl.addEventListener('submit', (e) => e.preventDefault());
  formEl.addEventListener('click', async (e) => {
    const flush = async () => { clearTimeout(saveTimer); doc.updated = Date.now(); await store.putDoc(doc); };
    const nextBtn = e.target.closest('[data-next]');
    if (nextBtn) {
      const link = outgoing[+nextBtn.dataset.next];
      await flush();
      const created = startFrom(form, doc, formById(link.to), await store.getSettings());
      await store.putDoc(created);
      location.hash = 'doc/' + created.id;
      return;
    }
    const unlink = e.target.closest('[data-unlink]');
    if (unlink) {
      const r = removeSource(form, doc, unlink.dataset.unlink);
      sourceMsg = `Link removed.${r.cleared ? ` ${r.cleared} answer${r.cleared > 1 ? 's' : ''} it had filled ${r.cleared > 1 ? 'were' : 'was'} cleared.` : ''}${r.filled ? ` ${r.filled} answer${r.filled > 1 ? 's were' : ' was'} updated from the remaining links.` : ''}`;
      await flush();
      showEditor(doc.id);
      return;
    }
    const linkBtn = e.target.closest('[data-link]');
    if (!linkBtn) return;
    const srcForm = formById(linkBtn.dataset.link);
    const already = new Set((doc.sources || []).map((s) => s.id));
    const client = String(doc.data.client_name || '').trim().toLowerCase();
    const candidates = (await store.listDocs())
      .filter((x) => x.form === srcForm.id && !already.has(x.id))
      .sort((a, b) => (String(b.data.client_name || '').trim().toLowerCase() === client) - (String(a.data.client_name || '').trim().toLowerCase() === client) || String(b.data.doc_date).localeCompare(String(a.data.doc_date)));
    const pick = await pickDialog(`Link a ${srcForm.title}`, client ? 'Documents for this client are listed first.' : 'Newest first.', candidates);
    if (!pick) return;
    let src;
    let keep = async () => {};
    try {
      if (pick === 'upload') {
        const file = await chooseFile('application/pdf,.pdf');
        if (!file) return;
        const got = await importPdf(file);
        if (got.form.id !== srcForm.id) throw new Error(`That PDF is a ${got.form.title}, not a ${srcForm.title}.`);
        src = got.doc;
        keep = got.keep;
      } else {
        src = await store.getDoc(pick);
      }
    } catch (err) {
      alertBox('Could not link the document', `<p>${esc(err.message)}</p>`);
      return;
    }
    const theirs = String(src.data.client_name || '').trim();
    if (client && theirs && theirs.toLowerCase() !== client) {
      if (!(await confirmBox('Different client', `That ${srcForm.title} is for ${theirs}, but this document is for ${doc.data.client_name}. Link it anyway?`, 'Link anyway'))) return;
    }
    await keep();
    const r = addSource(form, doc, srcForm, src);
    sourceMsg = `Linked the ${srcForm.title}. ${r.filled ? `${r.filled} answer${r.filled > 1 ? 's were' : ' was'} filled in.` : 'No blank answers needed filling.'}${r.kept ? ` ${r.kept} answer${r.kept > 1 ? 's' : ''} you had already entered ${r.kept > 1 ? 'were' : 'was'} kept.` : ''}`;
    await flush();
    showEditor(doc.id);
  });

  document.querySelector('.tabs').onclick = (e) => {
    const b = e.target.closest('button[data-tab]');
    if (!b) return;
    document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
    editorEl.dataset.show = b.dataset.tab;
    window.scrollTo(0, 0);
  };

  const findBlock = (key) => {
    for (const s of model.sections) for (const b of s.blocks) if (b.key === key) return b;
    return null;
  };

  preview.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const wrap = btn.closest('.pv-p');
    const key = wrap.dataset.key;
    const b = findBlock(key);
    if (!b) return;
    const act = btn.dataset.act;
    if (act === 'edit') {
      wrap.innerHTML = `<textarea class="pv-edit" rows="5">${esc(b.text)}</textarea>
        <div class="pv-tools"><button type="button" class="primary small" data-act="save">Save wording</button><button type="button" class="link" data-act="cancel">Cancel</button></div>`;
      const ta = $('textarea', wrap); ta.focus();
      ta.style.height = ta.scrollHeight + 'px';
    } else if (act === 'save') {
      const text = $('textarea', wrap).value.replace(/\s+/g, ' ').trim();
      if (!text || text === b.generated) delete doc.overrides[key];
      else doc.overrides[key] = { text, src: b.generated };
      save(); render();
    } else if (act === 'cancel') {
      render();
    } else if (act === 'revert') {
      delete doc.overrides[key];
      save(); render();
    } else if (act === 'keep') {
      if (doc.overrides[key]) doc.overrides[key].src = b.generated;
      save(); render();
    }
  });

  const exportPdf = async (btn, variant) => {
    model = buildModel(form, doc);
    const out = variant ? buildModel(form, doc, variant) : model;
    if (out.missing.length || model.missing.length) {
      const list = [...new Set([...model.missing, ...out.missing])];
      await alertBox('Not ready to export', `<p>These items still need an answer:</p><ul class="missing-list">${list.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>`);
      return;
    }
    const stale = model.sections.flatMap((s) => s.blocks).filter((b) => b.stale);
    if (stale.length) {
      await alertBox('Check edited wording', `<p>${stale.length} paragraph${stale.length > 1 ? 's were' : ' was'} edited before later answer changes. On the Review tab, choose "Use updated text" or "keep your wording" for each one, then export.</p>`);
      return;
    }
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Building…';
    try {
      const settings = await store.getSettings();
      const blob = await makePdfBlob(out, settings.embedData === false ? null : pdfPayload(form, doc));
      if (variant && variant.onePage && blob.pages > 1) {
        await alertBox('Longer than one page', `<p>The ${esc(variant.label.toLowerCase())} runs to ${blob.pages} pages. A quick reference is meant to fit on one page so it can be posted. Shorten the longest lists, then export again.</p>`);
      }
      await saveFile(blob, out.fileName);
    } catch (err) {
      await alertBox('Export failed', `<p>${esc(err.message || err)}</p>`);
    } finally {
      btn.disabled = false; btn.textContent = label;
    }
  };
  $('#export').onclick = (e) => exportPdf(e.currentTarget);
  document.querySelectorAll('[data-variant]').forEach((b) => { b.onclick = () => exportPdf(b, form.variants[+b.dataset.variant]); });
}

// ---------- Settings ----------

async function showSettings() {
  const s = await store.getSettings();
  const prov = {};
  PROVIDER_FIELDS.forEach((f) => { prov[f.id] = s[f.id] ?? f.default ?? ''; });
  app.innerHTML = `
    <header class="bar"><a class="btn" href="#">Documents</a><h1>Settings</h1><span></span></header>
    <main class="home">
      <section class="card">
        <h2>Provider defaults</h2>
        <p class="muted small">Filled into each new document. You can still change them per document.</p>
        <form id="prov" autocomplete="off">${PROVIDER_FIELDS.map((f) => fieldHTML(f, prov)).join('')}
          <button class="primary" type="submit">Save defaults</button> <span id="saved" class="muted small"></span></form>
      </section>
      <section class="card">
        <h2>Exported PDFs</h2>
        <label class="check"><input type="checkbox" id="embedData"${s.embedData === false ? '' : ' checked'}> Include re-import data in exported PDFs</label>
        <p class="muted small">When on, each PDF carries a hidden copy of the document\u2019s answers so it can be uploaded later to link it to another document or keep working on it. It is not shown on any page, and it holds the same information the PDF already shows. Turn it off before exporting a copy you want to contain only what is visible, for example one going to a payer.</p>
      </section>
      <section class="card">
        <h2>Backup</h2>
        <p class="muted small">Backups are encrypted with a passphrase you choose. Without it the file cannot be opened, by you or anyone else, so keep the passphrase somewhere safe.</p>
        <div class="new-list"><button id="backup">Save encrypted backup</button><button id="restore">Restore from backup</button></div>
        <input type="file" id="restoreFile" accept=".abadocs,application/json" hidden>
      </section>
      <section class="card">
        <h2>Remove data</h2>
        <button class="danger" id="wipe">Delete everything on this device</button>
      </section>
    </main>`;

  bindFields($('#prov'), prov, () => { $('#saved').textContent = ''; });
  $('#prov').onsubmit = async (e) => {
    e.preventDefault();
    const next = { ...(await store.getSettings()) };
    PROVIDER_FIELDS.forEach((f) => { next[f.id] = String(prov[f.id] ?? '').trim(); });
    await store.putSettings(next);
    $('#saved').textContent = 'Saved.';
  };

  $('#embedData').onchange = async (e) => {
    const cur = await store.getSettings();
    cur.embedData = e.target.checked;
    await store.putSettings(cur);
  };

  $('#backup').onclick = async () => {
    const d = await dialog(`<h3>Encrypted backup</h3>
      <div class="field"><label>Passphrase</label><input type="password" name="p1" minlength="8" required autocomplete="new-password"></div>
      <div class="field"><label>Confirm passphrase</label><input type="password" name="p2" required autocomplete="new-password"></div>
      <p class="muted small">At least 8 characters.</p>
      <div class="actions"><button value="cancel" formnovalidate>Cancel</button><button value="ok" class="primary">Save backup</button></div>`);
    if (!d) return;
    const p1 = d.querySelector('[name=p1]').value, p2 = d.querySelector('[name=p2]').value;
    if (p1 !== p2) return alertBox('Passphrases do not match', '<p>Nothing was saved.</p>');
    const text = await encryptJSON(await store.exportAll(), p1);
    await saveFile(new Blob([text], { type: 'application/json' }), `aba-docs-backup_${new Date().toISOString().slice(0, 10)}.abadocs`);
  };

  $('#restore').onclick = () => $('#restoreFile').click();
  $('#restoreFile').onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const d = await dialog(`<h3>Restore backup</h3><p>This replaces everything currently on this device.</p>
      <div class="field"><label>Passphrase</label><input type="password" name="p" required></div>
      <div class="actions"><button value="cancel" formnovalidate>Cancel</button><button value="ok" class="danger">Restore</button></div>`);
    if (!d) return;
    try {
      const data = await decryptJSON(await file.text(), d.querySelector('[name=p]').value);
      await store.importAll(data);
      await alertBox('Restored', `<p>${data.docs.length} document${data.docs.length === 1 ? '' : 's'} restored.</p>`);
      location.hash = '';
    } catch (err) {
      alertBox('Could not restore', `<p>${esc(err.message)}</p>`);
    }
  };

  $('#wipe').onclick = async () => {
    if (await confirmBox('Delete everything?', 'All documents and settings will be removed from this device. Make a backup first if you need one.', 'Delete everything')) {
      await store.wipe();
      location.hash = '';
    }
  };
}

// ---------- Start ----------

store.requestPersistence();
route();

const local = ['localhost', '127.0.0.1'].includes(location.hostname);
if ('serviceWorker' in navigator && (!local || location.search.includes('sw'))) {
  navigator.serviceWorker.register('sw.js');
}
