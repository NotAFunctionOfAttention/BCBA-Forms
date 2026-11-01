# ABA Docs

An installable web app (PWA) that turns structured answers into audit-ready clinical ABA documents and exports them as PDF. Plain HTML, CSS and JavaScript, no build step.

**Everything stays on the device.** Documents and settings are stored in the browser's IndexedDB. The page's Content-Security-Policy sets `connect-src 'none'`, so the app cannot send data anywhere, and every library and font is bundled in `vendor/`. Once loaded, it works offline.

## Documents

| Form | File |
|---|---|
| Intake Summary and Assessment Plan | `js/forms/intake.js` |
| Functional Behavior Assessment | `js/forms/fba.js` |
| Functional Analysis Summary (graph drawn from session data) | `js/forms/fa.js` |
| Behavior Intervention Plan | `js/forms/bip.js` |
| Crisis and Safety Plan, plus a one-page quick reference | `js/forms/crisis.js` |
| Preference Assessment | `js/forms/preference.js` |
| Skill Assessment Summary (tool names and your scores only; no copyrighted items) | `js/forms/skill-assessment.js` |
| Caregiver Training Plan, plus a one-page plain-language Family summary | `js/forms/caregiver.js` |
| Discharge Summary and Transition Plan, plus a one-page Summary for receiving staff | `js/forms/discharge.js` |
| Skill Acquisition Program | `js/forms/skill.js` |
| Visual Analysis and Phase Change Decision | `js/forms/visual.js` |
| Treatment Plan | `js/forms/treatment-plan.js` |
| Progress Report | `js/forms/progress-report.js` |

To add a document type, write a form file like `bip.js` (entry fields in `groups`, document text in `build`) and list it in `js/forms/index.js`.

Answer types:

| Type | Use |
|---|---|
| `select` | Closed list where every option is given (e.g. safety) |
| `combo` | Dropdown of common answers plus **Other**, which opens a text box |
| `multi` | Checkboxes; with `other: true`, an **Other** box opens a text box (one item per line) |
| `grid` | Editable table with computed columns and totals; `layout: 'cards'` for long entries such as goals, with optional image columns for graphs |
| `image` | Photo or screenshot, resized on the device and printed in the report (graphs) |
| `text`, `textarea`, `list` | Open answers. `suggest` adds tap-to-insert phrases that you can then edit |

`suggest` can also be a function of the answers so far (see `js/forms/behavior-suggest.js`): picking a target behavior offers matching definitions, onsets, offsets, examples and non-examples; ticking a function offers matching antecedents, strategies and desired behaviors; goals are drafted from the behavior, replacement, measure and review date. A used suggestion shows a check mark and tapping it again removes it.

Each option carries the exact phrase that goes into the document, so picking an option never produces awkward wording.

## Extra versions of a document

A form can define `variants`: another PDF built from the same answers. The caregiver training plan's **Family summary** and the discharge summary's **Summary for receiving staff** work the same way. The crisis plan's **Quick reference** button exports a one-page, two-column version to post where staff can see it, identifying the client by first name and last initial (or initials, client ID, or full name). If it runs past one page the app says so.

## Linked documents

Documents can draw answers from earlier ones in two ways:

