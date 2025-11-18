import type { Request, Response } from "express";
import logger from "../lib/logger";
import { getYandexMapsApiKey } from "../lib/api-keys";

/**
 * Роут для получения конфигурации Yandex Maps API
 * Возвращает URL для загрузки библиотеки с API ключом
 */
export function registerYandexMapsRoute(app: any) {
  app.get("/api/yandex-maps/config", async (req: Request, res: Response) => {
    try {
      const apiKey = getYandexMapsApiKey();
      const scriptUrl = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;

      res.json({
        scriptUrl,
        lang: "ru_RU",
      });
    } catch (error) {
      logger.error("Failed to get Yandex Maps config:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to get Yandex Maps configuration",
      });
    }
  });
}

