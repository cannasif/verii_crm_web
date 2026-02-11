export const OfferType = {
  YURTICI: 'YURTICI',
  YURTDISI: 'YURTDISI',
} as const;

export type OfferTypeValue = (typeof OfferType)[keyof typeof OfferType];

export type OfferType = OfferTypeValue;

export const DEFAULT_OFFER_TYPE: OfferTypeValue = OfferType.YURTICI;

export const OFFER_TYPE_VALUES: OfferTypeValue[] = [OfferType.YURTICI, OfferType.YURTDISI];

export function isOfferType(value: string | null | undefined): value is OfferTypeValue {
  return value === OfferType.YURTICI || value === OfferType.YURTDISI;
}

const LEGACY_TO_OFFER_TYPE: Record<string, OfferTypeValue> = {
  Domestic: OfferType.YURTICI,
  Export: OfferType.YURTDISI,
};

export function normalizeOfferType(value: string | null | undefined): OfferTypeValue {
  if (isOfferType(value)) return value;
  if (value && value in LEGACY_TO_OFFER_TYPE) return LEGACY_TO_OFFER_TYPE[value];
  return DEFAULT_OFFER_TYPE;
}
