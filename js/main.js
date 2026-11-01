import * as store from './store.js';
import { FORMS, formById } from './forms/index.js';
import { CLIENT_FIELDS, PROVIDER_FIELDS, newDocData, buildModel, modelToHTML, allFields } from './engine.js';
import { makePdfBlob } from './pdf.js';
import { encryptJSON, decryptJSON } from './crypto.js';
import { esc, uid, fmtDate } from './util.js';

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

async function showHome() {
  const docs = (await store.listDocs()).sort((a, b) => b.updated - a.updated);
  app.innerHTML = `
    <header class="bar"><h1>ABA Docs</h1><a class="btn" href="#settings">Settings</a></header>
    <main class="home">
      <section class="card">
        <h2>New document</h2>
        <div class="new-list">${FORMS.map((f) => `<button class="primary" data-new="${f.id}">${esc(f.title)}</button>`).join('')}</div>
      </section>
      <section class="card">
        <h2>Documents on this device</h2>
        ${docs.length ? '<ul class="doc-list">' + docs.map((d) => {
          const f = formById(d.form);
          return `<li><a href="#doc/${d.id}"><strong>${esc(f ? f.title : d.form)}</strong><span>${esc(d.data.client_name || 'No client name')} · ${esc(fmtDate(d.data.doc_date))}</span></a>
            <div class="row-actions"><button class="link" data-dup="${d.id}">Duplicate</button><button class="link danger-text" data-del="${d.id}">Delete</button></div></li>`;
        }).join('') + '</ul>' : '<p class="muted">No documents yet.</p>'}
      </section>
      <p class="muted small">Everything you enter stays on this device. This app makes no network connections.</p>
    </main>`;

  app.onclick = async (e) => {
    const t = e.target.closest('button');
    if (!t) return;
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
function gridHTML(f, data) {
  const rows = Array.isArray(data[f.id]) && data[f.id].length ? data[f.id] : [{}];
  if (!Array.isArray(data[f.id]) || !data[f.id].length) data[f.id] = rows;
  const head = f.columns.map((c) => `<th>${esc(c.label)}</th>`).join('') + '<th></th>';
  const body = rows.map((r, i) => '<tr>' + f.columns.map((c) => {
    if (c.calc) return `<td class="calc">${esc(c.calc(r, rows))}</td>`;
    const v = r[c.id] ?? '';
    const at = `data-grid="${f.id}" data-row="${i}" data-col="${c.id}"`;
    if (c.type === 'select') return `<td><select ${at}>${c.options.map(([k, l]) => `<option value="${esc(k)}"${k === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></td>`;
    if (c.type === 'number') return `<td><input type="number" inputmode="numeric" min="0" ${at} value="${esc(v)}"></td>`;
    return `<td><input type="text" ${at} value="${esc(v)}" autocomplete="off"${c.placeholder ? ` placeholder="${esc(c.placeholder)}"` : ''}></td>`;
  }).join('') + `<td><button type="button" class="link danger-text" data-grid-del="${f.id}" data-row="${i}" aria-label="Remove row">✕</button></td></tr>`).join('');
  return `<div class="grid-wrap"><table class="grid"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
    <div class="grid-actions"><button type="button" class="small" data-grid-add="${f.id}">+ Add ${esc(f.rowName || 'row')}</button></div>`;
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
      if (f.columns.some((c) => c.calc)) {
        // Refresh computed cells without rebuilding the inputs being typed in.
        root.querySelectorAll(`[data-gridfield="${f.id}"] tbody tr`).forEach((tr, i) => {
          const cells = tr.querySelectorAll('td');
          f.columns.forEach((c, ci) => { if (c.calc) cells[ci].textContent = c.calc(rows[i], rows); });
        });
      }
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

async function showEditor(id) {
  const doc = await store.getDoc(id);
  if (!doc) { location.hash = ''; return; }
  const form = formById(doc.form);
  doc.overrides = doc.overrides || {};
  let model;

  app.innerHTML = `
    <header class="bar">
      <a class="btn" href="#">Documents</a>
      <h1 class="doc-title">${esc(form.title)}</h1>
      <button class="primary" id="export">Export PDF</button>
    </header>
    <div class="tabs" role="tablist"><button data-tab="form" class="on">Enter</button><button data-tab="preview">Review</button></div>
    <main class="editor" data-show="form">
      <form class="ed-form" autocomplete="off">
        ${groupHTML('Client', CLIENT_FIELDS, doc.data)}
        ${groupHTML('Document', form.dates.map((f) => ({ ...f, type: 'date' })), doc.data, true,
          `<label class="check"><input type="checkbox" id="sig_guardian"${doc.data.sig_guardian ? ' checked' : ''}> Include parent/guardian signature line</label>`)}
        ${groupHTML('Provider', PROVIDER_FIELDS, doc.data, false)}
        ${form.groups.map((g) => groupHTML(g.title, g.fields, doc.data)).join('')}
      </form>
      <div class="ed-preview"><div id="preview"></div></div>
    </main>`;

  const preview = $('#preview');
  const editorEl = $('.editor');

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

  $('#export').onclick = async () => {
    model = buildModel(form, doc);
    if (model.missing.length) {
      await alertBox('Not ready to export', `<p>These items still need an answer:</p><ul class="missing-list">${model.missing.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>`);
      return;
    }
    const stale = model.sections.flatMap((s) => s.blocks).filter((b) => b.stale);
    if (stale.length) {
      await alertBox('Check edited wording', `<p>${stale.length} paragraph${stale.length > 1 ? 's were' : ' was'} edited before later answer changes. On the Review tab, choose "Use updated text" or "keep your wording" for each one, then export.</p>`);
      return;
    }
    const btn = $('#export');
    btn.disabled = true; btn.textContent = 'Building…';
    try {
      const blob = await makePdfBlob(model);
      await saveFile(blob, model.fileName);
    } catch (err) {
      await alertBox('Export failed', `<p>${esc(err.message || err)}</p>`);
    } finally {
      btn.disabled = false; btn.textContent = 'Export PDF';
    }
  };
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
    const next = { ...s };
    PROVIDER_FIELDS.forEach((f) => { next[f.id] = String(prov[f.id] ?? '').trim(); });
    await store.putSettings(next);
    $('#saved').textContent = 'Saved.';
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
