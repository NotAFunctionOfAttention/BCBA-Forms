// Intake Summary and Assessment Plan, following Chapter 4 of the clinic
// manual: screening for fit, history, the family's concerns in their own
// words, a typical day, problem behavior, safety, health, strengths and
// preferences, prior services, family context, observation, consent and
// releases, interim safety recommendations, and the assessment plan.
// Field types and suggestion conventions are described at the top of bip.js.

import { cap, frag, fin, joinList, lines, fmtDate, mark } from '../util.js';

const SAFETY = [
  ['elopement', 'Running away (elopement)', 'running away (elopement)'],
  ['pica', 'Eating non-food items (pica)', 'eating non-food items (pica)'],
  ['sib', 'Self-injury', 'self-injury'],
  ['sibling', 'Aggression toward siblings', 'aggression toward siblings'],
  ['climbing', 'Climbing', 'climbing to unsafe heights'],
  ['water', 'Water', 'unsupervised access to water'],
];
const INTERIM = {
  elopement: ['Door alarms or locks on exterior doors at home', 'An adult holds the child’s hand in parking lots and near streets'],
  pica: ['Small objects and toxic items kept out of reach', 'Close supervision during play on the floor'],
  sib: ['Consultation with the child’s physician about injuries', 'Soft surfaces available where head-hitting occurs'],
  sibling: ['The younger sibling is not left alone with the child'],
  climbing: ['Tall furniture anchored to the wall'],
  water: ['Pool and bathroom doors kept closed and latched', 'Constant adult supervision near water'],
};
const HEALTH = [
  ['sleep', 'Sleep problems', 'sleep problems'],
  ['feeding', 'Restricted eating', 'restricted eating'],
  ['gi', 'Constipation or stomach problems', 'constipation or other stomach problems'],
  ['toilet', 'Not yet toilet trained', 'not yet toilet trained'],
  ['seizures', 'Seizures', 'a history of seizures'],
  ['allergies', 'Allergies', 'allergies'],
  ['meds', 'Current medications', 'current medications'],
  ['illness', 'Recent illness', 'recent illness'],
  ['pain', 'Possible pain behaviors', 'behaviors that may signal pain'],
];
const PLAN = [
  ['fba', 'Functional behavior assessment', 'a functional behavior assessment of the problem behaviors'],
  ['pref', 'Preference assessment', 'a preference assessment'],
  ['vbmapp', 'VB-MAPP', 'the VB-MAPP'],
  ['ablls', 'ABLLS-R', 'the ABLLS-R'],
  ['afls', 'AFLS', 'the AFLS'],
  ['peak', 'PEAK', 'PEAK'],
  ['efl', 'Essential for Living', 'Essential for Living'],
  ['vineland', 'Vineland Adaptive Behavior Scales', 'the Vineland Adaptive Behavior Scales'],
  ['obs', 'Direct observation at home or school', 'direct observation at home or school'],
];
const PROVIDERS = [
  ['ped', 'Pediatrician', 'the pediatrician'],
  ['devped', 'Developmental pediatrician', 'the developmental pediatrician'],
  ['slp', 'Speech-language pathologist', 'the speech-language pathologist'],
  ['ot', 'Occupational therapist', 'the occupational therapist'],
  ['school', 'School or preschool', 'the school or preschool'],
  ['ei', 'Early intervention program', 'the early intervention program'],
  ['prior', 'Previous ABA provider', 'the previous ABA provider'],
];
const firstName = (d) => String(d.client_name || '').trim().split(/\s+/)[0] || 'The client';

