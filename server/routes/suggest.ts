import type { Express, Request, Response } from "express";
import { suggestQuerySchema } from "../lib/validation-schemas";
import { fetchGeocoderData } from "../lib/yandex-api";
import { handleValidationError, handleError } from "../lib/error-handlers";

/**
 * Тип для элемента из ответа Yandex Geocoder API
 */
interface YandexGeocoderFeatureMember {
  GeoObject: {
    name: string;
    description?: string;
    metaDataProperty?: {
      GeocoderMetaData?: {
        text?: string;
      };
    };
    Point?: {
      pos?: string;
    };
  };
}

/**
 * Роут для получения предложений адресов через Yandex Maps API
 */
export function registerSuggestRoute(app: Express) {
  app.get("/api/suggest", async (req: Request, res: Response) => {
    try {
      // Валидируем query параметры
      const validated = suggestQuerySchema.parse(req.query);
      const { text } = validated;

      // Получаем данные из Yandex Geocoder API
      const data = await fetchGeocoderData(text, 10);

      // Парсим геокодер и извлекаем подходящие предложения (например, адреса)
      const suggestions = (
        data.response?.GeoObjectCollection?.featureMember || []
      ).map((item: YandexGeocoderFeatureMember) => {
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
      if (handleValidationError(error, req, res, "Suggest")) {
        return;
      }

      // Обработка других ошибок
      handleError(error, res, "Suggest (via geocoder) failed");
    }
  });
}

