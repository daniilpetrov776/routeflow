import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerGeocodeRoute } from "./routes/geocode";
import { registerSuggestRoute } from "./routes/suggest";
import { registerRoutesRoute } from "./routes/routes";
import { registerYandexMapsRoute } from "./routes/yandex-maps";

/**
 * Регистрирует все роуты приложения
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Регистрируем роуты
  registerGeocodeRoute(app);
  registerSuggestRoute(app);
  registerRoutesRoute(app);
  registerYandexMapsRoute(app);

  const httpServer = createServer(app);
  return httpServer;
}