export default {
  id: 'intake',
  title: 'Intake Summary and Assessment Plan',
  fileTag: 'Intake',
  dates: [
    { id: 'doc_date', label: 'Date of report', required: true },
    { id: 'in_interview', label: 'Date of caregiver interview' },
  ],
  guardianSignature: false,

  next: [
    {
      to: 'fba', label: 'Start an FBA from this intake',
      carries: 'the first problem behavior, records reviewed and informants',
      map: (d) => {
        const pb = (Array.isArray(d.in_behaviors) ? d.in_behaviors : []).find((r) => String(r.behavior || '').trim());
        return {
          tb_name: pb ? frag(pb.behavior) : '',
          records: (d.in_releases || []).length ? ['evals'] : [],
          informants: ['cg'],
          setting_events: String(d.in_health_notes || '').trim(),
        };
      },
    },
    {
      to: 'pref', label: 'Start a preference assessment from this intake',
      carries: 'the preferences the family named, as items to assess',
      map: (d) => ({
        pa_reason: 'the client is new to services and preferences were not yet known',
        pa_sources: ['cg'],
        pa_results: lines(d.in_prefs).slice(0, 8).map((item) => ({ item: frag(item) })),
      }),
    },
    {
      to: 'tx', label: 'Start a treatment plan from this intake',
      carries: 'background, the family’s concerns, and coordination of care',
      map: (d) => ({
        tp_background: [d.in_dx_by ? `${firstName(d)} was diagnosed by ${frag(d.in_dx_by)}.` : '', String(d.in_family || '').trim(), String(d.in_prior || '').trim()].filter(Boolean).join('\n\n'),
        tp_referral: lines(d.in_concerns).length ? `The family’s main concerns, in their words: ${lines(d.in_concerns).map((c) => `“${cap(frag(c))}”`).join('; ')}.` : '',
        tp_assessments: ['interview', 'records', 'observation'],
        // The treatment plan uses the same keys for these providers.
        tp_coord: (d.in_releases || []).filter((k) => ['ped', 'devped', 'slp', 'ot', 'school', 'ei'].includes(k)),
      }),
    },
  ],

  groups: [
    {
      title: 'Referral and screening',
      fields: [
        { id: 'in_source', label: 'Referred by', type: 'combo', options: [['Developmental pediatrician', 'a developmental pediatrician'], ['Pediatrician', 'the child’s pediatrician'], ['School or preschool', 'the child’s school'], ['Early intervention program', 'the early intervention program'], ['Family (self-referral)', 'the family']] },
        { id: 'in_dx_by', label: 'Diagnosis made by', hint: 'Completes "…was diagnosed by". e.g. a developmental pediatrician at 3 years 2 months' },
        {
          id: 'in_fit', label: 'Screening for fit', type: 'multi', hint: 'Tick each that applies. If any do not, consider a helpful referral elsewhere.',
          options: [
            ['population', 'Within the population the clinic serves', 'the child is within the population the clinic serves'],
            ['scope', 'Concerns are within the scope of ABA', 'the concerns are within the scope of behavior analysis'],
            ['payer', 'Payer covers ABA for this child', 'the payer covers ABA services for this child'],
            ['competence', 'Team has the competence needed', 'the team has the competence the concerns require'],
          ],
        },
        { id: 'in_informants', label: 'Interviewed', type: 'multi', other: true, options: [['mother', 'Mother', 'the mother'], ['father', 'Father', 'the father'], ['grand', 'Grandparent', 'a grandparent'], ['other_cg', 'Other caregiver', 'another caregiver'], ['teacher', 'Teacher', 'the teacher']] },
        { id: 'in_interpreter', label: 'Interpreter', type: 'combo', options: [['Not needed', 'No interpreter was needed.'], ['Qualified interpreter used', 'A qualified interpreter was used for the interview.']], hint: 'If one was needed, note the language using Other. Do not use a family member or sibling as an interpreter.' },
      ],
    },
    {
      title: 'Family concerns',
      fields: [
        { id: 'in_concerns', label: 'Concerns, in the family’s words, most important first', type: 'list', hint: 'One per line. Write their words, not your interpretation. e.g. He hits when we leave the park' },
        { id: 'in_outcome', label: 'What a good outcome would look like to them', type: 'textarea', hint: 'Full sentences, in their words where possible.' },
      ],
    },
    {
      title: 'Daily routine and communication',
      fields: [
        { id: 'in_day', label: 'A typical day', type: 'textarea', hint: 'Wake-up to bedtime: meals, transitions, outings, and who is with the child when. Full sentences.' },
        {
          id: 'in_comm', label: 'How the child communicates', type: 'textarea', hint: 'Wants, refusals, and pain. Full sentences.',
          suggest: (d) => [
            `${firstName(d)} uses about 10 single words or word approximations, mostly for foods and favorite toys.`,
            `When ${firstName(d)} wants something he cannot name, he leads an adult by the hand to it.`,
            `${firstName(d)} communicates refusal by crying or dropping to the floor.`,
            `Caregivers are not always able to tell when ${firstName(d)} is hurt or unwell.`,
          ],
        },
      ],
    },
    {
      title: 'Problem behavior',
      fields: [
        {
          id: 'in_behaviors', label: 'Problem behaviors reported', type: 'grid', layout: 'cards', rowName: 'behavior', optional: true,
          hint: 'One card per behavior, as the family describes it. Leave blank if none were reported.',
          columns: [
            { id: 'behavior', label: 'Behavior', placeholder: 'e.g. hitting and scratching' },
            { id: 'looks', label: 'What it looks like', type: 'textarea', rows: 2 },
            { id: 'freq', label: 'How often, how long, how intense', placeholder: 'e.g. 3 to 5 times a day, under a minute' },
            { id: 'when', label: 'Most and least likely when', type: 'textarea', rows: 2 },
            { id: 'after', label: 'What people usually do afterward', type: 'textarea', rows: 2 },
            { id: 'injury', label: 'Injuries', placeholder: 'e.g. scratches to the mother’s arms; no medical care needed' },
          ],
        },
      ],
    },
    {
      title: 'Safety',
      fields: [
        { id: 'in_safety', label: 'Safety concerns reported', type: 'multi', optional: true, other: true, options: SAFETY, hint: 'Ask about each directly. Leave all unticked if none.' },
        { id: 'in_interim', label: 'Interim safety recommendations', type: 'list', optional: true, hint: 'Precautions to start now, before assessment is finished. Suggestions follow the concerns ticked.', suggest: (d) => (d.in_safety || []).flatMap((k) => INTERIM[k] || []) },
      ],
    },
    {
      title: 'Health',
      fields: [
        { id: 'in_health', label: 'Health areas with concerns', type: 'multi', optional: true, other: true, options: HEALTH, hint: 'Ask about sleep, eating, toileting, medications, allergies, seizures, recent illness and pain. Leave unticked if none.' },
        { id: 'in_health_notes', label: 'Health details', type: 'textarea', optional: true, hint: 'Optional. Details and anything that could produce or worsen problem behavior. Full sentences.' },
        { id: 'in_medical', label: 'Medical follow-up', type: 'select', options: [['none', 'No medical referral needed at this time'], ['refer', 'Referred to the physician before or during assessment']] },
      ],
    },
    {
      title: 'Strengths, preferences and history',
      fields: [
        { id: 'in_strengths', label: 'Skills and strengths', type: 'list', hint: 'What the child does well and enjoys. One per line.' },
        { id: 'in_prefs', label: 'Preferences', type: 'list', hint: 'Favorite foods, toys, activities, people and shows. One per line. These become items for the preference assessment.' },
        { id: 'in_prior', label: 'Prior services and the family’s view of them', type: 'textarea', optional: true, hint: 'Optional. Full sentences.' },
        { id: 'in_family', label: 'Family context', type: 'textarea', hint: 'Household, languages, caregiving arrangements, and values relevant to goals. Full sentences.' },
      ],
    },
    {
      title: 'Observation and impressions',
      fields: [
        { id: 'in_obs', label: 'Observation of the child', type: 'textarea', hint: 'How the child explored, responded to you, communicated, and what he gravitated toward. Full sentences.' },
        { id: 'in_impressions', label: 'Initial impressions', type: 'textarea', hint: 'Tentative; recommendations wait for assessment data. Full sentences.' },
      ],
    },
    {
      title: 'Consent, releases and assessment plan',
      fields: [
        { id: 'in_consent_date', label: 'Date written consent for assessment was obtained', type: 'date' },
        { id: 'in_releases', label: 'Releases of information obtained for', type: 'multi', optional: true, other: true, options: PROVIDERS },
        { id: 'in_plan', label: 'Planned assessments', type: 'multi', other: true, options: PLAN },
        {
          id: 'in_plan_why', label: 'Why these assessments', type: 'textarea', hint: 'Full sentences.',
          suggest: [
            'A functional behavior assessment will identify what maintains the problem behaviors so treatment can address their function.',
            'A preference assessment will identify reinforcers for teaching.',
            'A skill assessment will identify strengths, deficits, and barriers across communication, social, and adaptive skills to guide goal selection.',
            'The payer requires a norm-referenced adaptive measure.',
          ],
        },
        { id: 'in_plan_hours', label: 'Assessment hours requested', hint: 'e.g. 8 hours over 3 weeks' },
      ],
    },
  ],

  build(v, c) {
    const behaviors = v.rows('in_behaviors').filter((r) => String(r.behavior || '').trim());
    const safety = v.multi('in_safety', { optional: true });
    const interim = v.list('in_interim').filter((x) => !x.startsWith('⟦'));
    const health = v.multi('in_health', { optional: true });
    const fit = v.multi('in_fit', { optional: true });
    const releases = v.multi('in_releases', { optional: true });
    const consent = v.raw('in_consent_date');
    const para = (id, key, optional) => v.paras(id, { optional }).map((t, i) => ({ type: 'p', key: key + i, text: fin(t) }));
    const interp = v.opt('in_interpreter');

    return [
      {
        heading: 'Referral',
        blocks: [
          { type: 'p', key: 'ref', text: `${cap(c.client)} was referred by ${frag(v.t('in_source'))} and was diagnosed by ${frag(v.t('in_dx_by'))}. Information was gathered from ${joinList(v.multi('in_informants'))} through a caregiver interview${v.raw('in_interview') ? ` on ${fmtDate(v.raw('in_interview'))}` : ''}, a review of records, and observation.${interp ? ' ' + fin(interp) : ''}` },
          { type: 'p', key: 'fit', text: fit.length ? `The referral was screened for fit: ${joinList(fit)}.` : 'The referral was screened for fit with the clinic’s population, scope, payer coverage, and competence.' },
        ],
      },
      {
        heading: 'Family Concerns',
        blocks: [
          { type: 'p', key: 'cintro', text: 'The family described their concerns as follows, most important first:' },
          { type: 'ol', items: v.list('in_concerns').map((c) => (c.startsWith('⟦') ? c : `“${fin(c)}”`)) },
          ...para('in_outcome', 'outcome'),
        ],
      },
      { heading: 'Daily Routine and Communication', blocks: [...para('in_day', 'day'), ...para('in_comm', 'comm')] },
      {
        heading: 'Problem Behavior',
        blocks: behaviors.length ? behaviors.flatMap((r) => [
          { type: 'sub', text: cap(frag(r.behavior)) },
          ...(String(r.looks || '').trim() ? [{ type: 'p', text: fin(r.looks) }] : []),
          { type: 'dl', wide: true, rows: [['How often', r.freq ? fin(r.freq) : '—'], ['When', r.when ? fin(r.when) : '—'], ['Usual response', r.after ? fin(r.after) : '—'], ['Injuries', r.injury ? fin(r.injury) : 'None reported.']] },
        ]) : [{ type: 'p', key: 'nopb', text: 'No problem behavior was reported.' }],
      },
      {
        heading: 'Safety',
        blocks: [
          { type: 'p', key: 'safety', text: safety.length ? `The family reported the following safety concerns: ${joinList(safety)}.` : 'The family was asked about running away, eating non-food items, self-injury, aggression toward siblings, climbing, and water. No safety concerns were reported.' },
          ...(interim.length ? [{ type: 'p', key: 'interim', text: 'Interim safety recommendations, to begin now:' }, { type: 'ul', items: interim.map(fin) }] : []),
        ],
      },
      {
        heading: 'Health',
        blocks: [
          { type: 'p', key: 'health', text: health.length ? `Health areas with concerns: ${joinList(health)}.` : 'Sleep, eating, toileting, medications, allergies, seizures, recent illness, and pain behaviors were reviewed, and no concerns were reported.' },
          ...para('in_health_notes', 'hn', true),
          { type: 'p', key: 'med', text: v.raw('in_medical') === 'refer' ? 'The family was referred to the child’s physician to review possible medical contributors before or during assessment.' : 'No medical referral is needed at this time.' },
        ],
      },
      {
        heading: 'Strengths and Preferences',
        blocks: [
          { type: 'sub', text: 'Strengths' },
          { type: 'ul', items: v.list('in_strengths').map(fin) },
          { type: 'sub', text: 'Preferences' },
          { type: 'p', key: 'prefs', text: `${cap(joinList(v.list('in_prefs').map(frag)))}.` },
        ],
      },
      { heading: 'Prior Services and Family Context', blocks: [...para('in_prior', 'prior', true), ...para('in_family', 'family')] },
      { heading: 'Observation and Initial Impressions', blocks: [...para('in_obs', 'obs'), ...para('in_impressions', 'imp')] },
      {
        heading: 'Consent and Releases',
        blocks: [
          { type: 'p', key: 'consent', text: consent ? `Written consent for assessment was obtained on ${fmtDate(consent)}.` : mark('Date written consent for assessment was obtained') },
          { type: 'p', key: 'rel', text: releases.length ? `Releases of information were obtained for ${joinList(releases)}.` : 'No releases of information were needed at this time.' },
        ],
      },
      {
        heading: 'Assessment Plan',
        blocks: [
          { type: 'p', key: 'plan', text: `The assessment will include ${joinList(v.multi('in_plan'))}, requiring ${frag(v.t('in_plan_hours'))}.` },
          ...para('in_plan_why', 'why'),
        ],
      },
    ];
  },
};
