// Crisis and Safety Plan, following Chapter 12 of the clinic manual: crisis
// behavior, prevention, early warning signs and response, de-escalation and
// safety steps (least restrictive first), physical intervention only when law,
// policy and staff certification allow it, roles, when to call for help, and
// what happens after a crisis. Also exports a one-page quick reference.
// Field types and suggestion conventions are described at the top of bip.js.

import { cap, frag, fin, joinList, fmtDate, mark } from '../util.js';

const BEHAVIORS = [
  ['aggression', 'Severe aggression', 'severe aggression likely to injure others'],
  ['sib', 'Self-injury causing tissue damage', 'self-injury that causes, or is likely to cause, tissue damage'],
  ['elopement', 'Elopement toward danger', 'elopement toward danger, such as traffic or water'],
  ['pica', 'Pica', 'pica (eating non-food items)'],
  ['climbing', 'Climbing to dangerous heights', 'climbing to dangerous heights'],
];
const BEHAVIOR_TO_KEY = { aggression: 'aggression', 'self-injurious behavior (SIB)': 'sib', elopement: 'elopement', pica: 'pica' };
const picked = (d) => new Set(Array.isArray(d.cr_behaviors) ? d.cr_behaviors : []);
const by = (d, table) => [...picked(d)].flatMap((k) => table[k] || []);

const DEFS = {
  aggression: ['Hitting, kicking, or biting with enough force to cause injury, or throwing heavy or sharp objects at another person.'],
  sib: ['Forceful head-hitting, head-banging against hard surfaces, or self-biting that breaks the skin.'],
  elopement: ['Running away from an adult in a parking lot, street, or any area near traffic, or leaving the building through an exterior door.'],
  pica: ['Placing small, sharp, or toxic non-food items in the mouth or swallowing them.'],
  climbing: ['Climbing onto furniture, shelves, fences, or other surfaces higher than 3 feet.'],
};
const PREVENT = {
  aggression: ['Staffing allows a second adult to respond within seconds', 'Heavy or sharp objects are kept out of reach in session areas'],
  sib: ['Hard edges in session areas are padded', 'Protective equipment is available as prescribed by the physician'],
  elopement: ['Exterior doors have alarms and are secured', 'An adult holds the client’s hand when walking to and from the car', 'The car seat is on the side of the car away from traffic', 'Gates at home are kept latched'],
  pica: ['Small objects, batteries, and toxic items are removed from session areas', 'Rooms are checked for small items before each session'],
  climbing: ['Tall furniture and shelves are anchored to the wall', 'Climbing opportunities are provided in safe play equipment'],
};
const PRECURSORS = {
  aggression: ['Raised voice or screaming', 'Clenched fists or pushing materials away', 'Moving toward a person with arms raised'],
  sib: ['Hand moving toward the head', 'Whining or crying that escalates', 'Rocking faster'],
  elopement: ['Dropping to the ground or pulling the hand', 'Looking toward the street or door', 'Moving toward an exit'],
  pica: ['Scanning the floor for small items', 'Picking up small objects', 'Bringing objects toward the mouth'],
  climbing: ['Moving toward furniture or shelves', 'Placing a foot on a chair or ledge'],
};
const EARLY = [
  'Stay calm and use a short, quiet instruction',
  'Prompt the replacement behavior from the behavior intervention plan',
  'Reduce or pause demands',
  'Move the client away from the hazard, or the hazard away from the client',
  'Offer a preferred, calming activity if the plan allows it',
];
const STEPS = [
  'Use a calm voice and as few words as possible',
  'Give the client more space',
  'Remove demands',
  'Move other people away from the area',
  'Remove objects that could be thrown or used to cause harm',
  'Position yourself between the client and the hazard',
  'Block attempts to hit or bite using approved blocking',
];
const STEP_BY = {
  elopement: ['If the client breaks away, the nearest adult moves quickly to place themselves between the client and traffic, without chasing from behind', 'Once beside the client, hold the client’s hand and walk to a safe area'],
  pica: ['If an item is in the mouth, prompt the client to hand it over or trade it for a preferred item', 'Do not reach into the mouth unless trained to do so; seek medical help if the item may have been swallowed'],
  sib: ['Place a soft barrier between the client’s head and hard surfaces', 'Use protective equipment as prescribed'],
  climbing: ['Stand below and beside the client to guard against a fall', 'Help the client down using the least physical guidance needed'],
};
const CALL = [
  'Call 911 if anyone is seriously injured',
  'Call 911 if the client cannot be located or reaches a road and cannot be safely retrieved',
  'Call 911 or Poison Control if a toxic item may have been swallowed',
  'Notify the clinic director and the supervising BCBA immediately after emergency services are called',
];
const AFTER = [
  'Check the client and staff for injuries and provide first aid as needed',
  'Notify the caregiver the same day',
  'Notify the supervising BCBA the same day',
  'Complete an incident report within 24 hours',
  'Debrief with the team and review the plan within 1 business day',
];

