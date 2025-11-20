import type { Express, Request, Response } from "express";
import { buildMapsScriptUrl } from "../lib/yandex-api";
import { handleError } from "../lib/error-handlers";

/**
 * Роут для получения конфигурации Yandex Maps API
 * Возвращает URL для загрузки библиотеки с API ключом
 */
export function registerYandexMapsRoute(app: Express) {
  app.get("/api/yandex-maps/config", async (req: Request, res: Response) => {
    try {
      const scriptUrl = buildMapsScriptUrl();

      res.json({
        scriptUrl,
        lang: "ru_RU",
      });
    } catch (error) {
      handleError(error, res, "Failed to get Yandex Maps configuration");
    }
  });
}

