// Text helpers shared by the forms, the preview and the PDF.

// Missing answers are carried through the text as ⟦Label⟧ so the preview can
// highlight them and export can refuse to run while any remain.
export const MARK_OPEN = '⟦';
export const MARK_CLOSE = '⟧';
export const MARK_RE = /⟦([^⟧]*)⟧/g;
export const mark = (label) => MARK_OPEN + label + MARK_CLOSE;
export const hasMark = (s) => typeof s === 'string' && s.includes(MARK_OPEN);

const squash = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// A fragment placed inside a sentence: no trailing period, and a leading
// capital is dropped unless the word looks like an acronym ("FCT", "RBTs").
export function frag(s) {
  let t = squash(s).replace(/[.;,]+$/, '');
  if (t.length > 1 && /[A-Z]/.test(t[0]) && /[a-z]/.test(t[1])) t = t[0].toLowerCase() + t.slice(1);
  return t;
}

export function cap(s) {
  const t = squash(s);
  if (t.startsWith(MARK_OPEN)) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// A complete sentence: capitalised, single closing punctuation.
export function fin(s) {
  let t = cap(s);
  if (!t) return t;
  if (!/[.!?]["')”]?$/.test(t) && !t.endsWith(MARK_CLOSE)) t += '.';
  if (t.endsWith(MARK_CLOSE)) t += '.';
  return t;
}

// Several paragraphs typed into one box stay separate paragraphs.
export const paras = (s) => String(s ?? '').split(/\n\s*\n/).map(squash).filter(Boolean);

export const lines = (s) => String(s ?? '').split(/\n/).map((l) => squash(l).replace(/^[-*•]\s*/, '')).filter(Boolean);

export function joinList(items) {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a.join('');
  if (a.length === 2) return a.join(' and ');
  return a.slice(0, -1).join(', ') + ', and ' + a[a.length - 1];
}

export function fmtDate(iso) {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : iso;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// "request a break" -> "requests a break" (first word only).
export function thirdPerson(phrase) {
  const t = String(phrase ?? '').trim();
  const m = /^(\S+)(.*)$/s.exec(t);
  if (!m) return t;
  const w = m[1];
  const v = /(s|sh|ch|x|z)$/.test(w) ? w + 'es' : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : w + 's';
  return v + m[2];
}

export const orJoin = (a) => (a.length <= 2 ? a.join(' or ') : a.slice(0, -1).join(', ') + ', or ' + a[a.length - 1]);
