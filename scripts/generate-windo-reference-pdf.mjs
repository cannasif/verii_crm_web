import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsPDF as JsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDFDocument } from 'pdf-lib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const publicDir = path.resolve(repoRoot, 'verii_crm_web', 'public');
const layoutSpecPath = path.resolve(repoRoot, 'pdf-samples', 'windo-quotation-layout-spec.json');
const layoutSpec = JSON.parse(await readFile(layoutSpecPath, 'utf8'));

const ATLAS_COVER_PDF_PATH = path.join(publicDir, 'pdf-templates', 'atlas-cover-first-3-pages.pdf');
const PDF_FONT_PATH = path.join(publicDir, 'fonts', 'arial.ttf');
const BRAND_LOGO_PATH = path.join(publicDir, 'logo.png');
const REFERENCE_IMAGE_PATHS = [
  path.join(publicDir, 'logo.png'),
  path.join(publicDir, 'login.jpg'),
  path.join(publicDir, 'v3rii.jpeg'),
];

const COMPANY_NAME = 'WINDOFORM KAPI & PENCERE AKS.';
const COMPANY_CONTACT_LINES = [
  'Kazım Karabekir Mah. 8501 Sokak No:7-B D:18 Buca / İzmir',
  '(0232) 854 70 00',
  'info@windoform.com.tr',
];
const TERMS_LINES = [
  'Yukarıdaki fiyatlara KDV dahil değildir.',
  'Bu teklif oluşturulduktan sonra 15 gün geçerlidir.',
  'Fiyatlara fabrika teslimi (veya belirtilen teslim şekline göre) fiyatlandırma dahildir.',
  'Ödemeler sipariş onayı ile %30 peşin, kalan teslimatta yapılır.',
  'Belirtilen teslim tarihi sipariş onayından itibaren geçerlidir.',
];

