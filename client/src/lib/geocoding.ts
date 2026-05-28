import { apiRequest } from "@/lib/queryClient";
import { formatAddressDisplay, formatBusinessAddressDisplay } from "@/lib/address-format";

export type GeocodedAddress = {
  address: string;
  coordinates: [number, number];
};

/**
 * Парсит строковое значение координаты в число
 */
export const parseCoordinate = (value?: string): number | null => {
  if (!value) return null;
  const normalized = value.replace(",", ".").trim();
  const numberValue = Number(normalized);
  return Number.isFinite(numberValue) ? numberValue : null;
};

/**
 * Парсит строку позиции "lon lat" в массив координат [lat, lon]
 */
export const parsePosString = (pos?: string): [number, number] | null => {
  if (!pos) return null;
  const [lonRaw, latRaw] = pos.split(" ");
  const lon = parseCoordinate(lonRaw);
  const lat = parseCoordinate(latRaw);
  if (lon === null || lat === null) return null;
  return [lat, lon];
};

function extractGeocodedAddress(data: unknown, fallback: string): GeocodedAddress | null {
  const geoObject = (data as {
    response?: { GeoObjectCollection?: { featureMember?: Array<{ GeoObject?: { Point?: { pos?: string }; metaDataProperty?: { GeocoderMetaData?: { text?: string } } } }> } };
  })?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;

  const coordinates = parsePosString(geoObject?.Point?.pos);
  if (!coordinates) {
    return null;
  }

  return {
    address: formatAddressDisplay(geoObject?.metaDataProperty?.GeocoderMetaData?.text?.trim() || fallback),
    coordinates,
  };
}

/**
 * Геокодирует адрес через API и возвращает координаты
 */
export const geocodeAddress = async (query: string): Promise<GeocodedAddress | null> => {
  try {
    const response = await apiRequest(
      "GET",
      `/api/geocode?address=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    return extractGeocodedAddress(data, query);
  } catch (error) {
    console.error("Geocode lookup failed:", error);
    return null;
  }
};

/**
 * Геокодирует объект по uri из Geosuggest
 */
export const geocodeByUri = async (uri: string, fallbackTitle: string): Promise<GeocodedAddress | null> => {
  try {
    const response = await apiRequest(
      "GET",
      `/api/geocode?uri=${encodeURIComponent(uri)}`
    );
    const data = await response.json();
    return extractGeocodedAddress(data, fallbackTitle);
  } catch (error) {
    console.error("Geocode by uri failed:", error);
    return null;
  }
};

/**
 * Разрешает подсказку в AddressPoint: использует координаты или geocode-by-uri
 */
export const resolveSuggestion = async (input: {
  title: string;
  fullAddress?: string;
  kind?: "business" | "address";
  coordinates?: [number, number];
  uri?: string;
}): Promise<GeocodedAddress | null> => {
  if (input.coordinates && input.coordinates.every(Number.isFinite)) {
    return {
      address: input.kind === "business"
        ? formatBusinessAddressDisplay(input.title, input.fullAddress)
        : formatAddressDisplay(input.fullAddress || input.title),
      coordinates: input.coordinates,
    };
  }

  if (input.uri) {
    const geocoded = await geocodeByUri(input.uri, input.title);
    if (geocoded) {
      if (input.kind === "business") {
        return {
          ...geocoded,
          address: formatBusinessAddressDisplay(input.title, input.fullAddress || geocoded.address),
        };
      }
      return geocoded;
    }
  }

  return geocodeAddress(input.title);
};
