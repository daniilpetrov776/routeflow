import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerGeocodeRoute } from "./routes/geocode";
import { registerSuggestRoute } from "./routes/suggest";
import { registerRoutesRoute } from "./routes/routes";
import { registerYandexMapsRoute } from "./routes/yandex-maps";
import { registerAlongRouteRoute } from "./routes/along-route";
import {
  suggestLimiter,
  geocodeLimiter,
  routesLimiter,
  alongRouteLimiter,
  yandexMapsConfigLimiter,
} from "./lib/rateLimiter";

/**
 * Регистрирует все роуты приложения
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Применяем специфичные rate limiters для каждого роута
  app.use("/api/suggest", suggestLimiter);
  app.use("/api/geocode", geocodeLimiter);
  app.use("/api/routes", routesLimiter);
  app.use("/api/along-route", alongRouteLimiter);
  app.use("/api/yandex-maps/config", yandexMapsConfigLimiter);

  // Регистрируем роуты
  registerGeocodeRoute(app);
  registerSuggestRoute(app);
  registerRoutesRoute(app);
  registerAlongRouteRoute(app);
  registerYandexMapsRoute(app);

  const httpServer = createServer(app);
  return httpServer;
}
