import { apiRequest } from "@/lib/queryClient";

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
    const geoObject =
      data.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    const coordinates = parsePosString(geoObject?.Point?.pos);
    if (!coordinates) {
      return null;
    }
    return {
      address: geoObject?.metaDataProperty?.GeocoderMetaData?.text?.trim() || query,
      coordinates,
    };
  } catch (error) {
    console.error("Geocode lookup failed:", error);
    return null;
  }
};

