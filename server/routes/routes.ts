import type { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import {
  calculateDistance,
  calculateDuration,
  formatDuration,
  formatDistance,
} from "../lib/route-calculations";
import { getYandexMapsApiKey } from "../lib/api-keys";
import logger from "../lib/logger";
import { routeRequestSchema } from "../lib/validation-schemas";

/**
 * Роут для расчета маршрутов
 */
export function registerRoutesRoute(app: any) {
  app.post("/api/routes", async (req: Request, res: Response) => {
    try {
      // Валидируем входные данные
      const validated = routeRequestSchema.parse(req.body);
      const { startingPoint, destinations, transportMode } = validated;

      const apiKey = getYandexMapsApiKey();

      // Вычисляем маршруты на основе координат
      const routes = [];

      for (let i = 0; i < destinations.length; i++) {
        const destination = destinations[i];

        // Вычисляем приблизительное расстояние по формуле Haversine
        const distance = calculateDistance(
          startingPoint.coordinates[0],
          startingPoint.coordinates[1],
          destination.coordinates[0],
          destination.coordinates[1]
        );

        // Генерируем несколько альтернативных маршрутов с разными характеристиками
        const routeAlternatives = [];

        // Основной маршрут
        const baseDuration = calculateDuration(distance, transportMode);
        routeAlternatives.push({
          duration: {
            value: baseDuration,
            text: formatDuration(baseDuration),
          },
          distance: { value: distance, text: formatDistance(distance) },
          traffic_info: { level: "light" },
          geometry: {
            coordinates: [startingPoint.coordinates, destination.coordinates],
          },
        });

        // Альтернативный маршрут (немного длиннее)
        const altDuration = baseDuration * 1.2;
        const altDistance = distance * 1.1;
        routeAlternatives.push({
          duration: {
            value: altDuration,
            text: formatDuration(altDuration),
          },
          distance: { value: altDistance, text: formatDistance(altDistance) },
          traffic_info: { level: "moderate" },
          geometry: {
            coordinates: [startingPoint.coordinates, destination.coordinates],
          },
        });

        // Третий альтернативный маршрут (объезд пробок)
        const trafficDuration = baseDuration * 1.5;
        const trafficDistance = distance * 1.3;
        routeAlternatives.push({
          duration: {
            value: trafficDuration,
            text: formatDuration(trafficDuration),
          },
          distance: {
            value: trafficDistance,
            text: formatDistance(trafficDistance),
          },
          traffic_info: { level: "heavy" },
          geometry: {
            coordinates: [startingPoint.coordinates, destination.coordinates],
          },
        });

        routes.push({
          destination: destination,
          routes: routeAlternatives,
        });
      }

      // Сохраняем расчет маршрута
      const route = await storage.createRoute({
        startingPoint: startingPoint.address,
        destinations: destinations.map((d) => d.address),
        transportMode,
        routeData: routes,
      });

      res.json({ routes, routeId: route.id });
    } catch (error) {
      // Обработка ошибок валидации
      if (error instanceof z.ZodError) {
        logger.warn("Route calculation validation error:", {
          errors: error.errors,
          body: req.body,
        });
        return res.status(400).json({
          error: "Некорректные данные запроса",
          details: error.errors.map((err) => ({
            path: err.path.join("."),
            message: err.message,
          })),
        });
      }

      // Обработка других ошибок
      logger.error("Route calculation error:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Route calculation failed",
      });
    }
  });
}

