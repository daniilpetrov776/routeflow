import type { Request, Response } from "express";

/**
 * Роут для получения предложений адресов через Yandex Maps API
 */
export function registerSuggestRoute(app: any) {
  app.get("/api/suggest", async (req: Request, res: Response) => {
    try {
      const { text } = req.query;
      const apiKey =
        process.env.YANDEX_MAPS_API_KEY ||
        process.env.VITE_YANDEX_MAPS_API_KEY ||
        "";

      if (!apiKey) {
        throw new Error("Yandex Maps API key not configured");
      }

      const response = await fetch(
        `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${encodeURIComponent(text as string)}&format=json&results=10&lang=ru_RU`
      );

      if (!response.ok) {
        throw new Error(`Yandex Geocoder API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Парсим геокодер и извлекаем подходящие предложения (например, адреса)
      const suggestions = (
        data.response?.GeoObjectCollection?.featureMember || []
      ).map((item: any) => {
        const geoObject = item.GeoObject;
        return {
          name: geoObject.name,
          description: geoObject.description,
          fullAddress: geoObject.metaDataProperty?.GeocoderMetaData?.text,
          coordinates: geoObject.Point?.pos?.split(" ").map(Number), // [lon, lat]
        };
      });

      res.json({ suggestions });
    } catch (error) {
      console.error("Suggest error (via geocoder):", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Suggest (via geocoder) failed",
      });
    }
  });
}

