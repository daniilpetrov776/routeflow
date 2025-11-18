import type { Request, Response } from "express";
import { z } from "zod";
import { getYandexMapsApiKey } from "../lib/api-keys";
import logger from "../lib/logger";
import { geocodeQuerySchema } from "../lib/validation-schemas";

/**
 * Роут для геокодирования адреса через Yandex Maps API
 */
export function registerGeocodeRoute(app: any) {
  app.get("/api/geocode", async (req: Request, res: Response) => {
    try {
      // Валидируем query параметры
      const validated = geocodeQuerySchema.parse(req.query);
      const { address } = validated;

      const apiKey = getYandexMapsApiKey();

      const response = await fetch(
        `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${encodeURIComponent(address)}&format=json&results=10&lang=ru_RU`
      );

      if (!response.ok) {
        throw new Error(`Yandex API error: ${response.statusText}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      // Обработка ошибок валидации
      if (error instanceof z.ZodError) {
        logger.warn("Geocode validation error:", {
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
      logger.error("Geocoding error:", error);
      res.status(500).json({
        error:
          error instanceof Error ? error.message : "Geocoding failed",
      });
    }
  });
}

