import type { Request, Response } from "express";
import { z } from "zod";
import { getYandexMapsApiKey } from "../lib/api-keys";
import logger from "../lib/logger";
import { suggestQuerySchema } from "../lib/validation-schemas";

/**
 * Роут для получения предложений адресов через Yandex Maps API
 */
export function registerSuggestRoute(app: any) {
  app.get("/api/suggest", async (req: Request, res: Response) => {
    try {
      // Валидируем query параметры
      const validated = suggestQuerySchema.parse(req.query);
      const { text } = validated;

      const apiKey = getYandexMapsApiKey();

      const response = await fetch(
        `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${encodeURIComponent(text)}&format=json&results=10&lang=ru_RU`
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
      // Обработка ошибок валидации
      if (error instanceof z.ZodError) {
        logger.warn("Suggest validation error:", {
          errors: error.errors,
          query: req.query,
        });
        return res.status(400).json({
          error: "Некорректные параметры запроса",
          details: error.errors.map((err) => ({
            path: err.path.join("."),
            message: err.message,
          })),
        });
      }

      // Обработка других ошибок
      logger.error("Suggest error (via geocoder):", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Suggest (via geocoder) failed",
      });
    }
  });
}

