import { categoryDefinitionsApi } from '@/features/category-definitions/api/category-definitions-api';
import type { CatalogCategoryNodeDto } from '@/features/category-definitions/types/category-definition-types';

export const MAX_CATEGORY_CLIENT_SEARCH_RESULTS = 80;

function normalizeCategorySearchText(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR');
}

export function tokenizeCategorySearchQuery(raw: string): string[] {
  return normalizeCategorySearchText(raw)
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

export function categoryNodeMatchesSearchTokens(
  node: CatalogCategoryNodeDto,
  tokens: string[]
): boolean {
  if (tokens.length === 0) {
    return false;
  }
  const haystack = normalizeCategorySearchText(
    [node.name, node.code, node.fullPath ?? ''].filter(Boolean).join(' \u0001 ')
  );
  return tokens.every((token) => haystack.includes(token));
}

export function filterCategoryNodesForClientSearch(
  nodes: CatalogCategoryNodeDto[],
  query: string,
  options: { includeBranches: boolean }
): CatalogCategoryNodeDto[] {
  const tokens = tokenizeCategorySearchQuery(query);
  if (tokens.length === 0) {
    return [];
  }
  const pool = options.includeBranches ? nodes : nodes.filter((n) => !n.hasChildren);
  const matched = pool.filter((n) => categoryNodeMatchesSearchTokens(n, tokens));
  matched.sort((a, b) => {
    const pa = (a.fullPath ?? a.name).localeCompare(b.fullPath ?? b.name, 'tr-TR');
    return pa !== 0 ? pa : a.catalogCategoryId - b.catalogCategoryId;
  });
  return matched.slice(0, MAX_CATEGORY_CLIENT_SEARCH_RESULTS);
}

export function buildCategoryIdIndex(nodes: CatalogCategoryNodeDto[]): Map<number, CatalogCategoryNodeDto> {
  const map = new Map<number, CatalogCategoryNodeDto>();
  for (const n of nodes) {
    map.set(n.catalogCategoryId, n);
  }
  return map;
}

export function buildAncestorChainFromRoot(
  node: CatalogCategoryNodeDto,
  byId: Map<number, CatalogCategoryNodeDto>
): CatalogCategoryNodeDto[] {
  const reversed: CatalogCategoryNodeDto[] = [];
  let current: CatalogCategoryNodeDto | undefined = node;
  const guard = new Set<number>();
  while (current != null && !guard.has(current.catalogCategoryId)) {
    guard.add(current.catalogCategoryId);
    reversed.push(current);
    const nextParentId: number | null | undefined = current.parentCatalogCategoryId;
    current =
      nextParentId != null && nextParentId !== undefined ? byId.get(nextParentId) : undefined;
  }
  reversed.reverse();
  return reversed;
}

export async function fetchCatalogCategoryTreeFlat(catalogId: number): Promise<CatalogCategoryNodeDto[]> {
  const out: CatalogCategoryNodeDto[] = [];
  const queue: Array<number | null> = [null];

  while (queue.length > 0) {
    const parentId: number | null | undefined = queue.shift() ?? undefined;
    const children = await categoryDefinitionsApi.getCatalogCategories(
      catalogId,
      parentId ?? undefined
    );
    for (const child of children) {
      out.push(child);
      if (child.hasChildren) {
        queue.push(child.catalogCategoryId);
      }
    }
  }

  return out;
}
