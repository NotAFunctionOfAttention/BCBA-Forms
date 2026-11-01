// Treatment Plan, following the contents in Chapter 9 of the clinic manual:
// background and referral, assessment summary, goals grouped by area, BIP and
// crisis plan, caregiver training, coordination of care, service
// recommendation with justification, generalization, and discharge criteria.
// Field types and suggestion conventions are described at the top of bip.js.

import { cap, frag, fin, joinList, lines, fmtDate, mark } from '../util.js';
import { GOAL_AREAS, SERVICES, FUNCTIONS } from './common.js';
import { PROGRAMS } from './skill.js';

const ASSESSMENTS = [
  ['interview', 'Caregiver interview', 'a caregiver interview'],
  ['records', 'Record review', 'a review of records'],
  ['observation', 'Direct observation', 'direct observation'],
  ['fba', 'Functional behavior assessment', 'a functional behavior assessment'],
  ['fa', 'Functional analysis', 'a functional analysis'],
  ['pref', 'Preference assessment', 'a preference assessment'],
  ['vbmapp', 'VB-MAPP', 'the VB-MAPP'],
  ['ablls', 'ABLLS-R', 'the ABLLS-R'],
  ['afls', 'AFLS', 'the AFLS'],
  ['peak', 'PEAK', 'PEAK'],
  ['efl', 'Essential for Living', 'Essential for Living'],
  ['vineland', 'Vineland Adaptive Behavior Scales', 'the Vineland Adaptive Behavior Scales'],
];

const COORD = [
  ['slp', 'Speech-language pathologist', 'the speech-language pathologist'],
  ['ot', 'Occupational therapist', 'the occupational therapist'],
  ['ped', 'Pediatrician', 'the pediatrician'],
  ['devped', 'Developmental pediatrician', 'the developmental pediatrician'],
  ['school', 'School or preschool staff', 'school staff'],
  ['psych', 'Psychologist or psychiatrist', 'the psychologist or psychiatrist'],
  ['ei', 'Early intervention provider', 'the early intervention provider'],
];

const STATUS_CARRY = new Set(['progressing', 'not progressing', 'new']);
const firstName = (d) => String(d.client_name || '').trim().split(/\s+/)[0] || 'The client';
const PROGRAM_AREA = {
  'tacting common items': 'Communication', 'manding for preferred items': 'Communication', echoics: 'Communication', 'intraverbal fill-ins': 'Communication',
  'receptive identification of items': 'Learning readiness', 'motor imitation': 'Learning readiness', 'following one-step instructions': 'Learning readiness', 'matching identical items': 'Learning readiness',
  handwashing: 'Adaptive / daily living', toothbrushing: 'Adaptive / daily living', 'waiting for preferred items': 'Social',
};
const total = (rows) => (Array.isArray(rows) ? rows : []).reduce((n, r) => n + (Number(r.hours) || 0), 0);

