// Passphrase-encrypted backups (AES-GCM, key from PBKDF2-SHA256).
// A backup file is unreadable without the passphrase, so it is safe even if
// the folder it lands in syncs to a cloud service.

const ITER = 310000;
const enc = new TextEncoder();
const dec = new TextDecoder();

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function keyFrom(pass, salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptJSON(obj, pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFrom(pass, salt);
  // Chunked base64 so large backups don't overflow the call stack.
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj))));
  let bin = '';
  for (let i = 0; i < ct.length; i += 0x8000) bin += String.fromCharCode(...ct.subarray(i, i + 0x8000));
  return JSON.stringify({ format: 'aba-docs-encrypted', v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), data: btoa(bin) });
}

export async function decryptJSON(text, pass) {
  let wrapper;
  try { wrapper = JSON.parse(text); } catch { throw new Error('This file is not an ABA Docs backup.'); }
  if (wrapper.format !== 'aba-docs-encrypted') throw new Error('This file is not an ABA Docs backup.');
  const key = await keyFrom(pass, unb64(wrapper.salt));
  let pt;
  try {
    pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(wrapper.iv) }, key, unb64(wrapper.data));
  } catch {
    throw new Error('Wrong passphrase, or the file is damaged.');
  }
  return JSON.parse(dec.decode(pt));
}