- **Next steps** at the bottom of a finished document starts the next one from it.
- **Based on** at the top of a document links earlier ones to it: pick a document on this device, or upload a PDF this app exported (e.g. last week's preference assessment). A BIP or skill program can link several preference assessments; their top items are combined, newest first. A skill program can link preference assessments and a BIP at the same time, and fields both can fill (reinforcers, rationale) combine.

A linked document fills only answers that are blank, still at their default, or that it filled before and you have not changed. Removing a link takes back what it filled and recalculates from the remaining links. Linking a document for a different client asks for confirmation. Each document keeps a snapshot of what it used (`doc.sources`), so later edits to the earlier document do not change it, and the earlier document is listed under "Based on" in the PDF header.

### Re-import data in PDFs

Exported PDFs carry the document's answers (images excluded) as base64 JSON in a custom PDF metadata field, `AbaDocsData`. It never appears on a page. Uploading such a PDF restores the answers, on this device or another. It can be turned off in Settings → Exported PDFs, e.g. for copies going to a payer. Scanned or re-typed copies lose it; PDFs exported before v0.6.0 do not have it.

Home → **Open it here** imports a PDF as a document on this device.

| From | To | Carries over |
|---|---|---|
| FBA | BIP | Target behavior and definition, function, assessments, evidence, antecedents, current consequence |
| BIP | Skill Acquisition Program | Replacement behavior, response form, teaching procedure, fading, schedule, reinforcers, data collectors |
| BIP | Visual Analysis | Target behavior and measure, goal set to decrease |
| Preference Assessment | Skill Acquisition Program | Highest-preference items as reinforcers |
| Preference Assessment | BIP | Highest-preference items as reinforcers for the replacement behavior |
| Skill Acquisition Program | Visual Analysis | Program and measure, teaching phase, mastery criterion as the review target |
| FBA | Treatment Plan | Hypothesis statement, referral question, assessments used |
| Preference Assessment (several) | Treatment Plan | Preferred items and assessment dates |
| BIP | Treatment Plan | BIP summary, crisis plan status, the BIP's goals |
| Skill Acquisition Program (several) | Treatment Plan | One goal per program, with baseline and mastery criterion |
| Treatment Plan | Progress Report | Goals and baselines, services, coordination of care |
| FBA | FA Summary | Target behavior and definition, the hypothesis to test |
| FA Summary | BIP | Target behavior, confirmed function, FA results as evidence (combined with FBA evidence if both are linked) |
| FA Summary | Treatment Plan | The FA result in the assessment summary |
| BIP | Crisis Plan | Crisis behavior, prompting the replacement behavior as an early response |
| FBA | Crisis Plan | Situations in which the behavior is most likely, for the risk assessment |
| Crisis Plan | BIP / Treatment Plan | A note that a separate crisis plan applies |
| Intake | FBA / Preference Assessment / Treatment Plan | First problem behavior and informants / the family's named preferences as items / background, concerns, coordination |
| Intake | Skill Assessment | Planned instruments and strengths |
| Skill Assessment | Treatment Plan | Assessment summary and candidate goals, highest priority first |
| Treatment Plan / BIP | Caregiver Training | Caregiver goals and schedule / goals for the BIP's procedures and a plain-language starting summary |
| Caregiver Training | Progress Report | Caregiver training progress |
| Treatment Plan / Progress Report / Intake | Discharge Summary | Concerns, assessments, goals / final levels and statuses / the family's original concerns |
| Visual Analysis (several) | Progress Report | Current level, status and interpretation, matched to the goal by program or behavior name |
| Progress Report | Treatment Plan (revised) | Goals still in progress with current levels as new baselines, new goals, service recommendation |

Links are defined in each source form's `next` list or the target form's `from` list (`multiple: true` lets several sources feed one document; a target field marked `combine` merges values from different kinds of source: `and`, `paragraphs`, `union`, or `rows` for tables, where each row is tracked on its own; a form's `combineSources` can match sources to each other, as the progress report does with visual analyses). The logic lives in `js/links.js`.

## Using it

1. **Settings → Provider defaults**: practice, author and supervising BCBA details, filled into every new document.
2. **New document**: enter answers on the **Enter** tab. Hints show the phrasing that fits the finished sentence.
3. **Review** tab: the document as it will print. Unanswered items show in red. Use **Edit wording** on any paragraph to polish it; if you later change an answer behind an edited paragraph, the app flags it.
4. **Export PDF**: blocked until every required item is answered. Output is a letter-size clinical document with identification block, running header, "Page X of Y" footer, PHI notice and signature lines. No worksheet prompts, logs or checklists appear in it.

## Run it locally

```bash
python3 -m http.server 5173
```

Open http://localhost:5173. The offline cache is off on localhost so edits show immediately (add `?sw` to test it).

## Put it on your phone

Installing needs https, so host this folder on any static host (e.g. GitHub Pages). Only the app's code is hosted; data entered on a device never leaves it. On iPhone: open the URL in Safari → Share → **Add to Home Screen**. Use the installed app, not a Safari tab, so the browser does not clear its storage.

## Backups

Settings → **Save encrypted backup** writes an `.abadocs` file encrypted with your passphrase (AES-256-GCM, PBKDF2-SHA256). Without the passphrase it cannot be opened or recovered. Exported PDFs are **not** encrypted: save them somewhere that does not sync to a cloud service until they are filed in the client record.

## Shipping an update

Edit the files, bump `VERSION` in `sw.js`, re-upload. Installed copies update on the next launch.

## Files

| Path | What |
|---|---|
| `index.html` | Shell and security policy |
| `js/main.js` | Screens: documents, editor, settings |
| `js/engine.js` | Identifier fields, document model, on-screen preview |
| `js/links.js` | Linked documents, fill rules, re-import data in PDFs |
| `js/graph.js` | Multielement graph (SVG) for the FA summary |
| `js/pdf.js` | PDF layout (pdfmake) |
| `js/forms/` | One file per document type (`behavior-suggest.js` holds the BIP's answer-driven suggestions) |
| `js/store.js` | IndexedDB storage |
| `js/crypto.js` | Encrypted backup |
| `js/util.js` | Text helpers |
| `sw.js` | Offline cache |
| `vendor/` | pdfmake 0.2.10 and its Roboto fonts |

Never commit backups, exported PDFs or any client information to this repository.
