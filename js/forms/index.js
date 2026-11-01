// Every document type the app can produce. Add a form by writing a file like
// bip.js and listing it here.
import fba from './fba.js';
import bip from './bip.js';
import pref from './preference.js';
import skill from './skill.js';
import visual from './visual.js';
import tx from './treatment-plan.js';
import pr from './progress-report.js';
import fa from './fa.js';
import crisis from './crisis.js';
import intake from './intake.js';
import sa from './skill-assessment.js';
import cg from './caregiver.js';
import dc from './discharge.js';

import { skillSheet, bipSheet, abcSheet, prefSheet, sheetGroup } from './datasheets.js';

// Printable data sheets, each with its print settings at the end of the form.
const attachSheet = (form, sheet, extra) => {
  form.variants = [...(form.variants || []), sheet];
  form.groups.push(sheetGroup(extra));
};
attachSheet(skill, skillSheet, [{ id: 'ds_cols', label: 'Trials or sessions per sheet', type: 'number', default: 10, hint: 'Trial columns for trial-by-trial data; session columns for first-trial, probe and task analysis data.' }]);
attachSheet(bip, bipSheet, [
  { id: 'ds_rows', label: 'Sessions per sheet (event recording)', type: 'number', default: 10 },
  { id: 'ds_interval', label: 'Interval length in seconds (interval recording)', type: 'number', default: 10 },
  { id: 'ds_intervals', label: 'Number of intervals (interval recording)', type: 'number', default: 60 },
]);
attachSheet(fba, abcSheet, [{ id: 'ds_rows', label: 'Episodes per sheet', type: 'number', default: 8 }]);
attachSheet(pref, prefSheet, []);

// Listed in the order they usually come up in a case, grouped by stage for
// the home page.
export const STAGES = [
  ['Intake and assessment', [intake, fba, fa, pref, sa]],
  ['Planning', [tx, bip, crisis, skill, cg]],
  ['Progress and discharge', [visual, pr, dc]],
];
export const FORMS = STAGES.flatMap(([, forms]) => forms);
export const formById = (id) => FORMS.find((f) => f.id === id);
