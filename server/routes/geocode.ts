import type { Express, Request, Response } from "express";
import { geocodeQuerySchema } from "../lib/validation-schemas";
import { fetchGeocoderData } from "../lib/yandex-api";
import { handleValidationError, handleError } from "../lib/error-handlers";

/**
 * Роут для геокодирования адреса через Yandex Maps API
 */
export function registerGeocodeRoute(app: Express) {
  app.get("/api/geocode", async (req: Request, res: Response) => {
    try {
      // Валидируем query параметры
      const validated = geocodeQuerySchema.parse(req.query);
      const { address } = validated;

      // Получаем данные из Yandex Geocoder API
      const data = await fetchGeocoderData(address, 10);
      res.json(data);
    } catch (error) {
      // Обработка ошибок валидации
      if (handleValidationError(error, req, res, "Geocode")) {
        return;
      }

      // Обработка других ошибок
      handleError(error, res, "Geocoding failed");
    }
  });
}

