// Option lists shared by several forms. Each option carries the phrase used in
// the document (see the field type notes in bip.js).

export const orList = (a) => (a.length <= 2 ? a.join(' or ') : a.slice(0, -1).join(', ') + ', or ' + a[a.length - 1]);

export const TARGETS = [
  ['Aggression', 'aggression'],
  ['Self-injurious behavior (SIB)', 'self-injurious behavior (SIB)'],
  ['Elopement', 'elopement'],
  ['Property destruction', 'property destruction'],
  ['Tantrum behavior', 'tantrum behavior'],
  ['Disruptive behavior', 'disruptive behavior'],
  ['Verbal aggression', 'verbal aggression'],
  ['Pica', 'pica'],
  ['Motor stereotypy', 'motor stereotypy'],
  ['Vocal stereotypy', 'vocal stereotypy'],
];

export const MEASURES = [
  ['freq', 'Frequency (count)', 'frequency'],
  ['rate', 'Rate per hour', 'rate per hour'],
  ['dur_ep', 'Duration per episode', 'duration per episode'],
  ['dur_tot', 'Total duration per session', 'total duration per session'],
  ['pir', 'Partial interval recording (% of intervals)', 'percentage of intervals (partial interval recording)'],
  ['wir', 'Whole interval recording (% of intervals)', 'percentage of intervals (whole interval recording)'],
  ['mts', 'Momentary time sampling (% of samples)', 'percentage of momentary time samples'],
  ['lat', 'Latency', 'latency'],
  ['int', 'Intensity rating', 'intensity rating'],
  ['opp', 'Percentage of opportunities', 'percentage of opportunities'],
];

export const MEASURE_COMBO = MEASURES.map(([, l, p]) => [l, p]);

export const ASSESSMENTS = [
  ['fai', 'Functional Assessment Interview (FAI)', 'a Functional Assessment Interview (FAI)'],
  ['fast', 'Functional Analysis Screening Tool (FAST)', 'the Functional Analysis Screening Tool (FAST)'],
  ['qabf', 'Questions About Behavioral Function (QABF)', 'the Questions About Behavioral Function (QABF)'],
  ['mas', 'Motivation Assessment Scale (MAS)', 'the Motivation Assessment Scale (MAS)'],
  ['abc_n', 'ABC narrative recording', 'ABC narrative recording'],
  ['abc_c', 'ABC checklist recording', 'ABC checklist recording'],
  ['scatter', 'Scatterplot', 'scatterplot data'],
  ['records', 'Record review', 'a review of records'],
  ['fa', 'Functional analysis (FA)', 'a functional analysis (FA)'],
  ['iisca', 'Interview-informed synthesized contingency analysis (IISCA)', 'an interview-informed synthesized contingency analysis (IISCA)'],
];

export const FUNCTIONS = [
  ['escape', 'Escape / avoidance', 'escape from or avoidance of demands'],
  ['attention', 'Attention', 'access to attention'],
  ['tangible', 'Tangible', 'access to preferred items or activities'],
  ['automatic', 'Automatic', 'automatic reinforcement'],
];

export const MODES = [
  ['vocal', 'Vocal request', 'a vocal request'],
  ['card', 'Picture card / PECS', 'a picture card'],
  ['sign', 'Manual sign', 'a manual sign'],
  ['aac', 'AAC device', 'an AAC device'],
  ['gesture', 'Gesture', 'a gesture'],
];

export const PROCEDURES = [
  ['Functional communication training (FCT)', 'functional communication training (FCT)'],
  ['Discrete trial training (DTT)', 'discrete trial training (DTT)'],
  ['Natural environment teaching (NET)', 'natural environment teaching (NET)'],
  ['Incidental teaching', 'incidental teaching'],
  ['Behavioral skills training (BST)', 'behavioral skills training (BST)'],
  ['Task analysis and chaining', 'task analysis and chaining'],
];

export const PROMPTS = [
  ['fp', 'Full physical', 'full physical'],
  ['pp', 'Partial physical', 'partial physical'],
  ['model', 'Model', 'model'],
  ['gest', 'Gestural', 'gestural'],
  ['vocal', 'Vocal / verbal', 'vocal'],
  ['echoic', 'Echoic', 'echoic'],
  ['visual', 'Visual', 'visual'],
];

export const FADING = [
  ['Most-to-least', 'most-to-least prompt fading'],
  ['Least-to-most', 'least-to-most prompting'],
  ['Constant time delay', 'constant time delay'],
  ['Progressive time delay', 'progressive time delay'],
  ['Graduated guidance', 'graduated guidance'],
  ['Stimulus fading', 'stimulus fading'],
];

