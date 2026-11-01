// Builds the clinical PDF from the document model with pdfmake (bundled in
// vendor/, runs entirely on the device).

const INK = '#111111';
const RULE = '#555555';
const SHADE = '#EDEDED';

const thinTable = {
  hLineWidth: () => 0.5, vLineWidth: () => 0.5,
  hLineColor: () => RULE, vLineColor: () => RULE,
  paddingLeft: () => 5, paddingRight: () => 5, paddingTop: () => 3, paddingBottom: () => 3,
};

function sectionHeading(text) {
  return {
    stack: [
      { text: text.toUpperCase(), style: 'h2' },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 504, y2: 0, lineWidth: 0.75, lineColor: RULE }], margin: [0, 1, 0, 5] },
    ],
    unbreakable: true,
  };
}

function block(b) {
  switch (b.type) {
    case 'p': return { text: b.text, style: 'body' };
    case 'sub': return { text: b.text, style: 'h3' };
    case 'image':
      return { stack: [{ image: b.src, fit: [504, 300], alignment: 'center' }, b.caption ? { text: b.caption, style: 'caption' } : ''], margin: [0, 2, 0, 8], unbreakable: true };
    case 'ul': return { ul: b.items, style: 'list' };
    case 'ol': return { ol: b.items, style: 'list' };
    case 'dl':
      return {
        table: { widths: [b.wide ? 125 : 70, '*'], body: b.rows.map(([k, v]) => [{ text: k, bold: true }, v]) },
        layout: 'noBorders', style: 'dl',
      };
    case 'table':
      return {
        table: {
          headerRows: 1,
          widths: b.widths,
          body: [
            b.head.map((h) => ({ text: h, bold: true, fillColor: SHADE })),
            ...b.rows.map((r) => r.map((cell) => (cell === null ? {} : typeof cell === 'object' ? { text: cell.text, rowSpan: cell.rowSpan } : { text: cell }))),
          ],
        },
        layout: thinTable, style: 'table',
      };
    default: return null;
  }
}

function idTable(rows) {
  const body = [];
  for (let i = 0; i < rows.length; i += 2) {
    const a = rows[i], b = rows[i + 1] || ['', ''];
    body.push([
      { text: a[0], bold: true, fillColor: SHADE }, a[1],
      { text: b[0], bold: true, fillColor: b[0] ? SHADE : null }, b[1],
    ]);
  }
  return { table: { widths: [88, '*', 88, '*'], body }, layout: thinTable, style: 'idTable' };
}

function signatures(signers) {
  return {
    stack: [
      sectionHeading('Signatures'),
      ...signers.map((s) => ({
        columns: [
          { width: '*', stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 330, y2: 0, lineWidth: 0.75, lineColor: INK }], margin: [0, 26, 0, 2] },
            { text: s.role + (s.name ? ': ' + s.name : ''), style: 'sigLabel' },
          ] },
          { width: 140, stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 140, y2: 0, lineWidth: 0.75, lineColor: INK }], margin: [0, 26, 0, 2] },
            { text: 'Date', style: 'sigLabel' },
          ] },
        ],
        columnGap: 34,
      })),
    ],
    unbreakable: true,
    margin: [0, 10, 0, 0],
  };
}

export function modelToPdf(m) {
  const p = m.practice;
  const content = [];

  if (p.name || p.addr || p.phone) {
    content.push({ text: p.name || '', style: 'practice' });
    const sub = [p.addr, p.phone].filter(Boolean).join('   |   ');
    if (sub) content.push({ text: sub, style: 'practiceSub' });
    if (p.npi) content.push({ text: 'NPI ' + p.npi, style: 'practiceSub' });
  }
  content.push({ text: m.title.toUpperCase(), style: 'title' });
  if (m.idRows.length) content.push(idTable(m.idRows));

  for (const s of m.sections) {
    const blocks = s.blocks.map(block).filter(Boolean);
    // Keep each heading with the start of its section.
    content.push({ stack: [sectionHeading(s.heading), blocks[0] || ''], unbreakable: true });
    content.push(...blocks.slice(1));
  }
  content.push(signatures(m.signers));

  return {
    pageSize: 'LETTER',
    pageMargins: [54, 64, 54, 58],
    info: { title: m.title, subject: m.title, creator: m.practice.name || '', producer: m.practice.name || '' },
    header: (page) => (page === 1 ? null : {
      columns: [
        { text: m.clientLine, alignment: 'left' },
        { text: m.title, alignment: 'right' },
      ],
      style: 'runHead', margin: [54, 30, 54, 0],
    }),
    footer: (page, pages) => ({
      stack: [
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 504, y2: 0, lineWidth: 0.5, lineColor: RULE }] },
        { columns: [
          { text: 'CONFIDENTIAL: Contains protected health information.', alignment: 'left' },
          { text: (m.docDate ? m.docDate + '   ' : '') + `Page ${page} of ${pages}`, alignment: 'right' },
        ], margin: [0, 4, 0, 0] },
      ],
      style: 'runFoot', margin: [54, 14, 54, 0],
    }),
    content,
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.25, color: INK },
    styles: {
      practice: { fontSize: 13, bold: true, alignment: 'center' },
      practiceSub: { fontSize: 9, alignment: 'center', color: '#333333' },
      title: { fontSize: 14, bold: true, alignment: 'center', margin: [0, 12, 0, 10], characterSpacing: 0.5 },
      idTable: { fontSize: 9, margin: [0, 0, 0, 12] },
      h2: { fontSize: 10.5, bold: true, margin: [0, 10, 0, 0], characterSpacing: 0.3 },
      h3: { fontSize: 10, bold: true, margin: [0, 4, 0, 2] },
      body: { margin: [0, 0, 0, 6], alignment: 'left' },
      list: { margin: [8, 0, 0, 6] },
      dl: { margin: [0, 0, 0, 4] },
      table: { fontSize: 9, margin: [0, 2, 0, 8] },
      sigLabel: { fontSize: 9 },
      caption: { fontSize: 8.5, italics: true, alignment: 'center', margin: [0, 3, 0, 0], color: '#333333' },
      runHead: { fontSize: 8, color: '#444444' },
      runFoot: { fontSize: 8, color: '#444444' },
    },
  };
}

export function makePdfBlob(model) {
  return new Promise((resolve, reject) => {
    try {
      window.pdfMake.createPdf(modelToPdf(model)).getBlob(resolve);
    } catch (e) {
      reject(e);
    }
  });
}
