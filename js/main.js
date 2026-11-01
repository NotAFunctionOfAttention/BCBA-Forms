import * as store from './store.js';
import { FORMS, formById } from './forms/index.js';
import { CLIENT_FIELDS, PROVIDER_FIELDS, newDocData, buildModel, modelToHTML } from './engine.js';
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

function fieldHTML(f, value) {
  const id = 'f_' + f.id;
  const hint = f.hint ? `<small class="hint">${esc(f.hint)}</small>` : '';
  const opt = f.optional ? ' <span class="muted">(optional)</span>' : '';
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
      input = `<select id="${id}" data-id="${f.id}">${f.options.map(([k, l]) => `<option value="${k}"${k === value ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
      break;
    case 'checks': {
      const set = new Set(Array.isArray(value) ? value : []);
      return `<fieldset class="field checks" data-checks="${f.id}"><legend>${esc(f.label)}</legend>${f.options.map(([k, l]) =>
        `<label class="check"><input type="checkbox" value="${k}"${set.has(k) ? ' checked' : ''}> ${esc(l)}</label>`).join('')}</fieldset>`;
    }
    default:
      input = `<input type="text" id="${id}" data-id="${f.id}" value="${esc(value)}" autocomplete="off">`;
  }
  return `<div class="field"><label for="${id}">${esc(f.label)}${opt}</label>${hint}${input}</div>`;
}

function groupHTML(title, fields, data, open = true, extra = '') {
  return `<details class="group"${open ? ' open' : ''}><summary>${esc(title)}</summary>${fields.map((f) => fieldHTML(f, data[f.id] ?? '')).join('')}${extra}</details>`;
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
  formEl.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'sig_guardian') doc.data.sig_guardian = t.checked;
    else if (t.dataset.id) doc.data[t.dataset.id] = t.value;
    else {
      const fs = t.closest('[data-checks]');
      if (fs) doc.data[fs.dataset.checks] = [...fs.querySelectorAll('input:checked')].map((i) => i.value);
    }
    save(); soon();
  });
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
  app.innerHTML = `
    <header class="bar"><a class="btn" href="#">Documents</a><h1>Settings</h1><span></span></header>
    <main class="home">
      <section class="card">
        <h2>Provider defaults</h2>
        <p class="muted small">Filled into each new document. You can still change them per document.</p>
        <form id="prov" autocomplete="off">${PROVIDER_FIELDS.map((f) => fieldHTML(f, s[f.id] ?? f.default ?? '')).join('')}
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

  $('#prov').onsubmit = async (e) => {
    e.preventDefault();
    const next = { ...s };
    PROVIDER_FIELDS.forEach((f) => { next[f.id] = $('#f_' + f.id).value.trim(); });
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
