import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerGeocodeRoute } from "./routes/geocode";
import { registerSuggestRoute } from "./routes/suggest";
import { registerRoutesRoute } from "./routes/routes";

/**
 * Регистрирует все роуты приложения
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Регистрируем роуты
  registerGeocodeRoute(app);
  registerSuggestRoute(app);
  registerRoutesRoute(app);

  const httpServer = createServer(app);
  return httpServer;
}