export default {
  id: 'tx',
  title: 'Treatment Plan',
  fileTag: 'TreatmentPlan',
  dates: [
    { id: 'doc_date', label: 'Date of plan', required: true },
    { id: 'auth_start', label: 'Plan period start' },
    { id: 'auth_end', label: 'Plan period end' },
  ],
  guardianSignature: true,
  period: { start: 'auth_start', end: 'auth_end', label: 'Plan period' },

  // Documents that can feed this one (see js/links.js).
  from: [
    {
      from: 'fba', label: 'Start a treatment plan from this FBA',
      carries: 'hypothesis statement and the assessments used',
      map: (d) => {
        const fns = FUNCTIONS.filter(([k]) => (d.fn_functions || []).includes(k)).map((o) => o[2]);
        const assess = ['fba', 'observation'];
        if ((d.indirect || []).length) assess.push('interview');
        if ((d.records || []).length) assess.push('records');
        return {
          tp_assessments: assess,
          tp_fba_summary: d.tb_name && d.hyp_ante && d.hyp_conseq
            ? `A functional behavior assessment${d.doc_date ? ' dated ' + fmtDate(d.doc_date) : ''} found that when ${frag(d.hyp_ante)}, ${firstName(d)} engages in ${frag(d.tb_name)}, which results in ${frag(d.hyp_conseq)}.${fns.length ? ` ${cap(frag(d.tb_name))} is hypothesized to be maintained by ${joinList(fns)}.` : ''}`
            : '',
          tp_referral: String(d.referral || '').trim() ? `The referral question was: ${String(d.referral).trim()}` : '',
        };
      },
    },
    {
      from: 'pref', multiple: true, label: 'Start a treatment plan using this assessment',
      carries: 'preferred items and assessment dates',
      map: (list) => {
        const items = [...new Set(list.flatMap((d) => (Array.isArray(d.pa_results) ? d.pa_results : [])
          .filter((r) => Number(r.avail) > 0 && Number(r.sel) / Number(r.avail) >= 0.67).map((r) => String(r.item).trim())))];
        const dates = [...new Set(list.map((d) => d.assess_date || d.doc_date).filter(Boolean))].map(fmtDate);
        return {
          tp_assessments: ['pref'],
          tp_pref_summary: items.length ? `Preference ${dates.length > 1 ? 'assessments' : 'assessment'}${dates.length ? ' dated ' + joinList(dates) : ''} identified ${joinList(items)} as highly preferred. These items will be used as reinforcers and reassessed regularly.` : '',
        };
      },
    },
    {
      from: 'bip', label: 'Start a treatment plan from this BIP',
      carries: 'BIP summary, crisis plan status, and the BIP’s goals',
      map: (d) => {
        const name = frag(d.tb_name || '');
        const fns = FUNCTIONS.filter(([k]) => (d.fn_functions || []).includes(k)).map((o) => o[2]);
        const strategies = lines(d.ant_strats).map(frag);
        const goals = lines(d.goals).map((g) => ({
          area: name && g.toLowerCase().includes(name.toLowerCase()) ? 'Behavior reduction' : 'Communication',
          goal: fin(g),
          baseline: name && g.toLowerCase().includes(name.toLowerCase()) && d.bl_value ? frag(d.bl_value) : '',
        }));
        return {
          tp_bip: 'attached',
          tp_bip_summary: name ? [
            `A behavior intervention plan${d.doc_date ? ' dated ' + fmtDate(d.doc_date) : ''} addresses ${name}${fns.length ? `, hypothesized to be maintained by ${joinList(fns)}` : ''}.`,
            d.replacement ? `${firstName(d)} will be taught to ${frag(d.replacement)}${d.teach_proc ? ` through ${frag(d.teach_proc)}` : ''}.` : '',
            strategies.length ? `Antecedent strategies include ${joinList(strategies.map((x) => x.charAt(0).toLowerCase() + x.slice(1)))}.` : '',
          ].filter(Boolean).join(' ') : '',
          tp_crisis: d.safety === 'protocol' ? 'separate' : 'none',
          tp_goals: goals,
        };
      },
    },
    {
      from: 'skill', multiple: true, label: 'Start a treatment plan from this program',
      carries: 'a goal for each program, with its baseline and mastery criterion',
      map: (list) => ({
        tp_goals: list.map((d) => {
          const key = String(d.sk_name || '').trim();
          const p = PROGRAMS[key];
          const label = p ? p.label : cap(frag(key));
          const n = lines(d.sk_targets).length;
          return {
            area: PROGRAM_AREA[key] || '',
            goal: d.sk_def ? `${label}: ${firstName(d)} ${frag(d.sk_def)}${n ? `, across ${n} targets` : ''}${d.sk_mastery ? `, at ${frag(d.sk_mastery)}` : ''}.` : label,
            baseline: d.sk_baseline ? frag(d.sk_baseline) : '',
          };
        }),
      }),
    },
    {
      from: 'pr', label: 'Start the revised treatment plan from this report',
      carries: 'goals still in progress (with current levels as new baselines), new goals, and the service recommendation',
      map: (d) => ({
        tp_goals: [
          ...(Array.isArray(d.pr_goals) ? d.pr_goals : []).filter((r) => r.goal && STATUS_CARRY.has(r.status || 'progressing'))
            .map((r) => ({ area: r.area || '', goal: r.goal, baseline: r.current || r.baseline || '' })),
          ...lines(d.pr_next_goals).map((g) => ({ area: '', goal: fin(g), baseline: '' })),
        ],
        tp_type: d.pr_type,
        tp_services: Array.isArray(d.pr_recommend) ? d.pr_recommend.filter((r) => r.service) : [],
        tp_justification: d.pr_justification,
      }),
    },
  ],

  groups: [
    {
      title: 'Background and reason for referral',
      fields: [
        {
          id: 'tp_background', label: 'Background', type: 'textarea', combine: 'paragraphs', hint: 'Diagnosis history, prior services, family and language, school or daycare. Full sentences.',
          suggest: (d) => [
            `${firstName(d)} was diagnosed with autism spectrum disorder by a developmental pediatrician.`,
            `${firstName(d)} has not previously received ABA services.`,
            `${firstName(d)} previously received ABA services from another provider.`,
            `${firstName(d)} lives with both parents and a younger sibling.`,
            `${firstName(d)} attends a preschool program in the mornings.`,
          ],
        },
        { id: 'tp_referral', label: 'Reason for referral', type: 'textarea', combine: 'paragraphs', hint: 'The family’s concerns, in their words where possible. Full sentences.' },
        {
          id: 'tp_impairments', label: 'Functional impairments', type: 'list', hint: 'Behaviors or skill deficits that limit daily functioning and that ABA can address. Payers look for these. One per line.',
          suggest: [
            'Limited functional communication; relies on leading adults to items',
            'Aggression during transitions that limits access to community settings',
            'Elopement in community settings that creates a safety risk',
            'Limited play and social interaction with peers',
            'Dependence on adults for daily living routines',
            'Self-injurious behavior that risks physical harm',
          ],
        },
      ],
    },
    {
      title: 'Assessment summary',
      fields: [
        { id: 'tp_assessments', label: 'Assessments completed', type: 'multi', options: ASSESSMENTS, other: true, combine: 'union' },
        { id: 'tp_fba_summary', label: 'Functional assessment summary', type: 'textarea', optional: true, combine: 'paragraphs', hint: 'Optional. Filled in when an FBA or FA summary is linked.' },
        { id: 'tp_pref_summary', label: 'Preference assessment summary', type: 'textarea', optional: true, hint: 'Optional. Filled in when preference assessments are linked.' },
        { id: 'tp_skill_summary', label: 'Skill assessment summary', type: 'textarea', optional: true, hint: 'Optional. Strengths, deficits and barriers, and any scores the payer requires. Full sentences.' },
      ],
    },
    {
      title: 'Goals',
      fields: [
        {
          id: 'tp_goals', label: 'Treatment goals', type: 'grid', layout: 'cards', rowName: 'goal', combine: 'rows',
          hint: 'Each goal states the behavior, conditions, criterion and timeline. Linked BIPs and skill programs add their goals here; edit them freely.',
          columns: [
            { id: 'area', label: 'Area', type: 'select', options: [['', 'Choose…'], ...GOAL_AREAS] },
            { id: 'goal', label: 'Goal', type: 'textarea', rows: 3, placeholder: 'e.g. Jordan will independently mand for 20 preferred items using a word or approximation, with at least 2 adults, across 3 consecutive sessions.' },
            { id: 'baseline', label: 'Baseline', placeholder: 'e.g. 3 independent mands per session' },
            { id: 'target', label: 'Target date', placeholder: 'e.g. 05/01/2027' },
          ],
        },
      ],
    },
    {
      title: 'Behavior and safety plans',
      fields: [
        { id: 'tp_bip', label: 'Behavior intervention plan', type: 'select', options: [['attached', 'A behavior intervention plan is part of this treatment plan'], ['none', 'No behavior intervention plan is needed at this time']] },
        { id: 'tp_bip_summary', label: 'BIP summary', type: 'textarea', optional: true, hint: 'Optional. Filled in when a BIP is linked.' },
        { id: 'tp_crisis', label: 'Crisis plan', type: 'select', options: [['none', 'No crisis plan is needed at this time'], ['separate', 'A separate crisis plan applies']] },
      ],
    },
    {
      title: 'Caregiver training',
      fields: [
        {
          id: 'tp_cg_goals', label: 'Caregiver training goals', type: 'list', hint: 'One per line, with a fidelity criterion.',
          suggest: [
            'Caregivers will implement the antecedent strategies in the behavior intervention plan with at least 80% fidelity across 3 consecutive observations.',
            'Caregivers will respond to the client’s requests within 5 seconds in at least 80% of opportunities across 3 consecutive observations.',
            'Caregivers will use a warning and visual timer before transitions with at least 80% fidelity across 3 consecutive observations.',
            'Caregivers will follow the plan’s response to problem behavior with at least 80% fidelity across 3 consecutive observations.',
          ],
        },
        { id: 'tp_cg_schedule', label: 'Caregiver training schedule', type: 'combo', options: [['2 hours per week', '2 hours per week'], ['1 hour per week', '1 hour per week'], ['Twice per month', 'twice per month'], ['Monthly', 'monthly']], hint: 'Completes "Caregiver training will occur…".' },
      ],
    },
    {
      title: 'Coordination of care',
      fields: [
        { id: 'tp_coord', label: 'Other providers involved', type: 'multi', options: COORD, other: true, optional: true },
        {
          id: 'tp_coord_note', label: 'Coordination plan', type: 'textarea', optional: true, hint: 'Optional. Full sentences.',
          suggest: [
            'Releases of information are on file for each provider listed.',
            'The BCBA will consult with the speech-language pathologist monthly to align communication targets.',
            'Progress reports will be shared with the pediatrician with caregiver consent.',
          ],
        },
      ],
    },
    {
      title: 'Service recommendation',
      fields: [
        { id: 'tp_type', label: 'Type of treatment', type: 'select', options: [['comprehensive', 'Comprehensive (multiple areas of development)'], ['focused', 'Focused (a limited number of goals)']] },
        {
          id: 'tp_services', label: 'Recommended services', type: 'grid', rowName: 'service',
          hint: 'Hours come from the client’s needs, not from what a payer usually approves. Billing codes are optional; they differ by payer and change over time.',
          columns: [
            { id: 'service', label: 'Service', type: 'select', options: [['', 'Choose…'], ...SERVICES] },
            { id: 'hours', label: 'Hours/week', type: 'number' },
            { id: 'setting', label: 'Setting', placeholder: 'e.g. clinic' },
            { id: 'code', label: 'Code', placeholder: 'optional' },
          ],
          footer: (rows) => `Total: ${total(rows)} hours per week`,
        },
        {
          id: 'tp_justification', label: 'Clinical justification', type: 'textarea', hint: 'Connect the hours to the goals and the client’s needs. Full sentences.',
          suggest: (d) => (d.tp_type === 'focused' ? [
            'Focused treatment is recommended because treatment targets a limited number of specific goals.',
            'The recommended hours allow each goal to be taught several times per week while the client continues in other settings.',
          ] : [
            'Comprehensive treatment is recommended because the client has needs across communication, social, adaptive, and behavior areas.',
            'The recommended intensity reflects the number of active goals, the client’s age, and the client’s tolerance for sessions.',
            'Caregiver training hours support generalization of skills to home and community settings.',
            'BCBA hours allow weekly supervision of each technician and timely revision of programs based on the data.',
          ]),
        },
      ],
    },
    {
      title: 'Generalization and discharge',
      fields: [
        {
          id: 'tp_gen', label: 'Generalization and maintenance plan', type: 'textarea', hint: 'Full sentences.',
          suggest: [
            'Skills will be taught across multiple staff members, materials, and settings, including home.',
            'Goals include generalization criteria, and generalization probes will be conducted before a target is considered mastered.',
            'Mastered targets will be probed for maintenance on a fading schedule.',
          ],
        },
        {
          id: 'tp_discharge', label: 'Discharge criteria', type: 'list', hint: 'What would show services are no longer needed, or should change. One per line. These belong in the service agreement as well as this plan.',
          suggest: [
            'Treatment goals are met and skills are maintained at home and in the community',
            'Problem behavior is reduced to levels that no longer limit access to typical settings',
            'The client transitions to a setting where needs can be met with less intensive support',
            'The family chooses to end services',
            'Insufficient progress after reasonable modifications, at which point referral to other services will be considered',
          ],
        },
        { id: 'tp_dc_agreement', label: 'Discharge criteria in the service agreement', type: 'select', options: [['yes', 'Also written into the service agreement'], ['no', 'Not yet in the service agreement']] },
      ],
    },
  ],

  build(v, c) {
    const goals = v.rows('tp_goals').filter((r) => String(r.goal || '').trim());
    const areaOrder = GOAL_AREAS.map((a) => a[0]);
    const byArea = new Map();
    for (const g of goals) {
      const a = g.area || 'Other goals';
      if (!byArea.has(a)) byArea.set(a, []);
      byArea.get(a).push(g);
    }
    const areas = [...byArea.keys()].sort((x, y) => (areaOrder.indexOf(x) + 1 || 99) - (areaOrder.indexOf(y) + 1 || 99));
    let n = 0;
    const goalBlocks = goals.length ? areas.flatMap((a) => [
      { type: 'sub', text: a },
      {
        type: 'ol', start: n + 1, items: byArea.get(a).map((g) => {
          n++;
          const t = String(g.target || '').trim();
          return [fin(g.goal), g.baseline ? `Baseline: ${fin(g.baseline)}` : '', t && !String(g.goal).includes(t) ? `Target date: ${fin(t)}` : ''].filter(Boolean).join(' ');
        }),
      },
    ]) : [{ type: 'p', text: mark('Treatment goals') }];

    const services = v.rows('tp_services').filter((r) => r.service);
    const hasCode = services.some((r) => String(r.code || '').trim());
    const serviceTable = services.length ? {
      type: 'table',
      widths: hasCode ? ['*', 60, 100, 70] : ['*', 70, 120],
      head: hasCode ? ['Service', 'Hours/week', 'Setting', 'Code'] : ['Service', 'Hours/week', 'Setting'],
      rows: [
        ...services.map((r) => [r.service, String(r.hours ?? ''), r.setting || '', ...(hasCode ? [r.code || ''] : [])]),
        [{ text: 'Total' }, String(total(services)), '', ...(hasCode ? [''] : [])],
      ],
    } : { type: 'p', text: mark('Recommended services') };
    const para = (id, key, optional) => v.paras(id, { optional }).map((t, i) => ({ type: 'p', key: key + i, text: fin(t) }));
    const typeText = v.raw('tp_type') === 'focused' ? 'Focused treatment is recommended.' : 'Comprehensive treatment is recommended.';
    const coord = v.multi('tp_coord', { optional: true });

    return [
      { heading: 'Background', blocks: para('tp_background', 'bg') },
      { heading: 'Reason for Referral', blocks: para('tp_referral', 'ref') },
      { heading: 'Functional Impairments', blocks: [{ type: 'ul', items: v.list('tp_impairments').map(fin) }] },
      {
        heading: 'Assessment Summary',
        blocks: [
          { type: 'p', key: 'assess', text: `Assessment included ${joinList(v.multi('tp_assessments'))}.` },
          ...para('tp_fba_summary', 'fbas', true),
          ...para('tp_pref_summary', 'prefs', true),
          ...para('tp_skill_summary', 'skills', true),
        ],
      },
      { heading: 'Treatment Goals', blocks: goalBlocks },
      {
        heading: 'Behavior Intervention and Crisis Plans',
        blocks: [
          { type: 'p', key: 'bip', text: v.raw('tp_bip') === 'none' ? 'No behavior intervention plan is needed at this time.' : 'A behavior intervention plan is part of this treatment plan and is maintained in the client record.' },
          ...para('tp_bip_summary', 'bips', true),
          { type: 'p', key: 'crisis', text: v.raw('tp_crisis') === 'separate' ? 'A separate crisis plan applies and is maintained in the client record.' : 'No crisis plan is needed at this time.' },
        ],
      },
      {
        heading: 'Caregiver Training',
        blocks: [
          { type: 'ol', items: v.list('tp_cg_goals').map(fin) },
          { type: 'p', key: 'cgsched', text: `Caregiver training will occur ${frag(v.t('tp_cg_schedule'))}.` },
        ],
      },
      {
        heading: 'Coordination of Care',
        blocks: [
          { type: 'p', key: 'coord', text: coord.length ? `Care is coordinated with ${joinList(coord)}.` : 'No other providers are currently involved.' },
          ...para('tp_coord_note', 'coordn', true),
        ],
      },
      {
        heading: 'Service Recommendation',
        blocks: [{ type: 'p', key: 'type', text: typeText }, serviceTable, ...para('tp_justification', 'just')],
      },
      { heading: 'Generalization and Maintenance', blocks: para('tp_gen', 'gen') },
      {
        heading: 'Discharge Criteria',
        blocks: [
          { type: 'p', key: 'dc', text: `Services will be reviewed for discharge or transition when any of the following occur${v.raw('tp_dc_agreement') === 'no' ? '' : '. These criteria are also written into the service agreement'}:` },
          { type: 'ul', items: v.list('tp_discharge').map(fin) },
        ],
      },
    ];
  },
};