export const SCHEDULES = [
  ['Continuous (FR1)', 'a continuous (FR1) schedule'],
  ['Fixed ratio (FR)', 'a fixed-ratio schedule'],
  ['Variable ratio (VR)', 'a variable-ratio schedule'],
  ['Fixed interval (FI)', 'a fixed-interval schedule'],
  ['Variable interval (VI)', 'a variable-interval schedule'],
];

export const THINNING = [
  ['Delay to reinforcement', 'gradually increasing the delay to reinforcement'],
  ['Demand fading', 'demand fading, gradually increasing the work required before reinforcement'],
  ['Chained schedule', 'a chained schedule'],
  ['Multiple schedule (signaled availability)', 'a multiple schedule that signals when reinforcement is and is not available'],
  ['Ratio thinning', 'gradually increasing the ratio requirement'],
];

export const COLLECTORS = [
  ['rbt', 'Assigned RBT', 'the assigned RBT'],
  ['bcba', 'Supervising BCBA', 'the supervising BCBA'],
  ['cg', 'Caregiver', 'the caregiver'],
  ['school', 'School staff', 'school staff'],
];

// In priority order (safety and problem behavior first, Chapter 9).
export const GOAL_AREAS = [
  ['Behavior reduction', 'Behavior reduction'],
  ['Communication', 'Communication'],
  ['Social', 'Social'],
  ['Learning readiness', 'Learning readiness'],
  ['Adaptive / daily living', 'Adaptive / daily living'],
  ['Play and leisure', 'Play and leisure'],
  ['Caregiver training', 'Caregiver training'],
];

// Services in a recommendation or authorization, following the categories of
// the adaptive behavior CPT code set that takes effect January 1, 2027 (the
// BCBA directing the technician and the BCBA treating the client directly are
// separate services). Codes are left to the clinician: they differ by payer
// and change over time.
export const SERVICES = [
  ['Direct treatment by a behavior technician', 'Direct treatment by a behavior technician'],
  ['Technician treatment of harmful behavior', 'Technician treatment of harmful behavior'],
  ['BCBA directing the technician (protocol modification)', 'BCBA directing the technician (protocol modification)'],
  ['Treatment delivered directly by the BCBA', 'Treatment delivered directly by the BCBA'],
  ['BCBA non-face-to-face work (data analysis, protocol revision)', 'BCBA non-face-to-face work (data analysis, protocol revision)'],
  ['Caregiver training', 'Caregiver training'],
  ['Group treatment', 'Group treatment'],
  ['Assessment or reassessment', 'Assessment or reassessment'],
  ['Other', 'Other'],
  // Kept so documents written before the 2027 split still show their entry.
  ['Protocol modification and supervision by the BCBA', 'Protocol modification and supervision by the BCBA (before 2027)'],
];

// ---------- Printable data sheets ----------

export const DS_ID_FIELD = {
  id: 'ds_id', label: 'Identify the client on data sheets by', type: 'select',
  hint: 'Data sheets are handled by many people. Choose the least identifying option that still keeps records straight.',
  options: [['first', 'First name and last initial'], ['initials', 'Initials only'], ['id', 'Client ID only'], ['full', 'Full name']],
};

export function sheetIdentity(d) {
  const name = String(d.client_name || '').trim();
  const parts = name.split(/\s+/).filter(Boolean);
  switch (d.ds_id) {
    case 'full': return name;
    case 'initials': return parts.map((p) => p[0].toUpperCase() + '.').join('');
    case 'id': return d.client_id ? `Client ${d.client_id}` : '';
    default: return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : name;
  }
}

// Prompt codes in the order a hierarchy lists them, e.g. "full physical,
// partial physical, model, gestural, then independent" -> FP, PP, M, G, I.
const PROMPT_CODES = [
  ['full physical', 'FP'], ['partial physical', 'PP'], ['full echoic', 'FE'], ['partial echoic', 'PE'],
  ['full model', 'FM'], ['partial model', 'PM'], ['model', 'M'], ['gestural', 'G'], ['positional', 'POS'],
  ['vocal', 'V'], ['visual', 'VIS'], ['independent', 'I'],
];
export function promptCodes(phrase) {
  // "a full echoic model" is one prompt level, not an echoic plus a model.
  let text = String(phrase || '').toLowerCase().replace(/echoic model/g, 'echoic');
  const found = [];
  for (const [name, code] of PROMPT_CODES) {
    const at = text.indexOf(name);
    if (at >= 0) { found.push({ at, name, code }); text = text.slice(0, at) + ' '.repeat(name.length) + text.slice(at + name.length); }
  }
  const out = found.sort((a, b) => a.at - b.at);
  if (!out.some((p) => p.code === 'I')) out.push({ name: 'independent', code: 'I' });
  return out;
}
