export interface DocumentReturnNavigationState {
  returnTo?: string;
}

export function getDocumentReturnTo(state: unknown): string | undefined {
  return (state as DocumentReturnNavigationState | null)?.returnTo;
}

export function createDocumentReturnNavigationState(returnTo: string): DocumentReturnNavigationState {
  return { returnTo };
}
