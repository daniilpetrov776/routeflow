/** Короткие запросы, похожие на поиск организаций по категории */
const POI_CATEGORY_PREFIXES = [
  "аптек",
  "магазин",
  "супермаркет",
  "продукт",
  "банкомат",
  "банк",
  "кафе",
  "ресторан",
  "стоматолог",
  "поликлиник",
  "клиник",
  "школ",
  "детск",
  "пятёроч",
  "пятероч",
  "магнит",
  "перекрест",
];

export function looksLikePoiCategoryQuery(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized || normalized.length > 40) {
    return false;
  }

  return POI_CATEGORY_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(prefix)
  );
}

/** Первая часть адреса — обычно улица или район */
export function extractStreetContext(address: string): string | null {
  const part = address.split(",")[0]?.trim();
  if (!part || part.length < 3) {
    return null;
  }
  return part;
}

export function buildPoiSearchText(text: string, nearAddress?: string): string {
  if (!looksLikePoiCategoryQuery(text) || !nearAddress) {
    return text;
  }

  const street = extractStreetContext(nearAddress);
  if (!street) {
    return text;
  }

  const normalizedText = text.trim().toLowerCase();
  const normalizedStreet = street.toLowerCase();
  if (normalizedText.includes(normalizedStreet)) {
    return text;
  }

  return `${text.trim()} ${street}`;
}

export function isStreetNameFalsePositive(name: string, query: string): boolean {
  const normalizedName = name.trim().toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery === "аптека" && normalizedName.includes("аптекар")) {
    return true;
  }

  return false;
}
