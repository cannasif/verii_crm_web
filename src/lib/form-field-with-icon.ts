export const FORM_FIELD_ICON_PADDING_LEFT = '2.5rem';
export const FORM_FIELD_ICON_PADDING_LEFT_CLASS = 'pl-10';
export const FORM_FIELD_ICON_PADDING_LEFT_CLASS_LG = 'pl-12';

export function hasIconPrefixPadding(className?: string | null): boolean {
  if (!className) return false;
  return className.includes(FORM_FIELD_ICON_PADDING_LEFT_CLASS) || className.includes(FORM_FIELD_ICON_PADDING_LEFT_CLASS_LG);
}

export function getIconPrefixPaddingStyle(className?: string | null): { paddingLeft: string } | undefined {
  if (!hasIconPrefixPadding(className)) return undefined;
  return { paddingLeft: className?.includes(FORM_FIELD_ICON_PADDING_LEFT_CLASS_LG) ? '3rem' : FORM_FIELD_ICON_PADDING_LEFT };
}
