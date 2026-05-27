const COUNTRY_PARTS = new Set([
  "россия",
  "российская федерация",
  "russia",
  "russian federation",
]);

const CITY_PREFIX_RE =
  /^(город|г\.|поселок|посёлок|п\.|село|с\.|деревня|д\.|санкт-петербург|москва)\b/i;

const looksLikeCountry = (part: string): boolean =>
  COUNTRY_PARTS.has(part.trim().toLowerCase());

const looksLikeCity = (part: string): boolean =>
  CITY_PREFIX_RE.test(part.trim());

export const formatAddressDisplay = (address: string): string => {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

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
