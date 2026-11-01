// Every document type the app can produce. Add a form by writing a file like
// bip.js and listing it here.
import bip from './bip.js';

export const FORMS = [bip];
export const formById = (id) => FORMS.find((f) => f.id === id);
