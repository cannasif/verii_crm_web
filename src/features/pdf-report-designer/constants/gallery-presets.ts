export const PDF_GALLERY_PRESET_KEYS = [
  'commercialStarter',
  'compactSummary',
  'lineFocused',
  'signatureReady',
  'v3riiQuotation',
] as const;

export type PdfGalleryPresetKey = (typeof PDF_GALLERY_PRESET_KEYS)[number];