const ROLE_DEFAULT = [
  { role: 'Stays with the client and follows the steps', who: 'Assigned RBT' },
  { role: 'Moves other children away and calls for help', who: 'Second staff member' },
  { role: 'Contacts the caregiver and emergency services if needed', who: 'Clinic supervisor' },
];

function identifier(d) {
  const name = String(d.client_name || '').trim();
  const parts = name.split(/\s+/).filter(Boolean);
  switch (d.cr_qr_id) {
    case 'full': return name;
    case 'initials': return parts.map((p) => p[0].toUpperCase() + '.').join('');
    case 'id': return d.client_id ? `Client ${d.client_id}` : '';
    default: return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : name;
  }
}

function physicalText(v) {
  if (v.raw('cr_physical') !== 'permitted') return { text: 'No physical restraint or seclusion is permitted under this plan. Staff use only the de-escalation and safety steps above.', ok: true };
  const checks = new Set(Array.isArray(v.raw('cr_checks')) ? v.raw('cr_checks') : []);
  const ok = ['law', 'policy', 'certified'].every((k) => checks.has(k));
  return { text: ok ? 'Emergency physical intervention is permitted only as described below, only when there is imminent risk of serious injury, for the shortest time possible, and never as punishment or treatment. It is permitted by state law and organizational policy and is carried out only by staff currently certified in the named crisis management system.' : mark('Confirmation that law, policy and staff certification permit physical intervention'), ok };
}

