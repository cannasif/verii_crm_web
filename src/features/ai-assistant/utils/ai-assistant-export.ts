import { exportSheetsToXlsx } from '@/lib/xlsx-export';
import { registerPdfExportFont } from '@/lib/pdf-export-font';
import type { AiAssistantStructuredResultDto } from '../types/ai-assistant.types';

type ExportParams = {
  result: AiAssistantStructuredResultDto;
  question: string;
  answer: string;
  language: string;
};

const createFileName = (resultType: string): string => {
  const safeType = resultType.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'result';
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13);
  return `crm-ai-${safeType}-${timestamp}`;
};

const normalizeCell = (value: unknown): string | number | boolean => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return String(value);
};

const collectDataSections = (result: AiAssistantStructuredResultDto): AiAssistantStructuredResultDto[] => {
  const sections = result.columns.length > 0 && result.rows.length > 0 ? [result] : [];
  return [
    ...sections,
    ...(result.sections ?? []).flatMap((section) => collectDataSections(section)),
  ];
};

const createUniqueSheetName = (title: string, usedNames: Set<string>): string => {
  const sanitizedTitle = ['\\', '/', '*', '?', ':', '[', ']']
    .reduce((value, character) => value.split(character).join(' '), title);
  const baseName = sanitizedTitle.trim().slice(0, 31) || 'Data';
  let candidate = baseName;
  let suffix = 2;
  while (usedNames.has(candidate.toLocaleLowerCase())) {
    const suffixText = ` ${suffix}`;
    candidate = `${baseName.slice(0, 31 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }

  usedNames.add(candidate.toLocaleLowerCase());
  return candidate;
};

export async function exportAiAssistantResultToExcel(params: ExportParams): Promise<void> {
  const fileName = createFileName(params.result.type);
  const dataSections = collectDataSections(params.result);
  const usedNames = new Set<string>();
  const summaryName = params.language.startsWith('en') ? 'Summary' : 'Ozet';
  usedNames.add(summaryName.toLocaleLowerCase());
  await exportSheetsToXlsx(fileName, [
    {
      name: summaryName,
      rows: [
        [params.language.startsWith('en') ? 'Question' : 'Soru', params.question],
        [params.language.startsWith('en') ? 'Answer' : 'Yanit', params.answer],
        [params.language.startsWith('en') ? 'Generated at' : 'Olusturma zamani', new Date()],
      ],
    },
    ...dataSections.map((section) => ({
      name: createUniqueSheetName(section.title, usedNames),
      rows: [
        section.columns.map((column) => column.label),
        ...section.rows.map((row) => section.columns.map((column) => normalizeCell(row[column.key]))),
      ],
    })),
  ]);
}

export async function exportAiAssistantResultToPdf(params: ExportParams): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true });
  const font = await registerPdfExportFont(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 32;

  doc.setFont(font, 'bold');
  doc.setFontSize(16);
  doc.text(params.result.title, margin, 38);
  doc.setFont(font, 'normal');
  doc.setFontSize(9);
  const questionLines = doc.splitTextToSize(params.question, pageWidth - margin * 2);
  doc.text(questionLines, margin, 58);
  const answerStartY = 58 + questionLines.length * 11 + 6;
  const answerLines = doc.splitTextToSize(params.answer, pageWidth - margin * 2);
  doc.text(answerLines.slice(0, 8), margin, answerStartY);
  const tableStartY = answerStartY + Math.min(answerLines.length, 8) * 11 + 14;
  const dataSections = collectDataSections(params.result);

  dataSections.forEach((section, index) => {
    if (index > 0) doc.addPage('a4', 'landscape');
    const sectionTitleY = index === 0 ? tableStartY : 38;
    doc.setFont(font, 'bold');
    doc.setFontSize(11);
    doc.text(section.title, margin, sectionTitleY);
    autoTable(doc, {
      startY: sectionTitleY + 10,
      head: [section.columns.map((column) => column.label)],
      body: section.rows.map((row) =>
        section.columns.map((column) => String(normalizeCell(row[column.key])))
      ),
      theme: 'grid',
      styles: { font, fontSize: 7, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { font, fontStyle: 'bold', fillColor: [27, 39, 66], textColor: 255 },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      margin: { left: margin, right: margin, bottom: 28 },
      showHead: 'everyPage',
    });
  });

  doc.save(`${createFileName(params.result.type)}.pdf`);
}
