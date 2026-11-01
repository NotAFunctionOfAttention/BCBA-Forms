// Every document type the app can produce. Add a form by writing a file like
// bip.js and listing it here.
import fba from './fba.js';
import bip from './bip.js';
import pref from './preference.js';
import skill from './skill.js';
import visual from './visual.js';

export const FORMS = [fba, bip, pref, skill, visual];
export const formById = (id) => FORMS.find((f) => f.id === id);