export default {
  id: 'crisis',
  title: 'Crisis and Safety Plan',
  fileTag: 'CrisisPlan',
  dates: [
    { id: 'doc_date', label: 'Date of plan', required: true },
    { id: 'review_date', label: 'Next review' },
  ],
  guardianSignature: true,

  // A second, one-page version to post where staff can see it.
  variants: [{
    id: 'quick', label: 'Quick reference', title: 'Crisis Plan Quick Reference', fileTag: 'CrisisQuickRef', quick: true, onePage: true,
    idLine: (d) => [identifier(d), d.doc_date ? `Plan dated ${fmtDate(d.doc_date)}` : '', d.review_date ? `Review by ${fmtDate(d.review_date)}` : ''].filter(Boolean).join('   ·   '),
    build(v) {
      const phys = physicalText(v);
      const roles = v.rows('cr_roles').filter((r) => r.role);
      const contacts = v.list('cr_qr_contacts').filter((x) => !x.startsWith('⟦'));
      return [
        { col: 1, heading: 'Crisis behavior', blocks: v.paras('cr_def').map((t) => ({ type: 'p', text: fin(t) })) },
        { col: 1, heading: 'Warning signs', blocks: [{ type: 'ul', items: v.list('cr_precursors').map(fin) }] },
        { col: 1, heading: 'When you see warning signs', blocks: [{ type: 'ol', items: v.list('cr_early').map(fin) }] },
        { col: 1, heading: 'Physical intervention', blocks: [{ type: 'p', text: v.raw('cr_physical') !== 'permitted' ? 'Not permitted under this plan.' : phys.ok ? 'Only as written in the full plan, only when there is imminent risk of serious injury, and only by certified staff.' : phys.text }] },
        { col: 2, heading: 'If crisis behavior happens', blocks: [{ type: 'ol', items: v.list('cr_steps').map(fin) }] },
        { col: 2, heading: 'Call for help', blocks: [{ type: 'ul', items: [...v.list('cr_call').map(fin), ...contacts.map(fin)] }] },
        ...(roles.length ? [{ col: 2, heading: 'Who does what', blocks: [{ type: 'ul', items: roles.map((r) => `${r.who ? r.who + ': ' : ''}${frag(r.role)}.`) }] }] : []),
        { col: 2, heading: 'After a crisis', blocks: [{ type: 'ol', items: v.list('cr_after').map(fin) }] },
      ];
    },
  }],

  from: [
    {
      from: 'bip', label: 'Start a crisis plan from this BIP',
      carries: 'the crisis behavior, and prompting the replacement behavior as an early response',
      map: (d) => {
        const key = BEHAVIOR_TO_KEY[String(d.tb_name || '').trim()];
        return {
          cr_behaviors: key ? [key] : [],
          cr_def: key ? DEFS[key][0] : '',
          cr_early: d.replacement ? `Stay calm and use a short, quiet instruction\nPrompt the replacement behavior from the behavior intervention plan: ${frag(d.replacement)}\nReduce or pause demands` : '',
        };
      },
    },
    {
      from: 'fba', label: 'Start a crisis plan from this FBA',
      carries: 'the situations in which the behavior is most likely, for the risk assessment',
      map: (d) => ({
        cr_risk: [d.ant_patterns, d.setting_events].map((t) => String(t || '').trim()).filter(Boolean).join(' '),
      }),
    },
  ],

  next: [
    {
      to: 'bip', label: 'Start a BIP that refers to this plan',
      carries: 'a safety note pointing to this crisis plan',
      map: (d) => ({ safety: 'protocol', safety_note: `Staff will follow the crisis and safety plan${d.doc_date ? ' dated ' + fmtDate(d.doc_date) : ''} if ${joinList(BEHAVIORS.filter(([k]) => (d.cr_behaviors || []).includes(k)).map((b) => b[2])) || 'crisis behavior'} occurs.` }),
    },
    {
      to: 'tx', label: 'Start a treatment plan that refers to this plan',
      carries: 'that a separate crisis plan applies',
      map: () => ({ tp_crisis: 'separate' }),
    },
  ],

  groups: [
    {
      title: 'Crisis behavior',
      fields: [
        { id: 'cr_behaviors', label: 'Behavior posing an immediate risk of serious harm', type: 'multi', options: BEHAVIORS, other: true, otherHint: 'One per line.' },
        { id: 'cr_def', label: 'Definition of crisis behavior', type: 'textarea', hint: 'What specifically counts as a crisis, as distinct from everyday problem behavior handled by the BIP. Suggestions follow the behaviors ticked.', suggest: (d) => by(d, DEFS), suggestEmpty: 'Tick a behavior above to see suggestions.' },
        {
          id: 'cr_risk', label: 'Risk assessment', type: 'textarea', hint: 'How often, how severe, and in what situations. Full sentences.',
          suggest: [
            'The behavior has occurred about once per month, most often during transitions to and from the car.',
            'No injuries have occurred, but a single occurrence near traffic could be fatal.',
            'Injuries have included bruising that did not require medical care.',
          ],
        },
      ],
    },
    {
      title: 'Prevention',
      fields: [
        { id: 'cr_prevent', label: 'Prevention measures', type: 'list', hint: 'Environmental safety, staffing and supervision. One per line.', suggest: (d) => [...by(d, PREVENT), 'Supervision ratios are maintained at all times'] },
      ],
    },
    {
      title: 'Early warning signs',
      fields: [
        { id: 'cr_precursors', label: 'Precursors', type: 'list', hint: 'Behaviors that reliably come just before the crisis behavior. One per line.', suggest: (d) => by(d, PRECURSORS), suggestEmpty: 'Tick a behavior above to see suggestions.' },
        { id: 'cr_early', label: 'Response to warning signs', type: 'list', hint: 'What to do as soon as a precursor appears. One step per line, in order.', suggest: EARLY },
      ],
    },
    {
      title: 'De-escalation and safety steps',
      fields: [
        { id: 'cr_steps', label: 'Steps if crisis behavior occurs', type: 'list', hint: 'Least restrictive first. One step per line, in order.', suggest: (d) => [...STEPS, ...by(d, STEP_BY)] },
      ],
    },
    {
      title: 'Physical intervention',
      fields: [
        { id: 'cr_physical', label: 'Emergency physical intervention', type: 'select', options: [['none', 'Not permitted under this plan'], ['permitted', 'Permitted only as described']] },
        { id: 'cr_physical_detail', label: 'Procedure, conditions and who may use it', type: 'textarea', optional: true, hint: 'Only if permitted: the named crisis management system, the specific procedure, when it may be used, maximum duration, and who is certified.' },
        {
          id: 'cr_checks', label: 'Before physical intervention is written in, confirm', type: 'multi', optional: true,
          hint: 'All three are required if physical intervention is permitted (Chapter 12).',
          options: [
            ['law', 'State law permits it'],
            ['policy', 'Organizational policy permits it'],
            ['certified', 'Staff who would use it hold current certification'],
          ],
        },
      ],
    },
    {
      title: 'Roles and emergency help',
      fields: [
        {
          id: 'cr_roles', label: 'Who does what', type: 'grid', rowName: 'role', default: ROLE_DEFAULT,
          columns: [
            { id: 'role', label: 'Responsibility', placeholder: 'e.g. stays with the client' },
            { id: 'who', label: 'Who', placeholder: 'e.g. assigned RBT' },
          ],
        },
        { id: 'cr_call', label: 'When to call for help', type: 'list', hint: 'One per line.', suggest: CALL },
        { id: 'cr_medical', label: 'Medical guidance', type: 'textarea', optional: true, hint: 'Optional. Guidance from the client’s physicians, such as signs that need medical evaluation.' },
      ],
    },
    {
      title: 'After a crisis',
      fields: [
        { id: 'cr_after', label: 'After-crisis steps', type: 'list', hint: 'One step per line, in order.', suggest: AFTER },
      ],
    },
    {
      title: 'Training, consent and review',
      fields: [
        {
          id: 'cr_trained', label: 'Trained and rehearsed', type: 'multi', other: true,
          options: [
            ['rbts', 'RBTs on the case', 'all RBTs assigned to the case'],
            ['bcbas', 'BCBAs', 'the supervising BCBA'],
            ['cg', 'Caregivers', 'the caregivers'],
            ['staff', 'Other clinic staff', 'clinic staff who may be present'],
          ],
        },
        { id: 'cr_rehearse', label: 'How it is rehearsed', type: 'combo', options: [['Role play in the clinic', 'role play in the clinic'], ['Role play in the setting where it applies', 'role play in the setting where the plan applies, with no hazards present'], ['Role play and video model', 'role play and a video model']] },
        { id: 'cr_consent_date', label: 'Date caregiver consent was obtained', type: 'date' },
        { id: 'cr_review', label: 'Review schedule', type: 'combo', options: [['After every incident and every 3 months', 'after every incident and at least every 3 months'], ['After every incident and every 6 months', 'after every incident and at least every 6 months']] },
      ],
    },
    {
      title: 'Quick reference',
      fields: [
        { id: 'cr_qr_id', label: 'Identify the client on the quick reference by', type: 'select', hint: 'The quick reference is meant to be posted where staff can see it. Choose the least identifying option that still lets staff know whose plan it is.', options: [['first', 'First name and last initial'], ['initials', 'Initials only'], ['id', 'Client ID only'], ['full', 'Full name']] },
        { id: 'cr_qr_contacts', label: 'Emergency contacts to show', type: 'list', optional: true, hint: 'Optional. One per line, e.g. Clinic director: (555) 555-0100' },
      ],
    },
  ],

  build(v) {
    const phys = physicalText(v);
    const roles = v.rows('cr_roles').filter((r) => r.role);
    const consent = v.raw('cr_consent_date');
    const detail = v.opt('cr_physical_detail');
    return [
      {
        heading: 'Crisis Behavior',
        blocks: [
          { type: 'p', key: 'which', text: `This plan applies to ${joinList(v.multi('cr_behaviors'))}. It is separate from the behavior intervention plan: the BIP is treatment that makes this behavior less likely, and this plan is what staff do in the moment if it occurs.` },
          ...v.paras('cr_def').map((t, i) => ({ type: 'p', key: 'def' + i, text: `Crisis behavior is defined as follows. ${fin(t)}` })),
          ...v.paras('cr_risk').map((t, i) => ({ type: 'p', key: 'risk' + i, text: fin(t) })),
        ],
      },
      { heading: 'Prevention', blocks: [{ type: 'ul', items: v.list('cr_prevent').map(fin) }] },
      {
        heading: 'Early Warning Signs',
        blocks: [
          { type: 'sub', text: 'Precursors' },
          { type: 'ul', items: v.list('cr_precursors').map(fin) },
          { type: 'sub', text: 'Response when a precursor occurs' },
          { type: 'ol', items: v.list('cr_early').map(fin) },
        ],
      },
      {
        heading: 'De-escalation and Safety Steps',
        blocks: [
          { type: 'p', key: 'order', text: 'If crisis behavior occurs, staff follow these steps in order, starting with the least restrictive:' },
          { type: 'ol', items: v.list('cr_steps').map(fin) },
        ],
      },
      {
        heading: 'Physical Intervention',
        blocks: [
          { type: 'p', key: 'phys', text: phys.text },
          ...(v.raw('cr_physical') === 'permitted' ? [{ type: 'p', key: 'physd', text: detail ? fin(detail) : mark('Procedure, conditions and who may use it') }] : []),
        ],
      },
      {
        heading: 'Roles',
        blocks: [roles.length ? { type: 'table', widths: ['*', 160], head: ['Responsibility', 'Who'], rows: roles.map((r) => [fin(r.role), r.who || '']) } : { type: 'p', text: mark('Who does what') }],
      },
      {
        heading: 'Emergency Services and Medical Care',
        blocks: [{ type: 'ul', items: v.list('cr_call').map(fin) }, ...v.paras('cr_medical', { optional: true }).map((t, i) => ({ type: 'p', key: 'med' + i, text: fin(t) }))],
      },
      { heading: 'After a Crisis', blocks: [{ type: 'ol', items: v.list('cr_after').map(fin) }] },
      {
        heading: 'Training, Consent and Review',
        blocks: [
          { type: 'p', key: 'train', text: `Before the plan takes effect, ${joinList(v.multi('cr_trained'))} will be trained in it and will rehearse it through ${frag(v.t('cr_rehearse'))}.` },
          { type: 'p', key: 'consent', text: consent ? `The plan was reviewed with the caregivers, and written consent was obtained on ${fmtDate(consent)}.` : mark('Date caregiver consent was obtained') },
          { type: 'p', key: 'review', text: `The plan will be reviewed ${frag(v.t('cr_review'))}. Each incident is reviewed to decide whether the behavior intervention plan, the environment, staffing, or this plan should change.` },
        ],
      },
    ];
  },
};
