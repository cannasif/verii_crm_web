import { createClientId } from '@/lib/create-client-id';

import { A4_CANVAS_WIDTH, mmToCanvasX, mmToCanvasY } from '../constants';

import type { PdfCanvasElement, PdfReportElement, PdfTableElement } from '../types/pdf-report-template.types';

import {

  buildV3riiTableColumns,

  resolveTemplateField,

  type PdfFieldLike,

} from './resolve-template-field-paths';



export type { PdfFieldLike };



const NAVY = '#3c1636';

const PINK = '#e5117d';

const ORANGE = '#ff8c1c';

const INK = '#2a1b2a';

const MUTED = '#786674';

const BORDER = '#e4d6df';

const ROW_ALT = '#fcf7fa';



export interface V3riiQuotationPresetResult {

  elements: PdfCanvasElement[];

  missingSlots: string[];

}



function mm(x: number, y: number, w: number, h: number): { x: number; y: number; width: number; height: number } {

  return {

    x: Math.round(mmToCanvasX(x)),

    y: Math.round(mmToCanvasY(y)),

    width: Math.round(mmToCanvasX(w)),

    height: Math.round(mmToCanvasY(h)),

  };

}



function textEl(

  text: string,

  box: { x: number; y: number; width: number; height: number },

  options?: Partial<PdfReportElement>

): PdfReportElement {

  return {

    id: createClientId(),

    type: 'text',

    section: 'page',

    pageNumbers: [1],

    fontSize: 12,

    fontFamily: 'Helvetica',

    color: INK,

    text,

    ...box,

    ...options,

  };

}



function fieldEl(

  field: PdfFieldLike,

  box: { x: number; y: number; width: number; height: number },

  options?: Partial<PdfReportElement>

): PdfReportElement {

  return {

    id: createClientId(),

    type: 'field',

    section: 'page',

    pageNumbers: [1],

    text: field.label,

    value: field.label,

    path: field.path,

    fontSize: 12,

    fontFamily: 'Helvetica',

    color: INK,

    ...box,

    ...options,

  };

}



function shapeEl(

  box: { x: number; y: number; width: number; height: number },

  style: PdfReportElement['style']

): PdfReportElement {

  return {

    id: createClientId(),

    type: 'shape',

    section: 'page',

    pageNumbers: [1],

    style,

    ...box,

  };

}



/**

 * Teklif PDF onizlemesi (build-quotation-preview-pdf) ile ayni yapi.

 * Tum alan path'leri API'den gelen field listesinden cozulur; sabit path kullanilmaz.

 */

