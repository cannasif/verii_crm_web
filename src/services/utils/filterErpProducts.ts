import type { ErpProduct } from "../erp-types";

function normalizeSearchText(value: string | undefined | null): string {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "c")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim();
}

function getProductFields(product: ErpProduct): string[] {
  return [
    product.stokKodu,
    product.stokAdi,
    product.grupKodu,
    product.grupAdi,
    product.ureticiKodu,
    product.kod1,
    product.kod1Adi,
    product.kod2,
    product.kod2Adi,
    product.kod3,
    product.kod4,
    product.kod5,
  ]
    .map((field) => normalizeSearchText(field))
    .filter((field) => field.length > 0);
}

function scoreProduct(product: ErpProduct, rawQuery: string): number {
  const normalizedQuery = normalizeSearchText(rawQuery);
  if (normalizedQuery.length === 0) return 0;

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const fields = getProductFields(product);
  const combined = fields.join(" ");

  if (tokens.length === 0) return 0;
  if (!tokens.every((token) => combined.includes(token))) return 0;

  let score = 0;

  tokens.forEach((token) => {
    if (normalizeSearchText(product.stokKodu).startsWith(token)) score += 12;
    if (normalizeSearchText(product.stokAdi).startsWith(token)) score += 10;
    if (normalizeSearchText(product.grupKodu).startsWith(token)) score += 8;
    if (normalizeSearchText(product.grupAdi).startsWith(token)) score += 7;
    if (normalizeSearchText(product.ureticiKodu).startsWith(token)) score += 6;

    fields.forEach((field) => {
      if (field === token) score += 10;
      else if (field.startsWith(token)) score += 6;
      else if (field.includes(token)) score += 3;
    });
  });

  if (combined.startsWith(normalizedQuery)) score += 10;
  else if (combined.includes(normalizedQuery)) score += 5;

  return score;
}

export function filterAndRankErpProducts(products: ErpProduct[], rawQuery: string): ErpProduct[] {
  const normalizedQuery = normalizeSearchText(rawQuery);
  if (normalizedQuery.length < 2) return products;

  return [...products]
    .map((product, index) => ({
      product,
      index,
      score: scoreProduct(product, normalizedQuery),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.index - right.index;
    })
    .map((entry) => entry.product);
}
