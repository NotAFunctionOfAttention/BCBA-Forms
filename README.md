# ABA Docs

An installable web app (PWA) that turns structured answers into audit-ready clinical ABA documents and exports them as PDF. Plain HTML, CSS and JavaScript, no build step.

**Everything stays on the device.** Documents and settings are stored in the browser's IndexedDB. The page's Content-Security-Policy sets `connect-src 'none'`, so the app cannot send data anywhere, and every library and font is bundled in `vendor/`. Once loaded, it works offline.

## Documents

| Form | File |
|---|---|
| Behavior Intervention Plan | `js/forms/bip.js` |

To add a document type, write a form file like `bip.js` (entry fields in `groups`, document text in `build`) and list it in `js/forms/index.js`.

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
| `js/pdf.js` | PDF layout (pdfmake) |
| `js/forms/` | One file per document type |
| `js/store.js` | IndexedDB storage |
| `js/crypto.js` | Encrypted backup |
| `js/util.js` | Text helpers |
| `sw.js` | Offline cache |
| `vendor/` | pdfmake 0.2.10 and its Roboto fonts |

Never commit backups, exported PDFs or any client information to this repository.