function formatCurrency(amount, currencyCode) {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)} ${currencyCode}`;
  }
}

function normalizeCustomerAccountName(value) {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';
  const erpMatch = trimmed.match(/^ERP:\s*[^-]+-\s*(.+)$/i);
  if (erpMatch?.[1]) return erpMatch[1].trim();
  return trimmed;
}

function getCurrencyPresentation(value) {
  const normalized = String(value ?? 'TRY').trim().toUpperCase();
  switch (normalized) {
    case '0':
    case 'TL':
    case 'TRY':
      return { code: 'TRY', label: 'Türk Lirası' };
    case '1':
    case 'USD':
      return { code: 'USD', label: 'ABD Doları' };
    case '2':
    case 'EUR':
      return { code: 'EUR', label: 'Euro' };
    case '3':
    case 'GBP':
      return { code: 'GBP', label: 'İngiliz Sterlini' };
    default:
      return { code: normalized || 'TRY', label: normalized || 'Türk Lirası' };
  }
}

function formatDate(value) {
  if (!value) return '';
  const normalized = value.includes('T') ? value.split('T')[0] : value;
  const date = new Date(`${normalized}T12:00:00`);
  if (Number.isNaN(date.getTime())) return normalized;
  return date.toLocaleDateString('tr-TR');
}

function buildDescription(line) {
  const extra = [line.description1, line.description2, line.description3]
    .map((value) => value?.trim() ?? '')
    .filter(Boolean)
    .join(' • ');

  if (!extra) return line.productName;
  return `${line.productName}\n${extra}`;
}

function buildDiscountSummary(line) {
  return [
    line.discountRate1 ? `%${line.discountRate1}` : '%0',
    line.discountRate2 ? `%${line.discountRate2}` : '%0',
    line.discountRate3 ? `%${line.discountRate3}` : '%0',
  ].join(' / ');
}

function calculateTotals(lines) {
  return lines.reduce(
    (acc, line) => {
      const grossLineTotal = (line.quantity || 0) * (line.unitPrice || 0);
      const discountAmount =
        (line.discountAmount1 || 0) + (line.discountAmount2 || 0) + (line.discountAmount3 || 0);
      const netTotal = line.lineTotal || 0;
      const vatTotal = line.vatAmount || Math.max((line.lineGrandTotal || 0) - netTotal, 0);
      const grandTotal = line.lineGrandTotal || netTotal + vatTotal;

      acc.grossTotal += grossLineTotal;
      acc.discountTotal += discountAmount;
      acc.netTotal += netTotal;
      acc.vatTotal += vatTotal;
      acc.grandTotal += grandTotal;
      return acc;
    },
    { grossTotal: 0, discountTotal: 0, netTotal: 0, vatTotal: 0, grandTotal: 0 }
  );
}

function normalizeMetaFields(fields) {
  return (fields ?? [])
    .map((field) => ({
      label: field.label?.trim() ?? '',
      value: field.value?.trim() ?? '',
    }))
    .filter((field) => field.label && field.value);
}

async function fileToDataUrl(filePath) {
  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime =
      ext === '.png' ? 'image/png' :
      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
      ext === '.ttf' ? 'font/ttf' :
      'application/octet-stream';
    return `data:${mime};base64,${data.toString('base64')}`;
  } catch {
    return null;
  }
}

async function buildLinesPdfBytes(sample, options = {}) {
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const currency = getCurrencyPresentation(sample.currencyCode);
  const totals = calculateTotals(sample.lines);
  const rowMetrics = [];
  const [logoDataUrl, ...referenceDataUrls] = await Promise.all([
    fileToDataUrl(BRAND_LOGO_PATH),
    ...REFERENCE_IMAGE_PATHS.map((filePath) => fileToDataUrl(filePath)),
  ]);

  try {
    const fontBytes = await readFile(PDF_FONT_PATH);
    const fontBinary = Array.from(fontBytes, (byte) => String.fromCharCode(byte)).join('');
    doc.addFileToVFS('arial.ttf', fontBinary);
    doc.addFont('arial.ttf', 'ArialCustom', 'normal');
    doc.setFont('ArialCustom', 'normal');
  } catch {
    // Fallback to built-in font if Arial cannot be loaded.
  }

  const customerName = normalizeCustomerAccountName(sample.customerName);
  const customerDetailLines = [
    customerName,
    sample.representativeName ? `Satınalma Departmanı: ${sample.representativeName}` : '',
    sample.address || sample.shippingAddress || '',
    sample.erpCustomerCode || '',
  ].filter(Boolean);

  const noteLines = [
    ...normalizeMetaFields(sample.metaFields).map((field) => `${field.label}: ${field.value}`),
    ...(sample.description ? [sample.description] : []),
    ...(sample.notes ?? []).filter((item) => item.trim().length > 0),
  ].slice(0, 5);

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, 'F');
  doc.setFillColor(52, 90, 153);
  doc.rect(0, 0, 210, 4, 'F');

  doc.setDrawColor(215, 221, 232);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(12, 11, 86, 33, 2, 2, 'FD');
  doc.roundedRect(104, 11, 94, 33, 2, 2, 'FD');
  doc.roundedRect(12, 50, 86, 37, 2, 2, 'FD');
  doc.roundedRect(104, 50, 94, 37, 2, 2, 'FD');

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', 24, 19, 52, 17, undefined, 'FAST');
  } else {
    doc.setTextColor(52, 90, 153);
    doc.setFontSize(22);
    doc.text('WINDOFORM', 55, 28, { align: 'center' });
  }

  doc.setTextColor(52, 90, 153);
  doc.setFontSize(11);
  doc.text('FİYAT TEKLİFİ', 108, 19);

  const offerInfoLines = [
    ['Teklif No', sample.offerNo ?? '-'],
    ['Tarih', formatDate(sample.offerDate) || new Date().toLocaleDateString('tr-TR')],
    ['Teslim', formatDate(sample.deliveryDate) || '-'],
  ];

  doc.setTextColor(58, 65, 83);
  doc.setFontSize(8.5);
  offerInfoLines.forEach(([label, value], index) => {
    const y = 27 + index * 7;
    doc.text(`${label}:`, 108, y);
    doc.text(String(value), 190, y, { align: 'right' });
  });

  doc.setTextColor(52, 90, 153);
  doc.setFontSize(10);
  doc.text(COMPANY_NAME, 16, 58);
  doc.setTextColor(90, 98, 116);
  doc.setFontSize(7.5);
  COMPANY_CONTACT_LINES.forEach((line, index) => {
    doc.text(line, 16, 65 + index * 5.2);
  });

  doc.setTextColor(180, 186, 196);
  doc.setFontSize(6.5);
  doc.text('MÜŞTERİ (CARİ)', 108, 58);
  doc.setTextColor(52, 90, 153);
  doc.setFontSize(9.5);
  if (customerDetailLines.length > 0) {
    doc.text(customerDetailLines[0], 108, 64);
  }
  doc.setTextColor(90, 98, 116);
  doc.setFontSize(7.4);
  customerDetailLines.slice(1).forEach((line, index) => {
    doc.text(line, 108, 70 + index * 5.2, { maxWidth: 82 });
  });

  const tableRows = sample.lines.map((line) => [
    '',
    line.productCode ?? '',
    buildDescription(line),
    `${line.quantity || 0}`,
    formatCurrency(line.unitPrice || 0, currency.code),
    buildDiscountSummary(line),
    formatCurrency(line.lineTotal || 0, currency.code),
  ]);

  autoTable(doc, {
    startY: 94,
    margin: { left: 12, right: 12 },
    head: [[
      'GÖRSEL',
      'STOK KODU',
      'STOK ADI / AÇIKLAMA',
      'MİKTAR',
      'BİRİM FİYAT',
      'İSKONTO',
      'NET TOPLAM',
    ]],
    body: tableRows,
    theme: 'grid',
    styles: {
      font: 'ArialCustom',
      fontStyle: 'normal',
      fontSize: 7.5,
      lineColor: [220, 226, 236],
      lineWidth: 0.15,
      textColor: [46, 57, 77],
      cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
      valign: 'middle',
    },
    headStyles: {
      fillColor: [52, 90, 153],
      textColor: [255, 255, 255],
      fontSize: 7.2,
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 67 },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 23, halign: 'right' },
      5: { cellWidth: 18, halign: 'right' },
      6: { cellWidth: 28, halign: 'right' },
    },
    didDrawCell(data) {
      if (data.section === 'body' && data.column.index === 0) {
        const x = data.cell.x + 2;
        const y = data.cell.y + 2;
        const size = Math.min(12, data.cell.height - 4);
        doc.setDrawColor(213, 219, 229);
        doc.rect(x, y, size, size);
        if (logoDataUrl) {
          doc.addImage(logoDataUrl, 'PNG', x + 1, y + 1, size - 2, size - 2, undefined, 'FAST');
        } else {
          doc.setTextColor(120, 131, 149);
          doc.setFontSize(6);
          doc.text('WF', x + size / 2, y + size / 2 + 1.5, { align: 'center' });
        }
      }

      if (data.section === 'body' && data.column.index === 2) {
        rowMetrics.push({
          rowIndex: data.row.index,
          pageNumber: doc.getCurrentPageInfo().pageNumber,
          y: Number(data.cell.y.toFixed(3)),
          height: Number(data.cell.height.toFixed(3)),
          rawText: buildDescription(sample.lines[data.row.index] ?? {}),
          renderedLines: Array.isArray(data.cell.text) ? data.cell.text : [String(data.cell.text ?? '')],
          renderedLineCount: Array.isArray(data.cell.text) ? data.cell.text.length : 1,
        });
      }
    },
  });

  const finalY = doc.lastAutoTable?.finalY ?? 150;
  const summaryStartY = Math.max(finalY + layoutSpec.summary.topPadding, layoutSpec.summary.minStartY);
  const metrics = {
    table: {
      rowMetrics,
      finalY: Number(finalY.toFixed(3)),
      summaryStartY: Number(summaryStartY.toFixed(3)),
      pageCount: doc.getNumberOfPages(),
    },
  };

  doc.setDrawColor(199, 208, 220);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(12, summaryStartY, 72, 22, 2, 2, 'FD');
  doc.roundedRect(134, summaryStartY, 64, 32, 2, 2, 'FD');

  doc.setTextColor(123, 132, 148);
  doc.setFontSize(7);
  doc.text('MÜŞTERİ ONAYI', 16, summaryStartY + 6);
  doc.setDrawColor(210, 216, 226);
  doc.line(18, summaryStartY + 15, 76, summaryStartY + 15);
  doc.setFontSize(6.5);
  doc.text('Kaşe ve imza', 47, summaryStartY + 20, { align: 'center' });

  const summaryLines = [
    ['Brüt Toplam', totals.grossTotal],
    ['İskonto Toplam', totals.discountTotal],
    ['Net Ara Toplam', totals.netTotal],
    [`KDV (%${sample.lines[0]?.vatRate ?? 20})`, totals.vatTotal],
  ];
  doc.setTextColor(123, 132, 148);
  doc.setFontSize(layoutSpec.summary.labelFontSize);
  summaryLines.forEach(([label, value], index) => {
    const y = summaryStartY + 7 + index * 5.5;
    doc.text(label, 138, y);
    doc.text(formatCurrency(Number(value), currency.code), 194, y, { align: 'right' });
  });
  doc.setTextColor(52, 90, 153);
  doc.setFontSize(layoutSpec.summary.totalFontSize);
  doc.text('Genel Toplam:', 138, summaryStartY + 28);
  doc.text(formatCurrency(totals.grandTotal, currency.code), 194, summaryStartY + 28, { align: 'right' });

  const noteSectionY = summaryStartY + 42;
  doc.setFillColor(248, 250, 253);
  doc.rect(0, noteSectionY, 210, layoutSpec.notes.sectionHeight, 'F');
  doc.setDrawColor(52, 90, 153);
  doc.setLineWidth(0.6);
  doc.line(12, noteSectionY + 4, 12, noteSectionY + 34);
  doc.setLineWidth(0.2);
  doc.setTextColor(52, 90, 153);
  doc.setFontSize(layoutSpec.notes.titleFontSize);
  doc.text('TEKLİF ŞARTLARI VE ÖNEMLİ NOTLAR', 16, noteSectionY + 8);
  doc.setDrawColor(182, 191, 206);
  doc.roundedRect(16, noteSectionY + 12, layoutSpec.notes.deliveryBadgeWidth, layoutSpec.notes.deliveryBadgeHeight, 1.2, 1.2, 'S');
  doc.setFontSize(layoutSpec.notes.bodyFontSize);
  doc.setTextColor(80, 90, 110);
  doc.text(
    `TESLİM ŞEKLİ (DELIVERY TERMS): ${sample.salesTypeName || 'Belirtilecektir'}`,
    18,
    noteSectionY + 17
  );

  const renderedTerms = noteLines.length > 0 ? noteLines : TERMS_LINES;
  renderedTerms.slice(0, 6).forEach((line, index) => {
    const isLeft = index < 3;
    const x = isLeft ? 16 : 109;
    const y = noteSectionY + 25 + (index % 3) * layoutSpec.notes.lineGap;
    doc.text(`• ${line}`, x, y, { maxWidth: isLeft ? 84 : 84 });
  });

  const referenceStartY = noteSectionY + 44;
  doc.setTextColor(52, 90, 153);
  doc.setFontSize(9);
  doc.text('SAHA VE KEŞİF GÖRSELLERİ (REFERANS)', 16, referenceStartY);
  doc.setFontSize(6.8);
  doc.setTextColor(126, 134, 149);
  doc.text(
    'Bu görseller, teklifin montaj ve proje süreçlerine ait örnek başlıklardır. Referans niteliğiyle eklenmiştir.',
    16,
    referenceStartY + 5
  );

  const referenceBoxY = referenceStartY + 9;
  [16, 74, 132].forEach((x, index) => {
    doc.setDrawColor(196, 204, 216);
    doc.roundedRect(x, referenceBoxY, 46, 24, 1.5, 1.5, 'S');
    const imageData = referenceDataUrls[index] || logoDataUrl;
    if (imageData) {
      doc.addImage(imageData, x + 1.5, referenceBoxY + 1.5, 43, 17, undefined, 'FAST');
    }
    doc.setTextColor(90, 98, 116);
    doc.setFontSize(6.2);
    doc.text(`Referans ${index + 1}`, x + 23, referenceBoxY + 21.5, { align: 'center' });
  });

  if (options.metricsOutputPath) {
    await mkdir(path.dirname(options.metricsOutputPath), { recursive: true });
    await writeFile(options.metricsOutputPath, JSON.stringify(metrics, null, 2));
  }

  return doc.output('arraybuffer');
}

async function mergeAtlasCoverWithLinesPdf(linesPdfBytes) {
  const coverPdfBytes = await readFile(ATLAS_COVER_PDF_PATH);
  const mergedPdf = await PDFDocument.create();
  const [coverPdf, linesPdf] = await Promise.all([
    PDFDocument.load(coverPdfBytes),
    PDFDocument.load(linesPdfBytes),
  ]);

  const coverPages = await mergedPdf.copyPages(coverPdf, coverPdf.getPageIndices());
  coverPages.forEach((page) => mergedPdf.addPage(page));
  const linePages = await mergedPdf.copyPages(linesPdf, linesPdf.getPageIndices());
  linePages.forEach((page) => mergedPdf.addPage(page));
  return Buffer.from(await mergedPdf.save());
}

function noteFieldsToArray(sample) {
  return Object.entries(sample)
    .filter(([key, value]) => /^note\d+$/i.test(key) && typeof value === 'string' && value.trim().length > 0)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey, 'en'))
    .map(([, value]) => value.trim());
}

function expandLines(lines, repeatFactor) {
  if (!Array.isArray(lines) || repeatFactor <= 1) {
    return lines ?? [];
  }

  const expanded = [];
  for (let iteration = 1; iteration <= repeatFactor; iteration += 1) {
    for (const line of lines) {
      expanded.push({
        ...line,
        productCode: line.productCode ? `${line.productCode}-${iteration}` : line.productCode,
        productName: `${line.productName} Faz ${iteration}`,
        erpProjectCode: line.erpProjectCode ? `${line.erpProjectCode}-${iteration}` : line.erpProjectCode,
      });
    }
  }

  return expanded;
}

async function main() {
  const samplePath = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(repoRoot, 'pdf-samples', 'windo-quotation-sample.json');
  const outputPath = process.argv[3] ? path.resolve(process.argv[3]) : path.resolve(repoRoot, 'tmp', 'reference-windo-quotation.pdf');
  const includeCover = process.argv.includes('--include-cover');
  const metricsFlagIndex = process.argv.indexOf('--metrics-output');
  const metricsOutputPath = metricsFlagIndex >= 0 && process.argv[metricsFlagIndex + 1]
    ? path.resolve(process.argv[metricsFlagIndex + 1])
    : null;

  const rawSample = JSON.parse(await readFile(samplePath, 'utf8'));
  const sample = {
    fileName: path.basename(outputPath),
    title: 'Windo Teklif',
    currencyCode: rawSample.currency ?? 'TRY',
    lines: expandLines(rawSample.lines ?? [], rawSample.repeatFactor ?? 1),
    offerNo: rawSample.offerNo ?? null,
    customerName: rawSample.customerName ?? rawSample.potentialCustomerName ?? null,
    representativeName: rawSample.representativeName ?? null,
    address: rawSample.shippingAddressText ?? null,
    shippingAddress: rawSample.shippingAddressText ?? null,
    erpCustomerCode: rawSample.erpCustomerCode ?? null,
    offerDate: rawSample.offerDate ?? null,
    deliveryDate: rawSample.deliveryDate ?? null,
    validUntil: rawSample.validUntil ?? null,
    paymentTypeName: rawSample.paymentTypeName ?? null,
    salesTypeName: rawSample.salesTypeDefinitionName ?? null,
    projectCode: rawSample.erpProjectCode ?? null,
    description: rawSample.description ?? null,
    notes: noteFieldsToArray(rawSample),
    metaFields: [
      { label: 'Seri No', value: rawSample.documentSerialTypeName ?? null },
    ],
  };

  const linesPdfBytes = await buildLinesPdfBytes(sample, { metricsOutputPath });
  const outputBytes = includeCover ? await mergeAtlasCoverWithLinesPdf(linesPdfBytes) : Buffer.from(linesPdfBytes);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, outputBytes);
  console.log(outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
