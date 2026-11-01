// On-device storage (IndexedDB). Nothing here touches the network.

const DB_NAME = 'aba-docs';
let dbp;

function db() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('docs', { keyPath: 'id' });
        req.result.createObjectStore('kv');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbp;
}

async function tx(store, mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(store, mode);
    const s = t.objectStore(store);
    let out;
    Promise.resolve(fn(s)).then((r) => { out = r; });
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
  });
}

const wrap = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });

export const listDocs = () => tx('docs', 'readonly', (s) => wrap(s.getAll()));
export const getDoc = (id) => tx('docs', 'readonly', (s) => wrap(s.get(id)));
export const putDoc = (doc) => tx('docs', 'readwrite', (s) => { s.put(doc); });
export const deleteDoc = (id) => tx('docs', 'readwrite', (s) => { s.delete(id); });

export async function getSettings() {
  return (await tx('kv', 'readonly', (s) => wrap(s.get('settings')))) || {};
}
export const putSettings = (v) => tx('kv', 'readwrite', (s) => { s.put(v, 'settings'); });

export async function exportAll() {
  return { app: 'aba-docs', version: 1, exported: new Date().toISOString(), settings: await getSettings(), docs: await listDocs() };
}

export async function importAll(data) {
  if (!data || data.app !== 'aba-docs' || !Array.isArray(data.docs)) throw new Error('This file is not an ABA Docs backup.');
  await wipe();
  await putSettings(data.settings || {});
  await tx('docs', 'readwrite', (s) => { data.docs.forEach((d) => s.put(d)); });
}

export async function wipe() {
  await tx('docs', 'readwrite', (s) => { s.clear(); });
  await tx('kv', 'readwrite', (s) => { s.clear(); });
}

// Ask the browser not to evict our data under storage pressure.
export function requestPersistence() {
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
