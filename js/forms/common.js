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
  ['Noncompliance', 'noncompliance'],
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

// Services in a recommendation or authorization. Codes are left to the
// clinician: they differ by payer and change over time.
export const SERVICES = [
  ['Direct treatment by a behavior technician', 'Direct treatment by a behavior technician'],
  ['Protocol modification and supervision by the BCBA', 'Protocol modification and supervision by the BCBA'],
  ['Caregiver training', 'Caregiver training'],
  ['Group treatment', 'Group treatment'],
  ['Assessment or reassessment', 'Assessment or reassessment'],
  ['Other', 'Other'],
];
