import { isAxiosError } from 'axios';
import type { TFunction } from 'i18next';
import type { PdfReportDesignerCreateFormValues } from '../schemas/pdf-report-designer-create-schema';
import type { PdfCanvasElement } from '../types/pdf-report-template.types';
import { isPdfTableElement } from '../types/pdf-report-template.types';

export interface PdfTemplateValidationIssue {
  elementId?: string;
  elementIndex?: number;
  formField?: 'title' | 'ruleType';
  message: string;
}

const API_ELEMENT_ERROR_PATTERN = /^Elements\[(\d+)\]:\s*(.+)$/i;

export function extractPdfTemplateApiErrorStrings(err: unknown): string[] {
  if (!isAxiosError(err) || err.response?.data == null) return [];

  const data = err.response.data as Record<string, unknown>;
  const collected: string[] = [];

  if (typeof data.exceptionMessage === 'string' && data.exceptionMessage.trim()) {
    collected.push(data.exceptionMessage.trim());
  }

  if (Array.isArray(data.errors)) {
    for (const item of data.errors) {
      if (typeof item === 'string' && item.trim()) collected.push(item.trim());
      if (typeof item === 'object' && item != null && 'message' in item) {
        const message = String((item as { message: unknown }).message).trim();
        if (message) collected.push(message);
      }
    }
  }

  return [...new Set(collected)];
}

export function parsePdfTemplateApiErrors(
  errors: string[],
  elements: PdfCanvasElement[],
  t: TFunction
): PdfTemplateValidationIssue[] {
  return errors.map((raw) => {
    const match = raw.match(API_ELEMENT_ERROR_PATTERN);
    if (!match) {
      return { message: raw };
    }

    const index = Number(match[1]);
    const element = elements[index];
    const detail = match[2].trim();

    if (/table must have at least one column/i.test(detail)) {
      return {
        elementId: element?.id,
        elementIndex: index,
        message: t('pdfReportDesigner.validation.tableNoColumns', { index: index + 1 }),
      };
    }

    return {
      elementId: element?.id,
      elementIndex: index,
      message: t('pdfReportDesigner.validation.elementIssue', { index: index + 1, detail }),
    };
  });
}

export function validatePdfTemplateForm(
  values: PdfReportDesignerCreateFormValues,
  t: TFunction
): PdfTemplateValidationIssue[] {
  const issues: PdfTemplateValidationIssue[] = [];

  if (!values.title?.trim()) {
    issues.push({
      formField: 'title',
      message: t('reportDesigner.form.requiredTitle'),
    });
  }

  return issues;
}

export function validatePdfTemplateElements(
  elements: PdfCanvasElement[],
  t: TFunction
): PdfTemplateValidationIssue[] {
  const issues: PdfTemplateValidationIssue[] = [];

  elements.forEach((element, index) => {
    if (!isPdfTableElement(element)) return;
    if (element.columns.length > 0) return;

    issues.push({
      elementId: element.id,
      elementIndex: index,
      message: t('pdfReportDesigner.validation.tableNoColumns', { index: index + 1 }),
    });
  });

  return issues;
}

export function validatePdfTemplate(
  values: PdfReportDesignerCreateFormValues,
  elements: PdfCanvasElement[],
  t: TFunction
): PdfTemplateValidationIssue[] {
  return [...validatePdfTemplateForm(values, t), ...validatePdfTemplateElements(elements, t)];
}
