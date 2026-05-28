import type { Express, Request, Response } from "express";
import { geocodeQuerySchema } from "../lib/validation-schemas";
import { fetchGeocoderData, fetchGeocoderByUri } from "../lib/yandex-api";
import { handleValidationError, handleError } from "../lib/error-handlers";

/**
 * Роут для геокодирования адреса или uri через Yandex Geocoder API
 */
export function registerGeocodeRoute(app: Express) {
  app.get("/api/geocode", async (req: Request, res: Response) => {
    try {
      const validated = geocodeQuerySchema.parse(req.query);

      const data = validated.uri
        ? await fetchGeocoderByUri(validated.uri)
        : await fetchGeocoderData(validated.address!, 10);

      res.json(data);
    } catch (error) {
      if (handleValidationError(error, req, res, "Geocode")) {
        return;
      }

      handleError(error, res, "Geocoding failed");
    }
  });
}
