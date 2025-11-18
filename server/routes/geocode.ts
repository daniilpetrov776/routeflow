import type { Request, Response } from "express";

/**
 * Роут для геокодирования адреса через Yandex Maps API
 */
export function registerGeocodeRoute(app: any) {
  app.get("/api/geocode", async (req: Request, res: Response) => {
    try {
      const { address } = req.query;
      const apiKey =
        process.env.YANDEX_MAPS_API_KEY ||
        process.env.VITE_YANDEX_MAPS_API_KEY ||
        "";

      if (!apiKey) {
        throw new Error("Yandex Maps API key not configured");
      }

      const response = await fetch(
        `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${encodeURIComponent(address as string)}&format=json&results=10&lang=ru_RU`
      );

      if (!response.ok) {
        throw new Error(`Yandex API error: ${response.statusText}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Geocoding error:", error);
      res
        .status(500)
        .json({
          error:
            error instanceof Error ? error.message : "Geocoding failed",
        });
    }
  });
}

