const COUNTRY_PARTS = new Set([
  "россия",
  "российская федерация",
  "россия",
  "российская федерация",
  "russia",
  "russian federation",
]);

const CITY_PREFIX_RE =
  /^(город|г\.|поселок|посёлок|п\.|село|с\.|деревня|д\.|санкт-петербург|москва)\b/i;

const CITY_NAME_RE =
  /^(санкт-петербург|москва|saint petersburg|st\.?\s*petersburg|moscow)$/i;
const CITY_PREFIX_TEXT_RE =
  /^(город|г\.|поселок|посёлок|п\.|село|с\.|деревня|д\.)\s+/i;

const looksLikeCountry = (part: string): boolean =>
  COUNTRY_PARTS.has(part.trim().toLowerCase());

const looksLikeCity = (part: string): boolean =>
  CITY_PREFIX_RE.test(part.trim()) ||
  CITY_NAME_RE.test(part.trim()) ||
  CITY_PREFIX_TEXT_RE.test(part.trim());

const normalizeAddressParts = (address: string): string[] =>
  address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

const normalizeComparablePart = (part: string): string =>
  part
    .trim()
    .toLowerCase()
    .replace(/[«»"']/g, "")
    .replace(/\s+/g, " ");

export const formatAddressDisplay = (address: string): string => {
  const parts = normalizeAddressParts(address);

  if (parts.length >= 2 && looksLikeCity(parts[0])) {
    const city = parts.shift()!;
    return [...parts, city].join(", ");
  }

  if (parts.length < 3 || !looksLikeCountry(parts[0])) {
    return address.trim();
  }

  const country = parts[0];
  const cityParts: string[] = [];
  const addressParts = parts.slice(1);

  while (addressParts.length > 1 && (cityParts.length === 0 || looksLikeCity(addressParts[0]))) {
    cityParts.push(addressParts.shift()!);
    if (cityParts.length >= 2) break;
  }

  if (cityParts.length === 0) {
    return [...addressParts, country].join(", ");
  }

  return [...addressParts, ...cityParts, country].join(", ");
};

export const formatBusinessAddressDisplay = (
  name: string,
  address?: string
): string => {
  const cleanName = name.trim();
  const cleanAddress = address?.trim();

  if (!cleanAddress) {
    return cleanName;
  }

  const formattedAddress = formatAddressDisplay(cleanAddress);
  const addressParts = normalizeAddressParts(formattedAddress);
  const comparableName = normalizeComparablePart(cleanName);
  const uniqueAddressParts = addressParts.filter(
    (part) => normalizeComparablePart(part) !== comparableName
  );

  return [cleanName, ...uniqueAddressParts].filter(Boolean).join(", ");
};
