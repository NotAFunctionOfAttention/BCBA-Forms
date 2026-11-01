// Every document type the app can produce. Add a form by writing a file like
// bip.js and listing it here.
import fba from './fba.js';
import bip from './bip.js';
import pref from './preference.js';
import skill from './skill.js';
import visual from './visual.js';
import tx from './treatment-plan.js';
import pr from './progress-report.js';

// Listed in the order they usually come up in a case.
export const FORMS = [fba, pref, bip, skill, tx, visual, pr];
export const formById = (id) => FORMS.find((f) => f.id === id);