export function createV3riiQuotationPresetElements(

  headerFields: PdfFieldLike[],

  lineFields: PdfFieldLike[]

): V3riiQuotationPresetResult {

  const missingSlots: string[] = [];



  const branchField =
    resolveTemplateField(
      headerFields,
      ['branchname', 'warehousename', 'representationbranch', 'branch', 'depoadi', 'depoismi'],
      ['sube', 'depo', 'veren', 'teklif veren']
    ) ??
    resolveTemplateField(headerFields, ['companyname', 'firmname'], ['sirket', 'firma', 'unvan']);

  const branchCodeField = resolveTemplateField(

    headerFields,

    ['branchcode', 'warehousecode', 'branchid'],

    ['sube kod', 'depo kod']

  );

  const customerField = resolveTemplateField(

    headerFields,

    ['potentialcustomername', 'customername', 'erpcustomername'],

    ['musteri', 'cari', 'verilen', 'teklif verilen']

  );

  const offerDateField = resolveTemplateField(

    headerFields,

    ['offerdate', 'quotationdate', 'createddate'],

    ['tarih', 'teklif tarih']

  );

  const offerNoField = resolveTemplateField(

    headerFields,

    ['offerno', 'quotationno', 'documentno'],

    ['teklif no', 'belge no']

  );



  if (!customerField) missingSlots.push('Müşteri');

  if (!offerDateField) missingSlots.push('Tarih');

  if (!offerNoField) missingSlots.push('Teklif No');



  const M = 14;

  const gap = 6;

  const contentW = 182;

  const colW = (contentW - gap) / 2;

  const cardY = 28;

  const cardH = 32;

  const rightX = M + colW + gap;

  const tableY = cardY + cardH + 8;



  const elements: PdfCanvasElement[] = [

    shapeEl(mm(0, 0, 210, 3.2), {

      background: `linear-gradient(90deg, ${PINK} 0%, ${ORANGE} 100%)`,

      border: 'none',

      radius: 0,

    }),

    textEl('FİYAT TEKLİFİ', { x: 0, y: mm(0, 12, 0, 0).y, width: A4_CANVAS_WIDTH, height: Math.round(mmToCanvasY(12)) }, {

      fontSize: 23,

      fontFamily: 'Helvetica-Bold',

      color: NAVY,

      style: { textAlign: 'center' },

    }),

    shapeEl(mm(87, 20.6, 36, 1.4), {

      background: `linear-gradient(90deg, ${PINK} 0%, ${ORANGE} 100%)`,

      border: 'none',

      radius: 2,

    }),

    shapeEl(mm(M, cardY, colW, cardH), {

      background: '#ffffff',

      border: `1px solid ${BORDER}`,

      radius: 10,

    }),

    shapeEl(mm(M, cardY, 2.2, cardH), { background: PINK, border: 'none', radius: 0 }),

    textEl('TEKLİF VEREN', mm(M + 6, cardY + 4, colW - 12, 5), {

      fontSize: 7,

      fontFamily: 'Helvetica-Bold',

      color: PINK,

    }),

    branchField
      ? fieldEl(branchField, mm(M + 6, cardY + 10, colW - 12, 10), {
          fontSize: 12,
          fontFamily: 'Helvetica-Bold',
          color: INK,
          style: { textAlign: 'left' },
        })
      : textEl('Firma Adınız', mm(M + 6, cardY + 10, colW - 12, 10), {
          fontSize: 12,
          fontFamily: 'Helvetica-Bold',
          color: INK,
          style: { textAlign: 'left' },
        }),

    ...(branchCodeField

      ? [

          fieldEl(branchCodeField, mm(M + 6, cardY + 22, colW - 12, 6), {

            fontSize: 8,

            color: MUTED,

            style: { textAlign: 'left' },

          }),

        ]

      : []),

    shapeEl(mm(rightX, cardY, colW, cardH), {

      background: '#ffffff',

      border: `1px solid ${BORDER}`,

      radius: 10,

    }),

    shapeEl(mm(rightX, cardY, 2.2, cardH), { background: ORANGE, border: 'none', radius: 0 }),

    textEl('TEKLİF VERİLEN', mm(rightX + 6, cardY + 4, colW - 12, 5), {

      fontSize: 7,

      fontFamily: 'Helvetica-Bold',

      color: ORANGE,

    }),

    ...(customerField

      ? [

          fieldEl(customerField, mm(rightX + 6, cardY + 10, colW - 12, 10), {

            fontSize: 12,

            fontFamily: 'Helvetica-Bold',

            color: INK,

            style: { textAlign: 'left' },

          }),

        ]

      : []),

    shapeEl(mm(rightX + 6, cardY + 21, colW - 12, 0.3), { background: BORDER, border: 'none', radius: 0 }),

    textEl('TARİH', mm(rightX + 6, cardY + 23, 28, 5), { fontSize: 7, color: MUTED }),

    ...(offerDateField

      ? [

          fieldEl(offerDateField, mm(rightX + colW - 42, cardY + 23, 30, 5), {

            fontSize: 9.5,

            fontFamily: 'Helvetica-Bold',

            color: INK,

            style: { textAlign: 'right' },

          }),

        ]

      : []),

    textEl('TEKLİF NO', mm(rightX + 6, cardY + 28, 34, 5), { fontSize: 7, color: MUTED }),

    ...(offerNoField

      ? [

          fieldEl(offerNoField, mm(rightX + 40, cardY + 28, colW - 46, 5), {

            fontSize: 9.5,

            fontFamily: 'Helvetica-Bold',

            color: INK,

            style: { textAlign: 'right' },

          }),

        ]

      : []),

  ];



  const tableColumns = buildV3riiTableColumns(lineFields);

  if (tableColumns.length === 0) {

    missingSlots.push('Tablo satırları');

  }



  const table: PdfTableElement = {

    id: createClientId(),

    type: 'table',

    section: 'content',

    ...mm(M, tableY, contentW, 110),

    columns: tableColumns,

    headerStyle: {

      fontSize: 7.5,

      fontFamily: 'Helvetica-Bold',

      color: '#ffffff',

      backgroundColor: NAVY,

    },

    rowStyle: {

      fontSize: 8,

      fontFamily: 'Helvetica',

      color: INK,

    },

    alternateRowStyle: {

      fontSize: 8,

      fontFamily: 'Helvetica',

      color: INK,

      backgroundColor: ROW_ALT,

    },

    tableOptions: {

      repeatHeader: true,

      pageBreak: 'auto',

      showBorders: true,

      dense: true,

    },

    pageNumbers: [1],

  };



  const totalsY = tableY + 118;

  const currencyField = resolveTemplateField(

    headerFields,

    ['currency', 'currencycode'],

    ['para birim', 'doviz']

  );

  const totalsBlock: PdfReportElement = {

    id: createClientId(),

    type: 'quotationTotals',

    section: 'content',

    ...mm(108, totalsY, 88, 62),

    text: 'FİYAT DETAYI',

    fontSize: 8,

    fontFamily: 'Helvetica-Bold',

    color: NAVY,

    style: {

      background: '#ffffff',

      border: `1px solid ${BORDER}`,

      radius: 10,

      padding: 0,

    },

    quotationTotalsOptions: {

      layout: 'single',

      currencyMode: 'code',

      currencyPath: currencyField?.path ?? 'Currency',

      grossLabel: 'Brüt Toplam',

      discountLabel: 'Genel İskonto',

      netLabel: 'Net Ara Toplam',

      vatLabel: 'KDV',

      grandLabel: 'GENEL TOPLAM (KDV DAHİL)',

      showGross: true,

      showDiscount: false,

      showVat: true,

      emphasizeGrandTotal: true,

    },

    pageNumbers: [1],

  };



  return {

    elements: [...elements, table, totalsBlock],

    missingSlots,

  };

}


