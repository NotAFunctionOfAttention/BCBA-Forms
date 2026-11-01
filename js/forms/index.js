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

// Listed in the order they usually come up in a case, grouped by stage for
// the home page.
export const STAGES = [
  ['Intake and assessment', [intake, fba, fa, pref, sa]],
  ['Planning', [tx, bip, crisis, skill, cg]],
  ['Progress and discharge', [visual, pr, dc]],
];
export const FORMS = STAGES.flatMap(([, forms]) => forms);
export const formById = (id) => FORMS.find((f) => f.id === id);
